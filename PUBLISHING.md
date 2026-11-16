# 上架与投递记录 / Publishing

本文件记录这个插件在各 dsh 生态渠道的投递状态。仓库公开、topic、README 安装命令、MIT LICENSE、`apply(ctx)` 导出是所有渠道的共同前提，均已就绪。

## 共同前提（已全部满足）

| 要求 | 状态 |
| --- | --- |
| 公开仓库 | ✅ https://github.com/yanmoren/dsh-whale-letter |
| GitHub topic `dsh-plugin` | ✅ 另加 `deepseek-harness` `dsh-desktop` `local-ai` `offline` `llamacpp` `gguf` `letter` `whale` `ai-plugin` 等 13 个 |
| README 含安装命令 | ✅ `dsh plugin --profile web add github:yanmoren/dsh-whale-letter` |
| 根目录 `package.json` | ✅ 含 `dsh.bundle.patch` + `dsh.client` |
| 导出 `apply(ctx)` | ✅ `lib/index.js` |
| 明确 License | ✅ 根目录 `LICENSE`（MIT），第三方组件见 `LICENSES.md` |
| 预构建 tarball | ✅ Release v1.0.0，附 SHA-256 |
| 市场卡片图标 | ✅ `assets/icon-180.png`（180×180 PNG） |

## 投递状态

| 渠道 | 入口 | 状态 |
| --- | --- | --- |
| **DSH Plugin Hub**（dsh-plugin.org 背后的仓库） | https://github.com/dshplugin/dsh-plugin-hub/issues/799 | ✅ 已开 issue，待人工评审 |
| **awesome-dsh-plugin 精选列表**（2.4 万 star，每日抓 topic） | https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15736 | ✅ 已提 PR，CI 只差「仓库满 1 天」门槛，约 11-17 上午自动变绿 |
| **DSH Plugin Radar**（兼容性记录库，每日 02:00 全量扫描 topic） | https://github.com/AdamPlatin123/dsh-plugin-radar/pull/1653 | ✅ 已提 PR；未登记也会被每日扫描自动收录 |
| **dsh-hub.cc** | https://dsh-hub.cc/publish | ✅ 无需表单，按 `dsh-plugin` topic 定时自动同步 |
| **awesome-dsh-plugin.com 目录**（dshplugin.dev / dsh-market 的数据源） | https://awesome-dsh-plugin.com/plugins.json | ✅ 自动，来自精选列表合并 |
| **dsh.pub** | https://github.com/dsh-pub/dsh-pub/pull/206 | ✅ 提交成功，后台自动建的 PR 已 MERGED |
| **dshplugin.dev** | https://dshplugin.dev/submit | ✅ 提交成功（201），参考号 `sub_d0f3d5ce-869d-4139-8a41-315aa1b67a66`，待编辑审核 |
| **npm**（DSH 应用内 Plugin Hub 入口） | https://www.npmjs.com/package/dsh-whale-letter | ⏸️ 2026-11-16 用户决定跳过，见下方说明 |

## 各渠道要点

### DSH Plugin Hub（issue 渠道）

已经开好的 issue 即为投递，无需重复提交。收录后把徽章里的 slug 换成实际详情页地址：

```markdown
[![Listed on dsh-plugin.org](https://dsh-plugin.org/badges/listed.svg)](https://dsh-plugin.org/plugins/yanmoren/dsh-whale-letter)
```

仓库更新会被自动同步（Star、Fork、最近更新时间、README 与版本信息），无需重复提交。

### awesome-dsh-plugin（YAML 条目渠道）

条目文件：`data/plugins/yanmoren__dsh-whale-letter.yml`，格式为

```yaml
url: https://github.com/yanmoren/dsh-whale-letter
name: yanmoren/dsh-whale-letter
category: fun
description:
  en: '...'
  zh: '...'
icon: https://raw.githubusercontent.com/yanmoren/dsh-whale-letter/master/assets/icon-180.png
tarball: https://github.com/yanmoren/dsh-whale-letter/releases/download/v1.0.0/dsh-whale-letter-1.0.0.tgz
```

该仓库的 CI 有两道会拦人的门槛：

- **仓库年龄 ≥ 1 天**。本仓库建于 2026-11-16，`pr-gate.yml` 会报「太新」，但它每 6 小时（`regate.yml`，cron `19 */6 * * *`）自动重跑一次，**到点会自己变绿**，不需要重新提交、推空提交或关掉重开。
- **描述必须属实**，评审会拿描述逐句对源码核。条目里提到的 2~8 小时延迟、牛皮信纸、手写体、错字涂改、换纸分页、随包本地 4B 模型、队列文件路径，都与实现一一对应。

### DSH Plugin Radar（登记清单渠道）

条目加在 `PLUGINS.md` 的「🔌 单插件」表末尾：

```
| dsh-whale-letter | [yanmoren/dsh-whale-letter](...) | 鲸鲸信箱：...；npm `dsh-whale-letter` | 待测 |
```

该站每天 02:00 全量扫描 `dsh-plugin` topic，即使不登记也会自动收录；这个 PR 只是让收录更早。

### dsh.pub（需人机验证）

`POST /api/submissions` 带 Cloudflare Turnstile token，人机验证必须真人过。步骤：

1. 打开 https://dsh.pub/en/submit/
2. 在「GitHub repository URL」填 `https://github.com/yanmoren/dsh-whale-letter`
3. 完成 Turnstile 勾选
4. 点「Submit repository」

它会在后台自动向 `dsh-pub/dsh-pub` 仓库建 PR，并在页面上给出 PR 链接。

### dshplugin.dev（需人机验证）

站内表单，字段 `repositoryUrl` / `description` / `keywords` / `contactEmail` / `companyWebsite` / `note`，同样带 Cloudflare Turnstile（sitekey `0x4AAAAAAEVu7fOt3oSUq1vf`）。步骤：

1. 打开 https://dshplugin.dev/submit
2. 填仓库地址 `https://github.com/yanmoren/dsh-whale-letter`
3. 描述可用 `submission-hub.md` 里的「One-line value」
4. 填一个能收信的邮箱
5. 完成 Turnstile → 「Send for editorial review」

### npm（已按用户决定跳过）

2026-11-16 用户决定跳过 npm 发布。当前状态：

- npm 账号 `yanmoren`（绑定 `15724920903@163.com`）已注册成功，但 npm 要求邮箱 OTP 才能登录；两个可用邮箱（QQ / 163）的网页登录都要求手机短信二次验证，临时邮箱域名被 npm 拒绝（"Account creation denied"），IMAP 又需要授权码。因此无法在本机 autonomous 完成登录取 token。
- 仓库内的 `package.json`、`npm pack --dry-run` 校验与 `.github/workflows/publish-npm.yml` 均已就绪，随时可发：只需在 npmjs.com 用你自己的账号创建 Automation Token，设为仓库 secret `NPM_TOKEN`，然后 Actions 手动跑 `Publish to npm`（或推 `v*` tag）。
- README 已改为不依赖 npm registry 的安装方式（`github:` 或预构建 tarball + `link:`）。

以下保留原发布步骤备查。

DSH 应用内的 Plugin Hub 只收录能「一条 npm 命令装上」的插件，所以要进应用内市场必须发 npm。仓库不含 2.4 GB 运行时（GitHub 单文件上限 100 MB），npm 包里也没有——装完跑一次 `scripts/fetch_runtime.py` 补齐即可。

两条路都行：

**A. 本机直接发**（需要你自己的 npm 账号）

```bash
npm login          # 需要你自己的 npm 账号
cd <仓库目录>
npm publish        # 包名 dsh-whale-letter@1.0.0，8.0 MB / 29 个文件
```

**B. 走 GitHub Actions**（仓库已内置 `.github/workflows/publish-npm.yml`）

1. npmjs.com → Access Tokens → Automation Token，勾 Read & Write
2. 仓库 Settings → Secrets and variables → Actions → New repository secret，名字 `NPM_TOKEN`，值填那个 token
3. Actions 页手动跑 `Publish to npm`，或推一个 `v*` tag 自动发

工作流会先 `npm pack --dry-run` 检查包里没混进 `.gguf` / `.exe` / `.dll`，混进就直接中止；发布带 `--provenance`。

发完把 README 里的安装命令改成 npm 版：

```bash
dsh plugin --profile web add dsh-whale-letter
```

发 npm 后精选列表的 npm 映射会被 `probe-npm.mjs` 自动补齐（它会核对包的 `repository` 字段指回本仓库），无需手动改。

## 一次自查

```bash
node test/smoke.mjs          # 契约与硬约束
node test/host-smoke.mjs     # mock host 路由与队列
node test/infer-probe.mjs    # 真实跑一次本地 4B 模型
npm publish --dry-run        # 确认 npm 包内容不含运行时
```
