/* ARCHE B2C · 학부모 대시보드 + 자녀(학생) 대시보드 (b2c_mockup ②③ 그대로 이식)
 * window.ArcheParentDash.mount(el, opts)  — 학부모 대시보드
 * window.ArcheChildDash.mount(el, opts)   — 자녀(학생) 대시보드
 * 데이터 없으면 목업 기본값으로 렌더(연동 전에도 화면 확인 가능).
 */
(function(){
  var CSSID='b2cd-style';
  function injectCSS(){
    if(document.getElementById(CSSID))return;
    var s=document.createElement('style'); s.id=CSSID;
    s.textContent=[
    ".b2cd{--bg:#f2f4f6;--panel:#fff;--line:#e5e8eb;--line-soft:#eef1f4;--ink:#191f28;--ink-dim:#4e5968;--ink-mute:#8b95a1;--ink-faint:#b0b8c1;--blue:#3182f6;--blue-deep:#1b64da;--blue-soft:#e8f3ff;--mint:#00b8a9;--safe:#12b76a;--safe-soft:#ecfdf3;--navy:#141a29;--gold:#c8a24a;--gold-soft:#f6efdb;--warn-soft:#fffaeb;--warn:#9a7b28;",
      "font-family:'Pretendard Variable',Pretendard,sans-serif;color:var(--ink);letter-spacing:-.012em;-webkit-font-smoothing:antialiased;line-height:1.6}",
    ".b2cd *{box-sizing:border-box}",
    ".b2cd .b2cd-view{max-width:960px;margin:0 auto;padding:22px 18px 70px}",
    ".b2cd .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:12px;font:inherit;font-weight:800;font-size:13.5px;padding:12px 16px;cursor:pointer;transition:.14s}",
    ".b2cd .btn.pri{background:var(--blue);color:#fff;box-shadow:0 4px 14px rgba(49,130,246,.26)}",
    ".b2cd .btn.pri:hover{background:var(--blue-deep)}",
    ".b2cd .btn.ghost{background:#fff;color:var(--blue-deep);border:1.5px solid #cfd9f0}",
    ".b2cd .btn.gold{background:var(--navy);color:#fff}",
    ".b2cd .btn.sm{padding:9px 13px;font-size:12.5px;border-radius:10px}",
    ".b2cd .sec-t{font-size:12.5px;font-weight:800;color:var(--ink-mute);margin:24px 4px 12px;letter-spacing:.02em;display:flex;align-items:center;gap:8px}",
    ".b2cd .sec-t .pip{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:11px}",
    ".b2cd .sec-t .pip.a{background:var(--blue-soft)}.b2cd .sec-t .pip.p{background:var(--gold-soft)}",
    ".b2cd .hero{border-radius:20px;padding:24px 24px;color:#fff;position:relative;overflow:hidden;display:flex;align-items:center;gap:16px}",
    ".b2cd .hero.blue{background:linear-gradient(135deg,#1b64da,#3182f6)}",
    ".b2cd .hero.navy{background:linear-gradient(135deg,#1A237E,#0F1548)}",
    ".b2cd .hero::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 86% 12%,rgba(255,255,255,.18),transparent 46%)}",
    ".b2cd .hero .av{position:relative;width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:22px;font-weight:900;flex:none}",
    ".b2cd .hero .who{position:relative;min-width:0}",
    ".b2cd .hero .eb{font-size:11px;font-weight:800;letter-spacing:2px;opacity:.85}",
    ".b2cd .hero h1{font-size:21px;font-weight:900;margin:5px 0 5px}",
    ".b2cd .hero .meta{font-size:12.5px;opacity:.95;display:flex;flex-wrap:wrap;gap:6px}",
    ".b2cd .hero .chip{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);border-radius:20px;padding:3px 10px;font-weight:700;font-size:11.5px}",
    ".b2cd .hero .lo{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);color:#fff;border-radius:9px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer}",
    ".b2cd .credit{margin-top:14px;background:#fff;border:1px solid #f2e2b0;border-radius:14px;padding:13px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}",
    ".b2cd .credit .ci{font-size:22px}",
    ".b2cd .credit .ct{font-size:13px;font-weight:800;color:var(--warn)}",
    ".b2cd .credit .cd{font-size:12px;color:var(--ink-dim);font-weight:500}",
    ".b2cd .credit .cta{margin-left:auto}",
    ".b2cd .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}",
    ".b2cd .card{background:#fff;border:1px solid var(--line-soft);border-radius:18px;padding:20px;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:.16s}",
    ".b2cd .card:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(25,31,40,.09);border-color:#dfe6f5}",
    ".b2cd .card::before{content:'';position:absolute;top:0;left:0;width:100%;height:4px;opacity:0;transition:.16s}",
    ".b2cd .card.a::before{background:linear-gradient(90deg,#1b64da,#3182f6);opacity:1}",
    ".b2cd .card.p::before{background:linear-gradient(90deg,var(--gold),#e6c766);opacity:1}",
    ".b2cd .card .chd{display:flex;align-items:center;gap:11px;margin-bottom:11px}",
    ".b2cd .card .ic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-size:22px;flex:none}",
    ".b2cd .card.a .ic{background:var(--blue-soft)}.b2cd .card.p .ic{background:var(--gold-soft)}",
    ".b2cd .card h3{font-size:15.5px;font-weight:800;flex:1;min-width:0}",
    ".b2cd .card h3 small{display:block;font-size:11px;color:var(--ink-mute);font-weight:600;margin-top:2px}",
    ".b2cd .badge{font-size:10.5px;font-weight:800;border-radius:99px;padding:4px 10px;white-space:nowrap;flex:none}",
    ".b2cd .b-new{background:var(--safe-soft);color:#0e8a4f}.b2cd .b-trial{background:var(--warn-soft);color:var(--warn)}.b2cd .b-off{background:#f0f2f6;color:var(--ink-mute)}.b2cd .b-done{background:var(--blue-soft);color:var(--blue-deep)}",
    ".b2cd .card .d{font-size:12.5px;color:var(--ink-dim);line-height:1.62;margin-bottom:14px;flex:1}",
    ".b2cd .card .row{display:flex;gap:8px;flex-wrap:wrap}",
    ".b2cd .card .row .btn{flex:1}",
    ".b2cd .note{font-size:11.5px;color:var(--ink-mute);text-align:center;margin-top:24px;line-height:1.75}",
    "@media(max-width:560px){.b2cd .hero{flex-direction:column;text-align:center;padding-top:44px}.b2cd .hero .meta{justify-content:center}.b2cd .grid{grid-template-columns:1fr}}"
    ].join('');
    document.head.appendChild(s);
  }
  function esc(v){return (v==null?'':String(v)).replace(/[&<>"]/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x];});}
  function el(sel){ if(typeof sel==='string')return document.getElementById(sel)||document.querySelector(sel); return sel; }

  function cardHTML(kind,o){
    var badge=o.badge?('<span class="badge '+o.badge[0]+'">'+esc(o.badge[1])+'</span>'):'';
    var rows=(o.actions||[]).map(function(a,i){return '<button class="btn '+a[0]+' sm" data-act="'+(a[2]||i)+'">'+esc(a[1])+'</button>';}).join('');
    return '<div class="card '+kind+'" data-key="'+esc(o.key||'')+'"><div class="chd"><div class="ic">'+(o.ic||'')+'</div>'
      +'<h3>'+esc(o.title)+(o.sub?'<small>'+esc(o.sub)+'</small>':'')+'</h3>'+badge+'</div>'
      +'<div class="d">'+esc(o.desc)+'</div><div class="row">'+rows+'</div></div>';
  }
  function fillGrid(container, kind, arr, onAct){
    container.innerHTML=(arr||[]).map(function(o){return cardHTML(kind,o);}).join('');
    container.addEventListener('click',function(ev){
      var btn=ev.target.closest('button[data-act]'); if(!btn)return;
      var cardEl=btn.closest('.card'); var key=cardEl&&cardEl.getAttribute('data-key');
      if(onAct)onAct(btn.getAttribute('data-act'), key, cardEl);
    });
  }

  // 학년대: 초/중/고. 노출 규칙 — 고:아르케만 · 중:아르케+펜타 · 초:펜타만
  function bandOf(g){ g=String(g||''); if(/고|N수/.test(g))return '고'; if(/중/.test(g))return '중'; if(/초/.test(g))return '초'; return '중'; }
  function visionMeta(band){ return band==='초'
    ? {key:'vision_basic',title:'펜타비전 기초',ic:'📘',recSub:'초5~6'}
    : {key:'vision_adv',title:'펜타비전 심화',ic:'📗',recSub:'중1~2'}; }
  // 학년별 펜타 코스: 초=기초+심화 / 중=심화+트랙 / 고=없음
  function pentaCards(band){
    return band==='초' ? [{key:'vision_basic',ic:'📘',title:'펜타비전 기초'},{key:'vision_adv',ic:'📗',title:'펜타비전 심화'}]
         : band==='중' ? [{key:'vision_adv',ic:'📗',title:'펜타비전 심화'},{key:'track',ic:'📙',title:'펜타트랙'}]
         : [];
  }

  /* ── ② 학부모 대시보드 ── */
  function mountParent(root, opts){
    opts=opts||{}; injectCSS(); root=el(root); if(!root)return;
    var p=opts.parent||{}, c=opts.child||{};
    var pName=p.name||'학부모', cName=c.name||'자녀', cGrade=c.grade||'';
    var credits=(opts.credits!=null)?opts.credits:4;
    var band=opts.band||bandOf(cGrade);
    var showArche=(band!=='초'), showPenta=(band!=='고');
    var vm=visionMeta(band);
    root.classList.add('b2cd');

    var arche=opts.arche||[
      {ic:'🪜',title:'진로 징검다리',key:'sr',desc:'자녀에게 진로 탐구 회차를 보내고, 완성 리포트를 받아 코칭하세요.',badge:['b-trial','체험 1회'],actions:[['pri','자녀에게 보내기','send'],['ghost','샘플 리포트','sample']]},
      {ic:'📝',title:'수행평가 도우미',key:'perf',desc:'학교 수행평가 준비 도구를 자녀에게 전달하세요.',badge:['b-trial','체험 1회'],actions:[['pri','자녀에게 보내기','send'],['ghost','샘플 리포트','sample']]}
    ];
    var penta=opts.penta||pentaCards(band).map(function(pc,i){
      return (i===0)
        ? {ic:pc.ic,title:pc.title,key:pc.key,sub:esc(cName)+' · '+(cGrade||vm.recSub)+' 권장',desc:'이번 주 회차를 보내면 자녀가 수행하고 성장 리포트가 회신됩니다.',badge:['b-new','새 리포트 1'],actions:[['gold','회차 보내기','send'],['ghost','리포트 보기','report']]}
        : {ic:pc.ic,title:pc.title,key:pc.key,sub:'다음 단계',desc:'준비되면 이 코스로 이어집니다.',badge:['b-off','미수강'],actions:[['ghost','샘플 보기','sample']]};
    });

    var toolNames=[]; if(showArche)toolNames.push('진로 징검다리·수행평가'); if(showPenta)toolNames.push('펜타');
    var creditDesc=toolNames.join(' · ')+' 각 1회 · 남은 체험 '+esc(credits)+'개';

    var html='<section class="b2cd-view">'
      +'<div class="hero blue"><button class="lo" data-lo>로그아웃</button>'
        +'<div class="av">'+esc(pName.slice(0,1))+'</div>'
        +'<div class="who"><div class="eb">ARCHE · 학부모</div><h1>'+esc(pName)+' 학부모님</h1>'
        +'<div class="meta"><span class="chip">자녀 · '+esc(cName)+(cGrade?(' ('+esc(cGrade)+')'):'')+'</span><span class="chip">학부모–학생 루프</span></div></div></div>'
      +'<div class="credit"><span class="ci">🎟️</span><div><div class="ct">체험 크레딧 사용 중</div><div class="cd">'+creditDesc+'</div></div><a class="btn pri sm cta" data-upsell>구독으로 전환</a></div>';
    if(showArche) html+='<div class="sec-t"><span class="pip a">🎓</span>아르케 · 진로/입시 역량</div><div class="grid" id="b2cd-p-arche"></div>';
    if(showPenta) html+='<div class="sec-t"><span class="pip p">✦</span>펜타 · 융합사고 역량</div><div class="grid" id="b2cd-p-penta"></div>';
    html+='<div class="note">학부모가 회차를 <b>자녀에게 보내면</b> 자녀가 직접 수행하고, 완성되면 <b>리포트가 이곳으로 회신</b>됩니다.<br>숨긴 입시기능(합격 역설계·성적 판독 등)은 B2C 화면에 노출되지 않습니다.</div>'
      +'</section>';
    root.innerHTML=html;

    if(showArche) fillGrid(root.querySelector('#b2cd-p-arche'),'a',arche,function(act,key){ if(opts.onAction)opts.onAction('arche',act,key); });
    if(showPenta) fillGrid(root.querySelector('#b2cd-p-penta'),'p',penta,function(act,key){ if(opts.onAction)opts.onAction('penta',act,key); });
    var lo=root.querySelector('[data-lo]'); if(lo)lo.addEventListener('click',function(){ if(opts.onLogout)opts.onLogout(); });
    var up=root.querySelector('[data-upsell]'); if(up)up.addEventListener('click',function(){ if(opts.onUpsell)opts.onUpsell(); });
  }

  /* ── ③ 자녀(학생) 대시보드 ── */
  function mountChild(root, opts){
    opts=opts||{}; injectCSS(); root=el(root); if(!root)return;
    var s=opts.student||{}; var name=s.name||'학생', grade=s.grade||'';
    var band=opts.band||bandOf(grade);
    var showArche=(band!=='초'), showPenta=(band!=='고');
    var vm=visionMeta(band);
    root.classList.add('b2cd');

    // 받은 과제(inbox) — 아르케 먼저, 펜타 다음 순서
    var inbox=opts.inbox;
    if(!inbox){ inbox=[];
      if(showArche) inbox.push({ic:'🪜',title:'진로 징검다리',key:'sr1',sub:'부모님이 보냄 · 3일 전',desc:'관심사 인터뷰부터 시작하는 진로 탐구.',badge:['b-done','진행 중'],actions:[['pri','이어서 하기 →','continue']]});
      if(showPenta) inbox.push({ic:vm.ic,title:vm.title+' · 3주차',key:'wb1',sub:'부모님이 보냄 · 어제',desc:'사회계약설 — 8챕터 워크북. 지금 바로 시작할 수 있어요.',badge:['b-new','NEW'],actions:[['gold','워크북 시작 →','open']]});
    }
    var arche=opts.arche||[
      {ic:'📝',title:'수행평가 도우미',key:'perf',desc:'학교 수행평가 안내문을 올리면 관점부터 함께 잡아줘요.',badge:['b-trial','체험 1회'],actions:[['pri','시작하기 →','start']]}
    ];
    var penta=opts.penta||pentaCards(band).map(function(pc,i){
      return (i===0)
        ? {ic:pc.ic,title:pc.title,key:pc.key,sub:'내 코스',desc:'받은 회차를 수행하고, 탐구 전/후 지성 레이더로 성장을 확인해요.',badge:['b-new','회차 1'],actions:[['gold','워크북 열기 →','open']]}
        : {ic:pc.ic,title:pc.title,key:pc.key,sub:'다음 단계',desc:'다음 단계로 이어지는 코스예요.',badge:['b-off','준비 중'],actions:[['ghost','미리 보기','sample']]};
    });
    var got=inbox.length;

    var html='<section class="b2cd-view">'
      +'<div class="hero navy"><button class="lo" data-lo>로그아웃</button>'
        +'<div class="av">'+esc(name.slice(0,1))+'</div>'
        +'<div class="who"><div class="eb">ARCHE · 학생</div><h1>'+esc(name)+' 학생</h1>'
        +'<div class="meta">'+(grade?'<span class="chip">'+esc(grade)+'</span>':'')+'<span class="chip">받은 과제 '+esc(got)+'</span></div></div></div>'
      +'<div class="sec-t"><span class="pip a">📩</span>부모님이 보낸 과제</div><div class="grid" id="b2cd-c-inbox"></div>';
    if(showArche) html+='<div class="sec-t"><span class="pip a">🎓</span>아르케 — 내가 할 수 있어요</div><div class="grid" id="b2cd-c-arche"></div>';
    if(showPenta) html+='<div class="sec-t"><span class="pip p">✦</span>펜타 — 오늘의 사고력</div><div class="grid" id="b2cd-c-penta"></div>';
    html+='<div class="note">받은 과제를 수행하면 결과가 부모님께 자동으로 전달돼요. 작성은 언제나 <b>학생 본인</b>이 합니다.</div>'
      +'</section>';
    root.innerHTML=html;

    fillGrid(root.querySelector('#b2cd-c-inbox'),'a',inbox,function(act,key){ if(opts.onAction)opts.onAction('inbox',act,key); });
    if(showArche) fillGrid(root.querySelector('#b2cd-c-arche'),'a',arche,function(act,key){ if(opts.onAction)opts.onAction('arche',act,key); });
    if(showPenta) fillGrid(root.querySelector('#b2cd-c-penta'),'p',penta,function(act,key){ if(opts.onAction)opts.onAction('penta',act,key); });
    var lo=root.querySelector('[data-lo]'); if(lo)lo.addEventListener('click',function(){ if(opts.onLogout)opts.onLogout(); });
  }

  window.ArcheParentDash={ mount: mountParent };
  window.ArcheChildDash={ mount: mountChild };
})();
