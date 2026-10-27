// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePlaywright } from "./resolve-playwright.mjs";

const { chromium } = resolvePlaywright();
const output = resolve(".tools/calendar-qa");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    timezoneId: "Asia/Shanghai",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://**/*", (route) => route.abort());
  await page.clock.setFixedTime(new Date("2026-10-26T12:00:00+08:00"));
  await page.addInitScript(() => {
    if (!localStorage.getItem("paydance-web-preview-settings"))
      localStorage.setItem(
        "paydance-web-preview-settings",
        JSON.stringify({
          settingsVersion: 5,
          locale: "zh-CN",
          hasCompletedOnboarding: true,
          themeMode: "light",
          config: {
            salaryType: "monthly",
            monthlySalary: 18000,
            dailySalary: 360,
            hourlyRate: 45,
            workDaysPerMonth: 22,
            workdays: [1, 2, 3, 4, 5],
            startTime: "09:00:00",
            endTime: "18:00:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            enableLunchBreak: true,
          },
        }),
      );
  });
  const url = process.env.PAYDANCE_QA_URL ?? "http://127.0.0.1:1423/PayDance/";
  await page.goto(url);
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  await page.getByRole("radio", { name: "自动计算", exact: true }).click();
  assert.equal(await page.locator(".calendar-summary strong").textContent(), "18天");
  const workDays = page.getByLabel("本月工作天数（自动）");
  assert.equal(await workDays.inputValue(), "18");
  assert.equal(await workDays.getAttribute("readonly"), "");
  await page.getByRole("radio", { name: "单休", exact: true }).click();
  assert.equal(await page.locator(".calendar-summary strong").textContent(), "21天");
  await page.getByRole("radio", { name: "大小周", exact: true }).click();
  await page.getByLabel("大小周顺序").selectOption("single");
  assert.equal(await page.locator(".calendar-summary strong").textContent(), "20天");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("paydance-web-preview-settings")).config
        .alternatingAnchorIsSingle === true,
  );
  await page.reload();
  await page.getByRole("button", { name: "打开设置", exact: true }).click();
  assert.equal(await page.getByLabel("大小周顺序").inputValue(), "single");
  assert.equal(await page.locator(".calendar-summary strong").textContent(), "20天");
  await page.getByText("查看本月日历", { exact: true }).click();
  assert.equal(await page.locator(".month-day").count(), 31);
  const overflow = await page
    .locator(".work-calendar")
    .evaluate((element) => element.scrollWidth > element.clientWidth);
  assert.equal(overflow, false, "work calendar must fit the settings card");

  // Expand only the screenshot fixture, so the whole shared component can be inspected.
  await page.locator(".work-calendar").evaluate((element) => {
    const stage = document.createElement("div");
    stage.id = "calendar-qa-stage";
    stage.className = "theme-light";
    Object.assign(stage.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "440px",
      padding: "22px",
      background: "var(--panel)",
      color: "var(--text)",
      zIndex: "10000",
    });
    const copy = element.cloneNode(true);
    const originalSelects = element.querySelectorAll("select");
    copy.querySelectorAll("select").forEach((select, index) => {
      select.value = originalSelects[index].value;
    });
    stage.appendChild(copy);
    document.body.appendChild(stage);
  });
  await page
    .locator("#calendar-qa-stage")
    .screenshot({ path: resolve(output, "calendar-light.png"), animations: "disabled" });
  await page.locator("#calendar-qa-stage").evaluate((element) => {
    element.className = "theme-dark";
  });
  await page
    .locator("#calendar-qa-stage")
    .screenshot({ path: resolve(output, "calendar-dark.png"), animations: "disabled" });
  assert.deepEqual(errors, []);
  console.log(
    "Work calendar browser QA passed: offline counts, schedule changes, persistence, calendar preview, no horizontal overflow or runtime errors.",
  );
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
}
