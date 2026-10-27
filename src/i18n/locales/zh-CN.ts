// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import type { Messages } from "../types";

const zhCN: Messages = {
  // ── Dashboard ───────────────────────────────────────────────────────────
  "dashboard.todayEarnings": "今日入账",
  "dashboard.tapToMini": "今日入账 {amount}，双击或按 Enter 进入迷你悬浮模式",
  "dashboard.doubleClickMini": "双击进入迷你悬浮模式",
  "dashboard.statsLabel": "今日收入看板",
  "dashboard.salaryInfo": "薪资说明",

  // ── Salary info sheet ──────────────────────────────────────────────────
  "salaryInfo.title": "薪资说明",
  "salaryInfo.close": "关闭薪资说明",
  "salaryInfo.dailyRate": "日薪",
  "salaryInfo.hourlyRate": "时薪",
  "salaryInfo.minuteRate": "分薪",
  "salaryInfo.secondRate": "秒薪",
  "salaryInfo.subtitleSuffix": "换算",

  // ── Status labels ──────────────────────────────────────────────────────
  "status.invalidConfig": "配置待修正",
  "status.working": "正在上班",
  "status.nightWork": "正在夜班",
  "status.afterWork": "已下班",
  "status.nightWorkDone": "夜班已完成",
  "status.beforeWork": "未到上班",
  "status.lunchBreak": "午休中",
  "status.restDay": "今日休息",

  // ── Stats panel ────────────────────────────────────────────────────────
  "stats.worked": "已工作",
  "stats.estimated": "今日预计",
  "stats.untilWork": "距离上班",
  "stats.untilResume": "距离复工",
  "stats.todayDone": "今日完成",
  "stats.untilOff": "距离下班",
  "stats.progress": "今日进度",

  // ── Settings ────────────────────────────────────────────────────────────
  "settings.title": "设置",
  "settings.close": "关闭设置",
  "settings.salaryMode": "薪资模式",
  "settings.salary": "薪资",
  "settings.workdays": "每周工作日",
  "settings.workTime": "工作时间",
  "settings.amountAnimation": "金额变换",
  "settings.amountAnimationDesc": "金额数字变化方式",
  "settings.currency": "货币符号",
  "settings.startup": "启动",
  "settings.autostart": "开机自动启动",
  "taskbarDetails.title": "薪跳 · 收入详情",
  "taskbarDetails.date": "工作日期：{date}",
  "taskbarDetails.earned": "今日已赚：{amount}",
  "taskbarDetails.expected": "今日预计：{amount}",
  "taskbarDetails.status": "当前状态：{status}",
  "taskbarDetails.worked": "已工作：{elapsed} / {total}（{progress}%）",
  "taskbarDetails.untilWork": "距离上班：{time}",
  "taskbarDetails.untilResume": "距离午休结束：{time}",
  "taskbarDetails.untilOff": "距离下班：{time}",
  "taskbarDetails.nextDay": "次日 ",
  "taskbarDetails.workTime": "工作时间：{start} → {end}",
  "taskbarDetails.lunch": "剔除午休：{start} → {end}",
  "taskbarDetails.rates": "折算时薪：{hourly} · 秒薪：{second}",
  "taskbarDetails.salary": "薪资设置：{mode} {amount}",
  "taskbarDetails.month": "{year} 年 {month} 月工作日：{days} 天（{schedule}{estimate}）",
  "taskbarDetails.estimate": " · 暂估",
  "taskbarDetails.manualDays": "每月工作天数：{days} 天（手动）",
  "taskbarDetails.actions": "双击金额打开主页面 · 右键打开菜单",
  "settings.taskbarAmount": "任务栏金额",
  "settings.taskbarEnable": "显示实时金额",
  "settings.taskbarHint":
    "在主屏幕任务栏显示今日入账，并隐藏托盘图标。悬停查看收入详情，双击打开主页面，右键打开设置、退出等菜单。开机自启时静默显示。",
  "settings.taskbarOffset": "水平偏移（像素）",
  "settings.taskbarOffsetHint": "正数向左，负数向右，0 为默认位置。",
  "settings.taskbarOnly": "仅在任务栏显示",
  "settings.taskbarError": "任务栏显示失败：",
  "settings.language": "语言",
  "settings.onboarding": "首次启动向导",
  "settings.openOnboarding": "打开首次启动向导",
  "settings.saveFailed": "设置未能保存，请重试。",
  "settings.unsavedHint": "更改未保存，修正后自动保存。",
  "settings.loadFailed":
    "设置文件无法读取，当前使用默认值。若反复出现，请删除 salary-settings.json 后重新打开应用。",
  "settings.loadRecovered": "设置文件已损坏，已备份为 .bak 文件并恢复默认值。",

  // ── Settings → salary mode ─────────────────────────────────────────────
  "salaryMode.label": "薪资输入方式",
  "salaryMode.monthly": "月薪",
  "salaryMode.daily": "日薪",
  "salaryMode.hourly": "时薪",
  "salaryMode.monthlyLong": "月薪模式",
  "salaryMode.dailyLong": "日薪模式",
  "salaryMode.hourlyLong": "时薪模式",

  // ── Settings → salary amounts ──────────────────────────────────────────
  "calendar.heading": "工作日与节假日",
  "calendar.mode": "工作日计算方式",
  "calendar.manual": "手动设置",
  "calendar.automatic": "自动计算",
  "calendar.schedule": "休息制度",
  "calendar.double": "双休",
  "calendar.single": "单休",
  "calendar.alternating": "大小周",
  "calendar.restDay": "每周休息日",
  "calendar.weekday": "星期{day}",
  "calendar.thisWeek": "大小周顺序",
  "calendar.thisDouble": "本周双休（小周）",
  "calendar.thisSingle": "本周单休（大周）",
  "calendar.alternatingHint":
    "周一为一周起点，单双休逐周交替，跨月、跨年不重置。大小周默认周日休息。",
  "calendar.month": "{year} 年 {month} 月应上班",
  "calendar.confirmed": "已计入中国大陆法定放假与调休补班",
  "calendar.estimated": "年历尚未获取：仅按每周规则暂估，未计入法定放假和调休。",
  "calendar.breakdown": "本月法定放假 {holidays} 天 · 调休补班 {makeup} 天",
  "calendar.rule": "法定放假优先休息，调休补班优先上班；其余日期按所选制度计算。",
  "calendar.rateHint": "月薪按当月应上班天数折算，跨月自动更新。",
  "calendar.preview": "查看本月日历",
  "calendar.work": "班",
  "calendar.rest": "休",
  "calendar.makeup": "补班",
  "calendar.offline": "已知年历可离线使用",
  "calendar.refresh": "更新年历",
  "calendar.updating": "更新中…",
  "calendar.cachedAfterFailure": "联网更新失败，继续使用已保存的年历。",
  "calendar.unavailable":
    "暂时无法获取该年安排。当前为暂估，可稍后更新，或切回手动设置。",
  "calendar.source": "数据来源与许可",
  "calendar.officialNotice": "查看国务院放假通知",
  "calendar.autoDays": "本月工作天数（自动）",
  "validation.calendarOptions": "工作日自动计算选项无效",
  "salaryAmount.workDaysPerMonth": "每月工作天数",
  "salaryAmount.unitYuan": "元",
  "salaryAmount.unitDays": "天",
  "salaryAmount.monthlySalary": "月薪",
  "salaryAmount.dailySalary": "日薪",
  "salaryAmount.hourlyRate": "时薪",

  // ── Settings → work time ───────────────────────────────────────────────
  "workTime.start": "上班",
  "workTime.end": "下班",

  // ── Settings → lunch break ─────────────────────────────────────────────
  "lunchBreak.heading": "午休",
  "lunchBreak.toggle": "剔除午休",
  "lunchBreak.toggleOnboarding": "剔除午休",
  "lunchBreak.start": "开始",
  "lunchBreak.end": "结束",

  // ── Settings → workdays ────────────────────────────────────────────────
  "workdays.label": "每周工作日",
  "workdays.mon": "一",
  "workdays.tue": "二",
  "workdays.wed": "三",
  "workdays.thu": "四",
  "workdays.fri": "五",
  "workdays.sat": "六",
  "workdays.sun": "日",

  // ── Settings → amount mode ─────────────────────────────────────────────
  "amountMode.rolling": "滚动变换",
  "amountMode.plain": "直接变换",

  // ── Settings → currency symbol ─────────────────────────────────────────
  "currency.placeholder": "如 ¥ $ € £",
  "currency.hint": "留空即不显示货币符号，最多 4 个字符",

  // ── Settings → about footer ────────────────────────────────────────────
  "about.appVersion": "版本",
  "about.labelSeparator": "：",
  "about.appAuthor": "作者",
  "about.openRepo": "打开 GitHub 仓库",
  "about.repoError": "无法打开 GitHub 仓库，请稍后重试。",

  // ── Onboarding ─────────────────────────────────────────────────────────
  "onboarding.ariaLabel": "首次配置",
  "onboarding.stepSalaryMode": "薪资模式",
  "onboarding.stepWorkTime": "工作时间",
  "onboarding.stepPreferences": "使用偏好",
  "onboarding.back": "上一步",
  "onboarding.next": "下一步",
  "onboarding.start": "开始",

  // ── Onboarding → preferences ───────────────────────────────────────────
  "preferences.language": "语言",
  "preferences.theme": "主题",
  "preferences.light": "浅色",
  "preferences.dark": "深色",
  "preferences.autostart": "开机自动启动",

  // ── Title bar ──────────────────────────────────────────────────────────
  "titlebar.openSettings": "打开设置",
  "titlebar.settings": "设置",
  "titlebar.toggleMini": "切换迷你悬浮模式",
  "titlebar.miniMode": "迷你悬浮模式",
  "titlebar.switchToLight": "切换到浅色模式",
  "titlebar.switchToDark": "切换到深色模式",
  "titlebar.lightMode": "浅色模式",
  "titlebar.darkMode": "深色模式",
  "titlebar.cancelTop": "取消窗口置顶",
  "titlebar.alwaysOnTop": "窗口置顶",
  "titlebar.cancelTopTitle": "取消置顶",
  "titlebar.alwaysOnTopTitle": "窗口置顶",
  "titlebar.minimize": "最小化窗口",
  "titlebar.minimizeTitle": "最小化",
  "titlebar.closeToTray": "关闭到托盘",

  // ── Mini window ────────────────────────────────────────────────────────
  "mini.ariaLabel": "迷你悬浮金额 {amount}，按 Enter 恢复完整窗口，右键调整透明度",
  "mini.restoreTitle": "双击恢复完整窗口",

  // ── Mini opacity ──────────────────────────────────────────────────────
  "opacity.header": "透明度",
  "opacity.ariaLabel": "迷你悬浮透明度",

  // ── Validation ─────────────────────────────────────────────────────────
  "validation.salaryTypeError": "薪资模式错误",
  "validation.monthlyPositive": "月薪需大于 0",
  "validation.dailyPositive": "日薪需大于 0",
  "validation.hourlyPositive": "时薪需大于 0",
  "validation.workDaysPositive": "工作天数需大于 0",
  "validation.workDaysRange": "工作天数不能超过 31",
  "validation.workdaysMinOne": "至少选 1 天",
  "validation.workdaysError": "工作日错误",
  "validation.startTimeError": "上班时间错误",
  "validation.endTimeError": "下班时间错误",
  "validation.timeSameError": "时间不能相同",
  "validation.lunchStartError": "午休开始错误",
  "validation.lunchEndError": "午休结束错误",
  "validation.lunchSameError": "午休起止时间不能相同",
  "validation.nightLunchOutside": "夜班午休需在工时内",
  "validation.lunchOutside": "午休需在工时内",

  // ── Autostart ──────────────────────────────────────────────────────────
  "autostart.error": "自启动设置失败",

  // ── Updater ────────────────────────────────────────────────────────────
  "updater.newVersion": "发现新版本",
  "updater.downloading": "下载中…",
  "updater.failed": "更新失败",
  "updater.clickToDownload": "点击下载",
  "updater.retry": "点击重试",

  // ── Web Preview ────────────────────────────────────────────────────────
  "web.heroHeadline1": "看见每一秒的",
  "web.heroHeadline2": "收入跳动",
  "web.heroLead": "具象化你的劳动价值，专注工作，也看见回报",
  "web.downloadWindows": "下载 Windows 版",
  "web.downloadShort": "下载电脑版",
  "web.featureRealtime": "毫秒级更新",
  "web.featureRealtimeDesc": "今日收入实时跳动",
  "web.featureFocus": "安心专注",
  "web.featureFocusDesc": "轻量窗口，静默运行",
  "web.featurePrivacy": "隐私优先",
  "web.featurePrivacyDesc": "所有数据本地处理",
  "web.featureAriaLabel": "产品核心优势",
  "web.topbarAriaLabel": "产品信息",
  "web.versionLabel": "当前版本",
  "web.actionsAriaLabel": "网页端操作",
  "web.footerAriaLabel": "作者归属",
  "web.opacityLabel": "透明度",
  "web.opacityAriaLabel": "迷你悬浮透明度",
};

export default zhCN;
