// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

//! A standard Windows tooltip bound only to PayDance's own taskbar child window.
//! Common controls handles hover, dismissal and screen-edge placement.

use std::ptr::{null, null_mut};
use windows_sys::Win32::{
    Foundation::{GetLastError, HWND},
    Graphics::Gdi::{CLEARTYPE_QUALITY, CreateFontW, DEFAULT_CHARSET, DeleteObject, HFONT},
    System::LibraryLoader::GetModuleHandleW,
    UI::{Controls::*, HiDpi::*, WindowsAndMessaging::*},
};

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

pub(crate) struct TaskbarTooltip {
    window: HWND,
    owner: HWND,
    text: Vec<u16>,
    font: HFONT,
    dpi: u32,
}

impl TaskbarTooltip {
    pub(crate) unsafe fn new(owner: HWND, text: &str) -> Result<Self, String> {
        unsafe {
            let controls = INITCOMMONCONTROLSEX {
                dwSize: std::mem::size_of::<INITCOMMONCONTROLSEX>() as u32,
                dwICC: ICC_WIN95_CLASSES,
            };
            if InitCommonControlsEx(&controls) == 0 {
                return Err("Windows tooltip controls are unavailable".into());
            }
            let previous_dpi = SetThreadDpiAwarenessContext(GetWindowDpiAwarenessContext(owner));
            let window = CreateWindowExW(
                WS_EX_TOPMOST | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
                TOOLTIPS_CLASSW,
                null(),
                WS_POPUP | TTS_ALWAYSTIP | TTS_NOPREFIX,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                owner,
                null_mut(),
                GetModuleHandleW(null()),
                null(),
            );
            let error = GetLastError();
            SetThreadDpiAwarenessContext(previous_dpi);
            if window.is_null() {
                return Err(format!("Create tooltip failed ({error})"));
            }
            let mut tooltip = Self {
                window,
                owner,
                text: wide(text),
                font: null_mut(),
                dpi: 0,
            };
            let mut info = tooltip.tool_info();
            if SendMessageW(
                window,
                TTM_ADDTOOLW,
                0,
                (&mut info as *mut TTTOOLINFOW) as isize,
            ) == 0
            {
                return Err("Cannot attach taskbar hover details".into());
            }
            SetWindowPos(
                window,
                HWND_TOPMOST,
                0,
                0,
                0,
                0,
                SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE,
            );
            SendMessageW(window, TTM_SETDELAYTIME, TTDT_INITIAL as usize, 400);
            SendMessageW(window, TTM_SETDELAYTIME, TTDT_RESHOW as usize, 100);
            SendMessageW(window, TTM_SETDELAYTIME, TTDT_AUTOPOP as usize, 30_000);
            tooltip.update_dpi();
            Ok(tooltip)
        }
    }

    fn tool_info(&mut self) -> TTTOOLINFOW {
        TTTOOLINFOW {
            // The V2 prefix also works with unthemed Comctl32 v5 (including
            // test executables), which rejects the newer lpReserved tail.
            cbSize: std::mem::offset_of!(TTTOOLINFOW, lpReserved) as u32,
            uFlags: TTF_IDISHWND | TTF_SUBCLASS | TTF_TRANSPARENT,
            hwnd: self.owner,
            uId: self.owner as usize,
            lpszText: self.text.as_mut_ptr(),
            ..unsafe { std::mem::zeroed() }
        }
    }

    unsafe fn update_dpi(&mut self) {
        unsafe {
            let dpi = GetDpiForWindow(self.owner).max(96);
            if dpi == self.dpi {
                return;
            }
            let font = CreateFontW(
                -(((10 * dpi + 36) / 72) as i32),
                0,
                0,
                0,
                400,
                0,
                0,
                0,
                DEFAULT_CHARSET as u32,
                0,
                0,
                CLEARTYPE_QUALITY as u32,
                0,
                wide("Microsoft YaHei").as_ptr(),
            );
            if !font.is_null() {
                SendMessageW(self.window, WM_SETFONT, font as usize, 1);
                if !self.font.is_null() {
                    DeleteObject(self.font);
                }
                self.font = font;
            }
            SendMessageW(
                self.window,
                TTM_SETMAXTIPWIDTH,
                0,
                (420 * dpi / 96) as isize,
            );
            self.dpi = dpi;
        }
    }

    pub(crate) unsafe fn update(&mut self, text: &str) {
        unsafe {
            self.update_dpi();
            let next = wide(text);
            if self.text == next {
                return;
            }
            // Keep the old buffer alive until the synchronous control update returns.
            let previous = std::mem::replace(&mut self.text, next);
            let mut info = self.tool_info();
            SendMessageW(
                self.window,
                TTM_UPDATETIPTEXTW,
                0,
                (&mut info as *mut TTTOOLINFOW) as isize,
            );
            drop(previous);
            SendMessageW(self.window, TTM_UPDATE, 0, 0);
        }
    }
}

impl Drop for TaskbarTooltip {
    fn drop(&mut self) {
        unsafe {
            if IsWindow(self.window) != 0 {
                DestroyWindow(self.window);
            }
            if !self.font.is_null() {
                DeleteObject(self.font);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registers_multiline_hover_text_updates_it_and_cleans_up() {
        unsafe {
            let owner = CreateWindowExW(
                0,
                wide("STATIC").as_ptr(),
                null(),
                WS_POPUP,
                0,
                0,
                80,
                40,
                null_mut(),
                null_mut(),
                GetModuleHandleW(null()),
                null(),
            );
            assert!(!owner.is_null());
            let mut tooltip =
                TaskbarTooltip::new(owner, "今日已赚：¥893.34\n已工作：6:00:00").unwrap();
            assert_eq!(SendMessageW(tooltip.window, TTM_GETTOOLCOUNT, 0, 0), 1);
            assert_eq!(
                IsWindowVisible(tooltip.window),
                0,
                "a tooltip must not show without hovering"
            );
            let mut info = tooltip.tool_info();
            assert_ne!(
                SendMessageW(
                    tooltip.window,
                    TTM_GETTOOLINFOW,
                    0,
                    (&mut info as *mut TTTOOLINFOW) as isize
                ),
                0
            );
            assert_ne!(
                info.uFlags & TTF_SUBCLASS,
                0,
                "common controls must handle actual hover messages"
            );
            tooltip.update("今日已赚：¥894.01\n工作进度：95%\n大小周 🪙");
            let mut buffer = vec![0_u16; 8193];
            info.lpszText = buffer.as_mut_ptr();
            SendMessageW(
                tooltip.window,
                TTM_GETTEXTW,
                buffer.len(),
                (&mut info as *mut TTTOOLINFOW) as isize,
            );
            let length = buffer.iter().position(|&value| value == 0).unwrap();
            assert_eq!(
                String::from_utf16_lossy(&buffer[..length]),
                "今日已赚：¥894.01\n工作进度：95%\n大小周 🪙"
            );
            let handle = tooltip.window;
            drop(tooltip);
            assert_eq!(
                IsWindow(handle),
                0,
                "tooltip must be removed before its owner"
            );
            assert_ne!(
                IsWindow(owner),
                0,
                "the hover tooltip must not destroy the amount window"
            );
            DestroyWindow(owner);
        }
    }
}
