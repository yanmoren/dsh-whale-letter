/* 鲸鲸信箱 · 纯函数契约测试 + 静态产物自检（无需 dsh、无需模型） */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  MIN_WAIT_MS, MAX_WAIT_MS, MIN_LETTER_CHARS,
  pickDelayMs, makeLetter, isDue, countHan, stateView, normalizeStore
} from '../lib/contract.js'
import {
  WORK_PATTERN, LIFE_PARAGRAPHS, HOME_QUESTIONS, OFF_TOPIC_LINES,
  sanitizeLetter, fallbackLetter, buildMessages
} from '../lib/persona.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name) }
  else { fail++; console.log('  FAIL  ' + name + (extra ? ' → ' + extra : '')) }
}

/* 用固定随机数，保证测试可复现 */
function rngOf(seq) {
  let i = 0
  return () => seq[(i++) % seq.length]
}

console.log('\n[1] 等待时间与队列契约')
ok('随机等待落在 2~8 小时', Array.from({ length: 200 }, (_, i) => pickDelayMs(() => i / 200))
  .every((d) => d >= MIN_WAIT_MS && d < MAX_WAIT_MS))
ok('等待时长与机器/内容无关', pickDelayMs(() => 0.5) === Math.round(MIN_WAIT_MS + 0.5 * (MAX_WAIT_MS - MIN_WAIT_MS)))
const L = makeLetter('今天好累，项目上线了', { now: 1000000, rng: rngOf([0.25]), id: 'Ltest' })
ok('信件字段齐全', L.id === 'Ltest' && L.status === 'queued' && L.reply === null && L.deliverAt > L.createdAt)
ok('到点判定', isDue(L, L.deliverAt) && !isDue(L, L.deliverAt - 1))
ok('已送达不再判定为到点', !isDue({ ...L, status: 'delivered' }, L.deliverAt + 1))
ok('状态视图不泄露回信全文', !JSON.stringify(stateView([L], L.createdAt)).includes('项目上线'))
ok('存储归一化能恢复损坏字段', normalizeStore({ letters: [{ id: 'x', text: 'hi', createdAt: 5, deliverAt: null }] }).letters[0].deliverAt > 5)

console.log('\n[2] 内容硬约束')
ok('素材段落全部不含工作字眼', LIFE_PARAGRAPHS.every((p) => !WORK_PATTERN.test(p)),
  LIFE_PARAGRAPHS.find((p) => WORK_PATTERN.test(p)))
ok('家常提问不含工作字眼', HOME_QUESTIONS.every((p) => !WORK_PATTERN.test(p)))
ok('撇开话题句不含工作字眼', OFF_TOPIC_LINES.every((p) => !WORK_PATTERN.test(p)))

const modelRaw = [
  '# 回信',
  '我今天把项目需求都改完了，开会到很晚。',
  '```', '代码不要写', '```',
  '窗外的光淡淡的，鲸鲸趴着看了好久。',
  '* 米饭要盛满',
  '<think>这里在想事情</think>',
  '晚上有没有好好吃饭呀。'
].join('\n')
const clean = sanitizeLetter(modelRaw, { rng: rngOf([0.1, 0.4, 0.7]) })
ok('不出现任何工作字眼', !WORK_PATTERN.test(clean.text), clean.text.slice(0, 120))
ok('不少于 500 汉字', countHan(clean.text) >= MIN_LETTER_CHARS, String(countHan(clean.text)))
ok('不以 Markdown / 代码块 / 表情呈现', !/[#*`>|\-\d+\.]\s/.test(clean.text) && !/```/.test(clean.text))
ok('已剥离 thinking 段', !clean.text.includes('这里在想事情'))
ok('结尾有家常提问', /[？?]/.test(clean.text.split('\n\n').filter(Boolean).slice(-2).join('')))
ok('有落款', /鲸鲸\s*$/.test(clean.text))
ok('记录了被换掉的句子', clean.removedWorkSentences.length >= 1)

const nasty = sanitizeLetter('工作 加班 项目 客户 老板 KPI 会议 代码 文档 deadline', { rng: rngOf([0.3]) })
ok('极端来信也能得到干净长信', !WORK_PATTERN.test(nasty.text) && countHan(nasty.text) >= MIN_LETTER_CHARS)

const fb = fallbackLetter('今天加班到很晚，项目上线了', { rng: rngOf([0.6, 0.2]) })
ok('兜底长信不依赖模型且合规', !WORK_PATTERN.test(fb.text) && countHan(fb.text) >= MIN_LETTER_CHARS && fb.text.includes('鲸鲸'))
ok('兜底长信撇开了话题', OFF_TOPIC_LINES.some((s) => fb.text.includes(s)))

const msgs = buildMessages('随便写点什么')
ok('推理消息含人设与来信', msgs.length === 2 && msgs[0].content.includes('鲸鲸') && msgs[1].content.includes('随便写点什么'))

console.log('\n[3] 静态产物自检')
const files = [
  'package.json', 'cordis.patch.yml', 'README.md',
  'lib/index.js', 'lib/client.js', 'lib/contract.js', 'lib/persona.js',
  'lib/infer.js', 'lib/notify.js', 'lib/letter.css', 'lib/letter.js',
  'lib/write.html', 'lib/read.html',
  'lib/assets/MaShanZheng-Regular.ttf', 'lib/assets/OFL-MaShanZheng.txt',
  'lib/assets/LongCang-Regular.ttf', 'lib/assets/OFL-LongCang.txt',
  'lib/runtime/Qwen3-4B-Q4_K_M.gguf', 'lib/runtime/llama/llama-server.exe',
  'scripts/fetch_runtime.py'
]
for (const f of files) ok('存在 ' + f, fs.existsSync(path.join(ROOT, f)))
const client = fs.readFileSync(path.join(ROOT, 'lib/client.js'), 'utf8')
ok('client.js 走 ModuleLoader 且 id 正确', client.includes("id: 'dsh-whale-letter'") && client.includes('__ModuleLoader__.load'))
const css = fs.readFileSync(path.join(ROOT, 'lib/letter.css'), 'utf8')
ok('信纸含纤维噪点与墨晕滤镜', css.includes('feTurbulence') && css.includes('url(#inkBleed)') && css.includes('mix-blend-mode'))
const idx = fs.readFileSync(path.join(ROOT, 'lib/index.js'), 'utf8')
ok('宿主注入了入口与拆信路由', idx.includes('/write') && idx.includes('/read') && idx.includes('tapIndex'))
ok('模型文件体积合理', fs.existsSync(path.join(ROOT, 'lib/runtime/Qwen3-4B-Q4_K_M.gguf')) &&
  fs.statSync(path.join(ROOT, 'lib/runtime/Qwen3-4B-Q4_K_M.gguf')).size > 2_400_000_000)

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败\n')
process.exit(fail ? 1 : 0)
