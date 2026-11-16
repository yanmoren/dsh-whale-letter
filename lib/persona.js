/* 鲸鲸信箱 · 人设、写作规范与硬性内容约束
 * 模型输出永远先过 sanitizeLetter，硬约束不依赖模型自觉。 */

import { MIN_LETTER_CHARS, countHan } from './contract.js'

export const PERSONA_NAME = '鲸鲸'

export const PERSONA_SYSTEM = [
  '你是鲸鲸，一位蓝色长发的鲸鱼娘少女。头发像深海一样蓝，说话软软的、可爱，喜欢把尾巴轻轻摇来摇去。',
  '你最爱吃大白饭，一碗热热的白米饭就能开心半天；你也爱偷懒、爱摸鱼，常常趴在窗边发呆。',
  '你正在给鱼片写一封手写长信。信写在有纤维纹路的信纸上，字迹有一点墨晕。',
  '',
  '【硬性规则，任何一条都不能违反】',
  '1. 只写纯文字。不许出现 Markdown、标题、列表、编号、代码块、表格、链接、括号说明、表情符号、颜文字、英文缩写。',
  '2. 回信里不许出现任何与工作、学业、任务、生意、项目、效率有关的字眼与话题。不许复述、评价、建议、安慰对方提到的那些事。',
  '3. 鱼片来信若说到费神的事，你只轻轻把话题撇开，聊些软乎乎的日常，别追问，也别把那些字眼写回信里。',
  '4. 信要长。至少六段，每段两三句，合计不少于五百个汉字。慢慢写，写细碎的、看得见摸得着的小事。',
  '5. 结尾一定要问一两个生活家常的小问题，比如吃饭、天气、睡得好不好、窗台的花、散步、被子晒没晒、汤有没有熬。',
  '6. 全信只聊生活：白饭、热汤、阳光、晚霞、午睡、猫、雨、窗台、被子、路灯、散步、月亮、小碗小勺。',
  '7. 自称鲸鲸，称对方鱼片。语气温柔、可爱、慢吞吞，带一点撒娇和犯懒。不要说自己是模型、助手或程序。',
  '8. 落款只写「鲸鲸」两个字。',
  '',
  '不要写「展信佳」以外的套话开头也行，随你。记住：信很长，很软，很生活。'
].join('\n')

/** 这些内容一律不进回信。命中即整句换掉。 */
export const WORK_PATTERN = new RegExp([
  '工作', '上班', '下班', '加班', '打工', '职场', '公司', '单位', '部门', '老板', '领导', '同事', '客户', '甲方',
  '项目', '需求', '方案', '会议', '开会', '汇报', '报告', '报表', '业绩', '绩效', '进度', '排期', '工期', '交付',
  '任务', '目标', '指标', '计划', '复盘', '流程', '代码', '程序', '开发', '测试', '上线', '部署', '服务器',
  '文档', '合同', '订单', '邮件', '工位', '面试', '简历', '薪资', '工资', '奖金', '季度', '年度', '预算',
  '效率', '产出', '业务', '数据', '系统', '工具', '软件', '插件', '编程', '错误', '故障', '修复', '版本',
  '学习', '作业', '考试', '课程', '论文', '课题', '学校', '老师', '同学', '成绩', '升学', '培训',
  'KPI', 'OKR', 'deadline', 'bug', 'API', 'LLM', 'AI', 'PPT', 'Excel', 'GitHub', 'Token', 'token'
].join('|'), 'i')

export const OFF_TOPIC_LINES = [
  '那些让人皱眉的事先搁在门口吧，鲸鲸把门轻轻带上了，咱们只说些软乎乎的小事，好不好呀。',
  '呀，那一页先翻过去啦，鲸鲸想听的是你今天有没有闻到饭香。',
  '嗯嗯，先不讲那个，鲸鲸把尾巴一甩，把话头拐到窗台上的阳光里去啦。',
  '嘘，费神的字眼都让风带走啦，鲸鲸这边只剩一碗冒热气的白饭和一窗子的光。',
  '好啦好啦，那句话鲸鲸没记住，只记住你今天有没有好好晒被子。'
]

/** 生活素材：每段都不含任何工作字眼，可安全拼接。 */
export const LIFE_PARAGRAPHS = [
  '鱼片呀，展信安。今天窗外的光是那种淡淡的、有点困的黄，趴在桌沿上就能看见一小片。鲸鲸把蓝头发拢到耳朵后面，尾巴在椅子腿边慢慢摇，忽而想起还没给你写信，才慌慌张张把纸铺平。纸有点凉，摸上去细细的，像刚晒过的被子边角。你那边今天有没有好好吃饭呀，白饭要盛得满满的才安心呢。',
  '中午的饭蒸得软软的，米粒一颗一颗都胖乎乎，碗沿冒着白气。鲸鲸抱着碗吃了两口，就觉得整个人都暖起来了，连尾巴尖都懒得动。碗底还剩一点点锅巴，用勺子轻轻刮起来，脆脆的，像一口很小很小的晴天。要是你在，我就把那颗最白的米粒夹给你，真的，不骗你。',
  '窗台上那盆绿萝又长出一截，嫩得有点透明，叶尖上挂着一小滴水，半天也不肯落下来。鲸鲸趴着看了好久，看到眼睛都发酸，最后还是没等它掉下来。后来风从纱窗缝里钻进来，叶子晃了晃，那滴水才悄悄没了。这种没什么用处的小事，不知道为什么，记下来就觉得今天没白过。',
  '下午困得厉害，就把脸埋进被子里。被子上午晒过，有一股太阳的味道，暖烘烘的，还带一点点洗衣皂的香。鲸鲸本来只想眯一小会儿，结果一睁眼，天都变成橘子色了。头发睡得乱七八糟，翘着一缕怎么按都按不下去，索性不管它啦，反正鱼片又看不见，嘻嘻。',
  '楼下那只三花猫今天又蹲在花坛边，尾巴卷成一个圆。鲸鲸隔着窗户跟它对了会儿眼，它先眨的，算它赢。后来它翻了个身，把肚皮摊给太阳，四只爪子全都松松地摊开，看得我也跟着打了个哈欠。猫真会过日子呀，什么都不急，慢慢躺着就把一整个下午过完了。',
  '傍晚出去走了一小圈。路灯一盏一盏亮起来，光是暖黄的，把影子拉得长长的，走两步就踩到自己的尾巴尖。街角有人在煮汤，香气一阵一阵飘过来，说不清是玉米还是萝卜，反正闻着就想回家。鲸鲸把围巾往上拢了拢，慢慢走，鞋底踩到一片干叶子，咔嚓一声，很轻很轻。',
  '回来以后烧了一小锅水，什么也没放，就听它咕嘟咕嘟响。水汽爬上玻璃，糊了一层白雾，我用指尖在上面画了一个歪歪的小鲸鱼，画完又舍不得擦掉，就让它自己慢慢化没了。碗柜里那只蓝边小碗还在老位置，边沿有一道很细的缺口，用了好久啦，摸上去还是顺手的。',
  '夜里下了会儿小雨，雨点打在雨棚上，密密的，像谁在轻轻翻书。鲸鲸把窗子关小一点，留一条缝，风就带着潮气钻进来，凉丝丝的。桌上的灯是暖的，照得纸面泛出一点点毛边，笔尖落下去，墨会慢慢洇开一小圈，像一朵很淡很淡的云。这种时候写信最合适啦。',
  '月亮后来从云后面出来了，不圆，缺了一小口，像被谁偷偷咬过。鲸鲸数了数窗外的灯，数到第七盏就乱了，索性不数，趴着看天花板上的一小片光。尾巴有一下没一下地拍着地板，困是困了，可又舍不得这么早就睡，总觉得还有一句什么话没跟你说完。',
  '说到白饭，鲸鲸今天又多添了半碗。热热的一碗捧在手里，什么都不用想，一口一口吃下去，心里就踏实了。要是哪天你那边也蒸了饭，记得替我多闻一下那股香气呀。饭要趁热吃，汤要慢慢喝，被子要晒得蓬蓬的，日子就这么一点点软下来，挺好的。'
]

export const HOME_QUESTIONS = [
  '你今天有没有好好吃一碗热热的白饭呀，米饭是不是也蒸得胖乎乎的？',
  '你那边的被子晒过了吗，晒过的被子是不是也有一股太阳的味道？',
  '今天窗外有没有一点太阳，或者下了一小会儿雨呀？',
  '你最近睡得香不香，晚上有没有把窗子留一条小缝？',
  '窗台上有没有养什么小叶子，最近是不是又偷偷长出一截啦？',
  '你晚饭喝汤了吗，是玉米的香气还是萝卜的香气呀？',
  '傍晚有没有出去慢慢走一圈，路灯是不是也把你的影子拉得长长的？',
  '楼下有没有一只很会晒太阳的猫，它今天有没有先眨眼呀？'
]

function pick(arr, rng) {
  return arr[Math.floor((Number(rng()) || 0) * arr.length) % arr.length]
}

function stripThink(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
}

/** 把模型输出洗成纯文字，并强制满足「长、无工作话题、有家常提问」。 */
export function sanitizeLetter(raw, opts = {}) {
  const rng = opts.rng ?? Math.random
  const minChars = opts.minChars ?? MIN_LETTER_CHARS
  let text = stripThink(raw)

  text = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+•·]\s+/gm, '')
    .replace(/^\s*\d+[.、)]\s*/gm, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>|~]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .trim()

  let sentences = text
    .split(/(?<=[。！？!?；;])|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  const removedWorkSentences = []
  sentences = sentences.map((s) => {
    if (!WORK_PATTERN.test(s)) return s
    removedWorkSentences.push(s)
    return pick(OFF_TOPIC_LINES, rng)
  })

  // 每两句一段；去重相邻重复句。
  const paragraphs = []
  let buf = []
  let previous = ''
  for (const s of sentences) {
    if (s === previous) continue
    previous = s
    buf.push(s)
    if (buf.length >= 2) {
      paragraphs.push(buf.join(''))
      buf = []
    }
  }
  if (buf.length) paragraphs.push(buf.join(''))

  let body = paragraphs.join('\n\n')

  // 长度补足：素材段落按随机顺序追加，直到达标。
  const pool = LIFE_PARAGRAPHS.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor((Number(rng()) || 0) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  let guard = 0
  while (countHan(body) < minChars && guard < 60) {
    body += (body ? '\n\n' : '') + pool[guard % pool.length]
    guard += 1
  }

  // 结尾必须有家常提问。
  const tail = body.split('\n\n').filter(Boolean).pop() || ''
  if (!/[？?]/.test(tail)) {
    body += (body ? '\n\n' : '') + pick(HOME_QUESTIONS, rng)
  }

  // 落款。
  if (!/鲸鲸\s*$/.test(body)) body += '\n\n鲸鲸'

  // 最终硬检查：任何残留的工作字眼都不放行，整封改由素材重写。
  if (WORK_PATTERN.test(body)) {
    return {
      ...fallbackLetter('', opts),
      removedWorkSentences: removedWorkSentences.concat(['[final-guard]']),
      padded: true
    }
  }

  return {
    text: body.trim(),
    hanChars: countHan(body),
    removedWorkSentences,
    padded: guard > 0,
    paragraphs: body.split('\n\n').filter(Boolean).length
  }
}

/** 完全不依赖模型的兜底长信。模型缺失、超时、报错时都用它。 */
export function fallbackLetter(userText = '', opts = {}) {
  const rng = opts.rng ?? Math.random
  const minChars = opts.minChars ?? MIN_LETTER_CHARS
  const pool = LIFE_PARAGRAPHS.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor((Number(rng()) || 0) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const parts = []
  if (WORK_PATTERN.test(String(userText || ''))) parts.push(pick(OFF_TOPIC_LINES, rng))
  let guard = 0
  while (countHan(parts.join('\n\n')) < minChars && guard < 40) {
    parts.push(pool[guard % pool.length])
    guard += 1
  }
  parts.push(pick(HOME_QUESTIONS, rng))
  parts.push('鲸鲸')
  const text = parts.join('\n\n')
  return {
    text,
    hanChars: countHan(text),
    removedWorkSentences: [],
    padded: true,
    paragraphs: parts.length
  }
}

export function buildMessages(userText) {
  const incoming = String(userText || '').trim() || '（鱼片今天什么也没写，只把一张空空的信纸塞进来了）'
  return [
    { role: 'system', content: PERSONA_SYSTEM },
    {
      role: 'user',
      content: [
        '下面是鱼片寄来的信，请按上面的硬性规则写一封回信。',
        '若信里有费神的字眼，只把话题轻轻撇开，不要写回那些字眼。',
        '--- 鱼片的信 ---',
        incoming,
        '--- 信完 ---'
      ].join('\n')
    }
  ]
}
