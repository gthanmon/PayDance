
<p align="center">
  <img src="src-tauri/icons/icon.png" alt="薪跳 PayDance" width="92">
</p>

<h1 align="center">PayDance 任务栏增强版</h1>

<p align="center">
  把「今天正在挣到的钱」放到桌面上，让每一秒的收入增长都看得见
</p>

<p align="center">
  <a href="https://paydance.vercel.app/"><strong>在线体验</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/MrBaoboer/PayDance/releases/latest"><strong>下载桌面版</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="docs/README_EN.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/MrBaoboer/PayDance/releases/latest"><img alt="最新版本" src="https://img.shields.io/github/v/release/MrBaoboer/PayDance?style=flat&label=release&labelColor=1F2328&color=F59E0B"></a>
  <a href="https://github.com/MrBaoboer/PayDance/releases"><img alt="下载量" src="https://img.shields.io/github/downloads/MrBaoboer/PayDance/total?style=flat&label=downloads&labelColor=1F2328&color=3D444D"></a>
  <a href="LICENSE"><img alt="许可" src="https://img.shields.io/badge/license-AGPL--3.0--only-3D444D?style=flat&labelColor=1F2328"></a>
</p>

---

> **非官方修改版本**：本仓库由 [gthanmon](https://github.com/gthanmon) 维护，基于 [MrBaoboer/PayDance](https://github.com/MrBaoboer/PayDance) 修改，保留原项目版权和 AGPL-3.0-only 许可。下方的官网、官方版本下载和历史更新记录属于上游项目。

## 本分支的新增与修复

- **任务栏实时工资**：在主屏幕的水平任务栏显示今日收入，可收起悬浮窗。成功显示后隐藏系统托盘图标，双击金额打开主页面，右键提供设置、隐藏窗口、迷你模式、置顶和退出菜单。
- **与 TrafficMonitor 配合**：金额放在监控软件左侧，使用微软雅黑 10 磅常规字体和紧凑间距；修复两个工具反复向左移动以及挂载任务栏时的 `1460` 超时问题。
- **自由调整位置**：水平偏移支持 `-2000` 到 `2000`，正数向左、负数向右，改动立即保存，重启后恢复。
- **悬停查看详情**：显示今日已赚、今日预计、工作进度、剩余时间、上下班与午休安排、折算时薪及工作日信息。
- **自动计算工作日**：支持双休、单休和大小周，结合中国法定节假日与调休安排计算当月上班天数。内置 2025、2026 年数据，联网更新后缓存；未知年份明确标记为暂估，仍可使用手动模式。
- **静默开机启动**：开机不弹主窗口；自启固定指向 `C:\Program Files\paydance\PayDance.exe`，迁移旧启动项，后续覆盖同名文件即可更新。
- **时间输入兼容**：修复 Windows 时间控件含秒时误报“上班时间错误”，支持 `HH:mm`、`HH:mm:ss` 及毫秒格式。

完整说明见 [2026-10-27 更新说明](docs/UPDATES_2026-10-27.md)、[更新日志](CHANGELOG.md) 和 [增强版构建与升级指南](docs/LOCAL_BUILD.md)。

### 构建本分支的 Windows 便携版

安装 Node.js 24、Rust stable、Microsoft C++ Build Tools、Windows SDK 和 WebView2 后运行：

```powershell
npm install
npm run build:exe:enhanced
```

输出为 `release-assets/PayDance.exe` 和对应的 SHA256 文件。该构建关闭官方自动更新检查，以保留本分支功能；升级步骤与兼容性边界见构建指南。

---

## 它是什么

薪跳 PayDance 是一款桌面实时工资看板。配置薪资与上下班时间后，它会在桌面实时显示每一秒的收入增长，让劳动时间价值变得可视化。

主窗口展示今日入账、工作进度、剩余时间和今日预计；迷你悬浮窗只保留金额数字，适合放在屏幕角落随时扫一眼。

<p align="center">
  <img src="docs/posters/poster-02-three-step-setup-v3.png" alt="薪跳 PayDance 首次配置三步上手" width="100%">
</p>

## 主要功能

- **实时金额**：今日入账持续更新，精确到小数点后 2 位。
- **常见工作制**：月薪/日薪/时薪自动换算，支持每周工作日、午休剔除、跨零点夜班。
- **迷你悬浮窗**：只显示金额，可拖拽、可置顶，透明度 10%–100% 可调；双击即可恢复主窗口。
- **本地优先**：不需要账号，薪资配置只保存在你自己的电脑上。
- **中英双语**：界面、托盘、校验提示完整覆盖简体中文与 English。
- **Windows 桌面能力**：支持亮暗主题、托盘常驻、开机自启动、后台更新。

## 获取

<div align="center">

| &nbsp; | 入口 | 说明 |
|:---:|:---:|:---:|
| 🌐 | **[在线体验](https://paydance.vercel.app/)** | 网页端，含所有核心功能，打开即用，无需下载 |
| ⬇️ | **[Windows 桌面版](https://paydance.vercel.app/download/windows)** | 便携 EXE，含托盘、置顶、迷你悬浮、开机自启动等完整能力 |

</div>

Release 页面同时提供 SHA256 校验文件，下载后可验证完整性。

## 技术栈

<div align="center">

| 层级 | 技术 |
|:---:|:---:|
| 桌面壳 | Tauri 2 + Rust |
| 前端 | Vue 3 + TypeScript + Vite |
| UI | Windows 11 风格、CSS Container Queries、Lucide Icons |
| 存储 | 本机应用数据目录（Tauri Store）/ 浏览器 localStorage |
| 测试 | Vitest + Rust 单元测试 + vue-tsc + cargo clippy |

</div>

Web Preview 与桌面端共享核心薪资逻辑和前端界面。

## 开发

**安装依赖**

```powershell
npm install
```

**桌面应用**

```powershell
npm run tauri dev
```

**Web Preview**

```powershell
npm run dev:web
```

**构建 Windows 便携版**

```powershell
npm run build:exe
```

**构建网页体验版**

```powershell
npm run build:web
```

**重置本地配置，重新进入首次启动向导**

```powershell
Remove-Item "$env:APPDATA\com.masterbao.paydance\salary-settings.json"
```

详细的提交规范、验证命令和贡献方向请参阅 [贡献指南](.github/CONTRIBUTING.md)。

## 隐私

薪跳不需要登录，不上传数据，不包含遥测。所有配置通过 Tauri Store 保存在本机 `salary-settings.json` 中，内容仅包括薪资参数、工作时间和界面偏好。

## 相关文档

- [常见问题](docs/FAQ.md)
- [架构与修改导航](docs/ARCHITECTURE.md)
- [产品定位与边界](docs/PRODUCT.md)
- [路线图](docs/ROADMAP.md)
- [更新日志](CHANGELOG.md)

## 许可

薪跳 PayDance 由 Mr.Baoboer 设计与开发，代码以 [AGPL-3.0-only](LICENSE) 发布。

完整许可信息与商标政策请参阅 [许可导引](legal/LEGAL.md)。

---

> [English version →](docs/README_EN.md)
