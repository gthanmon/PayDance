// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { parseCalendarDate } from "./holidays";

export const calendarSettingValidators = {
  calendarMode: (value: unknown) => value === "manual" || value === "china",
  workSchedule: (value: unknown) =>
    value === "double" || value === "single" || value === "alternating",
  weeklyRestDay: (value: unknown) =>
    Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6,
  alternatingWeekAnchor: (value: unknown) => Boolean(parseCalendarDate(value)),
  alternatingAnchorIsSingle: (value: unknown) => typeof value === "boolean",
};
