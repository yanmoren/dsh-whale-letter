/* 鲸鲸信箱 · 共享纯函数契约（Node 端 / 测试共用，无任何副作用） */

export const PLUGIN_ID = 'dsh-whale-letter'
export const ROUTE_BASE = '/whale-letter'
export const MIN_WAIT_MS = 2 * 60 * 60 * 1000
export const MAX_WAIT_MS = 8 * 60 * 60 * 1000
export const MIN_LETTER_CHARS = 500
export const MAX_INCOMING_CHARS = 2000
export const STORAGE_VERSION = 1

/** 等待时长只由随机决定，与机器配置、模型速度、来信内容完全无关。 */
export function pickDelayMs(rng = Math.random) {
  const r = Math.min(0.999999, Math.max(0, Number(rng()) || 0))
  return Math.round(MIN_WAIT_MS + r * (MAX_WAIT_MS - MIN_WAIT_MS))
}

export function makeLetterId(now = Date.now(), rng = Math.random) {
  return 'L' + now.toString(36) + Math.floor((Number(rng()) || 0) * 46656).toString(36).padStart(3, '0')
}

export function normalizeIncoming(text, maxLen = MAX_INCOMING_CHARS) {
  return String(text == null ? '' : text).replace(/\r/g, '').trim().slice(0, maxLen)
}

export function makeLetter(userText, opts = {}) {
  const now = opts.now ?? Date.now()
  const rng = opts.rng ?? Math.random
  const delayMs = opts.delayMs ?? pickDelayMs(rng)
  return {
    id: opts.id ?? makeLetterId(now, rng),
    text: normalizeIncoming(userText),
    createdAt: now,
    deliverAt: now + delayMs,
    delayMs,
    status: 'queued',
    reply: null,
    replySource: null,
    generatedAt: null,
    deliveredAt: null,
    readAt: null,
    error: null
  }
}

export function countHan(text) {
  return (String(text || '').match(/[\u3400-\u9FFF]/g) || []).length
}

export function isDue(letter, now = Date.now()) {
  return !!letter && letter.status === 'queued' && Number(letter.deliverAt) <= now
}

export function isDelivered(letter) {
  return !!letter && letter.status === 'delivered'
}

export function needsReply(letter) {
  return !!letter && !letter.reply && letter.status !== 'failed'
}

export function formatCountdown(ms) {
  const n = Math.max(0, Number(ms) || 0)
  const h = Math.floor(n / 3600000)
  const m = Math.floor((n % 3600000) / 60000)
  const s = Math.floor((n % 60000) / 1000)
  if (h > 0) return h + ' 小时 ' + m + ' 分'
  if (m > 0) return m + ' 分 ' + s + ' 秒'
  return s + ' 秒'
}

export function formatClock(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (x) => String(x).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/** 给前端的安全视图：不暴露内部路径与错误堆栈。 */
export function stateView(letters, now = Date.now()) {
  const list = Array.isArray(letters) ? letters : []
  const queued = list.filter((x) => x && x.status === 'queued')
  const delivered = list.filter(isDelivered)
  const unread = delivered.filter((x) => !x.readAt)
  return {
    now,
    total: list.length,
    queued: queued.length,
    delivered: delivered.length,
    unread: unread.length,
    waitRange: [MIN_WAIT_MS, MAX_WAIT_MS],
    nextDueAt: queued.length ? Math.min(...queued.map((x) => Number(x.deliverAt))) : null,
    letters: list
      .slice()
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .slice(0, 40)
      .map((x) => ({
        id: x.id,
        createdAt: x.createdAt,
        deliverAt: x.deliverAt,
        status: x.status,
        readAt: x.readAt || null,
        // 列表不展示来信原文与回信正文，界面上不出现任何费神的字眼。
        preview: formatClock(x.createdAt) + ' 寄出',
        replyPreview: x.reply ? '鲸鲸寄来的一封信' : null,
        replyReady: !!x.reply,
        countdown: x.status === 'queued' ? formatCountdown(Number(x.deliverAt) - now) : null
      }))
  }
}

export function emptyStore() {
  return { version: STORAGE_VERSION, letters: [] }
}

export function normalizeStore(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const letters = Array.isArray(src.letters) ? src.letters : []
  return {
    version: STORAGE_VERSION,
    letters: letters.filter((x) => x && typeof x.id === 'string').map((x) => ({
      ...makeLetter(x.text || '', {
        id: x.id,
        now: Number(x.createdAt) || Date.now(),
        delayMs: Number(x.delayMs) || pickDelayMs()
      }),
      ...x,
      deliverAt: Number(x.deliverAt) || (Number(x.createdAt) || Date.now()) + MIN_WAIT_MS
    }))
  }
}
