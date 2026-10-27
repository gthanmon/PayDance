// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tauriDir = resolve(import.meta.dirname);
const cargoToml = readFileSync(resolve(tauriDir, "Cargo.toml"), "utf8");
const libRs = readFileSync(resolve(tauriDir, "src", "lib.rs"), "utf8");
const startupRs = readFileSync(resolve(tauriDir, "src", "desktop_startup.rs"), "utf8");

describe("tauri single instance", () => {
  it("registers the official single-instance plugin on desktop", () => {
    expect(cargoToml).toContain("tauri-plugin-single-instance");
    expect(libRs).toContain("tauri_plugin_single_instance::init");
  });

  it("focuses the existing main window instead of opening a second app", () => {
    expect(libRs).toContain("desktop_startup::request_main_window(app)");
    expect(libRs).toContain("if !desktop_startup::is_background_launch(args)");
    expect(startupRs).toContain('get_webview_window("main")');
    expect(startupRs).toContain("show_window(&window)");
  });
});
