// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

#![cfg(windows)]

#[path = "../src/taskbar_tooltip.rs"]
mod taskbar_tooltip;
#[path = "../src/taskbar_window.rs"]
mod taskbar_window;

use std::ptr::{null, null_mut};
use windows_sys::Win32::{
    Foundation::{HWND, RECT},
    System::LibraryLoader::GetModuleHandleW,
    UI::{HiDpi::*, WindowsAndMessaging::*},
};

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

unsafe fn bounds(window: HWND) -> RECT {
    unsafe {
        let mut rect: RECT = std::mem::zeroed();
        assert_ne!(GetWindowRect(window, &mut rect), 0);
        rect
    }
}

// Exercise recovery on our own invisible windows, never on Explorer's controls.
#[test]
fn recovers_old_drift_once_and_does_not_shrink_the_monitor_area_again() {
    unsafe {
        let instance = GetModuleHandleW(null());
        for name in ["ReBarWindow32", "MSTaskSwWClass"] {
            let class_name = wide(name);
            let class = WNDCLASSW {
                lpfnWndProc: Some(DefWindowProcW),
                hInstance: instance,
                lpszClassName: class_name.as_ptr(),
                ..std::mem::zeroed()
            };
            assert_ne!(RegisterClassW(&class), 0);
        }
        let taskbar = CreateWindowExW(
            0,
            wide("STATIC").as_ptr(),
            null(),
            WS_POPUP,
            0,
            0,
            1800,
            40,
            null_mut(),
            null_mut(),
            instance,
            null(),
        );
        assert!(!taskbar.is_null());
        let rebar = CreateWindowExW(
            0,
            wide("ReBarWindow32").as_ptr(),
            null(),
            WS_CHILD,
            260,
            0,
            1340,
            40,
            taskbar,
            null_mut(),
            instance,
            null(),
        );
        let tasks = CreateWindowExW(
            0,
            wide("MSTaskSwWClass").as_ptr(),
            null(),
            WS_CHILD,
            0,
            0,
            90,
            40,
            rebar,
            null_mut(),
            instance,
            null(),
        );
        let monitor = CreateWindowExW(
            0,
            wide("STATIC").as_ptr(),
            wide("TrafficMonitor").as_ptr(),
            WS_CHILD,
            92,
            0,
            160,
            40,
            rebar,
            null_mut(),
            instance,
            null(),
        );
        assert!(!rebar.is_null() && !tasks.is_null() && !monitor.is_null());
        let neighbor = taskbar_window::TrafficMonitor {
            window: monitor,
            rect: bounds(monitor),
        };
        taskbar_window::recover_monitor_space(taskbar, neighbor, 96);
        assert_eq!(bounds(tasks).right, bounds(rebar).right);

        // Reproduce TrafficMonitor's reaction: reserve its own width once.
        let full = bounds(tasks);
        let width = full.right - full.left - 160;
        assert_ne!(MoveWindow(tasks, 0, 0, width, 40, 0), 0);
        assert_ne!(MoveWindow(monitor, width + 2, 0, 160, 40, 0), 0);
        let monitor_left = bounds(monitor).left;
        for _ in 0..1200 {
            assert!(!taskbar_window::can_reserve_task_list(false, true));
            assert_eq!(bounds(monitor).left, monitor_left);
            assert_eq!(bounds(tasks).right, full.right - 160);
        }
        assert_ne!(DestroyWindow(taskbar), 0);
        for name in ["ReBarWindow32", "MSTaskSwWClass"] {
            assert_ne!(UnregisterClassW(wide(name).as_ptr(), instance), 0);
        }
    }
}

#[test]
#[ignore = "Requires an unlocked Windows desktop with Explorer running"]
fn attaches_an_invisible_window_to_the_live_taskbar() {
    unsafe {
        let class: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
        let parent = FindWindowW(class.as_ptr(), null());
        assert!(!parent.is_null(), "Explorer taskbar must be running");
        let window = taskbar_window::create_child(parent, "STATIC", null())
            .expect("taskbar attachment must succeed");
        let actual_parent = GetParent(window);
        let visible = IsWindowVisible(window);
        let tooltip = taskbar_tooltip::TaskbarTooltip::new(
            window,
            "薪跳 · 今日已赚：¥893.34\n已工作：6:00:00",
        )
        .expect("native hover tooltip must support a taskbar child window");
        drop(tooltip);
        let destroyed = DestroyWindow(window);
        assert_eq!(actual_parent, parent);
        assert_eq!(visible, 0, "compatibility probe must stay invisible");
        assert_ne!(destroyed, 0, "probe window must be cleaned up");
    }
}

#[test]
#[ignore = "Requires TrafficMonitor visible in the live Windows taskbar"]
fn locates_the_left_edge_of_traffic_monitor() {
    unsafe {
        let class: Vec<u16> = "Shell_TrayWnd\0".encode_utf16().collect();
        let parent = FindWindowW(class.as_ptr(), null());
        assert!(!parent.is_null());
        let previous_dpi = SetThreadDpiAwarenessContext(GetWindowDpiAwarenessContext(parent));
        let left = taskbar_window::traffic_monitor(parent)
            .expect("TrafficMonitor must be detected")
            .rect
            .left;
        println!("TrafficMonitor left edge: {left}; earnings are anchored before this edge");
        for name in ["ReBarWindow32", "TrayNotifyWnd"] {
            let child = FindWindowExW(parent, null_mut(), wide(name).as_ptr(), null());
            if !child.is_null() {
                let rect = bounds(child);
                println!("{name}: left={}, right={}", rect.left, rect.right);
                if name == "ReBarWindow32" {
                    let tasks =
                        FindWindowExW(child, null_mut(), wide("MSTaskSwWClass").as_ptr(), null());
                    if !tasks.is_null() {
                        let rect = bounds(tasks);
                        println!("MSTaskSwWClass: left={}, right={}", rect.left, rect.right);
                    }
                }
            }
        }
        SetThreadDpiAwarenessContext(previous_dpi);
    }
}

#[test]
#[ignore = "Requires the fixed PayDance build and TrafficMonitor running on the live desktop"]
fn live_amount_and_monitor_remain_stable_across_refreshes() {
    unsafe {
        let parent = FindWindowW(wide("Shell_TrayWnd").as_ptr(), null());
        assert!(!parent.is_null());
        let previous_dpi = SetThreadDpiAwarenessContext(GetWindowDpiAwarenessContext(parent));
        let amount = FindWindowExW(
            parent,
            null_mut(),
            wide("PayDanceTaskbarAmount").as_ptr(),
            null(),
        );
        assert!(!amount.is_null(), "PayDance taskbar amount must be enabled");
        let initial_monitor =
            taskbar_window::traffic_monitor(parent).expect("TrafficMonitor must be visible");
        let initial_amount = bounds(amount);
        for _ in 0..24 {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let monitor =
                taskbar_window::traffic_monitor(parent).expect("TrafficMonitor must stay visible");
            let rect = bounds(amount);
            assert_eq!(
                monitor.rect.left, initial_monitor.rect.left,
                "neighbor must not drift"
            );
            assert_eq!(
                monitor.rect.left - rect.right,
                initial_monitor.rect.left - initial_amount.right,
                "the chosen offset must remain stable"
            );
            assert_eq!(
                rect.right, initial_amount.right,
                "amount's anchor must not drift"
            );
        }
        println!(
            "24 live refresh checks: amount right={}, TrafficMonitor left={}; both stable",
            initial_amount.right, initial_monitor.rect.left
        );
        SetThreadDpiAwarenessContext(previous_dpi);
    }
}
