// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

//! An app-owned child window inside Explorer's primary taskbar. No shell injection or
//! persistent shell changes. Its own message pump survives hidden WebView timers, and
//! re-discovers Explorer after taskbar recreation.

#[cfg(windows)]
mod native {
    use std::{
        ptr::{null, null_mut},
        sync::{Arc, Mutex, mpsc},
        time::{Duration, Instant},
    };
    use tauri::{AppHandle, Emitter, Manager};
    use tauri_plugin_store::StoreExt;
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, RECT, SIZE, WPARAM},
        Graphics::Gdi::*,
        System::{LibraryLoader::GetModuleHandleW, Registry::*},
        UI::{HiDpi::*, WindowsAndMessaging::*},
    };

    struct Request {
        enabled: bool,
        text: String,
        tooltip: String,
        offset: i32,
        reply: mpsc::Sender<Result<(), String>>,
    }
    pub struct TaskbarState(mpsc::Sender<Request>);
    struct PaintData {
        app: AppHandle,
        text: Mutex<String>,
    }
    struct Reservation {
        window: HWND,
        original: RECT,
        target_right: i32,
    }

    struct Worker {
        receiver: mpsc::Receiver<Request>,
        paint: Arc<PaintData>,
        tooltip: Option<crate::taskbar_tooltip::TaskbarTooltip>,
        details: String,
        window: HWND,
        taskbar: HWND,
        reservation: Option<Reservation>,
        observed_monitor: HWND,
        enabled: bool,
        offset: i32,
        windows11: bool,
        last_refresh: Instant,
        last_available: Option<bool>,
    }

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(Some(0)).collect()
    }

    fn taskbar_font(dpi: u32) -> HFONT {
        // Match the adjacent TrafficMonitor: Microsoft YaHei, 10pt, regular.
        unsafe {
            CreateFontW(
                -(((10 * dpi + 36) / 72) as i32),
                0,
                0,
                0,
                FW_NORMAL as i32,
                0,
                0,
                0,
                DEFAULT_CHARSET as u32,
                OUT_DEFAULT_PRECIS as u32,
                CLIP_DEFAULT_PRECIS as u32,
                CLEARTYPE_QUALITY as u32,
                DEFAULT_PITCH as u32,
                wide("Microsoft YaHei").as_ptr(),
            )
        }
    }

    fn amount_width(window: HWND, text: &str, dpi: i32) -> i32 {
        unsafe {
            let dc = GetDC(window);
            let font = taskbar_font(dpi as u32);
            let previous = SelectObject(dc, font);
            let text = wide(text);
            let mut size: SIZE = std::mem::zeroed();
            let measured =
                GetTextExtentPoint32W(dc, text.as_ptr(), (text.len() - 1) as i32, &mut size);
            SelectObject(dc, previous);
            DeleteObject(font);
            ReleaseDC(window, dc);
            let text_width = if measured != 0 {
                size.cx
            } else {
                64 * dpi / 96
            };
            (text_width + 2 * dpi / 96).clamp(24 * dpi / 96, 260 * dpi / 96)
        }
    }

    fn register_window_class() {
        unsafe {
            let class = wide("PayDanceTaskbarAmount");
            let class_info = WNDCLASSW {
                style: CS_DBLCLKS,
                lpfnWndProc: Some(window_proc),
                hInstance: GetModuleHandleW(null()),
                lpszClassName: class.as_ptr(),
                hCursor: LoadCursorW(null_mut(), IDC_HAND),
                ..std::mem::zeroed()
            };
            RegisterClassW(&class_info);
        }
    }

    fn registry_dword(name: &str) -> Option<u32> {
        let mut value = 0_u32;
        let mut size = 4;
        let result = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                wide("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize").as_ptr(),
                wide(name).as_ptr(),
                RRF_RT_REG_DWORD,
                null_mut(),
                (&mut value as *mut u32).cast(),
                &mut size,
            )
        };
        (result == 0).then_some(value)
    }

    fn is_windows11() -> bool {
        let mut buffer = [0_u16; 32];
        let mut size = std::mem::size_of_val(&buffer) as u32;
        let result = unsafe {
            RegGetValueW(
                HKEY_LOCAL_MACHINE,
                wide("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").as_ptr(),
                wide("CurrentBuildNumber").as_ptr(),
                RRF_RT_REG_SZ,
                null_mut(),
                buffer.as_mut_ptr().cast(),
                &mut size,
            )
        };
        result == 0
            && String::from_utf16_lossy(&buffer)
                .trim_end_matches('\0')
                .parse::<u32>()
                .unwrap_or(0)
                >= 22000
    }

    unsafe extern "system" fn window_proc(
        window: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        unsafe {
            if message == WM_NCCREATE {
                let create = &*(lparam as *const CREATESTRUCTW);
                SetWindowLongPtrW(window, GWLP_USERDATA, create.lpCreateParams as isize);
            }
            let data = GetWindowLongPtrW(window, GWLP_USERDATA) as *const PaintData;
            if !data.is_null() {
                match message {
                    WM_ERASEBKGND => return 1,
                    WM_PAINT => {
                        let mut paint: PAINTSTRUCT = std::mem::zeroed();
                        let dc = BeginPaint(window, &mut paint);
                        let mut rect: RECT = std::mem::zeroed();
                        GetClientRect(window, &mut rect);
                        // Color-keyed layered child windows make the taskbar's own background visible.
                        let light = registry_dword("SystemUsesLightTheme") == Some(1);
                        // Blend ClearType edges against the neighboring monitor's light gray,
                        // while leaving the rest of the native taskbar visible through the key.
                        let color_key = if light { 0x00d3d2d2 } else { 0x00202020 };
                        let mut previous_key = 0;
                        let mut alpha = 0;
                        let mut flags = 0;
                        GetLayeredWindowAttributes(
                            window,
                            &mut previous_key,
                            &mut alpha,
                            &mut flags,
                        );
                        if previous_key != color_key {
                            SetLayeredWindowAttributes(window, color_key, 255, LWA_COLORKEY);
                        }
                        let brush = CreateSolidBrush(color_key);
                        FillRect(dc, &rect, brush);
                        DeleteObject(brush);
                        let dpi = GetDpiForWindow(window).max(96);
                        // Keep the digits close to the adjacent monitor instead
                        // of centering them inside a generously padded window.
                        rect.right -= (dpi / 96).max(1) as i32;
                        let font = taskbar_font(dpi);
                        let previous = SelectObject(dc, font);
                        SetBkMode(dc, TRANSPARENT as i32);
                        SetTextColor(dc, if light { 0x00000000 } else { 0x00ffffff });
                        let text = (*data)
                            .text
                            .lock()
                            .unwrap_or_else(|e| e.into_inner())
                            .clone();
                        let mut text = wide(&text);
                        DrawTextW(
                            dc,
                            text.as_mut_ptr(),
                            (text.len() - 1) as i32,
                            &mut rect,
                            DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX | DT_END_ELLIPSIS,
                        );
                        SelectObject(dc, previous);
                        DeleteObject(font);
                        EndPaint(window, &paint);
                        return 0;
                    }
                    WM_LBUTTONDBLCLK => {
                        crate::desktop_startup::request_main_window(&(*data).app);
                        return 0;
                    }
                    WM_RBUTTONUP => {
                        crate::taskbar_menu::show(&(*data).app);
                        return 0;
                    }
                    WM_NCDESTROY => {
                        SetWindowLongPtrW(window, GWLP_USERDATA, 0);
                    }
                    _ => {}
                }
            }
            DefWindowProcW(window, message, wparam, lparam)
        }
    }

    impl Worker {
        fn refresh_with_recovery(&mut self) -> Result<(), String> {
            let result = self.refresh();
            let available = self.enabled && result.is_ok();
            if self.last_available != Some(available) {
                self.last_available = Some(available);
                crate::tray::set_taskbar_available(&self.paint.app, available);
            }
            result
        }

        fn release_reservation(&mut self) {
            if let Some(reservation) = self.reservation.take() {
                unsafe {
                    let mut current: RECT = std::mem::zeroed();
                    let mut container: RECT = std::mem::zeroed();
                    if IsWindow(reservation.window) != 0
                        && GetWindowRect(reservation.window, &mut current) != 0
                        && GetWindowRect(GetParent(reservation.window), &mut container) != 0
                        && current.right == reservation.target_right
                    {
                        let rect = reservation.original;
                        MoveWindow(
                            reservation.window,
                            rect.left - container.left,
                            rect.top - container.top,
                            rect.right - rect.left,
                            rect.bottom - rect.top,
                            1,
                        );
                    }
                }
            }
        }

        fn close(&mut self) {
            self.tooltip.take();
            self.release_reservation();
            unsafe {
                if IsWindow(self.window) != 0 {
                    DestroyWindow(self.window);
                }
            }
            self.window = null_mut();
        }

        fn refresh(&mut self) -> Result<(), String> {
            if !self.enabled {
                self.close();
                return Ok(());
            }
            unsafe {
                let parent = FindWindowW(wide("Shell_TrayWnd").as_ptr(), null());
                if parent.is_null() {
                    self.close();
                    return Err("Windows taskbar is unavailable".into());
                }
                if parent != self.taskbar || IsWindow(self.window) == 0 {
                    self.close();
                    self.taskbar = parent;
                    self.window = crate::taskbar_window::create_child(
                        parent,
                        "PayDanceTaskbarAmount",
                        Arc::as_ptr(&self.paint).cast(),
                    )?;
                }
                if self.tooltip.is_none() {
                    self.tooltip = Some(crate::taskbar_tooltip::TaskbarTooltip::new(
                        self.window,
                        &self.details,
                    )?);
                } else if let Some(tooltip) = &mut self.tooltip {
                    tooltip.update(&self.details);
                }

                let mut taskbar: RECT = std::mem::zeroed();
                GetWindowRect(parent, &mut taskbar);
                if taskbar.bottom - taskbar.top > taskbar.right - taskbar.left {
                    self.close();
                    return Err("Horizontal taskbars are required".into());
                }
                let dpi = GetDpiForWindow(parent).max(96) as i32;
                let text = self
                    .paint
                    .text
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .clone();
                let width = amount_width(self.window, &text, dpi);
                let offset = self.offset.clamp(-2000, 2000) * dpi / 96;
                let notify =
                    FindWindowExW(parent, null_mut(), wide("TrayNotifyWnd").as_ptr(), null());
                let mut notify_rect: RECT = std::mem::zeroed();
                let mut right = if !notify.is_null() && GetWindowRect(notify, &mut notify_rect) != 0
                {
                    notify_rect.left
                } else {
                    taskbar.right - 180 * dpi / 96
                };

                let monitor = crate::taskbar_window::traffic_monitor(parent);
                if let Some(monitor) = monitor {
                    self.release_reservation();
                    if self.observed_monitor != monitor.window {
                        crate::taskbar_window::recover_monitor_space(parent, monitor, dpi);
                        self.observed_monitor = monitor.window;
                    }
                    right = right.min(monitor.rect.left);
                } else {
                    self.observed_monitor = null_mut();
                }

                if crate::taskbar_window::can_reserve_task_list(self.windows11, monitor.is_some()) {
                    let rebar =
                        FindWindowExW(parent, null_mut(), wide("ReBarWindow32").as_ptr(), null());
                    let task_list =
                        FindWindowExW(rebar, null_mut(), wide("MSTaskSwWClass").as_ptr(), null());
                    let mut original: RECT = std::mem::zeroed();
                    if !rebar.is_null()
                        && !task_list.is_null()
                        && GetWindowRect(task_list, &mut original) != 0
                    {
                        if let Some(reservation) = &self.reservation
                            && reservation.window == task_list
                            && original.right == reservation.target_right
                        {
                            original.right = reservation.original.right;
                        }
                        // Reserve space from the existing task-list edge, respecting other widgets.
                        right = right.min(original.right);
                        let target = widget_left(right, width, offset, dpi).min(original.right);
                        if target > original.left + 80 * dpi / 96 {
                            let mut container: RECT = std::mem::zeroed();
                            GetWindowRect(rebar, &mut container);
                            MoveWindow(
                                task_list,
                                original.left - container.left,
                                original.top - container.top,
                                target - original.left,
                                original.bottom - original.top,
                                1,
                            );
                            self.reservation = Some(Reservation {
                                window: task_list,
                                original,
                                target_right: target,
                            });
                        }
                    }
                }

                let x = widget_left(right, width, offset, dpi);
                let height = (taskbar.bottom - taskbar.top).clamp(1, 72 * dpi / 96);
                if x < taskbar.left || x + width > taskbar.right {
                    self.close();
                    return Err("Not enough taskbar space".into());
                }
                if SetWindowPos(
                    self.window,
                    HWND_TOP,
                    x - taskbar.left,
                    taskbar.bottom - taskbar.top - height,
                    width,
                    height,
                    SWP_NOACTIVATE | SWP_SHOWWINDOW,
                ) == 0
                {
                    self.close();
                    return Err("Cannot position taskbar amount".into());
                }
                SetWindowTextW(self.window, wide(&text).as_ptr());
                InvalidateRect(self.window, null(), 0);
                if self.last_refresh.elapsed() >= Duration::from_secs(1) {
                    let _ = self.paint.app.emit_to("main", "taskbar-refresh", ());
                    self.last_refresh = Instant::now();
                }
            }
            Ok(())
        }
    }

    fn widget_left(right: i32, width: i32, offset: i32, dpi: i32) -> i32 {
        right - width - offset - dpi / 96
    }

    pub fn setup(app: &AppHandle) {
        let (sender, receiver) = mpsc::channel::<Request>();
        app.manage(TaskbarState(sender));
        let app = app.clone();
        std::thread::spawn(move || unsafe {
            register_window_class();
            let mut worker = Worker {
                receiver,
                paint: Arc::new(PaintData {
                    app,
                    text: Mutex::new(String::new()),
                }),
                tooltip: None,
                details: String::new(),
                window: null_mut(),
                taskbar: null_mut(),
                reservation: None,
                observed_monitor: null_mut(),
                enabled: false,
                offset: 0,
                windows11: is_windows11(),
                last_refresh: Instant::now(),
                last_available: None,
            };
            let mut last_layout = Instant::now();
            loop {
                let mut message: MSG = std::mem::zeroed();
                while PeekMessageW(&mut message, null_mut(), 0, 0, PM_REMOVE) != 0 {
                    TranslateMessage(&message);
                    DispatchMessageW(&message);
                }
                match worker.receiver.recv_timeout(Duration::from_millis(50)) {
                    Ok(request) => {
                        worker.enabled = request.enabled;
                        worker.offset = request.offset;
                        worker.details = request.tooltip;
                        *worker.paint.text.lock().unwrap_or_else(|e| e.into_inner()) = request.text;
                        let _ = request.reply.send(worker.refresh_with_recovery());
                        last_layout = Instant::now();
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        worker.close();
                        break;
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {}
                }
                if last_layout.elapsed() >= Duration::from_millis(500) {
                    if worker.enabled {
                        let _ = worker.refresh_with_recovery();
                    }
                    last_layout = Instant::now();
                }
            }
        });
    }

    pub async fn update(
        app: AppHandle,
        enabled: bool,
        text: String,
        offset: i32,
        tooltip: String,
        persist_offset: bool,
    ) -> Result<(), String> {
        if text.chars().count() > 64 {
            return Err("Amount text is too long".into());
        }
        if tooltip.chars().count() > 4096 || tooltip.contains('\0') {
            return Err("Taskbar details are too long or contain invalid characters".into());
        }
        if persist_offset {
            let store = app
                .store("salary-settings.json")
                .map_err(|error| error.to_string())?;
            store.set(
                "taskbarAmountOffset",
                serde_json::json!(offset.clamp(-2000, 2000)),
            );
            store
                .save()
                .map_err(|error| format!("Cannot save taskbar offset: {error}"))?;
        }
        let (sender, receiver) = mpsc::channel();
        app.state::<TaskbarState>()
            .0
            .send(Request {
                enabled,
                text,
                tooltip,
                offset: offset.clamp(-2000, 2000),
                reply: sender,
            })
            .map_err(|_| "Taskbar worker stopped".to_string())?;
        tauri::async_runtime::spawn_blocking(move || {
            receiver
                .recv_timeout(Duration::from_secs(3))
                .map_err(|_| "Taskbar worker timed out".to_string())?
        })
        .await
        .map_err(|error| error.to_string())?
    }

    pub fn shutdown(app: &AppHandle) {
        if let Some(state) = app.try_state::<TaskbarState>() {
            let (sender, receiver) = mpsc::channel();
            if state
                .0
                .send(Request {
                    enabled: false,
                    text: String::new(),
                    tooltip: String::new(),
                    offset: 0,
                    reply: sender,
                })
                .is_ok()
            {
                let _ = receiver.recv_timeout(Duration::from_secs(2));
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn scales_taskbar_offset_and_spacing() {
            assert_eq!(widget_left(1800, 112, 0, 96), 1687);
            assert_eq!(widget_left(1800, 168, 90, 144), 1541);
            assert_eq!(widget_left(1800, 112, -30, 96), 1717);
            assert_eq!(widget_left(1800, 168, -45, 144), 1676);
        }
    }
}

pub fn setup(app: &tauri::AppHandle) {
    #[cfg(windows)]
    native::setup(app);
    #[cfg(not(windows))]
    let _ = app;
}

pub fn shutdown(app: &tauri::AppHandle) {
    #[cfg(windows)]
    native::shutdown(app);
    #[cfg(not(windows))]
    let _ = app;
}

#[tauri::command]
pub async fn set_taskbar_amount(
    app: tauri::AppHandle,
    enabled: bool,
    text: String,
    offset: i32,
    tooltip: Option<String>,
    persist_offset: Option<bool>,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        let tooltip = tooltip.unwrap_or_else(|| text.clone());
        native::update(
            app,
            enabled,
            text,
            offset,
            tooltip,
            persist_offset.unwrap_or(false),
        )
        .await
    }
    #[cfg(not(windows))]
    {
        let _ = (app, text, offset, tooltip, persist_offset);
        if enabled {
            Err("Taskbar amount is available on Windows only".into())
        } else {
            Ok(())
        }
    }
}
