/* 鲸鲸信箱 · 浏览器半侧（dsh 设置页入口）
 * 手写 ModuleLoader bundle，无构建步骤；只注册一个 settings.section 面板。 */
window.__ModuleLoader__.load({
  id: 'dsh-whale-letter',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    var react = require('react')
    var h = react.createElement
    var useState = react.useState
    var useEffect = react.useEffect

    var S = {
      root: { maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: 'var(--dsw-alias-label-primary)' },
      title: { fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: 'var(--dsw-alias-label-tertiary)', margin: 0 },
      desc: { fontSize: 12, lineHeight: 1.75, color: 'var(--dsw-alias-label-tertiary)', margin: 0 },
      row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
      btn: { border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', borderRadius: 8, padding: '7px 14px', font: 'inherit', fontSize: 13, cursor: 'pointer' },
      primary: { borderColor: '#4a84c4', background: '#4a84c4', color: '#fff' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 4 },
      card: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
      k: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' },
      v: { fontSize: 17, fontWeight: 600 },
      note: { fontSize: 11.5, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 1.7 }
    }

    function Panel() {
      var pair = useState(null)
      var state = pair[0]
      var setState = pair[1]
      var busyPair = useState(false)
      var busy = busyPair[0]
      var setBusy = busyPair[1]

      function load() {
        fetch('/whale-letter/api/state').then(function (r) { return r.json() }).then(setState).catch(function () {})
      }
      useEffect(function () {
        load()
        var t = setInterval(load, 15000)
        return function () { clearInterval(t) }
      }, [])

      function instant() {
        setBusy(true)
        fetch('/whale-letter/api/instant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fast: true, text: '想看看信纸长什么样。' })
        }).then(function (r) { return r.json() }).then(function (r) {
          if (r.ok) window.open('/whale-letter/read?id=' + encodeURIComponent(r.id), '_blank')
          setTimeout(load, 2000)
        }).catch(function () {}).finally(function () { setBusy(false) })
      }

      var st = state || {}
      return h('div', { style: S.root },
        h('p', { style: S.title }, '鲸鲸信箱 · 本地来信'),
        h('p', { style: S.desc },
          '在独立页面写一封信，2 到 8 小时后桌面会弹提醒，点开是带纤维纹路的手写信。全部由插件自带的本地模型生成，不联网、不装任何额外软件。'),
        h('div', { style: S.grid },
          h('div', { style: S.card }, h('span', { style: S.k }, '在路上'), h('span', { style: S.v }, st.queued == null ? '—' : st.queued)),
          h('div', { style: S.card }, h('span', { style: S.k }, '已送达'), h('span', { style: S.v }, st.delivered == null ? '—' : st.delivered)),
          h('div', { style: S.card }, h('span', { style: S.k }, '信使'), h('span', { style: Object.assign({}, S.v, { fontSize: 12 }) }, st.runtime && st.runtime.ok ? '醒着 · 不必远行' : '歇脚 · 鲸鲸手写'))
        ),
        h('div', { style: S.row },
          h('button', { style: Object.assign({}, S.btn, S.primary), onClick: function () { window.open('/whale-letter/write', '_blank') } }, '打开寄信页'),
          h('button', { style: S.btn, onClick: function () { window.open('/whale-letter/read?latest=1', '_blank') } }, '看最近一封信'),
          h('button', { style: S.btn, disabled: busy, onClick: instant }, busy ? '正在写…' : '快速验收一封')
        ),
        h('p', { style: S.note },
          '回信固定不少于 500 字，只聊生活家常，遇到费神的话题会轻轻撇开。等待时长与电脑配置无关。'),
        st.lastError ? h('p', { style: S.note }, '上次运行提示：' + st.lastError) : null
      )
    }

    var inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          { name: 'settings.section', id: 'whale-letter', order: 27, label: '鲸鲸信箱' },
          function () { return h(Panel, {}) }
        )
      })
    }
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
