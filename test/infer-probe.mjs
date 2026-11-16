/* 本地推理链路探针：验证自带 llama-server + GGUF 能起服务并返回正文 */
import { runtimeStatus, generateReply } from '../lib/infer.js'

const s = runtimeStatus()
console.log('RUNTIME', JSON.stringify({ ok: s.ok, exe: s.exe, model: s.model, modelBytes: s.modelBytes, missing: s.missing }))
if (!s.ok) process.exit(2)

const started = Date.now()
const r = await generateReply('今天加班到很晚，项目终于上线了，好累。', {
  port: 18081,
  maxTokens: 64,
  bootTimeoutMs: 150000,
  generateTimeoutMs: 300000
})
console.log('SOURCE', r.source, 'HAN', r.hanChars, 'MS', Date.now() - started)
console.log('ERROR', r.error)
console.log('HEAD', r.text.slice(0, 260).replace(/\n/g, ' / '))
