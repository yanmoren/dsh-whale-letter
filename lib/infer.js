/* 鲸鲸信箱 · 本地推理：插件自带 llama-server.exe + GGUF，按需起停，不常驻内存 */

import { spawn, execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildMessages, sanitizeLetter, fallbackLetter } from './persona.js'

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url))
const RUNTIME_DIR = path.join(LIB_DIR, 'runtime')

function walk(dir, depth = 0) {
  if (depth > 3 || !fs.existsSync(dir)) return []
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(full, depth + 1))
    else out.push(full)
  }
  return out
}

export function runtimeStatus() {
  const files = walk(RUNTIME_DIR)
  const exe = files.find((f) => /llama-server\.exe$/i.test(f))
  const model = files.find((f) => /\.gguf$/i.test(f))
  const missing = []
  if (!exe) missing.push('llama-server.exe')
  if (!model) missing.push('*.gguf 模型文件')
  let modelBytes = 0
  try { modelBytes = model ? fs.statSync(model).size : 0 } catch (e) { /* noop */ }
  return {
    ok: missing.length === 0,
    exe: exe || null,
    model: model || null,
    modelBytes,
    missing,
    runtimeDir: RUNTIME_DIR
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function killTree(proc) {
  if (!proc || proc.killed || proc.exitCode !== null) return
  const pid = proc.pid
  try { proc.kill() } catch (e) { /* noop */ }
  if (process.platform === 'win32' && pid) {
    try { execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => {}) } catch (e) { /* noop */ }
  }
}

async function waitForHealth(port, timeoutMs, isDead) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (isDead()) throw new Error('推理进程提前退出')
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return
    } catch (e) { /* 还没起来 */ }
    await sleep(600)
  }
  throw new Error('本地推理服务启动超时')
}

/**
 * 生成一封回信。失败任何一步都用本地素材兜底，绝不把错误抛给宿主。
 * 返回 { text, source, hanChars, error, elapsedMs }
 */
export async function generateReply(userText, opts = {}) {
  const started = Date.now()
  const rng = opts.rng ?? Math.random
  const status = runtimeStatus()
  if (!status.ok || opts.forceFallback) {
    const fb = fallbackLetter(userText, { rng })
    return {
      text: fb.text,
      source: 'fallback',
      hanChars: fb.hanChars,
      error: status.ok ? null : ('本地运行环境缺失：' + status.missing.join('、')),
      elapsedMs: Date.now() - started
    }
  }

  const port = Number(opts.port) || 18081
  const threads = Math.max(2, Math.min(8, (os.cpus() || []).length || 4))
  const args = [
    '-m', status.model,
    '-c', '4096',
    '-t', String(threads),
    '--host', '127.0.0.1',
    '--port', String(port),
    '-ngl', '0',
    '--no-webui',
    '--chat-template-kwargs', JSON.stringify({ enable_thinking: false })
  ]
  let stderr = ''
  let proc
  let dead = false
  try {
    proc = spawn(status.exe, args, {
      cwd: path.dirname(status.exe),
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    })
    proc.on('exit', () => { dead = true })
    proc.stderr?.on('data', (c) => { stderr = (stderr + c.toString()).slice(-4000) })
    proc.on('error', (e) => { dead = true; stderr += String(e) })

    await waitForHealth(port, Number(opts.bootTimeoutMs) || 120000, () => dead)

    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'whale-letter-local',
        messages: buildMessages(userText),
        temperature: 0.86,
        top_p: 0.92,
        max_tokens: Number(opts.maxTokens) || 1600,
        stream: false,
        stop: ['<|im_end|>', '<|endoftext|>']
      }),
      signal: AbortSignal.timeout(Number(opts.generateTimeoutMs) || 15 * 60 * 1000)
    })
    if (!res.ok) throw new Error('本地推理返回 ' + res.status + ' ' + (await res.text()).slice(0, 200))
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content
    if (!raw || typeof raw !== 'string') throw new Error('本地推理未返回正文')

    const clean = sanitizeLetter(raw, { rng })
    return {
      text: clean.text,
      source: 'model',
      hanChars: clean.hanChars,
      error: null,
      elapsedMs: Date.now() - started
    }
  } catch (err) {
    const fb = fallbackLetter(userText, { rng })
    return {
      text: fb.text,
      source: 'fallback',
      hanChars: fb.hanChars,
      error: String(err && err.message ? err.message : err) + (stderr ? ' | ' + stderr.slice(-300) : ''),
      elapsedMs: Date.now() - started
    }
  } finally {
    killTree(proc)
  }
}
