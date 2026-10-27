// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

use std::ptr::{null, null_mut};
use windows_sys::Win32::{
    Foundation::{GetLastError, HWND, LPARAM, RECT, SetLastError},
    System::LibraryLoader::GetModuleHandleW,
    UI::{HiDpi::*, WindowsAndMessaging::*},
};

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

struct NeighborProbe {
    taskbar: RECT,
    monitor: Option<TrafficMonitor>,
}

#[derive(Clone, Copy)]
pub(crate) struct TrafficMonitor {
    pub window: HWND,
    pub rect: RECT,
}

unsafe extern "system" fn inspect_neighbor(window: HWND, data: LPARAM) -> i32 {
    unsafe {
        let probe = &mut *(data as *mut NeighborProbe);
        if IsWindowVisible(window) == 0 {
            return 1;
        }
        let mut title = [0_u16; 256];
        let count = GetWindowTextW(window, title.as_mut_ptr(), title.len() as i32);
        if count <= 0
            || !String::from_utf16_lossy(&title[..count as usize])
                .to_lowercase()
                .contains("trafficmonitor")
        {
            return 1;
        }
        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(window, &mut rect) != 0
            && rect.right > rect.left
            && rect.bottom > rect.top
            && rect.left >= probe.taskbar.left
            && rect.right <= probe.taskbar.right
            && rect.bottom > probe.taskbar.top
            && rect.top < probe.taskbar.bottom
            && probe
                .monitor
                .is_none_or(|monitor| rect.left < monitor.rect.left)
        {
            probe.monitor = Some(TrafficMonitor { window, rect });
        }
        1
    }
}

// TrafficMonitor may be nested under the Win10 rebar, rather than a direct sibling.
pub(crate) fn traffic_monitor(taskbar: HWND) -> Option<TrafficMonitor> {
    unsafe {
        let mut probe = NeighborProbe {
            taskbar: std::mem::zeroed(),
            monitor: None,
        };
        if GetWindowRect(taskbar, &mut probe.taskbar) == 0 {
            return None;
        }
        EnumChildWindows(
            taskbar,
            Some(inspect_neighbor),
            (&mut probe as *mut NeighborProbe) as LPARAM,
        );
        probe.monitor
    }
}

// A right-aligned TrafficMonitor follows changes to MSTaskSwWClass by subtracting
// its own width again. Never reserve that shared area while it is present.
pub(crate) fn can_reserve_task_list(windows11: bool, has_monitor: bool) -> bool {
    !windows11 && !has_monitor
}

fn needs_monitor_recovery(container: &RECT, tasks: &RECT, monitor: &RECT, dpi: i32) -> bool {
    let gap = 8 * dpi / 96;
    // Only repair a right-side monitor stranded inside otherwise empty rebar
    // space by the old layout loop. Respect monitors intentionally placed left.
    monitor.left >= tasks.right - gap
        && monitor.left <= tasks.right + gap
        && monitor.right + gap < container.right
        && tasks.left >= container.left
        && tasks.right < container.right
}

// Called once for each newly observed monitor, never from the periodic resize
// loop. Restoring the full task-list width lets TrafficMonitor reserve its own
// space once and recover the position left behind by older PayDance builds.
pub(crate) unsafe fn recover_monitor_space(taskbar: HWND, monitor: TrafficMonitor, dpi: i32) {
    unsafe {
        let rebar = FindWindowExW(taskbar, null_mut(), wide("ReBarWindow32").as_ptr(), null());
        if rebar.is_null() || GetParent(monitor.window) != rebar {
            return;
        }
        let task_list = FindWindowExW(rebar, null_mut(), wide("MSTaskSwWClass").as_ptr(), null());
        let mut tasks: RECT = std::mem::zeroed();
        let mut container: RECT = std::mem::zeroed();
        if !task_list.is_null()
            && GetWindowRect(task_list, &mut tasks) != 0
            && GetWindowRect(rebar, &mut container) != 0
            && needs_monitor_recovery(&container, &tasks, &monitor.rect, dpi)
        {
            MoveWindow(
                task_list,
                tasks.left - container.left,
                tasks.top - container.top,
                container.right - tasks.left,
                tasks.bottom - tasks.top,
                1,
            );
        }
    }
}

// Create locally before attaching to Explorer: directly creating against a foreign
// parent can wait on its message queue and fail with ERROR_TIMEOUT (1460).
pub(crate) unsafe fn create_child(
    parent: HWND,
    class_name: &str,
    data: *const std::ffi::c_void,
) -> Result<HWND, String> {
    unsafe {
        let previous_dpi = SetThreadDpiAwarenessContext(GetWindowDpiAwarenessContext(parent));
        let window = CreateWindowExW(
            WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE | WS_EX_LAYERED | WS_EX_NOPARENTNOTIFY,
            wide(class_name).as_ptr(),
            wide("PayDance taskbar amount").as_ptr(),
            WS_POPUP,
            0,
            0,
            1,
            1,
            null_mut(),
            null_mut(),
            GetModuleHandleW(null()),
            data,
        );
        let result = if window.is_null() {
            Err(format!("CreateWindowExW failed ({})", GetLastError()))
        } else {
            let style = GetWindowLongPtrW(window, GWL_STYLE) as u32;
            SetWindowLongPtrW(window, GWL_STYLE, ((style & !WS_POPUP) | WS_CHILD) as isize);
            SetLastError(0);
            SetParent(window, parent);
            let attach_error = GetLastError();
            if GetParent(window) != parent {
                DestroyWindow(window);
                Err(format!("SetParent failed ({attach_error})"))
            } else if SetLayeredWindowAttributes(window, 0x00010001, 255, LWA_COLORKEY) == 0 {
                DestroyWindow(window);
                Err("Taskbar transparency is unavailable".into())
            } else {
                Ok(window)
            }
        };
        SetThreadDpiAwarenessContext(previous_dpi);
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rect(left: i32, right: i32) -> RECT {
        RECT {
            left,
            right,
            top: 0,
            bottom: 40,
        }
    }

    #[test]
    fn monitor_keeps_its_task_list_width_across_repeated_refreshes() {
        let monitor_width = 160;
        let mut task_right = 1500;
        let mut monitor_left = task_right + 2;
        for _ in 0..1200 {
            if can_reserve_task_list(false, true) {
                // TrafficMonitor reacts to every foreign resize by reserving
                // its width again. The old logic therefore drifted each tick.
                task_right = monitor_left - 84 - monitor_width;
                monitor_left = task_right + 2;
            }
            let amount_left = monitor_left - 84;
            assert_eq!(task_right, 1500);
            assert_eq!(monitor_left, 1502);
            assert_eq!(amount_left, 1418);
        }
        assert!(can_reserve_task_list(false, false));
        assert!(!can_reserve_task_list(true, false));
    }

    #[test]
    fn recovers_a_stranded_right_monitor_but_respects_a_left_monitor() {
        let container = rect(260, 1600);
        assert!(needs_monitor_recovery(
            &container,
            &rect(260, 350),
            &rect(352, 512),
            96
        ));
        assert!(!needs_monitor_recovery(
            &container,
            &rect(420, 1600),
            &rect(260, 420),
            96
        ));
        assert!(!needs_monitor_recovery(
            &container,
            &rect(260, 1440),
            &rect(1442, 1602),
            96
        ));
    }
}
