// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { computed, onBeforeUnmount, onMounted, provide, ref, watch, type Ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import type { Window as TauriWindow } from "@tauri-apps/api/window";
import type { useSalarySettings } from "./useSalarySettings";
import type { SalarySnapshot } from "../lib/salary";
import { calculateSalarySnapshot } from "../lib/salary";
import type { ValidateT } from "../lib/salary/validation";
import { withCurrencySymbol } from "../lib/currency";
import { taskbarAmountKey } from "../lib/taskbar-amount-context";
import { ensureCalendarForDate } from "../lib/work-calendar";
import { normalizeTaskbarOffset } from "../lib/taskbar-offset";
import { buildTaskbarDetails } from "../lib/taskbar-details";

export function provideTaskbarAmount({
  enabled,
  only,
  offset,
  ready,
  currencySymbol,
  earnedText,
  hasConfigIssues,
  tooltip,
  saveStateNow,
  hideWindow,
}: {
  enabled: Ref<boolean>;
  only: Ref<boolean>;
  offset: Ref<number>;
  ready: Ref<boolean>;
  currencySymbol: Ref<string>;
  earnedText: Ref<string>;
  hasConfigIssues: Ref<boolean>;
  tooltip: Readonly<Ref<string>>;
  saveStateNow: () => Promise<void>;
  hideWindow: () => Promise<void>;
}) {
  const error = ref("");
  const busy = ref(false);
  let timer = 0;
  let disposed = false;
  let pending = false;
  let active: Promise<boolean> | null = null;
  let persistOffsetPending = false;

  // Serialize native updates so a slow enable cannot overtake a later disable.
  const publish = (): Promise<boolean> => {
    pending = true;
    active ??= (async () => {
      let succeeded = false;
      while (pending && !disposed) {
        pending = false;
        const persistOffset = persistOffsetPending;
        persistOffsetPending = false;
        try {
          await invoke("set_taskbar_amount", {
            enabled: enabled.value && ready.value,
            text: hasConfigIssues.value
              ? "--"
              : withCurrencySymbol(currencySymbol.value, earnedText.value),
            offset: normalizeTaskbarOffset(offset.value),
            tooltip: tooltip.value,
            persistOffset,
          });
          error.value = "";
          succeeded = true;
        } catch (cause) {
          persistOffsetPending ||= persistOffset;
          error.value = String(cause);
          succeeded = false;
        }
      }
      return succeeded;
    })().finally(() => {
      active = null;
    });
    return active;
  };

  // A user's position change must reach disk before the native preview moves.
  // Startup assignments are ignored until settings have finished loading.
  watch(
    offset,
    () => {
      if (!ready.value || disposed) return;
      persistOffsetPending = true;
      void publish();
    },
    { flush: "sync" },
  );

  watch(
    [enabled, offset, ready, currencySymbol, earnedText, hasConfigIssues, tooltip],
    () => {
      if (!ready.value || timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        void publish();
      }, 250);
    },
    { immediate: true },
  );

  provide(taskbarAmountKey, {
    enabled,
    offset,
    error,
    busy,
    hideWindow: async () => {
      busy.value = true;
      try {
        enabled.value = true;
        if (!(await publish()) || !enabled.value || !ready.value) return;
        only.value = true;
        await saveStateNow();
        await hideWindow();
      } finally {
        busy.value = false;
      }
    },
  });

  onBeforeUnmount(() => {
    disposed = true;
    window.clearTimeout(timer);
  });
  return { publish };
}

export function useDesktopTaskbar(
  settings: ReturnType<typeof useSalarySettings>,
  {
    appWindow,
    earnedText,
    hasConfigIssues,
    snapshot,
    saveStateNow,
    scheduleSaveState,
    setMiniMode,
    t,
  }: {
    appWindow: TauriWindow;
    earnedText: Ref<string>;
    hasConfigIssues: Ref<boolean>;
    snapshot: Ref<SalarySnapshot>;
    saveStateNow: () => Promise<void>;
    scheduleSaveState: () => void;
    setMiniMode: (value: boolean) => Promise<void>;
    t: Ref<ValidateT>;
  },
) {
  if (appWindow.label !== "main") return;
  const ready = computed(
    () => settings.isSettingsReady.value && settings.hasCompletedOnboarding.value,
  );
  const { publish } = provideTaskbarAmount({
    enabled: settings.taskbarAmountEnabled,
    offset: settings.taskbarAmountOffset,
    only: settings.taskbarOnly,
    ready,
    currencySymbol: settings.currencySymbol,
    earnedText,
    hasConfigIssues,
    tooltip: computed(() =>
      buildTaskbarDetails({
        now: new Date(),
        config: settings.config.value,
        snapshot: snapshot.value,
        currencySymbol: settings.currencySymbol.value,
        locale: settings.locale.value,
        t: t.value,
      }),
    ),
    saveStateNow,
    hideWindow: async () => {
      await setMiniMode(false);
      await appWindow.hide();
    },
  });
  watch(
    [settings.taskbarAmountEnabled, settings.taskbarAmountOffset, settings.taskbarOnly],
    scheduleSaveState,
  );
  let disposed = false;
  const unlisteners: Array<() => void> = [];
  onMounted(async () => {
    const listeners = await Promise.all([
      appWindow.listen("taskbar-refresh", () => {
        ensureCalendarForDate(new Date(), settings.config.value);
        snapshot.value = calculateSalarySnapshot(
          new Date(),
          settings.config.value,
          t.value,
        );
      }),
      appWindow.listen("window-shown", () => {
        settings.taskbarOnly.value = false;
      }),
      appWindow.listen("taskbar-hide-main", async () => {
        settings.taskbarOnly.value = true;
        await saveStateNow();
        await appWindow.hide();
      }),
    ]);
    if (disposed) listeners.forEach((unlisten) => unlisten());
    else unlisteners.push(...listeners);
  });
  onBeforeUnmount(() => {
    disposed = true;
    unlisteners.forEach((unlisten) => unlisten());
  });
  return {
    finishStartup: async () => {
      // Complete restoration and establish the amount/recovery entry before
      // native code decides whether this launch should reveal the dashboard.
      if (ready.value) await publish();
      await invoke("complete_desktop_startup", {
        configured: ready.value,
      });
    },
  };
}
