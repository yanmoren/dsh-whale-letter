### Repository
https://github.com/yanmoren/dsh-whale-letter

### One-line value
装上之后，你可以在独立页面给一个蓝发鲸鱼娘少女写信，2~8 小时后桌面弹出一封提醒，点开拆信封，读到牛皮信纸上带涂改痕迹的手写长信——全部由插件自带的本地 4B 模型离线生成。

### Category
Entertainment

### Install command
dsh plugin --profile web add github:yanmoren/dsh-whale-letter

（source-only 安装。插件同时提供 `dsh plugin --profile desktop add github:yanmoren/dsh-whale-letter` 供 DeepSeek Harness Desktop 桌面端使用。）

### Compatibility
DSH 0.1.x / 0.2.x，web 与 desktop profile 通用。平台：Windows 10/11 x64（提醒卡片用 Windows 自带 .NET WinForms，独立窗口用 Edge/Chrome 的 `--app` 模式；两者都找不到会退回默认浏览器）。Node 22+（dsh 自带）。web profile 需包含 `dsh-client-modules` 才能在设置页显示插件面板。

### License
MIT（仓库根目录 LICENSE；随包字体 SIL OFL 1.1、模型 Apache-2.0、llama.cpp MIT，明细见 LICENSES.md）

### Screenshots / demo
- 效果截图：https://github.com/yanmoren/dsh-whale-letter/blob/master/preview.png
- 信封态截图：https://github.com/yanmoren/dsh-whale-letter/blob/master/preview-envelope.png
- 不依赖 dsh 的静态效果预览（可直接打开）：https://github.com/yanmoren/dsh-whale-letter/blob/master/preview.html

### Notes
- **权限**：不读取任何凭据、不访问任何外部 API。唯一的网络行为是首次安装后执行 `python scripts/fetch_runtime.py` 下载公开的模型与 llama.cpp CPU 二进制（约 2.4 GB），完成后全程离线。
- **数据**：回信队列与配置全部落在用户自己的 `~/.dsh/whale-letter/`，不上传、不同步。
- **已知限制**：仓库因 GitHub 单文件 100 MB 上限不含模型与二进制，需先跑一次 `scripts/fetch_runtime.py`；模型缺失时插件自动降级为素材库生成回信，功能不中断。桌面提醒需要 dsh 在信到达那一刻处于运行状态（中途关闭不丢信，重启后自动补投）。
- **待补充**：npm 包尚未发布，因此暂未进入 DSH 内的 Plugin Hub（Plugin Hub 只收录可用单条 npm 命令安装的插件）；发布后会自动同步，无需重复提交。

### Pre-submission checklist
- [x] Repository is public
- [x] GitHub topic `dsh-plugin` added
- [x] README includes the install command
- [x] Plugin exports an `apply(ctx)` module
- [x] Repository root includes a `package.json`
