// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { shallowReactive } from "vue";
import year2025 from "./data/2025.json";
import year2026 from "./data/2026.json";

export type HolidayDay = { date: string; name: string; isOffDay: boolean };
export type HolidayYear = { year: number; papers: string[]; days: HolidayDay[] };

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseCalendarDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localDateKey(date) === value ? date : undefined;
}

export function parseHolidayYear(value: unknown, year: number): HolidayYear | undefined {
  if (!value || typeof value !== "object") return;
  const data = value as Partial<HolidayYear>;
  if (
    data.year !== year ||
    !Array.isArray(data.days) ||
    data.days.length > 120 ||
    !Array.isArray(data.papers) ||
    !data.papers.length ||
    !data.papers.every(
      (url) => typeof url === "string" && /^https:\/\/([\w-]+\.)*gov\.cn\//.test(url),
    )
  )
    return;
  const dates = new Set<string>();
  for (const day of data.days) {
    if (
      !day ||
      typeof day.name !== "string" ||
      !day.name.trim() ||
      day.name.length > 80 ||
      typeof day.isOffDay !== "boolean" ||
      !parseCalendarDate(day.date) ||
      !day.date.startsWith(`${year}-`) ||
      dates.has(day.date)
    )
      return;
    dates.add(day.date);
  }
  // A partial or empty feed must never masquerade as a complete annual calendar.
  if (
    !["元旦", "春节", "清明", "劳动", "端午", "中秋", "国庆"].every((name) =>
      data.days!.some((day) => day.isOffDay && day.name.includes(name)),
    )
  )
    return;
  return { year, papers: [...data.papers], days: data.days.map((day) => ({ ...day })) };
}

const calendars = shallowReactive(
  new Map<number, HolidayYear>([
    [2025, year2025],
    [2026, year2026],
  ]),
);
const fetchedAt = new Map<number, number>();
const attemptedAt = new Map<number, number>();
const pending = new Map<number, Promise<boolean>>();
const loadedCache = new Set<number>();

export const getHolidayYear = (year: number) => calendars.get(year);

function loadCache(year: number) {
  if (loadedCache.has(year)) return;
  loadedCache.add(year);
  try {
    const cached = JSON.parse(
      localStorage.getItem(`paydance.holidays.${year}`) ?? "null",
    );
    const data = parseHolidayYear(cached?.data, year);
    if (data) {
      calendars.set(year, data);
      if (Number.isFinite(cached.fetchedAt)) fetchedAt.set(year, cached.fetchedAt);
    }
  } catch {
    /* Offline data remains available even if browser storage is disabled. */
  }
}

export function refreshHolidayYear(
  year: number,
  force = false,
  fetcher = globalThis.fetch,
): Promise<boolean> {
  if (!Number.isInteger(year) || year < 2000 || year > 2200)
    return Promise.resolve(false);
  loadCache(year);
  const active = pending.get(year);
  if (active) return active;
  const now = Date.now();
  if (
    !force &&
    (now - (fetchedAt.get(year) ?? 0) < 86_400_000 ||
      now - (attemptedAt.get(year) ?? 0) < 3_600_000)
  )
    return Promise.resolve(calendars.has(year));
  attemptedAt.set(year, now);
  const request = (async () => {
    for (const url of [
      `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`,
      `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`,
    ]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetcher(url, {
          signal: controller.signal,
          cache: "no-cache",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response.ok) continue;
        const text = await response.text();
        if (text.length > 100_000) continue;
        const data = parseHolidayYear(JSON.parse(text), year);
        if (!data) continue;
        calendars.set(year, data);
        fetchedAt.set(year, now);
        try {
          localStorage.setItem(
            `paydance.holidays.${year}`,
            JSON.stringify({ data, fetchedAt: now }),
          );
        } catch {
          /* Use the in-memory copy. */
        }
        return true;
      } catch {
        /* Try the second source, then keep the last valid local copy. */
      } finally {
        clearTimeout(timeout);
      }
    }
    return false;
  })().finally(() => pending.delete(year));
  pending.set(year, request);
  return request;
}
