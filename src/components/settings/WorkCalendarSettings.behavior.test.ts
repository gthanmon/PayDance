// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

// @vitest-environment happy-dom
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkCalendarSettings from "./WorkCalendarSettings.vue";
import SalaryAmountFields from "./SalaryAmountFields.vue";
import { defaultSalaryConfig, type SalaryConfig } from "../../lib/salary";
import year2026 from "../../lib/work-calendar/data/2026.json";

vi.mock("#opener", () => ({ openExternalUrl: vi.fn() }));
let wrapper: VueWrapper | undefined;
const mountControlled = (config: SalaryConfig = defaultSalaryConfig) => {
  const result = mount(WorkCalendarSettings, {
    props: {
      config,
      "onUpdate:config": (next) => {
        void result.setProps({ config: next });
      },
    },
  });
  wrapper = result;
  return result;
};

describe("automatic workday settings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T12:00:00"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(year2026) }),
    );
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("switches from manual weekdays to an automatic month with a calendar preview", async () => {
    const view = mountControlled();
    expect(view.find(".weekday-control").exists()).toBe(true);
    await view
      .findAll('button[role="radio"]')
      .find((button) => button.text() === "自动计算")!
      .trigger("click");
    expect(view.find(".weekday-control").exists()).toBe(false);
    expect(view.get(".calendar-summary strong").text()).toBe("18天");
    expect(view.findAll(".month-day")).toHaveLength(31);
    expect(view.get('[title="2026-10-10 国庆节 班"]').classes()).toContain("is-makeup");
    expect(view.get(".calendar-summary").text()).toContain("法定放假 7 天");
  });

  it("chooses a single day off and keeps alternating phase tied to the current week", async () => {
    const view = mountControlled({ ...defaultSalaryConfig, calendarMode: "china" });
    await view
      .findAll('button[role="radio"]')
      .find((button) => button.text() === "单休")!
      .trigger("click");
    expect(view.get(".calendar-summary strong").text()).toBe("21天");
    await view.get("select").setValue("6");
    expect((view.props("config") as SalaryConfig).weeklyRestDay).toBe(6);
    await view
      .findAll('button[role="radio"]')
      .find((button) => button.text() === "大小周")!
      .trigger("click");
    await view.get("select").setValue("single");
    expect(view.props("config")).toMatchObject({
      alternatingWeekAnchor: "2026-10-26",
      alternatingAnchorIsSingle: true,
    });
    expect(view.get(".calendar-summary strong").text()).toBe("20天");
  });

  it("shows automatic workdays read-only and preserves the manually entered value", async () => {
    wrapper = mount(SalaryAmountFields, {
      props: {
        config: {
          ...defaultSalaryConfig,
          calendarMode: "china",
          workDaysPerMonth: 21.75,
        },
        density: "settings",
        hasIssue: () => false,
      },
    });
    const days = wrapper.findAll("input")[1];
    expect(days.element.readOnly).toBe(true);
    expect(days.element.value).toBe("18");
    await wrapper.setProps({
      config: { ...defaultSalaryConfig, calendarMode: "manual", workDaysPerMonth: 21.75 },
    });
    expect(days.element.readOnly).toBe(false);
    expect(days.element.value).toBe("21.75");
  });

  it("rolls into the next month without reopening the settings", async () => {
    vi.setSystemTime(new Date("2026-10-31T23:59:50"));
    const view = mountControlled({ ...defaultSalaryConfig, calendarMode: "china" });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(view.get(".calendar-summary").text()).toContain("2026 年 11 月");
    expect(view.get(".calendar-summary strong").text()).toBe("21天");
  });

  it("keeps the offline calendar on update failure and labels an unknown year as an estimate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const view = mountControlled({ ...defaultSalaryConfig, calendarMode: "china" });
    await view.get(".calendar-footer button").trigger("click");
    await flushPromises();
    expect(view.text()).toContain("继续使用已保存的年历");
    vi.setSystemTime(new Date("2028-02-15T12:00:00"));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(view.get(".calendar-summary").classes()).toContain("is-estimate");
    expect(view.get(".calendar-summary").text()).toContain("仅按每周规则暂估");
  });
});
