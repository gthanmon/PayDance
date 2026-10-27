// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import { createT } from "../composables/useI18n";
import {
  calculateSalarySnapshot,
  defaultSalaryConfig,
  type SalaryConfig,
} from "./salary";
import { buildTaskbarDetails } from "./taskbar-details";

const config: SalaryConfig = {
  ...defaultSalaryConfig,
  monthlySalary: 18000,
  calendarMode: "china",
  workSchedule: "double",
  startTime: "09:00:00",
  endTime: "17:25:00",
  enableLunchBreak: true,
  lunchStart: "11:40:00",
  lunchEnd: "13:20:00",
};
const details = (
  time: string,
  current = config,
  locale: "zh-CN" | "en" = "zh-CN",
  currencySymbol = "¥",
) => {
  const now = new Date(time);
  return buildTaskbarDetails({
    now,
    config: current,
    snapshot: calculateSalarySnapshot(now, current),
    currencySymbol,
    locale,
    t: createT(locale),
  });
};

describe("taskbar hover details", () => {
  it("shows live earnings, work progress, schedule, pay rates and the actual month's workdays", () => {
    const text = details("2026-10-26T16:30:00");
    expect(text).toContain("今日已赚：¥864.20");
    expect(text).toContain("今日预计：¥1000.00");
    expect(text).toContain("已工作：5:50:00 / 6:45:00（86.4%）");
    expect(text).toContain("距离下班：0:55:00");
    expect(text).toContain("工作时间：09:00:00 → 17:25:00");
    expect(text).toContain("剔除午休：11:40:00 → 13:20:00");
    expect(text).toContain("折算时薪：¥148.15 · 秒薪：¥0.0412");
    expect(text).toContain("2026 年 10 月工作日：18 天（双休）");
    expect(text).toContain("双击金额打开主页面 · 右键打开菜单");
  });

  it("uses appropriate countdowns before work and during lunch, and handles completed/rest days", () => {
    expect(details("2026-10-26T08:00:00")).toContain("距离上班：1:00:00");
    expect(details("2026-10-26T12:00:00")).toContain("距离午休结束：1:20:00");
    const completed = details("2026-10-26T18:00:00");
    expect(completed).toContain("当前状态：已下班");
    expect(completed).not.toContain("距离下班");
    const rest = details("2026-10-25T12:00:00");
    expect(rest).toContain("当前状态：今日休息");
    expect(rest).not.toMatch(/NaN|Infinity/);
  });

  it("keeps a night shift's work date and month across midnight", () => {
    const night: SalaryConfig = {
      ...config,
      startTime: "22:00:00",
      endTime: "06:00:00",
      enableLunchBreak: false,
    };
    const text = details("2026-10-01T02:00:00", night);
    expect(text).toContain("工作日期：2026-09-30");
    expect(text).toContain("2026 年 9 月工作日：22 天");
    expect(text).toContain("工作时间：22:00:00 → 次日 06:00:00");
    expect(text).not.toContain("剔除午休");
  });

  it("supports English, custom currency symbols, and manual workday counts", () => {
    const manual: SalaryConfig = {
      ...config,
      calendarMode: "manual",
      workDaysPerMonth: 21.75,
    };
    expect(details("2026-10-26T16:30:00", manual)).toContain(
      "每月工作天数：21.75 天（手动）",
    );
    const english = details("2026-10-26T16:30:00", manual, "en", "HK$");
    expect(english).toContain("Earned today: HK$");
    expect(english).toContain("Monthly workdays: 21.75 (manual)");
    expect(english).not.toContain("¥");
    expect(details("2026-10-26T16:30:00", manual, "zh-CN", "")).not.toContain("¥");
  });

  it("labels an unavailable annual calendar as an estimate and invalid settings as invalid", () => {
    expect(details("2028-02-15T16:30:00")).toContain("暂估");
    const invalid = details("2026-10-26T16:30:00", { ...config, monthlySalary: 0 });
    expect(invalid).toContain("配置待修正");
    expect(invalid).not.toContain("今日已赚");
    expect(invalid).not.toMatch(/NaN|Infinity/);
  });
});
