// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

//! A native context menu with its own invisible owner. Opening it never shows
//! the dashboard or blocks the amount worker's layout and income updates.

use crate::tray::{self, TrayAction};
use std::{
    ptr::{null, null_mut},
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::AppHandle;
use windows_sys::Win32::{
    Foundation::{GetLastError, HWND, POINT},
    System::LibraryLoader::GetModuleHandleW,
    UI::WindowsAndMessaging::*,
};

static MENU_OPEN: AtomicBool = AtomicBool::new(false);

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

struct PopupMenu(HMENU);
impl Drop for PopupMenu {
    fn drop(&mut self) {
        unsafe {
            DestroyMenu(self.0);
        }
    }
}

fn menu_action(command: i32) -> Option<TrayAction> {
    match command {
        1 => Some(TrayAction::Show),
        2 => Some(TrayAction::OpenSettings),
        3 => Some(TrayAction::Hide),
        4 => Some(TrayAction::ToggleMiniMode),
        5 => Some(TrayAction::ToggleAlwaysOnTop),
        6 => Some(TrayAction::Quit),
        _ => None,
    }
}

fn build_menu(use_en: bool) -> Result<PopupMenu, String> {
    unsafe {
        let menu = PopupMenu(CreatePopupMenu());
        if menu.0.is_null() {
            return Err(format!("Cannot create taskbar menu ({})", GetLastError()));
        }
        let labels = tray::tray_menu_labels(use_en);
        for (command, label) in [
            (1, labels.show),
            (2, labels.settings),
            (3, labels.hide),
            (0, ""),
            (4, labels.toggle_mini),
            (5, labels.toggle_top),
            (0, ""),
            (6, labels.quit),
        ] {
            let flags = if command == 0 {
                MF_SEPARATOR
            } else {
                MF_STRING
            };
            if AppendMenuW(menu.0, flags, command, wide(label).as_ptr()) == 0 {
                return Err(format!("Cannot build taskbar menu ({})", GetLastError()));
            }
        }
        SetMenuDefaultItem(menu.0, 1, 0);
        Ok(menu)
    }
}

struct MenuOwner(HWND);
impl Drop for MenuOwner {
    fn drop(&mut self) {
        unsafe {
            DestroyWindow(self.0);
        }
    }
}

fn popup(use_en: bool, point: POINT) -> Result<Option<TrayAction>, String> {
    unsafe {
        let menu = build_menu(use_en)?;
        // A child attached to Explorer cannot act as a reliable foreground
        // menu owner. This zero-size tool window belongs only to our process.
        let owner = MenuOwner(CreateWindowExW(
            WS_EX_TOOLWINDOW,
            wide("STATIC").as_ptr(),
            wide("PayDance menu").as_ptr(),
            WS_POPUP,
            point.x,
            point.y,
            0,
            0,
            null_mut(),
            null_mut(),
            GetModuleHandleW(null()),
            null(),
        ));
        if owner.0.is_null() {
            return Err(format!("Cannot create menu owner ({})", GetLastError()));
        }
        ShowWindow(owner.0, SW_SHOWNOACTIVATE);
        SetForegroundWindow(owner.0);
        let selected = TrackPopupMenu(
            menu.0,
            TPM_RETURNCMD | TPM_NONOTIFY | TPM_RIGHTBUTTON,
            point.x,
            point.y,
            0,
            owner.0,
            null(),
        );
        PostMessageW(owner.0, WM_NULL, 0, 0);
        ShowWindow(owner.0, SW_HIDE);
        Ok(menu_action(selected))
    }
}

pub(crate) fn show(app: &AppHandle) {
    if MENU_OPEN.swap(true, Ordering::AcqRel) {
        return;
    }
    let mut point = POINT { x: 0, y: 0 };
    if unsafe { GetCursorPos(&mut point) } == 0 {
        MENU_OPEN.store(false, Ordering::Release);
        return;
    }
    let use_en = tray::use_english(app);
    let app = app.clone();
    std::thread::spawn(move || {
        let selected = match popup(use_en, point) {
            Ok(action) => action,
            Err(error) => {
                eprintln!("{error}");
                Some(TrayAction::OpenSettings)
            }
        };
        MENU_OPEN.store(false, Ordering::Release);
        if let Some(action) = selected {
            let handle = app.clone();
            let _ = app.run_on_main_thread(move || tray::dispatch_action(&handle, action));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_menu_contains_recovery_settings_hide_and_quit_without_a_tray_icon() {
        for use_en in [false, true] {
            let menu = build_menu(use_en).unwrap();
            unsafe {
                assert_eq!(GetMenuItemCount(menu.0), 8);
                assert_eq!(GetMenuItemID(menu.0, 0), 1);
                assert_eq!(GetMenuItemID(menu.0, 1), 2);
                assert_eq!(GetMenuItemID(menu.0, 7), 6);
                let mut text = [0_u16; 80];
                let count = GetMenuStringW(menu.0, 2, text.as_mut_ptr(), 80, MF_BYCOMMAND);
                assert_eq!(
                    String::from_utf16_lossy(&text[..count as usize]),
                    tray::tray_menu_labels(use_en).settings
                );
            }
        }
        assert_eq!(menu_action(1), Some(TrayAction::Show));
        assert_eq!(menu_action(2), Some(TrayAction::OpenSettings));
        assert_eq!(menu_action(3), Some(TrayAction::Hide));
        assert_eq!(menu_action(6), Some(TrayAction::Quit));
        assert_eq!(menu_action(0), None); // Escape / click outside.
    }
}
