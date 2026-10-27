// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};

pub(crate) const AUTOSTART_ARG: &str = "--autostart";
pub(crate) const OPEN_MAIN_EVENT: &str = "tray-open-main";

pub(crate) struct StartupState {
    background: bool,
    ready: AtomicBool,
    manual_open: AtomicBool,
}

pub(crate) fn is_background_launch(args: impl IntoIterator<Item = String>) -> bool {
    args.into_iter().any(|arg| arg == AUTOSTART_ARG)
}

pub(crate) fn setup(app: &AppHandle) {
    app.manage(StartupState {
        background: is_background_launch(std::env::args().skip(1)),
        ready: AtomicBool::new(false),
        manual_open: AtomicBool::new(false),
    });
}

// A manual second launch must win even if the first instance is still loading.
pub(crate) fn request_main_window(app: &AppHandle) {
    let Some(state) = app.try_state::<StartupState>() else {
        return;
    };
    state.manual_open.store(true, Ordering::SeqCst);
    if state.ready.load(Ordering::SeqCst) {
        show_main_window(app);
    } else if let Some(window) = app.get_webview_window("main") {
        // A recovery icon must remain useful even if frontend boot failed.
        crate::tray::show_window(&window);
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        crate::tray::show_window(&window);
        let _ = window.emit(OPEN_MAIN_EVENT, ());
    }
}

fn should_show(background: bool, configured: bool, manual_open: bool) -> bool {
    !background || !configured || manual_open
}

#[tauri::command]
pub fn complete_desktop_startup(app: AppHandle, configured: bool) {
    let state = app.state::<StartupState>();
    state.ready.store(true, Ordering::SeqCst);
    if should_show(
        state.background,
        configured,
        state.manual_open.load(Ordering::SeqCst),
    ) {
        show_main_window(&app);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn autostart_is_silent_but_manual_launch_and_first_run_are_visible() {
        assert!(!should_show(true, true, false));
        assert!(should_show(false, true, false));
        assert!(should_show(true, false, false));
        assert!(should_show(true, true, true));
        assert!(is_background_launch(vec!["--autostart".into()]));
        assert!(!is_background_launch(vec!["--autostart=false".into()]));
        assert!(!is_background_launch(Vec::new()));
    }
}
