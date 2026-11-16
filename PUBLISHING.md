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
| **awesome-dsh-plugin 精选列表**（2.4 万 star，每日抓 topic） | https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15736 | ✅ 已提 PR，待 CI + 人工评审 |
| **dsh-hub.cc** | https://dsh-hub.cc/publish | ✅ 无需表单，按 `dsh-plugin` topic 定时自动同步 |
| **dsh.pub** | https://dsh.pub/en/submit/ | ⚠️ 需人工过一次 Cloudflare Turnstile，见下方步骤 |
| **npm**（DSH 应用内插件市场的硬性前提） | https://www.npmjs.com/package/dsh-whale-letter | ⚠️ 待本机 `npm login` 后发布 |

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

### dsh.pub（需人机验证）

`POST /api/submissions` 带 Cloudflare Turnstile token，人机验证必须真人过。步骤：

1. 打开 https://dsh.pub/en/submit/
2. 在「GitHub repository URL」填 `https://github.com/yanmoren/dsh-whale-letter`
3. 完成 Turnstile 勾选
4. 点「Submit repository」

它会在后台自动向 `dsh-pub/dsh-pub` 仓库建 PR，并在页面上给出 PR 链接。

### npm（进 DSH 应用内插件市场）

DSH 应用内的 Plugin Hub 只收录能「一条 npm 命令装上」的插件，所以要进应用内市场必须发 npm。仓库不含 2.4 GB 运行时（GitHub 单文件上限 100 MB），npm 包里也没有——装完跑一次 `scripts/fetch_runtime.py` 补齐即可。

```bash
npm login          # 需要你自己的 npm 账号
cd <仓库目录>
npm publish        # 包名 dsh-whale-letter@1.0.0，8.0 MB
```

发完把 README 里的安装命令改成 npm 版：

```bash
dsh plugin --profile web add dsh-whale-letter
```

发 npm 后 `data/npm-map.json` 会被 `probe-npm.mjs` 自动补齐（它会核对包的 `repository` 字段指回本仓库），无需手动改。

## 一次自查

```bash
node test/smoke.mjs          # 契约与硬约束
node test/host-smoke.mjs     # mock host 路由与队列
node test/infer-probe.mjs    # 真实跑一次本地 4B 模型
npm publish --dry-run        # 确认 npm 包内容不含运行时
```
