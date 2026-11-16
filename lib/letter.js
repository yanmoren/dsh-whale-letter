/* 鲸鲸信箱 · 信箱界面逻辑（原生 JS，无外部依赖）
   寄信页与拆信页共用列表、状态与快速验收。 */
(function () {
  'use strict'
  var BASE = '/whale-letter'

  function $(id) { return document.getElementById(id) }
  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined && text !== null) n.textContent = String(text)
    return n
  }
  function api(p, opts) {
    return fetch(BASE + p, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
  }
  function post(p, body) {
    return api(p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
  }
  function pad(x) { return String(x).padStart(2, '0') }
  function stamp(ts) {
    if (!ts) return '—'
    var d = new Date(ts)
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  }
  function nowStamp() { return stamp(Date.now()) }

  function notice(node, text, isErr, link) {
    node.textContent = text || ''
    if (isErr) node.classList.add('err')
    else node.classList.remove('err')
    node.classList.remove('hidden')
    if (link) {
      node.appendChild(el('span', null, '  '))
      var a = el('a', null, link.text)
      a.href = link.href
      a.target = '_blank'
      a.rel = 'noopener'
      node.appendChild(a)
    }
  }

  /** BSide 式左侧信件列表 */
  function renderList(container, letters, currentId) {
    container.textContent = ''
    if (!letters || !letters.length) { container.appendChild(el('div', 'empty', '还没有信呢。')); return }
    letters.slice(0, 30).forEach(function (l) {
      var done = l.status === 'delivered'
      var item = el('a', 'letter-item' + (done ? ' done' : '') + (currentId && l.id === currentId ? ' active' : ''))
      item.href = done ? BASE + '/read?id=' + encodeURIComponent(l.id) : BASE + '/write'
      item.appendChild(el('span', 'mark'))
      var txt = el('span', 'txt')
      txt.appendChild(el('span', 'ttl', done ? (l.replyPreview || '鲸鲸寄来的一封信') : (l.countdown ? '在路上 · ' + l.countdown : '一封在路上的信')))
      txt.appendChild(el('span', 'when', stamp(l.createdAt) + (done ? '' : ' · 待送达')))
      item.appendChild(txt)
      container.appendChild(item)
    })
  }

  function loadState() { return api('/api/state') }

  /* ---------- 写错字与涂改：只作用于展示层，回信正文字段保持纯文字 ---------- */
  var TYPO_MAP = {
    '的': '得', '得': '的', '在': '再', '再': '在', '是': '事', '事': '是',
    '有': '友', '友': '有', '我': '找', '你': '您', '他': '她', '这': '着',
    '那': '哪', '很': '狠', '会': '汇', '说': '悦', '看': '着', '好': '如',
    '个': '各', '们': '门', '来': '未', '去': '云', '到': '倒', '大': '太',
    '小': '少', '心': '必', '天': '夫', '里': '理', '夜': '液', '吃': '汽',
    '饭': '饮', '白': '自', '米': '来', '光': '先', '雨': '两', '窗': '囱',
    '鲸': '惊', '鱼': '渔', '片': '斤', '啊': '阿', '呀': '牙', '呢': '泥',
    '吧': '巴', '就': '蹴', '要': '耍', '能': '熊'
  }

  function hashOf(s) {
    var h = 2166136261
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return h >>> 0
  }
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function decorateText(text, rng, budget) {
    /* BSide 原版：正文清晰手写，无错字涂改 */
    return { frag: document.createTextNode(text), plain: text }
    /* 保留旧逻辑备查（已停用）：
    var positions = []
    for (var i = 0; i < text.length; i++) if (TYPO_MAP[text[i]]) positions.push(i)
    var chosen = {}
    var n = Math.min(budget, positions.length)
    for (var k = 0; k < n; k++) {
      var pick = Math.floor(rng() * positions.length)
      chosen[positions.splice(pick, 1)[0]] = true
    }
    var frag = document.createDocumentFragment()
    var visible = ''
    var firstTypo = true
    for (var j = 0; j < text.length; j++) {
      var ch = text[j]
      if (chosen[j]) {
        var s = el('span', 'scribble')
        s.appendChild(el('span', firstTypo || rng() < .6 ? 'wrong' : 'inkblot', TYPO_MAP[ch]))
        firstTypo = false
        s.appendChild(el('span', 'fix', ch))
        frag.appendChild(s)
        visible += TYPO_MAP[ch] + ch
      } else {
        frag.appendChild(document.createTextNode(ch))
        visible += ch
      }
    }
    return { frag: frag, plain: visible }
    */
  }
  function paginate(paras, per) {
    var pages = []
    for (var i = 0; i < paras.length; i += per) pages.push(paras.slice(i, i + per))
    if (pages.length > 1 && pages[pages.length - 1].length === 1 && pages[pages.length - 1][0].trim() === '鲸鲸') {
      pages[pages.length - 2].push(pages.pop()[0])
    }
    return pages
  }

  /** 快速验收：跳过等待生成一封，用本地素材兜底，到点后给链接 */
  function doInstant(btn, onDelivered) {
    if (btn.dataset.busy === '1') return
    btn.dataset.busy = '1'
    var old = btn.textContent
    btn.textContent = '正在写…'
    post('/api/instant', { fast: true, text: '想看看信纸长什么样。' }).then(function (r) {
      if (!r.ok) throw new Error(r.error || '生成失败')
      var tries = 0
      var poll = setInterval(function () {
        tries += 1
        loadState().then(function (s) {
          var hit = (s.letters || []).find(function (l) { return l.id === r.id && l.status === 'delivered' })
          if (hit) {
            clearInterval(poll)
            btn.dataset.busy = '0'
            btn.textContent = old
            onDelivered(r.id)
          } else if (tries > 40) {
            clearInterval(poll)
            btn.dataset.busy = '0'
            btn.textContent = old
            onDelivered(null)
          }
        }).catch(function () { /* 继续轮询 */ })
      }, 600)
    }).catch(function (e) {
      btn.dataset.busy = '0'
      btn.textContent = old
      onDelivered(null, e)
    })
  }

  /* ---------------- 寄信页 ---------------- */
  function initWrite() {
    var note = $('note')
    var counter = $('counter')
    var noticeBox = $('notice')
    var list = $('letterList')
    $('writeDate').textContent = nowStamp()
    $('composeDate').textContent = nowStamp()

    function updateCounter() { counter.textContent = note.value.length + ' / 2000' }
    note.addEventListener('input', updateCounter)
    updateCounter()

    function refresh() {
      return loadState().then(function (s) {
        $('statQueued').textContent = s.queued
        $('statDelivered').textContent = s.delivered
        $('runtimeTag').textContent = s.runtime && s.runtime.ok ? '信使醒着 · 不必远行' : '信使歇脚 · 鲸鲸手写'
        renderList(list, s.letters || [])
        return s
      }).catch(function () { $('runtimeTag').textContent = '信使暂时没回话…' })
    }

    $('clearBtn').addEventListener('click', function () {
      note.value = ''
      updateCounter()
      noticeBox.classList.add('hidden')
    })

    $('sendBtn').addEventListener('click', function () {
      var text = note.value.trim()
      if (!text) { notice(noticeBox, '信纸还是空的呀，写点什么再封上吧。', true); return }
      $('sendBtn').disabled = true
      post('/api/send', { text: text }).then(function (r) {
        if (!r.ok) throw new Error(r.error || '寄信失败')
        notice(noticeBox, '封好啦，信已经上路。这封信会在 2 到 8 小时之间慢慢送到，鲸鲸会写很长很长的回信给你。')
        note.value = ''
        updateCounter()
        return refresh()
      }).catch(function (e) { notice(noticeBox, '没寄出去：' + e.message, true) })
        .finally(function () { $('sendBtn').disabled = false })
    })

    $('instantBtn').addEventListener('click', function (e) {
      e.preventDefault()
      notice(noticeBox, '正在让鲸鲸赶紧写一封……（验收用，跳过等待）')
      doInstant($('instantBtn'), function (id, err) {
        if (err) { notice(noticeBox, '没生成出来：' + err.message, true); return }
        if (!id) { notice(noticeBox, '等得有点久，去信箱列表里看看有没有到。', true); refresh(); return }
        notice(noticeBox, '信到啦，点开就能拆开看：', false, {
          text: '拆开这封信', href: BASE + '/read?id=' + encodeURIComponent(id)
        })
        refresh()
      })
    })

    refresh()
    setInterval(refresh, 15000)
  }

  /* ---------------- 拆信页 ---------------- */
  function initRead() {
    var stage = $('stage')
    var envelope = $('envelope')
    var ink = $('ink')
    var pending = $('pending')
    var headSub = $('headSub')
    var readActions = document.querySelector('.read-actions')
    var params = new URLSearchParams(location.search)
    var wantedId = params.get('id')
    var currentId = null
    var currentReply = ''

    function showPending(text) {
      stage.classList.add('hidden')
      $('openTip').classList.add('hidden')
      readActions.classList.add('hidden')
      $('keepBtn').disabled = true
      $('saveBtn').disabled = true
      $('prevPage').disabled = true
      $('nextPage').disabled = true
      pending.classList.remove('hidden')
      if (text) $('pendingText').textContent = text
    }

    var pages = []
    var pageIndex = 0

    function fill(letter) {
      currentId = letter.id
      currentReply = String(letter.reply || '')
      $('letterDate').textContent = stamp(letter.deliveredAt || letter.deliverAt)
      $('paperDate').textContent = stamp(letter.deliveredAt || letter.deliverAt)
      headSub.textContent = '鲸鲸寄来的一封信 · 寄于 ' + stamp(letter.createdAt)
      pages = paginate(currentReply.split(/\n\n+/).filter(Boolean), 2)
      pageIndex = 0
      renderPage()
    }

    function renderPage() {
      ink.textContent = ''
      var group = pages[pageIndex] || []
      var rng = mulberry32(hashOf((currentId || '') + ':' + pageIndex))
      var budget = Math.max(1, Math.round(5 / Math.max(1, pages.length)))
      group.forEach(function (txt, i) {
        var deco = decorateText(txt, rng, budget)
        var p = el('p', 'ink-line' + (txt.trim() === '鲸鲸' ? ' sign-line' : ''))
        p.dataset.text = deco.plain
        p.appendChild(deco.frag)
        p.style.animationDelay = (0.18 + i * 0.3).toFixed(2) + 's'
        ink.appendChild(p)
      })
      $('pageNum').textContent = (pageIndex + 1) + ' / ' + pages.length
      $('prevPage').disabled = pageIndex <= 0
      $('nextPage').disabled = pageIndex >= pages.length - 1
    }

    function turnTo(next) {
      if (next < 0 || next >= pages.length || next === pageIndex) return
      var paper = $('paper')
      paper.classList.add('turn-out')
      setTimeout(function () {
        pageIndex = next
        renderPage()
        paper.classList.remove('turn-out')
        paper.classList.add('turn-in')
        setTimeout(function () { paper.classList.remove('turn-in') }, 560)
      }, 420)
    }

    function refreshSide() {
      return loadState().then(function (s) {
        renderList($('letterList'), s.letters || [], currentId)
        $('unreadBadge').textContent = s.unread || 0
        $('runtimeTag').textContent = s.runtime && s.runtime.ok ? '信使醒着 · 不必远行' : '信使歇脚 · 鲸鲸手写'
      }).catch(function () {})
    }

    function loadLetter() {
      var task = wantedId
        ? api('/api/letter?id=' + encodeURIComponent(wantedId))
        : api('/api/letters').then(function (r) {
            var hit = (r.letters || []).find(function (l) { return l.status === 'delivered' })
            if (!hit) return { ok: false, error: '信箱里还没有送达的信' }
            return api('/api/letter?id=' + encodeURIComponent(hit.id))
          })
      return task.then(function (r) {
        if (!r.ok || !r.letter) { showPending(r.error || '信还在路上呢，过一阵子再来看看吧。'); return }
        if (r.letter.status !== 'delivered' || !r.letter.reply) {
          showPending('这封信还在路上，鲸鲸会按自己慢慢的速度送到，等等她呀。')
          return
        }
        fill(r.letter)
        refreshSide()
      }).catch(function (e) { showPending('信箱暂时没连上：' + e.message) })
    }

    function open() {
      if (stage.classList.contains('pulled')) return
      envelope.classList.add('open')
      stage.classList.add('pulled')
      setTimeout(function () { stage.classList.add('revealed') }, 900)
    }
    envelope.addEventListener('click', open)
    envelope.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
    })

    $('keepBtn').addEventListener('click', function () {
      if (!currentId) return
      post('/api/read', { id: currentId }).then(function () {
        headSub.textContent = headSub.textContent.replace('鲸鲸寄来的一封信', '已经收好的一封信')
        $('keepBtn').textContent = '已经收好'
        $('keepBtn').disabled = true
      }).catch(function () {})
    })

    $('saveBtn').addEventListener('click', function () {
      if (!currentReply) return
      var blob = new Blob([currentReply], { type: 'text/plain;charset=utf-8' })
      var a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = '鲸鲸的信-' + (currentId || 'letter') + '.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(function () { URL.revokeObjectURL(a.href) }, 1000)
    })

    $('replayBtn').addEventListener('click', function () {
      pageIndex = 0
      renderPage()
      stage.classList.remove('revealed', 'pulled')
      envelope.classList.remove('open')
      Array.prototype.forEach.call(ink.querySelectorAll('p'), function (p) {
        p.style.animation = 'none'
        void p.offsetWidth
        p.style.animation = ''
      })
      setTimeout(open, 560)
    })

    $('prevPage').addEventListener('click', function () { turnTo(pageIndex - 1) })
    $('nextPage').addEventListener('click', function () { turnTo(pageIndex + 1) })

    $('instantLink').addEventListener('click', function (e) {
      e.preventDefault()
      doInstant($('instantLink'), function (id) {
        if (id) location.href = BASE + '/read?id=' + encodeURIComponent(id)
        else refreshSide()
      })
    })

    loadLetter()
    refreshSide()
  }

  var page = document.body.dataset.page
  if (page === 'write') initWrite()
  else if (page === 'read') initRead()
})()
