// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import type { SalaryConfig } from "../salary/config";
import {
  getHolidayYear,
  localDateKey,
  parseCalendarDate,
  refreshHolidayYear,
} from "./holidays";

export {
  getHolidayYear,
  localDateKey,
  parseCalendarDate,
  refreshHolidayYear,
} from "./holidays";

export function weekMonday(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

// Calendar-day arithmetic avoids DST changing the alternating-week parity.
const dayNumber = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;

export function isSingleRestWeek(date: Date, config: SalaryConfig) {
  const anchor =
    parseCalendarDate(config.alternatingWeekAnchor) ?? new Date(2026, 0, 5, 12);
  const weeks = Math.round(
    (dayNumber(weekMonday(date)) - dayNumber(weekMonday(anchor))) / 7,
  );
  return (((weeks % 2) + 2) % 2 === 0) === (config.alternatingAnchorIsSingle ?? false);
}

export function calendarDay(date: Date, config: SalaryConfig) {
  const key = localDateKey(date);
  if (config.calendarMode !== "china") {
    return {
      date: key,
      working: config.workdays.includes(date.getDay()),
      kind: "regular" as const,
      name: "",
    };
  }
  const special = getHolidayYear(date.getFullYear())?.days.find(
    (day) => day.date === key,
  );
  if (special)
    return {
      date: key,
      working: !special.isOffDay,
      kind: special.isOffDay ? ("holiday" as const) : ("makeup" as const),
      name: special.name,
    };
  const weekday = date.getDay();
  const working =
    config.workSchedule === "single"
      ? weekday !== (config.weeklyRestDay ?? 0)
      : weekday !== 0 &&
        (weekday !== 6 ||
          (config.workSchedule === "alternating" && isSingleRestWeek(date, config)));
  return { date: key, working, kind: "regular" as const, name: "" };
}

export function monthWorkCalendar(date: Date, config: SalaryConfig) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const count = new Date(year, month + 1, 0, 12).getDate();
  const days = Array.from({ length: count }, (_, index) =>
    calendarDay(new Date(year, month, index + 1, 12), config),
  );
  return {
    year,
    month: month + 1,
    days,
    workDays: days.filter((day) => day.working).length,
    holidays: days.filter((day) => day.kind === "holiday").length,
    makeupDays: days.filter((day) => day.kind === "makeup").length,
    confirmed: Boolean(getHolidayYear(year)),
  };
}

export function monthlyWorkDays(date: Date, config: SalaryConfig) {
  return config.calendarMode === "china"
    ? monthWorkCalendar(date, config).workDays
    : config.workDaysPerMonth;
}

export function ensureCalendarForDate(date: Date, config: SalaryConfig) {
  if (config.calendarMode !== "china") return;
  void refreshHolidayYear(date.getFullYear());
  // Cache next year's announced schedule in advance for an offline New Year.
  if (date.getMonth() >= 9) void refreshHolidayYear(date.getFullYear() + 1);
  // A night shift on January 1 can still belong to the previous work month/year.
  if (date.getMonth() === 0 && date.getDate() === 1)
    void refreshHolidayYear(date.getFullYear() - 1);
}
