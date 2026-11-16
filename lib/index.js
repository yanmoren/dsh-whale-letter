/* 鲸鲸信箱 · Host 半侧
 * 独立寄信页 / 信封阅读页 / 信件队列 / 本地推理 / 桌面提醒 / 独立窗口
 * 纯 JavaScript bundle，无构建步骤，运行时只依赖 dsh 自带的 Node 与 Windows 自带组件。 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PLUGIN_ID, ROUTE_BASE, MIN_WAIT_MS, MAX_WAIT_MS,
  makeLetter, normalizeIncoming, isDue, needsReply, stateView,
  emptyStore, normalizeStore, formatCountdown
} from './contract.js'
import { generateReply, runtimeStatus } from './infer.js'
import { fallbackLetter } from './persona.js'
import { deliver, ensureScripts, openLetterWindow } from './notify.js'

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.resolve(LIB_DIR, '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DATA_DIR = path.join(DSH_HOME, 'whale-letter')
const STORE_FILE = path.join(DATA_DIR, 'letters.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

const DEFAULTS = {
  port: 3080,
  inferencePort: 18081,
  notifyMode: 'card',
  tickMs: 30000,
  allowInstant: true
}

function readConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    return { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
  } catch (e) { return { ...DEFAULTS } }
}
function writeConfig(cfg) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8')
  return cfg
}
function readStore() {
  try { return normalizeStore(JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'))) }
  catch (e) { return emptyStore() }
}
function writeStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = STORE_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
  fs.renameSync(tmp, STORE_FILE)
}

function resolveWebServer(ctx) {
  try { const s = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined; if (s) return s } catch (e) { /* noop */ }
  return ctx.webServer
}
function hasRoutes(server) {
  return !!server && typeof server.register === 'function' && typeof server.tapIndex === 'function'
}
function detectPort(ctx, webServer) {
  const env = Number(process.env.DSH_PORT || process.env.PORT)
  if (Number.isFinite(env) && env > 0) return env
  const candidates = [
    webServer?.port, webServer?.options?.port, webServer?.config?.port,
    webServer?.server?.address?.()?.port,
    webServer?.httpServer?.address?.()?.port,
    ctx?.get?.('profileContext')?.port
  ]
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0 && n < 65536) return n
  }
  return 0
}

function readAsset(name) {
  return fs.readFileSync(path.join(LIB_DIR, name))
}

export const name = PLUGIN_ID
export const inject = ['webServer', 'connection']

export function apply(ctx) {
  const disposers = []
  const webServer = resolveWebServer(ctx)
  const cfg = readConfig()
  const port = detectPort(ctx, webServer) || cfg.port
  cfg.port = port
  writeConfig(cfg)
  try { ensureScripts() } catch (e) { /* 通知脚本生成失败不影响页面 */ }

  const state = { busy: false, lastTick: 0, lastError: null, lastDelivery: null }
  let store = readStore()

  function log(...args) {
    try { ctx.logger?.info?.('[' + PLUGIN_ID + ']', ...args) } catch (e) { /* noop */ }
  }

  /** 一次 tick：先投递所有到点的信（不依赖推理），再给一封排队信慢慢写回信。
   *  这样即使模型很慢或缺失，到点也一定弹提醒，且回信由本地素材兜底。 */
  async function tick(reason = 'timer') {
    if (state.busy) return
    state.busy = true
    state.lastTick = Date.now()
    try {
      const now = Date.now()
      let s = readStore()

      for (const l of s.letters) {
        if (!isDue(l, now)) continue
        if (!l.reply) {
          l.reply = fallbackLetter(l.text).text
          l.replySource = 'fallback'
          l.generatedAt = now
        }
        l.status = 'delivered'
        l.deliveredAt = now
        writeStore(s)
        const res = deliver({ letterId: l.id, port: cfg.port, mode: cfg.notifyMode })
        state.lastDelivery = { id: l.id, at: now, channels: res.channels }
        log('信已送达', l.id, res.channels.join('+'))
      }

      s = readStore()
      const pending = s.letters.find((l) => l.status === 'queued' && needsReply(l))
      if (pending) {
        const r = await generateReply(pending.text, {
          port: cfg.inferencePort,
          forceFallback: process.env.DSH_WHALE_NO_INFER === '1'
        })
        const fresh = readStore()
        const target = fresh.letters.find((l) => l.id === pending.id)
        if (target && !target.reply) {
          target.reply = r.text
          target.replySource = r.source
          target.generatedAt = Date.now()
          target.error = r.error || null
          writeStore(fresh)
          log('回信已写好', target.id, r.source, r.hanChars + '字', (r.elapsedMs / 1000).toFixed(1) + 's')
        }
      }
      store = readStore()
      state.lastError = null
    } catch (err) {
      state.lastError = String(err && err.message ? err.message : err)
      try { ctx.logger?.warn?.('[' + PLUGIN_ID + '] tick 失败: ' + state.lastError) } catch (e) { /* noop */ }
    } finally {
      state.busy = false
    }
  }

  /* ---------- HTTP 层 ---------- */
  if (!hasRoutes(webServer)) {
    try { ctx.logger?.warn?.('[' + PLUGIN_ID + '] 当前 profile 没有 webServer，页面路由未注册') } catch (e) { /* noop */ }
  } else {
    function rejected(req, res) {
      try {
        const conn = (typeof ctx.get === 'function' ? ctx.get('connection') : undefined) || ctx.connection
        if (!conn || typeof conn.requestRejection !== 'function') return false
        const code = conn.requestRejection(req)
        if (code === undefined || code === null || code === false) return false
        res.statusCode = typeof code === 'number' ? code : 403
        res.end()
        return true
      } catch (e) { return false }
    }
    function registerRoute(route) {
      const inner = route.handler
      const d = webServer.register({ ...route, handler: async (req, res) => {
        if (rejected(req, res)) return
        return inner(req, res)
      } })
      disposers.push(() => { try { typeof d === 'function' ? d() : d?.dispose?.() } catch (e) { /* noop */ } })
    }
    function sendJson(res, code, payload) {
      const body = Buffer.from(JSON.stringify(payload), 'utf8')
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': String(body.length) })
      res.end(body)
    }
    function sendBuffer(res, type, bytes, cache) {
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache || 'no-store', 'Content-Length': String(bytes.length) })
      res.end(bytes)
    }
    function readBody(req, limit = 32 * 1024) {
      return new Promise((resolve) => {
        let size = 0
        const chunks = []
        req.on('data', (c) => { size += c.length; if (size > limit) { resolve(''); return } chunks.push(c) })
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        req.on('error', () => resolve(''))
      })
    }
    function queryOf(req) {
      const q = String(req.url || '').split('?')[1] || ''
      return Object.fromEntries(new URLSearchParams(q))
    }
    function findLetter(id) {
      return readStore().letters.find((l) => l.id === id) || null
    }

    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/health', handler: (req, res) => {
      sendJson(res, 200, { ok: true, plugin: PLUGIN_ID, port: cfg.port, runtime: runtimeStatus().ok, busy: state.busy })
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/write', handler: (req, res) => {
      sendBuffer(res, 'text/html; charset=utf-8', readAsset('write.html'))
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/read', handler: (req, res) => {
      sendBuffer(res, 'text/html; charset=utf-8', readAsset('read.html'))
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/letter.css', handler: (req, res) => {
      sendBuffer(res, 'text/css; charset=utf-8', readAsset('letter.css'), 'public, max-age=3600')
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/letter.js', handler: (req, res) => {
      sendBuffer(res, 'application/javascript; charset=utf-8', readAsset('letter.js'))
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/font', handler: (req, res) => {
      try { sendBuffer(res, 'font/ttf', readAsset(path.join('assets', 'MaShanZheng-Regular.ttf')), 'public, max-age=604800') }
      catch (e) { res.writeHead(404); res.end() }
    } })

    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/font-longcang', handler: (req, res) => {
      try { sendBuffer(res, 'font/ttf', readAsset(path.join('assets', 'LongCang-Regular.ttf')), 'public, max-age=604800') }
      catch (e) { res.writeHead(404); res.end() }
    } })

    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/state', handler: (req, res) => {
      const s = readStore()
      sendJson(res, 200, {
        ok: true,
        ...stateView(s.letters),
        config: { port: cfg.port, notifyMode: cfg.notifyMode, waitMinMs: MIN_WAIT_MS, waitMaxMs: MAX_WAIT_MS },
        runtime: (() => { const r = runtimeStatus(); return { ok: r.ok, modelBytes: r.modelBytes, missing: r.missing } })(),
        busy: state.busy,
        lastError: state.lastError,
        lastDelivery: state.lastDelivery
      })
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/runtime', handler: (req, res) => {
      const r = runtimeStatus()
      sendJson(res, 200, { ok: r.ok, exe: r.exe ? path.basename(r.exe) : null, model: r.model ? path.basename(r.model) : null, modelBytes: r.modelBytes, missing: r.missing })
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/letters', handler: (req, res) => {
      sendJson(res, 200, { ok: true, letters: stateView(readStore().letters).letters })
    } })
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/letter', handler: (req, res) => {
      const id = String(queryOf(req).id || '')
      const l = findLetter(id)
      if (!l) { sendJson(res, 404, { ok: false, error: '没有找到这封信' }); return }
      if (l.status !== 'delivered' && !cfg.allowInstant) { sendJson(res, 403, { ok: false, error: '信还在路上' }); return }
      sendJson(res, 200, {
        ok: true,
        letter: {
          id: l.id, text: l.text, reply: l.reply, createdAt: l.createdAt,
          deliverAt: l.deliverAt, deliveredAt: l.deliveredAt, status: l.status,
          replySource: l.replySource
        }
      })
    } })

    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/send', handler: async (req, res) => {
      if (String(req.method || '').toUpperCase() !== 'POST') { sendJson(res, 405, { ok: false, error: 'use POST' }); return }
      let payload = {}
      try { payload = JSON.parse((await readBody(req)) || '{}') } catch (e) { /* noop */ }
      const text = normalizeIncoming(payload.text)
      if (!text) { sendJson(res, 400, { ok: false, error: '信纸还是空的呀' }); return }
      const letter = makeLetter(text)
      const s = readStore()
      s.letters.push(letter)
      writeStore(s)
      store = s
      log('收到来信', letter.id, '等待', formatCountdown(letter.delayMs))
      // 立刻在后台起一次生成，回信会在等待期内写好，到点即可拆。
      setTimeout(() => tick('new-letter').catch(() => {}), 50)
      sendJson(res, 200, {
        ok: true, id: letter.id, deliverAt: letter.deliverAt,
        waitMs: letter.delayMs,
        message: '封好啦，这封信会在 2 到 8 小时之间慢慢送到。'
      })
    } })

    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/read', handler: async (req, res) => {
      let payload = {}
      try { payload = JSON.parse((await readBody(req)) || '{}') } catch (e) { /* noop */ }
      const s = readStore()
      const l = s.letters.find((x) => x.id === String(payload.id || ''))
      if (l && !l.readAt) { l.readAt = Date.now(); writeStore(s); store = s }
      sendJson(res, 200, { ok: true })
    } })

    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/open', handler: async (req, res) => {
      let payload = {}
      try { payload = JSON.parse((await readBody(req)) || '{}') } catch (e) { /* noop */ }
      const url = openLetterWindow(cfg.port, payload.id || null)
      sendJson(res, 200, { ok: true, url })
    } })

    /** 验收用：跳过等待，立刻出一封信。fast=true 时用本地素材，不跑模型。 */
    registerRoute({ kind: 'exact', path: ROUTE_BASE + '/api/instant', handler: async (req, res) => {
      if (!cfg.allowInstant) { sendJson(res, 403, { ok: false, error: 'instant 已关闭' }); return }
      let payload = {}
      try { payload = JSON.parse((await readBody(req)) || '{}') } catch (e) { /* noop */ }
      const letter = makeLetter(payload.text || '今天想跟你说点家常。', { delayMs: 1 })
      const s = readStore()
      s.letters.push(letter)
      writeStore(s)
      if (payload.fast === true) {
        const { fallbackLetter } = await import('./persona.js')
        letter.reply = fallbackLetter(letter.text).text
        letter.replySource = 'fallback'
        letter.generatedAt = Date.now()
        writeStore(s)
      }
      setTimeout(() => tick('instant').catch(() => {}), 30)
      sendJson(res, 200, { ok: true, id: letter.id, fast: payload.fast === true })
    } })

    /* dsh 页面右下角入口：纯 HTML，无内联脚本，不受 CSP 影响。 */
    try {
      const tap = webServer.tapIndex((html) => {
        const entry = [
          '<a href="' + ROUTE_BASE + '/write" target="_blank" rel="noopener" ',
          'style="position:fixed;right:18px;bottom:18px;z-index:2147483000;',
          'display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;',
          'background:rgba(24,25,26,.9);color:#e8e6e1;border:1px solid rgba(217,161,110,.38);',
          'box-shadow:0 6px 22px rgba(0,0,0,.4);font:11.5px/1.4 system-ui,sans-serif;letter-spacing:.04em;',
          'text-decoration:none;opacity:.9" title="鲸鲸信箱">',
          'B SIDE · 鲸鲸信箱</a>'
        ].join('')
        if (String(html).includes('</body>')) return String(html).replace('</body>', entry + '</body>')
        return String(html) + entry
      })
      disposers.push(() => { try { typeof tap === 'function' ? tap() : tap?.dispose?.() } catch (e) { /* noop */ } })
    } catch (e) { /* 注入入口失败不影响主体 */ }
  }

  /* 启动补投：dsh 关掉期间到点的信，重启后照常送达。
     自动化验收时用 DSH_WHALE_NO_TICK=1 关掉自动轮询，由请求直接驱动 tick。 */
  if (process.env.DSH_WHALE_NO_TICK !== '1') {
    setTimeout(() => tick('startup').catch(() => {}), 1500)
    const timer = setInterval(() => tick('timer').catch(() => {}), Math.max(5000, Number(cfg.tickMs) || 30000))
    disposers.push(() => clearInterval(timer))
  }

  ctx.effect(() => () => {
    for (const dispose of disposers) { try { dispose() } catch (e) { /* noop */ } }
  })
}

