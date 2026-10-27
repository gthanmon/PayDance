// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file -- Independent test harnesses for controls and desktop startup. */
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { provideTaskbarAmount, useDesktopTaskbar } from "./useTaskbarAmount";
import { useSalarySettings } from "./useSalarySettings";
import { calculateSalarySnapshot } from "../lib/salary";
import type { ValidateT } from "../lib/salary/validation";
import type { Window as TauriWindow } from "@tauri-apps/api/window";
import TaskbarAmountSettings from "../components/settings/TaskbarAmountSettings.vue";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

function createHarness(ready = true) {
  const options = {
    enabled: ref(false),
    only: ref(false),
    offset: ref(0),
    ready: ref(ready),
    currencySymbol: ref("¥"),
    earnedText: ref("495.67"),
    hasConfigIssues: ref(false),
    tooltip: ref("今日已赚：¥495.67\n已工作：4:00:00"),
    saveStateNow: vi.fn(async () => {}),
    hideWindow: vi.fn(async () => {}),
  };
  const wrapper = mount(
    defineComponent({
      setup() {
        provideTaskbarAmount(options);
        return () => h(TaskbarAmountSettings);
      },
    }),
  );
  return { options, wrapper };
}

describe("taskbar amount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invoke.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the amount before finishing startup and leaves manual/background visibility to native launch policy", async () => {
    const hide = vi.fn(async () => {});
    let finishStartup: (() => Promise<void>) | undefined;
    let finishEmbedding: (() => void) | undefined;
    invoke.mockImplementation((command) =>
      command === "set_taskbar_amount"
        ? new Promise<void>((resolve) => {
            finishEmbedding = resolve;
          })
        : Promise.resolve(),
    );
    const wrapper = mount(
      defineComponent({
        setup() {
          const settings = useSalarySettings();
          settings.isSettingsReady.value = true;
          settings.hasCompletedOnboarding.value = true;
          settings.taskbarAmountEnabled.value = true;
          settings.taskbarOnly.value = true; // A saved hidden state must not hide a manual launch.
          const t = ref<ValidateT>((key) => key);
          const taskbar = useDesktopTaskbar(settings, {
            appWindow: {
              label: "main",
              hide,
              listen: vi.fn(async () => () => {}),
            } as unknown as TauriWindow,
            earnedText: ref("495.67"),
            hasConfigIssues: ref(false),
            snapshot: ref(
              calculateSalarySnapshot(new Date(), settings.config.value, t.value),
            ),
            saveStateNow: vi.fn(async () => {}),
            scheduleSaveState: vi.fn(),
            setMiniMode: vi.fn(async () => {}),
            t,
          });
          finishStartup = taskbar?.finishStartup;
          return () => h("div");
        },
      }),
    );
    const startup = finishStartup!();
    expect(invoke).toHaveBeenCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ enabled: true }),
    );
    expect(invoke).not.toHaveBeenCalledWith(
      "complete_desktop_startup",
      expect.anything(),
    );
    finishEmbedding!();
    await startup;
    expect(invoke).toHaveBeenLastCalledWith("complete_desktop_startup", {
      configured: true,
    });
    expect(hide).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("waits for settings and publishes the latest amount and currency", async () => {
    const { options, wrapper } = createHarness(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(invoke).not.toHaveBeenCalled();
    options.ready.value = true;
    options.enabled.value = true;
    options.earnedText.value = "496.01";
    options.currencySymbol.value = "HK$";
    await vi.advanceTimersByTimeAsync(300);
    expect(invoke).toHaveBeenLastCalledWith("set_taskbar_amount", {
      enabled: true,
      text: "HK$496.01",
      offset: 0,
      tooltip: "今日已赚：¥495.67\n已工作：4:00:00",
      persistOffset: false,
    });
    options.enabled.value = false;
    await vi.advanceTimersByTimeAsync(300);
    expect(invoke).toHaveBeenLastCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ enabled: false }),
    );
    wrapper.unmount();
  });

  it("does not hide the recovery window when native embedding fails", async () => {
    const { options, wrapper } = createHarness();
    options.enabled.value = true;
    await vi.advanceTimersByTimeAsync(300);
    invoke.mockRejectedValue("Windows taskbar is unavailable");
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(options.hideWindow).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Windows taskbar is unavailable");
    wrapper.unmount();
  });

  it("persists a user offset immediately, before preview throttling or hiding can interrupt it", async () => {
    const { options, wrapper } = createHarness();
    options.enabled.value = true;
    await vi.advanceTimersByTimeAsync(300);
    invoke.mockClear();
    await wrapper.get('input[type="number"]').setValue("-47");
    expect(invoke).toHaveBeenCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ offset: -47, persistOffset: true }),
    );
    // No debounce advance or click on the "taskbar only" button is required.
    wrapper.unmount();
  });

  it("does not overwrite the saved offset with initial values while restoring settings", async () => {
    const { options, wrapper } = createHarness(false);
    options.offset.value = -47;
    expect(invoke).not.toHaveBeenCalled();
    options.ready.value = true;
    await vi.advanceTimersByTimeAsync(300);
    expect(invoke).toHaveBeenLastCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ offset: -47, persistOffset: false }),
    );
    wrapper.unmount();
  });

  it("refreshes hover details even if the displayed amount has not changed", async () => {
    const { options, wrapper } = createHarness();
    options.enabled.value = true;
    await vi.advanceTimersByTimeAsync(300);
    const amount = options.earnedText.value;
    options.tooltip.value = "已工作：4:00:01\n距离下班：2:44:59";
    await vi.advanceTimersByTimeAsync(300);
    expect(invoke).toHaveBeenLastCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({
        text: `¥${amount}`,
        tooltip: "已工作：4:00:01\n距离下班：2:44:59",
      }),
    );
    wrapper.unmount();
  });

  it("allows a negative offset to be typed and publishes it without losing the minus sign", async () => {
    const { options, wrapper } = createHarness();
    options.enabled.value = true;
    options.offset.value = 120;
    await vi.advanceTimersByTimeAsync(300);
    const input = wrapper.get('input[type="number"]');
    expect(input.attributes("min")).toBe("-2000");
    expect(input.attributes("step")).toBe("1");
    // A cleared field/lone minus is an intermediate edit, not a request to reset.
    await input.setValue("");
    expect(options.offset.value).toBe(120);
    await input.setValue("-30");
    await vi.advanceTimersByTimeAsync(300);
    expect(options.offset.value).toBe(-30);
    expect(invoke).toHaveBeenLastCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ offset: -30 }),
    );
    await input.setValue("");
    await input.trigger("blur");
    expect((input.element as HTMLInputElement).value).toBe("-30");
    wrapper.unmount();
  });

  it("honors a disable while the native enable is still pending", async () => {
    const { options, wrapper } = createHarness();
    options.enabled.value = true;
    await vi.advanceTimersByTimeAsync(300);
    let finishEnable: (() => void) | undefined;
    invoke.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishEnable = resolve;
        }),
    );
    await wrapper.get("button").trigger("click");
    options.enabled.value = false;
    await vi.advanceTimersByTimeAsync(300);
    finishEnable?.();
    await flushPromises();
    expect(invoke).toHaveBeenLastCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ enabled: false }),
    );
    expect(options.hideWindow).not.toHaveBeenCalled();
    expect(options.only.value).toBe(false);
    wrapper.unmount();
  });

  it("saves before hiding and lets users move the amount away from other tools", async () => {
    const { options, wrapper } = createHarness();
    options.enabled.value = true;
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get('input[type="number"]').setValue("120");
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(invoke).toHaveBeenLastCalledWith(
      "set_taskbar_amount",
      expect.objectContaining({ offset: 120 }),
    );
    expect(options.saveStateNow).toHaveBeenCalledOnce();
    expect(options.hideWindow).toHaveBeenCalledOnce();
    expect(options.saveStateNow.mock.invocationCallOrder[0]).toBeLessThan(
      options.hideWindow.mock.invocationCallOrder[0]!,
    );
    wrapper.unmount();
  });
});
