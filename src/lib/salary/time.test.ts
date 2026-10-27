// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import { dateAtMinutes, parseTimeToMinutes } from "./time";

describe("native time input compatibility", () => {
  it.each(["09:00", "09:00:00", "09:00:00.000"])("accepts %s", (value) => {
    expect(parseTimeToMinutes(value)).toBe(540);
  });

  it.each(["", "24:00", "09:60", "09:00:60", "09:00:99", "09:00:", "09:00:00junk"])(
    "rejects malformed or out-of-range time %s",
    (value) => expect(parseTimeToMinutes(value)).toBeNaN(),
  );

  it("preserves seconds and milliseconds when constructing a shift boundary", () => {
    const date = dateAtMinutes(new Date(2026, 9, 26), parseTimeToMinutes("09:01:30.125"));
    expect([
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ]).toEqual([9, 1, 30, 125]);
  });
});
