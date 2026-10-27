// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

mod desktop_startup;
mod local_autostart;
mod portable_update;
mod settings_backup;
mod taskbar_amount;
#[cfg(windows)]
mod taskbar_menu;
#[cfg(windows)]
mod taskbar_tooltip;
#[cfg(windows)]
mod taskbar_window;
mod tray;

use portable_update::install_portable_update;
use settings_backup::backup_unreadable_settings;
use tray::exit_when_main_window_destroyed;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_autostart::Builder::new().build());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        if !desktop_startup::is_background_launch(args) {
            desktop_startup::request_main_window(app);
        }
    }));

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            install_portable_update,
            backup_unreadable_settings,
            local_autostart::configure_local_autostart,
            desktop_startup::complete_desktop_startup,
            taskbar_amount::set_taskbar_amount
        ])
        .on_window_event(exit_when_main_window_destroyed)
        .setup(|app| {
            desktop_startup::setup(app.handle());
            tray::setup(app)?;
            taskbar_amount::setup(app.handle());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                taskbar_amount::shutdown(app);
            }
        });
}
