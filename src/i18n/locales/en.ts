// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import type { Messages } from "../types";

const en: Messages = {
  // ── Dashboard ───────────────────────────────────────────────────────────
  "dashboard.todayEarnings": "Today's Earnings",
  "dashboard.tapToMini":
    "Today's earnings {amount}. Double-click or press Enter to enter mini floating mode",
  "dashboard.doubleClickMini": "Double-click for mini floating mode",
  "dashboard.statsLabel": "Today's Dashboard",
  "dashboard.salaryInfo": "Salary Info",

  // ── Salary info sheet ──────────────────────────────────────────────────
  "salaryInfo.title": "Salary Info",
  "salaryInfo.close": "Close salary info",
  "salaryInfo.dailyRate": "Daily",
  "salaryInfo.hourlyRate": "Hourly",
  "salaryInfo.minuteRate": "Per Minute",
  "salaryInfo.secondRate": "Per Second",
  "salaryInfo.subtitleSuffix": "Breakdown",

  // ── Status labels ──────────────────────────────────────────────────────
  "status.invalidConfig": "Needs Setup",
  "status.working": "Working",
  "status.nightWork": "Night Shift",
  "status.afterWork": "Off Work",
  "status.nightWorkDone": "Night Done",
  "status.beforeWork": "Not Yet",
  "status.lunchBreak": "Lunch Break",
  "status.restDay": "Day Off",

  // ── Stats panel ────────────────────────────────────────────────────────
  "stats.worked": "Worked",
  "stats.estimated": "Est. Today",
  "stats.untilWork": "Until Work",
  "stats.untilResume": "Until Resume",
  "stats.todayDone": "Done",
  "stats.untilOff": "Until Off",
  "stats.progress": "Today's Progress",

  // ── Settings ────────────────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.close": "Close settings",
  "settings.salaryMode": "Salary Mode",
  "settings.salary": "Salary",
  "settings.workdays": "Workdays",
  "settings.workTime": "Work Hours",
  "settings.amountAnimation": "Animation",
  "settings.amountAnimationDesc": "Amount display animation",
  "settings.currency": "Currency symbol",
  "settings.startup": "Startup",
  "settings.autostart": "Launch at startup",
  "taskbarDetails.title": "PayDance · Earnings details",
  "taskbarDetails.date": "Work date: {date}",
  "taskbarDetails.earned": "Earned today: {amount}",
  "taskbarDetails.expected": "Expected today: {amount}",
  "taskbarDetails.status": "Status: {status}",
  "taskbarDetails.worked": "Time worked: {elapsed} / {total} ({progress}%)",
  "taskbarDetails.untilWork": "Until work: {time}",
  "taskbarDetails.untilResume": "Until break ends: {time}",
  "taskbarDetails.untilOff": "Until off work: {time}",
  "taskbarDetails.nextDay": "next day ",
  "taskbarDetails.workTime": "Work hours: {start} → {end}",
  "taskbarDetails.lunch": "Excluded break: {start} → {end}",
  "taskbarDetails.rates": "Hourly: {hourly} · Per second: {second}",
  "taskbarDetails.salary": "Pay setting: {mode} {amount}",
  "taskbarDetails.month": "{year}/{month} workdays: {days} ({schedule}{estimate})",
  "taskbarDetails.estimate": " · estimate",
  "taskbarDetails.manualDays": "Monthly workdays: {days} (manual)",
  "taskbarDetails.actions": "Double-click to open dashboard · Right-click for menu",
  "settings.taskbarAmount": "Taskbar amount",
  "settings.taskbarEnable": "Show live amount",
  "settings.taskbarHint":
    "Show today's earnings in the primary taskbar and hide the tray icon. Hover for details, double-click for the dashboard, or right-click for settings and quit. Autostart runs silently.",
  "settings.taskbarOffset": "Horizontal offset (pixels)",
  "settings.taskbarOffsetHint":
    "Positive moves left, negative moves right, and 0 restores the default position.",
  "settings.taskbarOnly": "Show in taskbar only",
  "settings.taskbarError": "Taskbar display failed:",
  "settings.language": "Language",
  "settings.onboarding": "First-time setup",
  "settings.openOnboarding": "Open first-time setup",
  "settings.saveFailed": "Settings could not be saved. Please try again.",
  "settings.unsavedHint": "Changes are not saved until this is fixed.",
  "settings.loadFailed":
    "Settings could not be read, so defaults are in use. If this keeps happening, delete salary-settings.json and reopen the app.",
  "settings.loadRecovered":
    "The settings file was unreadable. It was backed up as a .bak file and reset to defaults.",

  // ── Settings → salary mode ─────────────────────────────────────────────
  "salaryMode.label": "Salary type",
  "salaryMode.monthly": "Monthly",
  "salaryMode.daily": "Daily",
  "salaryMode.hourly": "Hourly",
  "salaryMode.monthlyLong": "Monthly Salary",
  "salaryMode.dailyLong": "Daily Wage",
  "salaryMode.hourlyLong": "Hourly Rate",

  // ── Settings → salary amounts ──────────────────────────────────────────
  "calendar.heading": "Workdays & holidays",
  "calendar.mode": "Workday calculation",
  "calendar.manual": "Manual",
  "calendar.automatic": "Automatic",
  "calendar.schedule": "Weekly schedule",
  "calendar.double": "Two days off",
  "calendar.single": "One day off",
  "calendar.alternating": "Alternating",
  "calendar.restDay": "Weekly day off",
  "calendar.weekday": "{day}",
  "calendar.thisWeek": "Alternating week order",
  "calendar.thisDouble": "Two days off this week",
  "calendar.thisSingle": "One day off this week",
  "calendar.alternatingHint":
    "Weeks start Monday and alternate continuously across months and years. Alternating schedules rest on Sundays.",
  "calendar.month": "Workdays in {year}/{month}",
  "calendar.confirmed": "Includes mainland China holidays and makeup workdays",
  "calendar.estimated":
    "Annual calendar unavailable: estimate based only on the weekly schedule, excluding holidays and makeup days.",
  "calendar.breakdown":
    "{holidays} official days off · {makeup} makeup workdays this month",
  "calendar.rule":
    "Official days off and makeup workdays override the selected weekly schedule.",
  "calendar.rateHint":
    "Monthly salary is divided by this month's workdays; the month updates automatically.",
  "calendar.preview": "View this month's calendar",
  "calendar.work": "Work",
  "calendar.rest": "Off",
  "calendar.makeup": "Makeup",
  "calendar.offline": "Saved calendars work offline",
  "calendar.refresh": "Update calendar",
  "calendar.updating": "Updating…",
  "calendar.cachedAfterFailure": "Update failed. Using the saved annual calendar.",
  "calendar.unavailable":
    "The annual calendar is unavailable. This is an estimate; retry later or switch to manual.",
  "calendar.source": "Data source & license",
  "calendar.officialNotice": "State Council holiday notice",
  "calendar.autoDays": "This month's workdays (auto)",
  "validation.calendarOptions": "Invalid automatic workday options",
  "salaryAmount.workDaysPerMonth": "Work days per month",
  "salaryAmount.unitYuan": "CNY",
  "salaryAmount.unitDays": "days",
  "salaryAmount.monthlySalary": "Monthly Salary",
  "salaryAmount.dailySalary": "Daily Wage",
  "salaryAmount.hourlyRate": "Hourly Rate",

  // ── Settings → work time ───────────────────────────────────────────────
  "workTime.start": "Start",
  "workTime.end": "End",

  // ── Settings → lunch break ─────────────────────────────────────────────
  "lunchBreak.heading": "Lunch Break",
  "lunchBreak.toggle": "Deduct lunch break",
  "lunchBreak.toggleOnboarding": "Deduct lunch break",
  "lunchBreak.start": "Start",
  "lunchBreak.end": "End",

  // ── Settings → workdays ────────────────────────────────────────────────
  "workdays.label": "Workdays",
  "workdays.mon": "Mon",
  "workdays.tue": "Tue",
  "workdays.wed": "Wed",
  "workdays.thu": "Thu",
  "workdays.fri": "Fri",
  "workdays.sat": "Sat",
  "workdays.sun": "Sun",

  // ── Settings → amount mode ─────────────────────────────────────────────
  "amountMode.rolling": "Rolling",
  "amountMode.plain": "Instant",

  // ── Settings → currency symbol ─────────────────────────────────────────
  "currency.placeholder": "e.g. ¥ $ € £",
  "currency.hint": "Leave empty to hide the symbol. Up to 4 characters.",

  // ── Settings → about footer ────────────────────────────────────────────
  "about.appVersion": "Version",
  "about.labelSeparator": ": ",
  "about.appAuthor": "Author",
  "about.openRepo": "Open GitHub repository",
  "about.repoError": "Unable to open GitHub repository. Please try again later.",

  // ── Onboarding ─────────────────────────────────────────────────────────
  "onboarding.ariaLabel": "First-Time Setup",
  "onboarding.stepSalaryMode": "Salary Mode",
  "onboarding.stepWorkTime": "Work Hours",
  "onboarding.stepPreferences": "Preferences",
  "onboarding.back": "Back",
  "onboarding.next": "Next",
  "onboarding.start": "Start",

  // ── Onboarding → preferences ───────────────────────────────────────────
  "preferences.language": "Language",
  "preferences.theme": "Theme",
  "preferences.light": "Light",
  "preferences.dark": "Dark",
  "preferences.autostart": "Launch at startup",

  // ── Title bar ──────────────────────────────────────────────────────────
  "titlebar.openSettings": "Open settings",
  "titlebar.settings": "Settings",
  "titlebar.toggleMini": "Toggle mini floating mode",
  "titlebar.miniMode": "Mini floating mode",
  "titlebar.switchToLight": "Switch to light mode",
  "titlebar.switchToDark": "Switch to dark mode",
  "titlebar.lightMode": "Light mode",
  "titlebar.darkMode": "Dark mode",
  "titlebar.cancelTop": "Cancel always on top",
  "titlebar.alwaysOnTop": "Always on top",
  "titlebar.cancelTopTitle": "Cancel top",
  "titlebar.alwaysOnTopTitle": "Always on top",
  "titlebar.minimize": "Minimize window",
  "titlebar.minimizeTitle": "Minimize",
  "titlebar.closeToTray": "Close to tray",

  // ── Mini window ────────────────────────────────────────────────────────
  "mini.ariaLabel":
    "Mini floating amount {amount}. Press Enter to restore full window. Right-click for transparency.",
  "mini.restoreTitle": "Double-click to restore",

  // ── Mini opacity ──────────────────────────────────────────────────────
  "opacity.header": "Opacity",
  "opacity.ariaLabel": "Mini floating window opacity",

  // ── Validation ─────────────────────────────────────────────────────────
  "validation.salaryTypeError": "Invalid salary type",
  "validation.monthlyPositive": "Monthly salary must be greater than 0",
  "validation.dailyPositive": "Daily wage must be greater than 0",
  "validation.hourlyPositive": "Hourly rate must be greater than 0",
  "validation.workDaysPositive": "Work days must be greater than 0",
  "validation.workDaysRange": "Work days cannot exceed 31",
  "validation.workdaysMinOne": "Select at least 1 workday",
  "validation.workdaysError": "Invalid workday selection",
  "validation.startTimeError": "Invalid start time",
  "validation.endTimeError": "Invalid end time",
  "validation.timeSameError": "Start and end times cannot be the same",
  "validation.lunchStartError": "Invalid lunch start time",
  "validation.lunchEndError": "Invalid lunch end time",
  "validation.lunchSameError": "Lunch start and end times cannot be the same",
  "validation.nightLunchOutside": "Night shift lunch break must fall within work hours",
  "validation.lunchOutside": "Lunch break must fall within work hours",

  // ── Autostart ──────────────────────────────────────────────────────────
  "autostart.error": "Failed to update autostart setting",

  // ── Updater ────────────────────────────────────────────────────────────
  "updater.newVersion": "New version available",
  "updater.downloading": "Downloading…",
  "updater.failed": "Update failed",
  "updater.clickToDownload": "Click to download",
  "updater.retry": "Click to retry",

  // ── Web Preview ────────────────────────────────────────────────────────
  "web.heroHeadline1": "See Your Pay",
  "web.heroHeadline2": "Tick Up Live",
  "web.heroLead": "A wage board that tracks today’s earnings.",
  "web.downloadWindows": "Download for Windows",
  "web.downloadShort": "Desktop",
  "web.featureRealtime": "Today’s Pay",
  "web.featureRealtimeDesc": "Ticks up as you work",
  "web.featureFocus": "Mini Window",
  "web.featureFocusDesc": "Made for the corner",
  "web.featurePrivacy": "Local Data",
  "web.featurePrivacyDesc": "Saved on this device",
  "web.featureAriaLabel": "Key features",
  "web.topbarAriaLabel": "Product info",
  "web.versionLabel": "Current version",
  "web.actionsAriaLabel": "Actions",
  "web.footerAriaLabel": "Attribution",
  "web.opacityLabel": "Opacity",
  "web.opacityAriaLabel": "Mini floating window opacity",
};

export default en;
