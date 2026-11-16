/* 端到端验收：用轻量 mock host 加载插件，走真实 HTTP 路由与信件队列。
   不启动 dsh、不弹桌面窗口、不跑大模型（回信走素材兜底）。 */
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TMP = path.join(ROOT, 'test', '.tmp-home')
fs.rmSync(TMP, { recursive: true, force: true })
fs.mkdirSync(TMP, { recursive: true })

process.env.DSH_HOME = TMP
process.env.DSH_WHALE_NO_NOTIFY = '1'
process.env.DSH_WHALE_NO_TICK = '1'
process.env.DSH_WHALE_NO_INFER = '1'

const { WORK_PATTERN } = await import('../lib/persona.js')
const { MIN_WAIT_MS, MAX_WAIT_MS, countHan } = await import('../lib/contract.js')
const { apply } = await import('../lib/index.js')

let pass = 0, fail = 0
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' → ' + extra : '')) }
}

const routes = []
let cleanup = () => {}
const webServer = {
  port: 3080,
  register(r) { routes.push(r); return () => {} },
  tapIndex() { return () => {} }
}
const ctx = {
  webServer,
  get(n) { return n === 'webServer' ? webServer : undefined },
  effect(fn) { const ret = fn(); if (typeof ret === 'function') cleanup = ret; return ret },
  logger: { info() {}, warn() {} }
}

apply(ctx)
ok('插件注册了全部路由', routes.length === 15, String(routes.length))

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname
  const route = routes.find((r) => r.kind === 'exact' && r.path === pathname) ||
    routes.find((r) => r.kind === 'prefix' && pathname.startsWith(r.path))
  if (!route) { res.writeHead(404); res.end('no route'); return }
  Promise.resolve(route.handler(req, res)).catch((e) => {
    if (!res.headersSent) res.writeHead(500)
    res.end(String(e))
  })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const port = server.address().port

function req(p, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body))
    const r = http.request({
      host: '127.0.0.1', port, path: p, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}
    }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        let json = null
        try { json = JSON.parse(buf.toString('utf8')) } catch (e) { /* 非 JSON */ }
        resolve({ status: res.statusCode, text: buf.toString('utf8'), json, bytes: buf.length })
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

console.log('\n[1] 页面与静态资源')
const health = await req('/whale-letter/health')
ok('health 返回 ok', health.status === 200 && health.json?.ok === true, health.text)
const write = await req('/whale-letter/write')
ok('寄信页可访问', write.status === 200 && write.text.includes('封好，寄出去'))
const read = await req('/whale-letter/read')
ok('拆信页含信封结构', read.status === 200 && read.text.includes('env-flap'))
const css = await req('/whale-letter/letter.css')
ok('信纸样式含纤维与墨晕', css.status === 200 && css.text.includes('feTurbulence') && css.text.includes('inkBleed'))
const font = await req('/whale-letter/font')
ok('手写字体随包返回', font.status === 200 && font.bytes > 1_000_000, String(font.bytes))
const state0 = await req('/whale-letter/api/state')
ok('本地运行环境已就绪', state0.json?.runtime?.ok === true, JSON.stringify(state0.json?.runtime))

console.log('\n[2] 寄信与等待')
const sent = await req('/whale-letter/api/send', 'POST', { text: '今天加班到很晚，项目上线了，好累。' })
ok('寄信成功', sent.status === 200 && sent.json?.ok === true, sent.text)
ok('等待 2~8 小时', sent.json?.waitMs >= MIN_WAIT_MS && sent.json?.waitMs < MAX_WAIT_MS)
const state1 = await req('/whale-letter/api/state')
ok('队列出现一封信', state1.json?.queued >= 1)
ok('列表不展示来信原文', !(state1.json?.letters?.[0]?.preview || '').includes('项目'))

console.log('\n[3] 投递与回信硬约束')
const instant = await req('/whale-letter/api/instant', 'POST', { fast: true, text: '想看看信纸。' })
ok('快速验收生成一封信', instant.status === 200 && instant.json?.ok === true, instant.text)
let delivered = null
for (let i = 0; i < 30; i++) {
  const s = await req('/whale-letter/api/state')
  if ((s.json?.delivered || 0) >= 1) { delivered = s.json; break }
  await new Promise((r) => setTimeout(r, 120))
}
ok('信已投递', !!delivered, JSON.stringify(delivered?.lastDelivery))
const got = await req('/whale-letter/api/letter?id=' + encodeURIComponent(instant.json.id))
const reply = got.json?.letter?.reply || ''
ok('可以取到回信', got.status === 200 && reply.length > 0)
ok('回信不少于 500 汉字', countHan(reply) >= 500, String(countHan(reply)))
ok('回信不含任何工作字眼', !WORK_PATTERN.test(reply), reply.slice(0, 100))
ok('回信有家常提问与落款', reply.includes('？') && /鲸鲸\s*$/.test(reply))
const marked = await req('/whale-letter/api/read', 'POST', { id: instant.json.id })
ok('标记已读', marked.json?.ok === true)

cleanup()
server.close()
fs.rmSync(TMP, { recursive: true, force: true })
console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败\n')
process.exit(fail ? 1 : 0)
