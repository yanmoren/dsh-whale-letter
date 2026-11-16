# 鲸鲸信箱 · dsh-whale-letter

一个 DeepSeek Harness 插件。在独立页面寄一封信，**2 到 8 小时后**桌面弹提醒，点开是一个信封；拆开后是带纸张纤维、手写字体与墨迹微晕的长信。回信由**插件自带的本地 4B 模型**生成，全程离线，不需要 Ollama、Python、额外运行时，也不联网。

## 需求对照

| 要求 | 实现 |
| --- | --- |
| dsh 上使用的插件 | 纯 JS bundle，`cordis.patch.yml` 注入 Host 半侧 + `lib/client.js` 设置页面板 |
| 本地跑 AI、打包运行环境、不依赖任何软件 | `lib/runtime/` 内含 `Qwen3-4B-Q4_K_M.gguf`（2.33 GiB）+ `llama/llama-server.exe` 与全部 CPU DLL（42 MB）；Node 按需起停，不常驻内存 |
| 不论配置如何都要很久才出结果 | 等待时长由 `pickDelayMs()` 随机取 2~8 小时，与 CPU/GPU/内存/来信内容完全无关；生成在等待期内后台完成，到点才投递 |
| 桌面弹消息提醒，点开是一封信 | 到点弹右下角提醒卡片（Windows 自带 .NET WinForms），点「拆开看看」用 Edge/Chrome 的 `--app` 模式开独立无边框窗口；可选叠加系统 toast |
| 打开信封后是信纸质感、能看到纤维 | 深色信箱窗口里嵌一张牛皮纸信纸，`feTurbulence` 纤维层 + 十字折痕 + 翻角 + 墨迹晕开；邮票只在信封上 |
| 手写字体、墨水微微晕开 | 打包 SIL OFL 的「马善政毛笔楷书」；`feDisplacementMap + feGaussianBlur` 墨晕滤镜 + 双层文字模糊光晕 |
| 不论写什么都不能回复太短 | `sanitizeLetter()` 强制补足到 ≥500 汉字、≥6 段，模型再短也会补 |
| 不提任何工作有关，只回文字 | 系统提示 + 后处理双保险：工作字眼命中即整句换成家常句，最终硬检查不通过就整封重写；剥离 Markdown / 代码块 / 表情 / thinking 段 |
| 往工作上引就撇开话题 | 来信含费神字眼时，回信只把话头轻轻拐到窗台、白饭、天气上，不复述不评价 |
| 可以问生活家常 | 结尾强制追加 1~2 个关于吃饭、被子、天气、汤、猫、散步的小问题 |
| 蓝发鲸鱼娘少女，爱大白饭，爱摸鱼偷懒，说话可爱 | `lib/persona.js` 的 `PERSONA_SYSTEM` 与十段生活素材 |

## 安装

Windows，Node 22+（dsh 自带），dsh 0.1.x / 0.2.x 均可。项目路径含中文没问题，运行时脚本统一生成在 `~/.dsh/whale-letter/bin/`（纯 ASCII 路径）。

```bash
# 从 GitHub 安装（会 clone 仓库）
dsh plugin --profile web add github:yanmoren/dsh-whale-letter

# DeepSeek Harness Desktop 桌面端用 desktop profile
dsh plugin --profile desktop add github:yanmoren/dsh-whale-letter
```

装完**重启 dsh**。

### 补下运行环境（必做）

GitHub 仓库**不含** 2.4 GB 的模型与 llama 二进制（GitHub 单文件上限 100 MB），安装后先补一次：

```bash
cd <插件安装目录>
python scripts/fetch_runtime.py
```

脚本会下载 `Qwen3-4B-Q4_K_M.gguf`（2.33 GiB，Apache-2.0）与 llama.cpp CPU 二进制（42 MB）到 `lib/runtime/`。全部来自公开源，不需账号。

不想用 Python 也行——直接用浏览器下载后放进 `lib/runtime/` 即可，目录结构见 `LICENSES.md`。若始终缺模型，插件会降级为素材库生成回信，功能不中断，只是文笔变模板化。

### 本地开发安装

```bash
# link: 方式，不会把 2.4 GB 复制到 C 盘
dsh plugin --profile desktop add link:E:\临时文件\dsh-whale-letter
```

dsh 命令不在 PATH 时，手动改 `~/.dsh/profiles/<profile>/package.json`：

```json
{
  "dependencies": { "dsh-whale-letter": "link:E:/临时文件/dsh-whale-letter" },
  "dsh": { "profile": { "bundles": [ "...原有项...", "dsh-whale-letter" ] } }
}
```

装好后：

- 独立寄信页：`http://127.0.0.1:3080/whale-letter/write`
- dsh 页面右下角有「B SIDE · 鲸鲸信箱」入口
- 设置页多出「鲸鲸信箱」面板（状态、入口、快速验收）
- 拆信页：`http://127.0.0.1:3080/whale-letter/read?latest=1`

端口非 3080 时插件会自动探测 webServer 端口；也可改 `~/.dsh/whale-letter/config.json` 的 `port`。

## 使用

1. 打开寄信页，写信，点「封好，寄出去」。
2. 页面提示「2 到 8 小时之间慢慢送到」。信先入队，后台启动本地模型写回信。
3. 到点时桌面右下角弹提醒卡片，点「拆开看看」→ 独立窗口里出现信封。
4. 点信封 → 封盖翻开、信纸抽出、逐段墨迹浮现。

**要看到提醒，dsh 需在到点时处于运行状态**。中途关掉 dsh 不会丢信：队列落在 `~/.dsh/whale-letter/letters.json`，重启后 `startup tick` 会补投过期的信。

想立刻看效果：寄信页点「快速验收一封」，或设置面板同款按钮。它走 `/api/instant`（跳过等待、用本地素材生成），只用于视觉验收。

## 视觉风格

参照米哈游《BSide: Olivia Lin》信箱界面（Steam 商店官方截图）：

- 深色炭黑浮层窗口，浮在纯 CSS 生成的黄昏窗景上：暖橙夕照、深墨绿室内、模糊光斑与窗框，无外部图片、无联网素材
- 左侧信件列表（标题 + 等宽日期 + 选中态暖橙细线），底部「给鲸鲸写信 / 写信」
- 右侧阅读区：顶部细日期与标题，「下载 / 收好这封信」两枚低饱和胶囊；信纸是一张微微倾斜的牛皮纸，带十字折痕、右下翻角与纸内日期，无横线。邮票与邮戳只贴在信封右上角
- 正文用 Long Cang 龙藏体行书手写字体，落款用马善政毛笔楷书；墨色有轻微晕开
- 展示层会随机挑几个常用字写错，划掉后在旁边补写正确字（带浅色修正底），偶尔留下墨团涂黑；回信正文字段本身保持纯文字不变
- 长信按每页两段分页，左右「上一张 / 下一张」按钮触发整张信纸滑出滑入的换纸动画，底部显示页码，不再上下滚动
- 细体小字、大量留白、细分隔线，无 emoji、无高饱和色；信封拆开动效轻而慢
- 桌面提醒卡片与 dsh 页面入口同步换成深色 + 暖橙细线

保留的硬要求：纸张纤维、手写字体、墨水微晕、拆信封仪式、鲸鱼娘可爱口吻、只回纯文字长信。人设与回信规则未改动。

`scripts/make_preview.py` 会从 `lib/letter.css` 与 `lib/read.html` 重新生成自包含的 `preview.html`，改完样式跑一次即可同步静态预览。

## 验收

```bash
cd <插件目录>
node test/smoke.mjs          # 纯函数契约 + 硬约束 + 产物自检（43 项）
node test/host-smoke.mjs     # mock host 走真实 HTTP 路由与队列（18 项）
node test/infer-probe.mjs    # 真实跑一次本地 4B 模型（约 8 秒）
```

实测结果：三套全通过；`infer-probe` 返回 `SOURCE model`、8.3 秒、`ERROR null`、572 汉字；来信含「加班/项目」时输出自动撇开话题并补足长信。三个 PowerShell 通知脚本经语法解析无错误。

根目录 `preview.html` 是不依赖 dsh 的静态效果预览，双击即可看信封、纸张纤维与墨晕（`?open=1` 可直接展开）；`preview.png` 是效果截图。

## 目录

```
lib/
  index.js          Host 半侧：路由、队列、定时器、通知、入口注入
  client.js         dsh 设置页面板（ModuleLoader bundle）
  contract.js       共享纯函数：等待时长、队列状态、字数
  persona.js        人设 prompt、内容硬约束、生活素材、撇开话题
  infer.js          按需起停 llama-server + OpenAI 兼容接口
  notify.js         WinForms 提醒卡片 + Edge --app 独立窗口 + 系统 toast
  letter.css        信纸/纤维/墨晕/信封 3D
  letter.js         寄信页与拆信页逻辑
  write.html        独立寄信页面
  read.html         信封阅读页面
  assets/           手写字体 + OFL 许可证
  runtime/          4B GGUF 模型 + llama.cpp CPU 二进制（打包的运行环境）
scripts/fetch_runtime.py      丢文件或换机器时一键补下
scripts/make_preview.py       由真实样式重新生成静态预览页
test/                         契约测试与推理探针
```

## 配置（`~/.dsh/whale-letter/config.json`）

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `port` | 自动探测 / 3080 | dsh Web 服务端口，用于拼拆信窗口 URL |
| `inferencePort` | 18081 | 本地 llama-server 端口 |
| `notifyMode` | `card` | `card` 提醒卡片 / `toast` 系统通知 / `both` 两个都弹 |
| `tickMs` | 30000 | 队列轮询间隔 |
| `allowInstant` | true | 是否允许跳过等待的快速验收 |

## 故障排查

- **信使歇脚**（本地模型缺失）：设置页显示「歇脚 · 鲸鲸手写」，左下角显示「信使歇脚 · 鲸鲸手写」。跑 `python scripts/fetch_runtime.py` 补下；缺文件时回信自动用素材库生成，功能不中断。
- **没弹提醒**：确认 dsh 在到点那一刻运行；检查 `~/.dsh/whale-letter/letters.json` 里 `status` 是否变成 `delivered`。也可在寄信页点「快速验收一封」验证提醒链路。
- **独立窗口没出来**：`~/.dsh/whale-letter/bin/open.ps1` 会依次找 Edge / Chrome，都找不到就退回默认浏览器打开普通标签。
- **端口不对**：改 `config.json` 的 `port` 后重启 dsh。
- **回信太像模板**：`lib/persona.js` 的 `LIFE_PARAGRAPHS` 与 `PERSONA_SYSTEM` 可直接编辑；改完无需重建。

## 许可

插件自身代码 MIT（见 `LICENSE`）。随包第三方组件各自授权：字体 SIL OFL 1.1，模型 Apache-2.0，llama.cpp MIT，清单见 `LICENSES.md`。
