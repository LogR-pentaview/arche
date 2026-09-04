/* ============================================================================
 * course_picker.js · 학원용 코스웨어 · 회차 선택기 (시리즈로 명확히 구분)
 * ----------------------------------------------------------------------------
 * 문제: 시즌/주차만 나열하면 기초·심화·트랙이 섞여 헷갈림.
 * 해결: 시리즈(레벨) → 시즌 → 회차 3단계. 시리즈마다 색·아이콘·대상 명시.
 *       트랙은 일반/특목 반 등급까지 선택.
 * 사용:
 *   ArcheCoursePicker.mount(el, {
 *     catalog: [{id,level,season,week,theme,title,grade_band|grade,dur,has_tier|tier}],
 *     onPick: function(id, opt){ opt={level, tier} }   // 회차 확정 시
 *   });
 *   catalog 미지정 시 window.sb.rpc('penta_academy_catalog_list') 자동 로드.
 * ==========================================================================*/
(function () {
  "use strict";

  var SERIES = [
    { key: 'starter',      label: '비전 기초', grade: '초 5~6',    icon: '🌱', color: '#c8a24a', dur: '120분', desc: '이야기로 사고력을 키우는 융합 워크북' },
    { key: 'architecture', label: '비전 심화', grade: '중 1~2',    icon: '🏛', color: '#6366f1', dur: '120분', desc: '개념·논지·5대 지성 심화' },
    { key: 'track',        label: '트랙',      grade: '중 3 · 입시', icon: '🎯', color: '#3fa34d', dur: '90분',  desc: '시사 융합 · 진로 · 일반/특목', tier: true },
    { key: 'master',       label: '지성 다이빙', grade: '중·고등',   icon: '🔷', color: '#0ea5e9', dur: '120분', desc: '공학 윤리 특별편' }
  ];
  function ser(k){ for(var i=0;i<SERIES.length;i++) if(SERIES[i].key===k) return SERIES[i]; return {key:k,label:k,grade:'',icon:'📘',color:'#8b95a1',dur:'',desc:''}; }

  var CSS = "\
.cpk{--line:#e9ecf1;--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--bg:#f5f6f8;max-width:520px;margin:0 auto;font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,sans-serif;color:var(--ink);word-break:keep-all}\
.cpk *{box-sizing:border-box}\
.cpk-bc{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mute);margin:2px 2px 12px;flex-wrap:wrap}\
.cpk-bc b{color:var(--ink)}\
.cpk-bc .bk{background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px 10px;font-weight:700;color:var(--dim);cursor:pointer;font-size:12px}\
.cpk-bc .sep{color:#c9cfd8}\
.cpk-h{font-size:15px;font-weight:800;margin:0 2px 10px}\
.cpk-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}\
.cpk-sc{position:relative;text-align:left;background:#fff;border:1.5px solid var(--line);border-radius:16px;padding:15px 14px;cursor:pointer;transition:.12s;overflow:hidden}\
.cpk-sc:active{transform:scale(.98)}\
.cpk-sc::before{content:'';position:absolute;top:0;left:0;width:100%;height:5px;background:var(--c)}\
.cpk-sc .ic{font-size:26px;line-height:1}\
.cpk-sc .lb{font-size:16px;font-weight:900;margin:9px 0 2px}\
.cpk-sc .gr{display:inline-block;font-size:11px;font-weight:800;color:#fff;background:var(--c);border-radius:20px;padding:3px 9px;margin-bottom:7px}\
.cpk-sc .ds{font-size:12px;color:var(--dim);line-height:1.5}\
.cpk-sc .mt{font-size:11px;color:var(--mute);margin-top:8px;font-weight:700}\
.cpk-tier{display:flex;gap:8px;margin:0 2px 14px}\
.cpk-tier button{flex:1;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:11px;font-family:inherit;font-size:13px;font-weight:800;color:var(--dim);cursor:pointer}\
.cpk-tier button.on{border-color:var(--c);color:#fff;background:var(--c)}\
.cpk-tier button small{display:block;font-size:10.5px;font-weight:600;opacity:.85;margin-top:2px}\
.cpk-seasons{display:flex;gap:7px;overflow-x:auto;padding:2px 2px 10px;-webkit-overflow-scrolling:touch}\
.cpk-seasons::-webkit-scrollbar{height:0}\
.cpk-seasons button{flex:none;background:#fff;border:1.5px solid var(--line);border-radius:20px;padding:7px 14px;font-family:inherit;font-size:12.5px;font-weight:800;color:var(--dim);cursor:pointer;white-space:nowrap}\
.cpk-seasons button.on{border-color:var(--c);color:#fff;background:var(--c)}\
.cpk-weeks{display:flex;flex-direction:column;gap:8px}\
.cpk-wk{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid var(--line);border-radius:13px;padding:12px 14px;cursor:pointer;text-align:left;transition:.12s}\
.cpk-wk:active{transform:scale(.99)}\
.cpk-wk .no{flex:none;width:38px;height:38px;border-radius:11px;background:var(--cs);color:var(--c);display:grid;place-items:center;font-weight:900;font-size:13px}\
.cpk-wk .tx{min-width:0;flex:1}\
.cpk-wk .th{font-size:11px;color:var(--mute);font-weight:700;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.cpk-wk .ti{font-size:14px;font-weight:800;line-height:1.35}\
.cpk-wk .go{flex:none;color:var(--c);font-size:18px;font-weight:900}\
.cpk-empty{padding:26px;text-align:center;color:var(--mute);font-size:13px}\
";

  function inject(){ if(!document.getElementById('cpk-css')){var s=document.createElement('style');s.id='cpk-css';s.textContent=CSS;document.head.appendChild(s);} }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function el(h){var t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild;}
  function hex2rgba(hex,a){var m=hex.replace('#','');var r=parseInt(m.substr(0,2),16),g=parseInt(m.substr(2,2),16),b=parseInt(m.substr(4,2),16);return 'rgba('+r+','+g+','+b+','+a+')';}

  function mount(host, opts){
    inject();
    opts = opts || {};
    var onPick = opts.onPick || function(){};
    var root = document.createElement('div'); root.className='cpk';
    host.innerHTML=''; host.appendChild(root);

    var st = { view:'series', series:null, season:null, tier:'일반', catalog:opts.catalog||null };

    function load(){
      if(st.catalog){ render(); return; }
      root.innerHTML = '<div class="cpk-empty">회차를 불러오는 중…</div>';
      if(window.sb && window.sb.rpc){
        window.sb.rpc('penta_academy_catalog_list').then(function(r){
          if(r.error){ root.innerHTML='<div class="cpk-empty">회차를 불러오지 못했어요: '+esc(r.error.message)+'</div>'; return; }
          st.catalog = (r.data||[]).map(norm); render();
        });
      } else { root.innerHTML='<div class="cpk-empty">로그인 후 회차 목록이 표시됩니다.</div>'; }
    }
    function norm(c){ return { id:c.id, level:c.level, season:+c.season, week:+c.week, theme:c.theme, title:c.title,
      grade:(c.grade_band||c.grade||''), tier:(c.has_tier!=null?c.has_tier:c.tier)||false }; }

    function of(level){ return (st.catalog||[]).filter(function(c){return c.level===level;}); }
    function seasonsOf(level){ var s={}; of(level).forEach(function(c){s[c.season]=1;}); return Object.keys(s).map(Number).sort(function(a,b){return a-b;}); }

    function render(){
      if(st.view==='series') return renderSeries();
      return renderCourses();
    }

    function renderSeries(){
      var avail = SERIES.filter(function(s){ return of(s.key).length>0; });
      var cards = avail.map(function(s){
        var n = of(s.key).length;
        return '<button class="cpk-sc" data-s="'+s.key+'" style="--c:'+s.color+'">'
          +'<div class="ic">'+s.icon+'</div>'
          +'<div class="lb">'+esc(s.label)+'</div>'
          +'<span class="gr">'+esc(s.grade)+'</span>'
          +'<div class="ds">'+esc(s.desc)+'</div>'
          +'<div class="mt">'+n+'강 · '+esc(s.dur)+(s.tier?' · 일반/특목':'')+'</div></button>';
      }).join('');
      root.innerHTML = '<div class="cpk-h">어떤 과정을 여시겠어요?</div><div class="cpk-grid">'+cards+'</div>';
      [].forEach.call(root.querySelectorAll('.cpk-sc'), function(b){
        b.addEventListener('click', function(){ st.series=b.getAttribute('data-s'); st.season=seasonsOf(st.series)[0]||null; st.tier='일반'; st.view='courses'; render(); });
      });
    }

    function renderCourses(){
      var s = ser(st.series), c = s.color, cs = hex2rgba(c,0.12);
      var seasons = seasonsOf(st.series);
      var seasonChips = seasons.map(function(n){ return '<button class="'+(n===st.season?'on':'')+'" data-se="'+n+'" style="--c:'+c+'">시즌 '+n+'</button>'; }).join('');
      var tierBar = s.tier ? ('<div class="cpk-tier" style="--c:'+c+'">'
          +'<button data-tier="일반" class="'+(st.tier==='일반'?'on':'')+'">🎒 일반반<small>기본 토론 과정</small></button>'
          +'<button data-tier="특목" class="'+(st.tier==='특목'?'on':'')+'">🏅 특목반<small>+반론재반론·논술·면접</small></button></div>') : '';
      var weeks = of(st.series).filter(function(x){return x.season===st.season;}).sort(function(a,b){return a.week-b.week;});
      var list = weeks.length ? weeks.map(function(w){
        return '<button class="cpk-wk" data-id="'+w.id+'" style="--c:'+c+';--cs:'+cs+'">'
          +'<div class="no">'+w.week+'주</div>'
          +'<div class="tx"><div class="th">'+esc(w.theme||'')+'</div><div class="ti">'+esc(w.title)+'</div></div>'
          +'<div class="go">›</div></button>';
      }).join('') : '<div class="cpk-empty">이 시즌엔 회차가 없어요.</div>';
      root.innerHTML = '<div class="cpk-bc"><button class="bk">← 과정</button><span class="sep">/</span>'
        +'<span>'+s.icon+' <b>'+esc(s.label)+'</b> · '+esc(s.grade)+(s.tier?(' · <b>'+esc(st.tier)+'반</b>'):'')+'</span></div>'
        + tierBar
        + '<div class="cpk-seasons">'+seasonChips+'</div>'
        + '<div class="cpk-weeks">'+list+'</div>';
      root.querySelector('.bk').addEventListener('click', function(){ st.view='series'; render(); });
      [].forEach.call(root.querySelectorAll('.cpk-seasons button'), function(b){ b.addEventListener('click', function(){ st.season=+b.getAttribute('data-se'); render(); }); });
      [].forEach.call(root.querySelectorAll('.cpk-tier button'), function(b){ b.addEventListener('click', function(){ st.tier=b.getAttribute('data-tier'); render(); }); });
      [].forEach.call(root.querySelectorAll('.cpk-wk'), function(b){ b.addEventListener('click', function(){ onPick(+b.getAttribute('data-id'), { level:st.series, tier:(s.tier?st.tier:null) }); }); });
    }

    load();
    return { root:root, state:st };
  }

  window.ArcheCoursePicker = { mount: mount, SERIES: SERIES };
})();
