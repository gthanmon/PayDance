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

## 首次安装或从旧版升级

1. 先退出旧版进程；旧版可从托盘退出，新版也可以右键任务栏金额选择“退出”。
2. 把新版复制为 `C:\Program Files\paydance\PayDance.exe`，覆盖旧的同名文件。写入 Program Files 时可能需要 Windows 管理员权限。
3. 从该固定位置运行一次。在设置中启用“任务栏金额 → 显示实时金额”。
4. 若已启用开机启动，新版会将已知旧启动项迁移到上述固定路径，并加上 `--autostart`。未启用过自启时仍保持关闭，可在设置里开启。
5. 以后升级重复退出、覆盖和运行步骤即可，不需要删除薪资配置。

本分支与上游使用相同的应用标识和 `%APPDATA%\com.masterbao.paydance\salary-settings.json`，方便继承有效配置；升级前可以备份这个文件。两个版本共用单实例标识，不应同时运行。尚未从固定安装位置运行时，程序会提示先安装再开启自启，避免绑定到临时下载文件。

## 使用任务栏金额

- 开启金额后，可点击“仅在任务栏显示”收起主窗口。金额成功挂载时不再显示额外托盘图标；关闭该功能或挂载失败时会提供托盘入口。
- 开机启动保持主窗口隐藏；手动运行 EXE 或双击任务栏金额会打开主页面。
- 右键金额可打开主页面、设置，隐藏主窗口，切换迷你模式、置顶或退出程序。
- 鼠标悬停可查看收入、工作进度、倒计时、工作安排、薪资换算及工作日详情。
- 水平偏移范围为 `-2000` 到 `2000`：正数向左，负数向右，`0` 为默认位置。修改立即保存，重启后恢复。

检测到 TrafficMonitor 时，金额自动排在其左侧；使用微软雅黑 10 磅常规字体，按实际文字宽度紧凑排列。挂载窗口采用先在本进程创建、再附着到 Explorer 的方式，避免跨进程创建超时；不会注入 Explorer。Explorer 重建任务栏后会尝试重新挂载。

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

任务栏集成测试中带 `ignored` 的项目需要实际 Windows 桌面、Explorer，以及相应的 PayDance/TrafficMonitor 进程。请先查看 `src-tauri/tests/taskbar_native.rs` 中各测试的条件；需要时再手动运行对应项目。

自动测试覆盖时间解析、工作日和收入计算、保存流程、启动策略及原生菜单结构；真实开机启动和实际桌面交互仍需实机验收。
