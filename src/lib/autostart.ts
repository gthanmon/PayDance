// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { invoke } from "@tauri-apps/api/core";

export type AutostartAdapter = {
  disable: () => Promise<void>;
  enable: () => Promise<void>;
  isEnabled: () => Promise<boolean>;
};

export type AutostartResult = {
  enabled: boolean;
  error: string;
};

export const tauriAutostartAdapter: AutostartAdapter = {
  disable: async () => {
    if (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")) {
      await invoke("configure_local_autostart", { enabled: false });
    } else await disable();
  },
  enable: async () => {
    if (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")) {
      await invoke("configure_local_autostart", { enabled: true });
    } else await enable();
  },
  isEnabled: async () => {
    if (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")) {
      return invoke<boolean>("configure_local_autostart", { enabled: null });
    }
    return isEnabled();
  },
};

export async function readAutostartEnabled(
  adapter: AutostartAdapter,
): Promise<AutostartResult> {
  try {
    return {
      enabled: await adapter.isEnabled(),
      error: "",
    };
  } catch (error) {
    console.error("Failed to read autostart state", error);
    return {
      enabled: false,
      error: "",
    };
  }
}

export async function setAutostartEnabled(
  adapter: AutostartAdapter,
  enabled: boolean,
  previousEnabled: boolean,
  errorMessage: string,
): Promise<AutostartResult> {
  try {
    if (enabled) {
      await adapter.enable();
    } else {
      await adapter.disable();
    }

    return {
      enabled,
      error: "",
    };
  } catch (error) {
    console.error("Failed to update autostart state", error);
    return {
      enabled: previousEnabled,
      error: typeof error === "string" ? `${errorMessage} ${error}` : errorMessage,
    };
  }
}
