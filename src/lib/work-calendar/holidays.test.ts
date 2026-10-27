// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import data2026 from "./data/2026.json";

const response = (data: unknown) =>
  ({ ok: true, text: async () => JSON.stringify(data) }) as Response;

describe("holiday data updates", () => {
  beforeEach(() => {
    vi.resetModules();
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("rejects incomplete, mismatched, duplicate, and invalid date data", async () => {
    const { parseHolidayYear } = await import("./holidays");
    expect(parseHolidayYear(data2026, 2026)).toEqual({
      year: 2026,
      papers: data2026.papers,
      days: data2026.days,
    });
    expect(parseHolidayYear(data2026, 2027)).toBeUndefined();
    expect(parseHolidayYear({ ...data2026, days: [] }, 2026)).toBeUndefined();
    expect(
      parseHolidayYear({ ...data2026, days: [...data2026.days, data2026.days[0]] }, 2026),
    ).toBeUndefined();
    expect(
      parseHolidayYear(
        {
          ...data2026,
          days: [{ ...data2026.days[0], date: "2026-02-30" }, ...data2026.days.slice(1)],
        },
        2026,
      ),
    ).toBeUndefined();
    expect(
      parseHolidayYear({ ...data2026, papers: ["https://example.com/notice"] }, 2026),
    ).toBeUndefined();
  });

  it("keeps bundled data offline and never marks a missing year as confirmed", async () => {
    const { getHolidayYear, refreshHolidayYear } = await import("./holidays");
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await refreshHolidayYear(2026, true, fetcher)).toBe(false);
    expect(getHolidayYear(2026)?.days).toEqual(data2026.days);
    expect(await refreshHolidayYear(2028, true, fetcher)).toBe(false);
    expect(getHolidayYear(2028)).toBeUndefined();
  });

  it("deduplicates requests, caches a complete year and restores it without a network request", async () => {
    const { refreshHolidayYear } = await import("./holidays");
    const fetcher = vi.fn().mockResolvedValue(response(data2026));
    const first = refreshHolidayYear(2026, true, fetcher);
    const second = refreshHolidayYear(2026, true, fetcher);
    expect(first).toBe(second);
    expect(await first).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.resetModules();
    const reloaded = await import("./holidays");
    const offline = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await reloaded.refreshHolidayYear(2026, false, offline)).toBe(true);
    expect(offline).not.toHaveBeenCalled();
  });

  it("falls back to the second source and does not replace valid data with a partial feed", async () => {
    const { refreshHolidayYear, getHolidayYear } = await import("./holidays");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response({ ...data2026, days: [] }))
      .mockResolvedValueOnce(response(data2026));
    expect(await refreshHolidayYear(2026, true, fetcher)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(getHolidayYear(2026)?.days).toEqual(data2026.days);
  });

  it("times out both sources and keeps the local copy", async () => {
    vi.useFakeTimers();
    const { refreshHolidayYear, getHolidayYear } = await import("./holidays");
    const fetcher = vi.fn(
      (_url, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => reject(new Error("timeout")));
        }),
    );
    const request = refreshHolidayYear(2026, true, fetcher as typeof fetch);
    await vi.advanceTimersByTimeAsync(10_100);
    expect(await request).toBe(false);
    expect(getHolidayYear(2026)).toBeDefined();
  });
});
