// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

export const minTaskbarOffset = -2000;
export const maxTaskbarOffset = 2000;

export function normalizeTaskbarOffset(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maxTaskbarOffset, Math.max(minTaskbarOffset, Math.round(value)))
    : 0;
}
