#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""由 lib/letter.css + lib/read.html 生成自包含的 preview.html。
样式或拆信逻辑改完后重跑本脚本，静态预览会与真实页面保持一致。"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

css = (ROOT / 'lib' / 'letter.css').read_text(encoding='utf-8')
css = css.replace("url('/whale-letter/font-longcang')", "url('./lib/assets/LongCang-Regular.ttf')")
css = css.replace("url('/whale-letter/font')", "url('./lib/assets/MaShanZheng-Regular.ttf')")

html = (ROOT / 'lib' / 'read.html').read_text(encoding='utf-8')
html = html.replace('<title>鲸鲸寄来的一封信</title>', '<title>鲸鲸信箱 · 静态效果预览</title>')
html = html.replace(
    '<link rel="stylesheet" href="/whale-letter/letter.css">',
    '<style>\n' + css + '\n</style>'
)

JS = r"""
var TEXT = [
  '鱼片呀，展信安。今天窗外的光是那种淡淡的、有点困的黄，趴在桌沿上就能看见一小片。鲸鲸把蓝头发拢到耳朵后面，尾巴在椅子腿边慢慢摇，忽而想起还没给你写信，才慌慌张张把纸铺平。纸有点凉，摸上去细细的，像刚晒过的被子边角。你那边今天有没有好好吃饭呀，白饭要盛得满满的才安心呢。',
  '中午的饭蒸得软软的，米粒一颗一颗都胖乎乎，碗沿冒着白气。鲸鲸抱着碗吃了两口，就觉得整个人都暖起来了，连尾巴尖都懒得动。碗底还剩一点点锅巴，用勺子轻轻刮起来，脆脆的，像一口很小很小的晴天。要是你在，我就把那颗最白的米粒夹给你，真的，不骗你。',
  '窗台上那盆绿萝又长出一截，嫩得有点透明，叶尖上挂着一小滴水，半天也不肯落下来。鲸鲸趴着看了好久，看到眼睛都发酸，最后还是没等它掉下来。后来风从纱窗缝里钻进来，叶子晃了晃，那滴水才悄悄没了。这种没什么用处的小事，不知道为什么，记下来就觉得今天没白过。',
  '下午困得厉害，就把脸埋进被子里。被子上午晒过，有一股太阳的味道，暖烘烘的，还带一点点洗衣皂的香。鲸鲸本来只想眯一小会儿，结果一睁眼，天都变成橘子色了。头发睡得乱七八糟，翘着一缕怎么按都按不下去，索性不管它啦，反正鱼片又看不见，嘻嘻。',
  '楼下那只三花猫今天又蹲在花坛边，尾巴卷成一个圆。鲸鲸隔着窗户跟它对了会儿眼，它先眨的，算它赢。后来它翻了个身，把肚皮摊给太阳，四只爪子全都松松地摊开，看得我也跟着打了个哈欠。猫真会过日子呀，什么都不急，慢慢躺着就把一整个下午过完了。',
  '傍晚出去走了一小圈。路灯一盏一盏亮起来，光是暖黄的，把影子拉得长长的，走两步就踩到自己的尾巴尖。街角有人在煮汤，香气一阵一阵飘过来，说不清是玉米还是萝卜，反正闻着就想回家。鲸鲸把围巾往上拢了拢，慢慢走，鞋底踩到一片干叶子，咔嚓一声，很轻很轻。',
  '夜里下了会儿小雨，雨点打在雨棚上，密密的，像谁在轻轻翻书。鲸鲸把窗子关小一点，留一条缝，风就带着潮气钻进来，凉丝丝的。桌上的灯是暖的，照得纸面泛出一点点毛边，笔尖落下去，墨会慢慢洇开一小圈，像一朵很淡很淡的云。这种时候写信最合适啦。',
  '你今天有没有好好吃一碗热热的白饭呀，米饭是不是也蒸得胖乎乎的？',
  '鲸鲸'
];

var TYPO_MAP = {
  '的':'得','得':'的','在':'再','再':'在','是':'事','事':'是','有':'友','友':'有',
  '我':'找','你':'您','他':'她','这':'着','那':'哪','很':'狠','会':'汇','说':'悦',
  '看':'着','好':'如','个':'各','们':'门','来':'未','去':'云','到':'倒','大':'太',
  '小':'少','心':'必','天':'夫','里':'理','夜':'液','吃':'汽','饭':'饮','白':'自',
  '米':'来','光':'先','雨':'两','窗':'囱','鲸':'惊','鱼':'渔','片':'斤','啊':'阿',
  '呀':'牙','呢':'泥','吧':'巴','就':'蹴','要':'耍','能':'熊'
};
function hashOf(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry32(seed){return function(){seed|=0;seed=(seed+0x6D2B79F5)|0;var t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function decorateText(text,rng,budget){
  var pos=[];for(var i=0;i<text.length;i++)if(TYPO_MAP[text[i]])pos.push(i);
  var chosen={},n=Math.min(budget,pos.length);
  for(var k=0;k<n;k++){var p=Math.floor(rng()*pos.length);chosen[pos.splice(p,1)[0]]=true}
  var frag=document.createDocumentFragment(),visible='',firstTypo=true;
  for(var j=0;j<text.length;j++){
    var ch=text[j];
    if(chosen[j]){
      var s=el('span','scribble');
      s.appendChild(el('span',firstTypo||rng()<.6?'wrong':'inkblot',TYPO_MAP[ch]));
      firstTypo=false;
      s.appendChild(el('span','fix',ch));
      frag.appendChild(s);visible+=TYPO_MAP[ch]+ch;
    }else{frag.appendChild(document.createTextNode(ch));visible+=ch}
  }
  return {frag:frag,plain:visible};
}
function paginate(paras,per){
  var pages=[];
  for(var i=0;i<paras.length;i+=per)pages.push(paras.slice(i,i+per));
  if(pages.length>1&&pages[pages.length-1].length===1&&pages[pages.length-1][0].trim()==='鲸鲸'){
    pages[pages.length-2].push(pages.pop()[0]);
  }
  return pages;
}
function pad(x){return String(x).padStart(2,'0')}
function stamp(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' · '+pad(d.getHours())+':'+pad(d.getMinutes())}
var now=new Date(),sent=new Date(now.getTime()-4*3600*1000);
document.getElementById('letterDate').textContent=stamp(now);
document.getElementById('paperDate').textContent=stamp(now);
document.getElementById('headSub').textContent='鲸鲸寄来的一封信 · 寄于 '+stamp(sent);
document.getElementById('unreadBadge').textContent='1';
document.getElementById('runtimeTag').textContent='信使醒着 · 不必远行';

var list=document.getElementById('letterList');
list.textContent='';
[
  {title:'鲸鲸寄来的一封信',when:stamp(now),done:true,active:true},
  {title:'在路上 · 3 小时 12 分',when:stamp(sent)+' · 待送达',done:false,active:false},
  {title:'在路上 · 6 小时 40 分',when:stamp(sent)+' · 待送达',done:false,active:false}
].forEach(function(l){
  var a=el('a','letter-item'+(l.done?' done':'')+(l.active?' active':''));
  a.href='#';a.appendChild(el('span','mark'));
  var t=el('span','txt');t.appendChild(el('span','ttl',l.title));t.appendChild(el('span','when',l.when));
  a.appendChild(t);a.addEventListener('click',function(e){e.preventDefault()});list.appendChild(a);
});

var ink=document.getElementById('ink');
var pages=paginate(TEXT,2),pageIndex=0;
function renderPage(){
  ink.textContent='';
  var group=pages[pageIndex]||[];
  var rng=mulberry32(hashOf('preview:'+pageIndex));
  var budget=Math.max(1,Math.round(5/Math.max(1,pages.length)));
  group.forEach(function(txt,i){
    var d=decorateText(txt,rng,budget);
    var p=el('p','ink-line'+(txt.trim()==='鲸鲸'?' sign-line':''));
    p.dataset.text=d.plain;p.appendChild(d.frag);
    p.style.animationDelay=(0.18+i*0.3).toFixed(2)+'s';
    ink.appendChild(p);
  });
  document.getElementById('pageNum').textContent=(pageIndex+1)+' / '+pages.length;
  document.getElementById('prevPage').disabled=pageIndex<=0;
  document.getElementById('nextPage').disabled=pageIndex>=pages.length-1;
}
function turnTo(n){
  if(n<0||n>=pages.length||n===pageIndex)return;
  var paper=document.getElementById('paper');
  paper.classList.add('turn-out');
  setTimeout(function(){
    pageIndex=n;renderPage();
    paper.classList.remove('turn-out');paper.classList.add('turn-in');
    setTimeout(function(){paper.classList.remove('turn-in')},560);
  },420);
}
renderPage();
document.getElementById('prevPage').addEventListener('click',function(){turnTo(pageIndex-1)});
document.getElementById('nextPage').addEventListener('click',function(){turnTo(pageIndex+1)});

var stage=document.getElementById('stage'),envelope=document.getElementById('envelope');
function open(){
  if(stage.classList.contains('pulled'))return;
  envelope.classList.add('open');stage.classList.add('pulled');
  setTimeout(function(){stage.classList.add('revealed')},900);
}
envelope.addEventListener('click',open);
if(new URLSearchParams(location.search).has('open'))open();
document.getElementById('replayBtn').addEventListener('click',function(){
  pageIndex=0;renderPage();
  stage.classList.remove('revealed','pulled');envelope.classList.remove('open');
  Array.prototype.forEach.call(ink.querySelectorAll('p'),function(p){
    p.style.animation='none';void p.offsetWidth;p.style.animation='';
  });
  setTimeout(open,560);
});
document.getElementById('saveBtn').addEventListener('click',function(){
  var blob=new Blob([TEXT.join('\n\n')],{type:'text/plain;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='鲸鲸的信.txt';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
});
document.getElementById('keepBtn').addEventListener('click',function(){this.textContent='已经收好';this.disabled=true});
document.getElementById('instantLink').addEventListener('click',function(e){e.preventDefault();this.textContent='静态预览 · 无需生成'});
"""

html = html.replace(
    '<script src="/whale-letter/letter.js"></script>',
    '<script>\n' + JS + '\n</script>'
)
(ROOT / 'preview.html').write_text(html, encoding='utf-8')
print('preview.html 已生成：' + str(len(html)) + ' 字符')
