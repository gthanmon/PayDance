// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import {
  calculateSalarySnapshot,
  defaultSalaryConfig,
  validateSalaryConfig,
  type SalaryConfig,
} from "../salary";
import {
  calendarDay,
  isSingleRestWeek,
  monthWorkCalendar,
  monthlyWorkDays,
} from "./index";
import { migrateSalaryConfig, recoverVersionedSalaryConfig } from "../settings-migration";

const automatic: SalaryConfig = {
  ...defaultSalaryConfig,
  calendarMode: "china",
  workSchedule: "double",
};
const date = (value: string) => new Date(`${value}T12:00:00`);

describe("China work calendar", () => {
  it("counts all twelve months using the published 2026 holidays and makeup days", () => {
    expect(
      Array.from(
        { length: 12 },
        (_, month) => monthWorkCalendar(new Date(2026, month, 15), automatic).workDays,
      ),
    ).toEqual([21, 16, 22, 21, 19, 21, 23, 21, 22, 18, 21, 23]);
    const october = monthWorkCalendar(date("2026-10-26"), automatic);
    expect(october).toMatchObject({
      confirmed: true,
      workDays: 18,
      holidays: 7,
      makeupDays: 1,
    });
  });

  it("does not count a makeup Saturday twice for single-rest schedules", () => {
    const config = { ...automatic, workSchedule: "single" as const };
    expect(monthWorkCalendar(date("2026-10-01"), config).workDays).toBe(21);
    expect(calendarDay(date("2026-01-04"), config)).toMatchObject({
      working: true,
      kind: "makeup",
    });
    expect(calendarDay(date("2026-10-03"), config).working).toBe(false);
    expect(calendarDay(date("2026-10-11"), config).working).toBe(false);
    expect(calendarDay(date("2026-10-17"), config).working).toBe(true);
    const saturdayRest = { ...config, weeklyRestDay: 6 };
    expect(calendarDay(date("2026-10-11"), saturdayRest).working).toBe(true);
    expect(calendarDay(date("2026-10-17"), saturdayRest).working).toBe(false);
    expect(calendarDay(date("2026-10-10"), saturdayRest).working).toBe(true);
  });

  it("preserves alternating-week phase across months and years", () => {
    const config: SalaryConfig = {
      ...automatic,
      workSchedule: "alternating",
      alternatingWeekAnchor: "2026-10-05",
      alternatingAnchorIsSingle: false,
    };
    expect(monthWorkCalendar(date("2026-10-01"), config).workDays).toBe(20);
    expect(
      monthWorkCalendar(date("2026-10-01"), {
        ...config,
        alternatingAnchorIsSingle: true,
      }).workDays,
    ).toBe(19);
    expect(calendarDay(date("2026-10-31"), config).working).toBe(true);
    expect(calendarDay(date("2026-11-07"), config).working).toBe(false);
    expect(isSingleRestWeek(date("2026-10-04"), config)).toBe(true);
    const yearEnd = { ...config, alternatingWeekAnchor: "2026-12-28" };
    expect(isSingleRestWeek(date("2027-01-02"), yearEnd)).toBe(false);
    expect(isSingleRestWeek(date("2027-01-09"), yearEnd)).toBe(true);
  });

  it("applies official overrides before the weekly schedule and salary status", () => {
    expect(calendarDay(date("2026-05-01"), automatic)).toMatchObject({
      working: false,
      kind: "holiday",
    });
    expect(calculateSalarySnapshot(date("2026-05-01"), automatic).status).toBe(
      "rest-day",
    );
    expect(calculateSalarySnapshot(date("2026-05-09"), automatic).status).toBe("working");
    expect(
      calculateSalarySnapshot(date("2026-05-09"), automatic).dailySalary,
    ).toBeCloseTo(10000 / 19);
    expect(calculateSalarySnapshot(date("2026-05-01"), defaultSalaryConfig).status).toBe(
      "working",
    );
  });

  it("uses the shift's starting month when a night shift crosses into a holiday", () => {
    const config = {
      ...automatic,
      monthlySalary: 22000,
      startTime: "22:00:00",
      endTime: "06:00:00",
    };
    const snapshot = calculateSalarySnapshot(new Date("2026-10-01T02:00:00"), config);
    expect(snapshot.status).toBe("working");
    expect(snapshot.dailySalary).toBe(1000); // September has 22 workdays; October has 18.
    expect(
      calculateSalarySnapshot(new Date("2026-10-08T23:00:00"), config).dailySalary,
    ).toBeCloseTo(22000 / 18);
  });

  it("marks missing annual data as an estimate and handles leap months", () => {
    const february = monthWorkCalendar(date("2028-02-15"), automatic);
    expect(february.confirmed).toBe(false);
    expect(february.days).toHaveLength(29);
    expect(february.workDays).toBe(21);
  });

  it("preserves manual settings and saves/restores automatic settings", () => {
    expect(monthlyWorkDays(date("2026-10-01"), defaultSalaryConfig)).toBe(22);
    expect(migrateSalaryConfig(defaultSalaryConfig, 4)).toEqual(defaultSalaryConfig);
    const config = {
      ...automatic,
      weeklyRestDay: 0,
      alternatingWeekAnchor: "2026-10-26",
      alternatingAnchorIsSingle: true,
    };
    expect(migrateSalaryConfig(config, 5)).toEqual(config);
    expect(
      validateSalaryConfig(
        { ...config, workDaysPerMonth: 0, workdays: [] },
        (key) => key,
      ),
    ).toEqual([]);
    const invalid = recoverVersionedSalaryConfig({
      config: { ...config, weeklyRestDay: 8, alternatingWeekAnchor: "2026-02-30" },
      schemaVersion: 5,
    });
    expect(invalid.recoveryReason).toBe("invalid-values");
    expect(invalid.config.weeklyRestDay).toBeUndefined();
    expect(invalid.config.calendarMode).toBe("china");
  });
});
