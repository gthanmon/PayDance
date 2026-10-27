# 任务栏增强版：构建与升级

这是基于 [PayDance](https://github.com/MrBaoboer/PayDance) 修改的非官方分支，保留上游版权、许可和已有配置。完整改动见 [本次更新说明](UPDATES_2026-10-27.md)。

## 构建 Windows 便携版

需要 Node.js 24、Rust stable、Microsoft C++ Build Tools、Windows SDK 和 WebView2。

```powershell
npm install
npm run build:exe:enhanced
```

这个 npm 命令调用 `scripts/build-local.ps1`，最终通过 `npm run build:exe` 使用 Tauri 构建；如果项目中已有 `.tools` 便携 Rust 则复用，否则使用系统 Rust。

输出文件：

- `release-assets/PayDance.exe`
- `release-assets/PayDance.exe.sha256`

增强版构建设置 `VITE_PAYDANCE_LOCAL_BUILD=true`，关闭官方自动更新检查，并关闭官方 updater 签名产物生成，因此不需要上游发布私钥。原有 `npm run build:exe`、`npm run build:desktop`、`npm run build:web` 和开发命令继续保留；构建本分支交付的增强 EXE 请使用上面的专用命令。

## 使用与升级

1. 退出正在运行的旧版，并备份现有配置。
2. 使用新版可执行文件替换旧版，再启动程序。
3. 在设置中启用“任务栏金额 → 显示实时金额”，按需要调整显示位置。

本分支与上游共享应用标识及配置目录，因此不要同时运行两个版本。已有有效设置可以继续使用。

开机启动目前受固定安装位置限制，从其他目录运行时可能无法启用；相关要求以设置页提示为准。

## 使用任务栏金额

- 开启金额后，可点击“仅在任务栏显示”收起主窗口。金额成功挂载时不再显示额外托盘图标；关闭该功能或挂载失败时会提供托盘入口。
- 右键金额可打开主页面、设置，隐藏主窗口，切换迷你模式、置顶或退出程序。
- 鼠标悬停可查看收入、工作进度、倒计时、工作安排、薪资换算及工作日详情。
- 水平偏移支持向左或向右调整，修改后自动保存。

Explorer 重建任务栏后，程序会尝试恢复任务栏显示。不同任务栏布局下可通过水平偏移调整位置。

## 自动计算工作日

设置中的工作日计算可以在“手动”和“自动计算”之间切换。自动模式支持双休、单休和大小周；单休可指定每周休息日，大小周可指定基准周与单双周顺序。

节假日和调休安排优先于每周排班。内置 2025、2026 年数据，联网时从 `holiday-cn` 更新并缓存；无网络时继续使用已有数据。未知年份只能按周排班暂估，界面会明确标注，不能把暂估当作已确认的法定调休。来源与许可证见界面说明及 [第三方声明](../legal/THIRD_PARTY_NOTICES.md)。

## 验证

```powershell
npm test
npm run lint
npx vue-tsc --noEmit
cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test
```

任务栏集成测试中带 `ignored` 的项目需要实际 Windows 桌面及相应测试环境。请先查看 `src-tauri/tests/taskbar_native.rs` 中各测试的条件，再按需手动运行。

自动测试覆盖时间解析、工作日和收入计算、保存流程、启动策略及原生菜单结构；真实开机启动和实际桌面交互仍需实机验收。
