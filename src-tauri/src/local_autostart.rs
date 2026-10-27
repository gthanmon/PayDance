// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

#[cfg(windows)]
mod windows {
    use std::{
        path::PathBuf,
        ptr::{null, null_mut},
    };
    use windows_sys::Win32::{Foundation::*, System::Registry::*};

    const RUN_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
    const APP_NAME: &str = "PayDance";
    const OLD_NAMES: [&str; 3] = ["薪跳", "薪跳本地增强版", "pay-dance"];
    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(Some(0)).collect()
    }

    fn installed_exe() -> PathBuf {
        PathBuf::from(
            std::env::var_os("ProgramFiles").unwrap_or_else(|| "C:\\Program Files".into()),
        )
        .join("paydance")
        .join("PayDance.exe")
    }

    fn startup_command(exe: &std::path::Path) -> String {
        format!(
            "\"{}\" {}",
            exe.display(),
            crate::desktop_startup::AUTOSTART_ARG
        )
    }

    struct Key(HKEY);
    impl Drop for Key {
        fn drop(&mut self) {
            unsafe {
                RegCloseKey(self.0);
            }
        }
    }

    fn should_register(
        request: Option<bool>,
        existing: bool,
        installed: bool,
    ) -> Result<Option<bool>, ()> {
        match request {
            Some(true) if !installed => Err(()),
            Some(value) => Ok(Some(value)),
            None if existing && installed => Ok(Some(true)),
            None => Ok(None),
        }
    }

    pub fn configure(request: Option<bool>) -> Result<bool, String> {
        unsafe {
            let mut raw = null_mut();
            let mut status = RegOpenKeyExW(
                HKEY_CURRENT_USER,
                wide(RUN_KEY).as_ptr(),
                0,
                KEY_QUERY_VALUE | KEY_SET_VALUE,
                &mut raw,
            );
            if status == ERROR_FILE_NOT_FOUND && request != Some(true) {
                return Ok(false);
            }
            if status == ERROR_FILE_NOT_FOUND {
                status = RegCreateKeyExW(
                    HKEY_CURRENT_USER,
                    wide(RUN_KEY).as_ptr(),
                    0,
                    null(),
                    REG_OPTION_NON_VOLATILE,
                    KEY_QUERY_VALUE | KEY_SET_VALUE,
                    null(),
                    &mut raw,
                    null_mut(),
                );
            }
            if status != ERROR_SUCCESS {
                return Err(format!("Cannot open startup settings ({status})"));
            }
            let key = Key(raw);
            let exists = |name: &str| {
                RegQueryValueExW(
                    key.0,
                    wide(name).as_ptr(),
                    null(),
                    null_mut(),
                    null_mut(),
                    null_mut(),
                ) == ERROR_SUCCESS
            };
            let existing = exists(APP_NAME) || OLD_NAMES.iter().any(|name| exists(name));
            let exe = installed_exe();
            let running_installed = std::env::current_exe()
                .ok()
                .and_then(|path| path.canonicalize().ok())
                == exe.canonicalize().ok();
            let action = should_register(request, existing, exe.is_file() && running_installed)
                .map_err(|_| {
                    format!(
                        "请先将最新版 PayDance.exe 放到 {}，并运行该位置的程序，再开启开机启动。",
                        exe.display()
                    )
                })?;
            if let Some(enabled) = action {
                if enabled {
                    let command = wide(&startup_command(&exe));
                    let status = RegSetValueExW(
                        key.0,
                        wide(APP_NAME).as_ptr(),
                        0,
                        REG_SZ,
                        command.as_ptr().cast(),
                        (command.len() * 2) as u32,
                    );
                    if status != ERROR_SUCCESS {
                        return Err(format!("Cannot register startup ({status})"));
                    }
                }
                for name in OLD_NAMES.into_iter().chain((!enabled).then_some(APP_NAME)) {
                    let status = RegDeleteValueW(key.0, wide(name).as_ptr());
                    if status != ERROR_SUCCESS && status != ERROR_FILE_NOT_FOUND {
                        return Err(format!("Cannot remove old startup entry ({status})"));
                    }
                }
                return Ok(enabled);
            }
            Ok(existing)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn migrates_only_enabled_installations_and_requires_the_installed_file() {
            assert_eq!(should_register(None, true, true), Ok(Some(true)));
            assert_eq!(should_register(None, false, true), Ok(None));
            assert_eq!(should_register(None, true, false), Ok(None));
            assert_eq!(should_register(Some(true), false, false), Err(()));
            assert_eq!(should_register(Some(true), true, true), Ok(Some(true)));
            assert_eq!(should_register(Some(false), true, false), Ok(Some(false)));
            assert!(installed_exe().ends_with("paydance/PayDance.exe"));
        }

        #[test]
        fn startup_quotes_the_stable_path_and_always_requests_silent_launch() {
            assert_eq!(
                startup_command(std::path::Path::new(
                    r"C:\Program Files\paydance\PayDance.exe"
                )),
                r#""C:\Program Files\paydance\PayDance.exe" --autostart"#
            );
        }
    }
}

#[tauri::command]
pub fn configure_local_autostart(enabled: Option<bool>) -> Result<bool, String> {
    #[cfg(windows)]
    {
        windows::configure(enabled)
    }
    #[cfg(not(windows))]
    {
        let _ = enabled;
        Err("Local Windows startup is not available on this platform".into())
    }
}
