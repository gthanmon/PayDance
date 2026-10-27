// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import {
  isOvernightWorkConfig,
  resolveWorkSpans,
  validateSalaryConfig,
  type SalaryConfig,
  type SalarySnapshot,
} from "./salary";
import { getStatusText, type TFunc } from "./shift-display";
import { formatYuan } from "./money-format";
import { withCurrencySymbol } from "./currency";
import { localDateKey, monthWorkCalendar } from "./work-calendar";

const duration = (ms: number) => {
  const seconds = Math.max(0, Math.floor(Number.isFinite(ms) ? ms / 1000 : 0));
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

export function buildTaskbarDetails({
  now,
  config,
  snapshot,
  currencySymbol,
  locale,
  t,
}: {
  now: Date;
  config: SalaryConfig;
  snapshot: SalarySnapshot;
  currencySymbol: string;
  locale: string;
  t: TFunc;
}) {
  const lines = [t("taskbarDetails.title")];
  const issues = validateSalaryConfig(config, t);
  const hint = t("taskbarDetails.actions");
  if (issues.length || snapshot.status === "invalid-config") {
    return [
      ...lines,
      t("status.invalidConfig"),
      ...issues.map((issue) => issue.message),
      hint,
    ].join("\n");
  }
  const money = (amount: number) =>
    withCurrencySymbol(currencySymbol, formatYuan(amount, locale));
  const workDate = resolveWorkSpans(now, config)[0]?.[0] ?? now;
  lines.push(
    t("taskbarDetails.date", { date: localDateKey(workDate) }),
    t("taskbarDetails.earned", { amount: money(snapshot.earnedToday) }),
    t("taskbarDetails.expected", { amount: money(snapshot.dailySalary) }),
    t("taskbarDetails.status", {
      status: getStatusText(snapshot.status, snapshot.isNightWork, false, t),
    }),
    t("taskbarDetails.worked", {
      elapsed: duration(snapshot.elapsedWorkMs),
      total: duration(snapshot.workMsToday),
      progress: (snapshot.progress * 100).toFixed(1),
    }),
  );
  const countdown =
    snapshot.status === "before-work"
      ? "taskbarDetails.untilWork"
      : snapshot.status === "lunch-break"
        ? "taskbarDetails.untilResume"
        : "taskbarDetails.untilOff";
  if (snapshot.nextTransitionMs > 0)
    lines.push(t(countdown, { time: duration(snapshot.nextTransitionMs) }));
  const overnight = isOvernightWorkConfig(config) ? t("taskbarDetails.nextDay") : "";
  lines.push(
    t("taskbarDetails.workTime", {
      start: config.startTime,
      end: `${overnight}${config.endTime}`,
    }),
  );
  if (config.enableLunchBreak)
    lines.push(
      t("taskbarDetails.lunch", { start: config.lunchStart, end: config.lunchEnd }),
    );
  if (snapshot.workMsToday > 0) {
    const secondRate = withCurrencySymbol(
      currencySymbol,
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
        useGrouping: false,
      }).format(snapshot.secondRate),
    );
    lines.push(
      t("taskbarDetails.rates", {
        hourly: money(snapshot.hourlyRate),
        second: secondRate,
      }),
    );
  }
  const mode =
    config.salaryType === "daily"
      ? "salaryMode.daily"
      : config.salaryType === "hourly"
        ? "salaryMode.hourly"
        : "salaryMode.monthly";
  const salary =
    config.salaryType === "daily"
      ? config.dailySalary
      : config.salaryType === "hourly"
        ? config.hourlyRate
        : config.monthlySalary;
  lines.push(t("taskbarDetails.salary", { mode: t(mode), amount: money(salary) }));
  if (config.calendarMode === "china") {
    const month = monthWorkCalendar(workDate, config);
    const schedule =
      config.workSchedule === "single"
        ? "calendar.single"
        : config.workSchedule === "alternating"
          ? "calendar.alternating"
          : "calendar.double";
    lines.push(
      t("taskbarDetails.month", {
        year: month.year,
        month: month.month,
        days: month.workDays,
        schedule: t(schedule),
        estimate: month.confirmed ? "" : t("taskbarDetails.estimate"),
      }),
    );
  } else if (config.salaryType === "monthly") {
    lines.push(t("taskbarDetails.manualDays", { days: config.workDaysPerMonth }));
  }
  return [...lines, hint].join("\n");
}
