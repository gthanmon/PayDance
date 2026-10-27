// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const parseTimeToMinutes = (time: string) => {
  // Native time inputs can return seconds even when their step is one minute.
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?$/.exec(time);
  if (!match) return Number.NaN;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0) + Number(match[4] ?? 0);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second >= 60) {
    return Number.NaN;
  }

  return hour * 60 + minute + second / 60;
};

export const normalizeWorkEnd = (start: number, end: number) =>
  end < start ? end + 24 * 60 : end;

export const normalizeTimeInsideWorkWindow = (value: number, workStart: number) =>
  value < workStart ? value + 24 * 60 : value;

export const normalizeBreakEnd = (breakStart: number, breakEnd: number) => {
  let normalizedEnd = breakEnd;

  while (normalizedEnd <= breakStart) {
    normalizedEnd += 24 * 60;
  }

  return normalizedEnd;
};

export const dateAtMinutes = (base: Date, minutes: number) => {
  const date = new Date(base);
  const milliseconds = Math.round(minutes * 60_000);
  date.setHours(
    Math.floor(milliseconds / 3_600_000),
    Math.floor(milliseconds / 60_000) % 60,
    Math.floor(milliseconds / 1_000) % 60,
    milliseconds % 1_000,
  );
  return date;
};

export const previousDate = (date: Date) => {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return previous;
};

export const startOfLocalDay = (date: Date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};
