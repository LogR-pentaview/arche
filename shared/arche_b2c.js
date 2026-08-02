/* ARCHE B2C · 학부모용 메뉴 셸 (parent_menu_mockup.html 그대로 이식)
 * 아르케/펜타 2대메뉴 아코디언(초기접힘) + 비노출(관리자전용) 트레이 + 도구 페이지 라우팅.
 * 펜타 코스 페이지에는 실제 '시즌 골라담기'(ArcheSeasonPicker)를 마운트.
 * 의존: window.sb, window.ArcheSeasonPicker(선택), window.ArchePentaApp(선택).
 * 사용: ArcheParentMenu.mount(rootEl, { student:{name,grade,...}, onLogout:fn });
 */
(function(){
  var CSSID='ab2c-style';
  function injectCSS(){
    if(document.getElementById(CSSID))return;
    var s=document.createElement('style'); s.id=CSSID;
    s.textContent=[
    ".ab2c{--bg:#f2f4f6;--panel:#fff;--line:#e5e8eb;--line-soft:#eef1f4;--ink:#191f28;--ink-dim:#4e5968;--ink-mute:#8b95a1;--ink-faint:#b0b8c1;--blue:#3182f6;--blue-deep:#1b64da;--blue-soft:#e8f3ff;--mint:#00b8a9;--safe:#12b76a;--safe-soft:#ecfdf3;--navy:#141a29;--navy-2:#1b2334;--gold:#c8a24a;--lime:#b6e34a;",
      "font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;color:var(--ink);letter-spacing:-.012em;-webkit-font-smoothing:antialiased;line-height:1.6}",
    ".ab2c *{box-sizing:border-box}",
    ".ab2c .app{display:grid;grid-template-columns:264px 1fr;min-height:100vh}",
    ".ab2c .side{background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}",
    ".ab2c .side .brand{display:flex;align-items:center;gap:9px;padding:18px 18px 14px;font-size:18px;font-weight:800}",
    ".ab2c .side .brand .mk{width:30px;height:30px;border-radius:9px;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:15px;font-weight:800;box-shadow:0 4px 10px rgba(49,130,246,.3)}",
    ".ab2c .side .brand small{font-size:10.5px;font-weight:700;color:var(--ink-mute);background:var(--bg);border-radius:20px;padding:3px 9px;margin-left:auto}",
    ".ab2c .navsec{padding:6px 10px}",
    ".ab2c .navhead{display:flex;align-items:center;gap:8px;padding:11px 12px;font-size:12.5px;font-weight:800;letter-spacing:.02em;cursor:pointer;border-radius:11px;transition:.13s}",
    ".ab2c .navhead:hover{background:var(--bg)}",
    ".ab2c .navsec.penta .navhead:hover{background:#f6efdb}",
    ".ab2c .navhead .ic{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-size:12px}",
    ".ab2c .navhead .chev{margin-left:auto;font-size:10px;color:var(--ink-faint);transition:transform .2s}",
    ".ab2c .navsec.collapsed .navhead .chev{transform:rotate(-90deg)}",
    ".ab2c .navitems{overflow:hidden;transition:max-height .25s ease;max-height:400px}",
    ".ab2c .navsec.collapsed .navitems{max-height:0}",
    ".ab2c .navsec.arche .navhead{color:var(--blue-deep)}",
    ".ab2c .navsec.arche .navhead .ic{background:var(--blue-soft)}",
    ".ab2c .navsec.penta .navhead{color:#9a7b28}",
    ".ab2c .navsec.penta .navhead .ic{background:#f6efdb}",
    ".ab2c .navsec.penta{margin-top:4px;background:linear-gradient(180deg,#fcfaf3,#fff);border-radius:14px}",
    ".ab2c .grouplbl{font-size:10.5px;font-weight:800;color:var(--ink-faint);padding:8px 12px 4px;letter-spacing:.03em}",
    ".ab2c .nav-i{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:11px;cursor:pointer;transition:.13s;color:var(--ink-dim);font-size:13.5px;font-weight:600}",
    ".ab2c .nav-i:hover{background:var(--bg)}",
    ".ab2c .nav-i.on{background:var(--blue-soft);color:var(--blue-deep);font-weight:800}",
    ".ab2c .navsec.penta .nav-i.on{background:#f6efdb;color:#9a7b28}",
    ".ab2c .nav-i .emo{width:20px;text-align:center;font-size:14px;flex:none}",
    ".ab2c .nav-i .rec{margin-left:auto;font-size:10px;font-weight:700;color:var(--ink-mute);background:var(--bg);border-radius:20px;padding:2px 8px}",
    ".ab2c .nav-i.on .rec{background:rgba(255,255,255,.7)}",
    ".ab2c .side .divider{height:1px;background:var(--line-soft);margin:10px 14px}",
    ".ab2c .hidden-tray{margin:4px 10px 16px;background:#fbfcfd;border:1px dashed var(--line);border-radius:12px;padding:10px 12px}",
    ".ab2c .hidden-tray .ht{font-size:11px;font-weight:800;color:var(--ink-mute);display:flex;align-items:center;gap:6px;cursor:pointer}",
    ".ab2c .hidden-tray .ht .chev{margin-left:auto;transition:.2s;font-size:10px}",
    ".ab2c .hidden-tray.open .ht .chev{transform:rotate(180deg)}",
    ".ab2c .hidden-list{display:none;margin-top:8px;flex-wrap:wrap;gap:5px}",
    ".ab2c .hidden-tray.open .hidden-list{display:flex}",
    ".ab2c .hidden-list span{font-size:10.5px;font-weight:600;color:var(--ink-faint);background:#fff;border:1px solid var(--line-soft);border-radius:7px;padding:4px 8px;text-decoration:line-through;text-decoration-color:#d4d9df}",
    ".ab2c .hidden-note{font-size:10px;color:var(--ink-faint);font-weight:600;margin-top:8px;line-height:1.5}",
    ".ab2c .main{display:flex;flex-direction:column;min-width:0}",
    ".ab2c .topbar{height:60px;background:rgba(255,255,255,.86);backdrop-filter:blur(12px);border-bottom:1px solid var(--line-soft);display:flex;align-items:center;gap:12px;padding:0 24px;position:sticky;top:0;z-index:20}",
    ".ab2c .crumb{font-size:13px;font-weight:700;color:var(--ink-mute)}",
    ".ab2c .crumb b{color:var(--ink)}",
    ".ab2c .topbar .sp{margin-left:auto}",
    ".ab2c .stusel{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:11px;padding:7px 12px;font-size:13px;font-weight:700;cursor:pointer}",
    ".ab2c .stusel .av{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--mint));color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800}",
    ".ab2c .pbadge{font-size:11px;font-weight:800;color:var(--blue-deep);background:var(--blue-soft);border-radius:20px;padding:5px 11px}",
    ".ab2c .lobtn{border:1px solid var(--line);background:#fff;color:var(--ink-dim);border-radius:10px;padding:7px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}",
    ".ab2c .content{padding:26px 28px 60px;max-width:900px}",
    ".ab2c .pagehd{display:flex;align-items:flex-start;gap:14px;margin-bottom:6px}",
    ".ab2c .pagehd .pic{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;font-size:25px;flex:none}",
    ".ab2c .pagehd h1{font-size:24px;font-weight:800;letter-spacing:-.02em}",
    ".ab2c .pagehd .rectag{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800;border-radius:20px;padding:4px 11px;margin-left:8px;vertical-align:middle}",
    ".ab2c .pagehd p{font-size:14px;color:var(--ink-dim);font-weight:500;margin-top:7px;line-height:1.7;max-width:640px}",
    ".ab2c .cardrow{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:24px}",
    ".ab2c .card{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:20px 20px;transition:.15s}",
    ".ab2c .card:hover{border-color:var(--blue);box-shadow:0 10px 30px rgba(25,31,40,.06)}",
    ".ab2c .card .ci{width:40px;height:40px;border-radius:12px;background:var(--blue-soft);display:grid;place-items:center;font-size:19px;margin-bottom:12px}",
    ".ab2c .card h4{font-size:15px;font-weight:800}",
    ".ab2c .card p{font-size:12.5px;color:var(--ink-dim);font-weight:500;margin-top:6px;line-height:1.65}",
    ".ab2c .card .tag{margin-top:11px;font-size:11px;font-weight:700;color:var(--safe);background:var(--safe-soft);border-radius:20px;padding:4px 10px;display:inline-block}",
    ".ab2c .btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:12px;font-family:inherit;font-weight:800;cursor:pointer;font-size:13.5px;padding:11px 18px;transition:.14s}",
    ".ab2c .btn.pri{background:var(--blue);color:#fff;box-shadow:0 4px 14px rgba(49,130,246,.26)}",
    ".ab2c .btn.pri:hover{background:var(--blue-deep)}",
    ".ab2c .btn.gold{background:var(--navy);color:#fff}",
    ".ab2c .startrow{margin-top:22px;display:flex;gap:10px;flex-wrap:wrap}",
    ".ab2c .content.pentaview .pagehd .pic{background:#f6efdb}",
    ".ab2c .content.pentaview .card .ci{background:#f6efdb}",
    ".ab2c .content.pentaview .card:hover{border-color:var(--gold);box-shadow:0 10px 30px rgba(200,162,74,.12)}",
    ".ab2c .pentahero{margin-top:22px;background:linear-gradient(135deg,var(--navy),#20283c);border-radius:20px;padding:26px 26px;color:#eaf0f7;position:relative;overflow:hidden}",
    ".ab2c .pentahero::before{content:'';position:absolute;top:-100px;right:-80px;width:340px;height:340px;background:radial-gradient(closest-side,rgba(182,227,74,.12),transparent)}",
    ".ab2c .pentahero .pe{font-size:11px;font-weight:800;letter-spacing:.05em;color:var(--gold);background:rgba(200,162,74,.14);border-radius:20px;padding:4px 11px;display:inline-block}",
    ".ab2c .pentahero h3{font-size:21px;font-weight:800;color:#fff;margin-top:12px}",
    ".ab2c .pentahero .who{font-size:12.5px;color:#aab6c8;font-weight:600;margin-top:5px}",
    ".ab2c .pentahero ul{list-style:none;margin-top:16px;display:grid;gap:8px;max-width:560px}",
    ".ab2c .pentahero li{font-size:13px;color:#c3cdda;font-weight:500;padding-left:18px;position:relative}",
    ".ab2c .pentahero li::before{content:'\\25C6';position:absolute;left:0;color:var(--gold);font-size:8px;top:5px}",
    ".ab2c .freqmini{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:18px}",
    ".ab2c .fqm{background:var(--navy-2);border:1px solid #283349;border-radius:12px;padding:12px 8px;text-align:center}",
    ".ab2c .fqm .fn{font-size:10px;font-weight:800;color:var(--gold)}",
    ".ab2c .fqm .fbar{height:5px;border-radius:4px;background:#283349;margin:8px 0 7px;overflow:hidden}",
    ".ab2c .fqm .fbar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--gold),var(--lime))}",
    ".ab2c .fqm h5{font-size:11px;font-weight:800;color:#fff}",
    ".ab2c .notebar{margin-top:26px;background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:15px 17px;font-size:12px;color:var(--ink-mute);font-weight:600;line-height:1.7}",
    ".ab2c .notebar b{color:var(--ink-dim)}",
    ".ab2c .seasonmount{margin-top:22px}",
    ".ab2c #mnav-toggle{display:none}",
    "@media(max-width:820px){.ab2c .app{grid-template-columns:1fr}.ab2c .side{position:relative;height:auto}.ab2c .cardrow{grid-template-columns:1fr}}"
    ].join('');
    document.head.appendChild(s);
  }
  function esc(v){return (v==null?'':String(v)).replace(/[&<>"]/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x];});}

  var VIEWS={
   'h-jindo':{crumb:'<b>아르케</b> · 고등학생용 · 진로 징검다리', sec:'arche', pic:'🪜', picbg:'var(--blue-soft)',
     title:'진로 징검다리', rec:['고등','var(--blue-deep)','var(--blue-soft)'],
     desc:'관심사 인터뷰에서 출발해 진로로 수렴하는 탐구 주제를 발견하고, 탐구보고서의 구조를 학생이 스스로 잡아갑니다. AI는 방향·논리만 코칭하고 완성 문장은 대신 쓰지 않습니다.',
     cards:[['🎤','관심사 인터뷰','AI 질문에 학생이 직접 답하며 진로 신호를 모읍니다.','학생 자기작성'],
            ['🧭','탐구 주제 발견','인터뷰에서 나만의 탐구 주제 후보를 도출합니다.','AI 코칭'],
            ['🗂','보고서 구조 설계','서론–본론–결론 뼈대를 학생이 직접 잡습니다.','작성 코칭'],
            ['🔒','본인 작성 증명','타이핑 리듬으로 직접 썼음을 리포트로 남깁니다.','타이핑DNA']],
     start:'진로 징검다리 시작'},
   'h-suhaeng':{crumb:'<b>아르케</b> · 고등학생용 · 수행평가 도우미', sec:'arche', pic:'📝', picbg:'var(--blue-soft)',
     title:'수행평가 도우미', rec:['고등','var(--blue-deep)','var(--blue-soft)'],
     desc:'학교 안내문을 올리면 AI가 학생을 인터뷰해 관점을 스스로 고르게 하고, 그 학생만의 접근 설계도와 예상 채점 기준을 제공합니다. 작성은 학생 본인이 합니다.',
     cards:[['📄','안내문 업로드','수행평가 안내문을 올리면 핵심 요구를 분석합니다.','자동 분석'],
            ['🎤','관점 인터뷰','학생이 자기 관점을 직접 고르도록 질문합니다.','학생 선택'],
            ['🧩','접근 설계도','나만의 목차·논거 설계도를 제시합니다.','설계 코칭'],
            ['✅','예상 채점','평가 기준에 맞춰 스스로 점검합니다.','자기 점검']],
     start:'수행평가 도우미 시작'},
   'm-jindo':{crumb:'<b>아르케</b> · 중학생용 · 진로 징검다리', sec:'arche', pic:'🪜', picbg:'var(--blue-soft)',
     title:'진로 징검다리 <span style="font-size:15px;color:var(--ink-mute);font-weight:700">· 중등</span>', rec:['중등','var(--blue-deep)','var(--blue-soft)'],
     desc:'중학생 눈높이의 관심사 인터뷰로 시작해, 좋아하는 것과 잘하는 것을 진로 방향으로 이어봅니다. 고교 진학 전 나만의 탐구 씨앗을 심습니다.',
     cards:[['🎤','관심사 인터뷰','중학생 눈높이 질문으로 진로 신호를 모읍니다.','학생 자기작성'],
            ['🌱','진로 씨앗 찾기','좋아함·잘함을 진로 방향으로 연결합니다.','AI 코칭'],
            ['🗂','탐구 주제 초안','고교로 이어갈 탐구 주제를 미리 잡습니다.','작성 코칭'],
            ['🔒','본인 작성 증명','직접 썼음을 리포트로 남깁니다.','타이핑DNA']],
     start:'진로 징검다리 시작'},
   'm-suhaeng':{crumb:'<b>아르케</b> · 중학생용 · 수행평가 도우미', sec:'arche', pic:'📝', picbg:'var(--blue-soft)',
     title:'수행평가 도우미 <span style="font-size:15px;color:var(--ink-mute);font-weight:700">· 중등</span>', rec:['중등','var(--blue-deep)','var(--blue-soft)'],
     desc:'중학교 수행평가 안내문을 올리면 학생을 인터뷰해 관점을 고르게 하고, 스스로 작성하도록 설계도를 제공합니다.',
     cards:[['📄','안내문 업로드','중학교 수행평가 안내문을 분석합니다.','자동 분석'],
            ['🎤','관점 인터뷰','학생이 자기 관점을 직접 고릅니다.','학생 선택'],
            ['🧩','접근 설계도','쉬운 목차·논거 설계도를 제시합니다.','설계 코칭'],
            ['✅','예상 채점','기준에 맞춰 스스로 점검합니다.','자기 점검']],
     start:'수행평가 도우미 시작'},
   'p-basic':{crumb:'<b>펜타</b> · 펜타비전 기초', sec:'penta', course:'vision', level:'starter', pe:'STAGE 1 · 융합사고 기초',
     title:'펜타비전 기초', who:'초등 5~6학년 권장 · 학부모–학생 루프 · 온라인 구독', rec:['초5~6','#9a7b28','#f6efdb'],
     hero:['5가지 눈(5대 지성)으로 세상을 바라보는 첫 훈련','8챕터 워크북 — 아이가 직접 사고하고 쓰는 구성','읽기·영상·딜레마로 생각을 넓히는 지적 드라마','탐구 전/후 지성 확장 레이더로 성장 확인','학부모가 리포트를 읽고 아이를 이끄는 루프'],
     start:'기초 회차 보내기'},
   'p-adv':{crumb:'<b>펜타</b> · 펜타비전 심화', sec:'penta', course:'vision', level:'architecture', pe:'STAGE 1+ · 융합사고 심화',
     title:'펜타비전 심화', who:'중학 1~2학년 권장 · 학부모–학생 루프 · 온라인 구독', rec:['중1~2','#9a7b28','#f6efdb'],
     hero:['사회계약·정의·자유 등 12주제 심화 딜레마','5대 지성 주파수 정밀 진단과 성장 리포트','논지 구축·황금 문장으로 사고를 벼리는 훈련','탐구 전/후 지성 확장 레이더','학부모가 리포트를 해석해 아이와 대화'],
     start:'심화 회차 보내기'},
   'p-track':{crumb:'<b>펜타</b> · 펜타트랙', sec:'penta', course:'track', level:'', pe:'STAGE 2 · 진로 브릿지',
     title:'펜타트랙', who:'중학 3학년 · 고교 진학 브릿지 · 온라인 구독', rec:['중3','#9a7b28','#f6efdb'],
     hero:['교과 융합 인과율 해부 — 사고 가속도 훈련','진로 주파수로 관심의 방향을 구체화','고교 선택과목·활동 방향 설계','진로 내비게이터 + Arche-Log 탐구 설계','리포트로 고교 진학 로드맵 연결'],
     start:'트랙 회차 보내기'}
  };

  function toolCard(c){ return '<div class="card"><div class="ci">'+c[0]+'</div><h4>'+esc(c[1])+'</h4><p>'+esc(c[2])+'</p><span class="tag">'+esc(c[3])+'</span></div>'; }

  function mount(rootEl, opts){
    opts=opts||{}; injectCSS();
    if(typeof rootEl==='string')rootEl=document.getElementById(rootEl)||document.querySelector(rootEl);
    if(!rootEl)return;
    var stu=opts.student||{};
    var stuInitial=esc((stu.name||'자').slice(0,1));
    var stuLabel=esc(stu.name||'자녀')+(stu.grade?(' · '+esc(stu.grade)):'');
    rootEl.classList.add('ab2c');
    rootEl.innerHTML=
     '<div class="app">'
     +'<aside class="side">'
       +'<div class="brand"><span class="mk">A</span>아르케<small>학부모</small></div>'
       +'<div class="navsec arche collapsed" id="sec-arche">'
         +'<div class="navhead" data-sec="sec-arche"><span class="ic">🎓</span>아르케 <span style="font-size:10.5px;font-weight:700;color:var(--ink-faint);margin-left:2px">· 고·중등 입시/진로</span><span class="chev">▼</span></div>'
         +'<div class="navitems">'
           +'<div class="grouplbl">고등학생용</div>'
           +'<div class="nav-i" data-view="h-jindo"><span class="emo">🪜</span>진로 징검다리</div>'
           +'<div class="nav-i" data-view="h-suhaeng"><span class="emo">📝</span>수행평가 도우미</div>'
           +'<div class="grouplbl">중학생용</div>'
           +'<div class="nav-i" data-view="m-jindo"><span class="emo">🪜</span>진로 징검다리</div>'
           +'<div class="nav-i" data-view="m-suhaeng"><span class="emo">📝</span>수행평가 도우미</div>'
         +'</div>'
       +'</div>'
       +'<div class="navsec penta collapsed" id="sec-penta">'
         +'<div class="navhead" data-sec="sec-penta"><span class="ic">✦</span>펜타 <span style="font-size:10.5px;font-weight:700;color:var(--ink-faint);margin-left:2px">· 융합사고 역량</span><span class="chev">▼</span></div>'
         +'<div class="navitems">'
           +'<div class="nav-i" data-view="p-basic"><span class="emo">📘</span>펜타비전 기초<span class="rec">초5~6</span></div>'
           +'<div class="nav-i" data-view="p-adv"><span class="emo">📗</span>펜타비전 심화<span class="rec">중1~2</span></div>'
           +'<div class="nav-i" data-view="p-track"><span class="emo">📙</span>펜타트랙<span class="rec">중3</span></div>'
         +'</div>'
       +'</div>'
       +'<div class="divider"></div>'
       +'<div class="hidden-tray" id="htray">'
         +'<div class="ht" id="htray-t"><span class="lock">🔒</span>비노출 기능 (계정 내 유지)<span class="chev">▼</span></div>'
         +'<div class="hidden-list">'
           +'<span>생기부 대체 인터뷰</span><span>성적 업로드·판독</span><span>합격 역설계</span><span>학생 상담</span><span>학생 진단</span><span>성장 로드맵</span><span>이수과목 위계검증</span>'
         +'</div>'
         +'<div class="hidden-note">기능·데이터는 유지하되 학부모 화면에는 <b>노출하지 않습니다</b>. 관리자용에서만 접근.</div>'
       +'</div>'
     +'</aside>'
     +'<div class="main">'
       +'<div class="topbar"><div class="crumb" id="ab2c-crumb"><b>홈</b></div><div class="sp"></div>'
         +'<div class="stusel"><span class="av">'+stuInitial+'</span>'+stuLabel+' ▾</div>'
         +'<span class="pbadge">👨‍👩‍👧 학부모 계정</span>'
         +'<button class="lobtn" id="ab2c-logout">로그아웃</button>'
       +'</div>'
       +'<div class="content" id="ab2c-content"></div>'
     +'</div>'
     +'</div>';

    var contentEl=rootEl.querySelector('#ab2c-content');
    var crumbEl=rootEl.querySelector('#ab2c-crumb');

    function setActive(key){ rootEl.querySelectorAll('.nav-i').forEach(function(n){ n.classList.toggle('on', n.dataset.view===key); }); }

    function renderHome(){
      crumbEl.innerHTML='<b>홈</b>';
      contentEl.className='content';
      contentEl.innerHTML=
        '<div class="pagehd"><div class="pic" style="background:var(--blue-soft)">👋</div>'
        +'<div><h1>무엇부터 시작할까요?</h1><p>왼쪽 메뉴에서 <b>아르케</b>(고·중등 입시/진로) 또는 <b>펜타</b>(융합사고 역량)를 눌러 펼친 뒤, 도구를 선택하세요.</p></div></div>'
        +'<div class="cardrow">'
          +'<div class="card" style="cursor:pointer" data-home="sec-arche"><div class="ci">🎓</div><h4>아르케</h4><p>고등·중등 학생의 진로 징검다리 · 수행평가 도우미. 학생 본인이 인터뷰·작성하는 입시/진로 도구.</p><span class="tag">고1~중1 · 입시/진로</span></div>'
          +'<div class="card" style="cursor:pointer;border-color:#eadfba" data-home="sec-penta"><div class="ci" style="background:#f6efdb">✦</div><h4>펜타</h4><p>초5~중3의 융합사고 역량 코스. 펜타비전 기초·심화, 펜타트랙으로 사고력을 단계별로 키웁니다.</p><span class="tag" style="color:#9a7b28;background:#f6efdb">초5~중3 · 융합사고</span></div>'
        +'</div>'
        +'<div class="notebar">🔒 <b>본인 작성 원칙</b> — 모든 도구는 학생 본인의 인터뷰·입력에서 출발하며, 타인의 학교생활기록부를 수집·분석하지 않습니다. 성적표는 성적만 판독합니다.</div>';
      contentEl.querySelectorAll('[data-home]').forEach(function(c){ c.addEventListener('click',function(){ toggleSec(c.dataset.home); }); });
      setActive(null);
    }

    function render(key){
      var v=VIEWS[key]; if(!v){ renderHome(); return; }
      crumbEl.innerHTML=v.crumb;
      var rectag='<span class="rectag" style="color:'+v.rec[1]+';background:'+v.rec[2]+'">👦 '+v.rec[0]+' 권장</span>';
      if(v.sec==='arche'){
        contentEl.className='content';
        contentEl.innerHTML=
          '<div class="pagehd"><div class="pic" style="background:'+v.picbg+'">'+v.pic+'</div>'
          +'<div><h1>'+v.title+rectag+'</h1><p>'+esc(v.desc)+'</p></div></div>'
          +'<div class="cardrow">'+v.cards.map(toolCard).join('')+'</div>'
          +'<div class="startrow"><button class="btn pri" data-start="'+key+'">▶ '+esc(v.start)+'</button><button class="btn" style="background:#fff;border:1px solid var(--line);color:var(--ink-dim)">이전 기록 보기</button></div>'
          +'<div class="notebar">🔒 <b>본인 작성 원칙</b> — 모든 도구는 학생 본인의 인터뷰·입력에서 출발하며, 타인의 학교생활기록부를 수집·분석하지 않습니다. 성적표는 성적만 판독합니다.</div>';
      } else {
        contentEl.className='content pentaview';
        contentEl.innerHTML=
          '<div class="pagehd"><div class="pic">'+ (key==='p-basic'?'📘':key==='p-adv'?'📗':'📙') +'</div>'
          +'<div><h1>'+v.title+rectag+'</h1><p style="color:var(--ink-mute)">'+esc(v.who)+'</p></div></div>'
          +'<div class="pentahero"><span class="pe">'+esc(v.pe)+'</span><h3>'+esc(v.title)+'</h3><div class="who">'+esc(v.who)+'</div>'
            +'<ul>'+v.hero.map(function(h){return '<li>'+esc(h)+'</li>';}).join('')+'</ul>'
            +'<div class="freqmini">'
              +'<div class="fqm"><div class="fn">F1</div><div class="fbar"><i style="width:82%"></i></div><h5>수학·논리</h5></div>'
              +'<div class="fqm"><div class="fn">F2</div><div class="fbar"><i style="width:68%"></i></div><h5>과학·기술</h5></div>'
              +'<div class="fqm"><div class="fn">F3</div><div class="fbar"><i style="width:74%"></i></div><h5>역사·사회</h5></div>'
              +'<div class="fqm"><div class="fn">F4</div><div class="fbar"><i style="width:60%"></i></div><h5>심리·인지</h5></div>'
              +'<div class="fqm"><div class="fn">F5</div><div class="fbar"><i style="width:70%"></i></div><h5>예술·디자인</h5></div>'
            +'</div></div>'
          +'<div class="startrow"><button class="btn gold" data-start="'+key+'">▶ '+esc(v.start)+'</button><button class="btn" style="background:#fff;border:1px solid var(--line);color:var(--ink-dim)">회차 목록 보기</button></div>'
          +'<div class="seasonmount" id="ab2c-season"></div>';
        // 실제 시즌 골라담기 마운트
        var sm=contentEl.querySelector('#ab2c-season');
        if(window.ArcheSeasonPicker && sm){
          ArcheSeasonPicker.mount(sm,{course:v.course,level:v.level||'starter',studentId:stu.id,
            onStart:function(p,lv){ if(opts.onSeasonStart)opts.onSeasonStart(p, lv?Object.assign({},v,{level:lv}):v); },
            onTrial:function(p,lv){ if(opts.onSeasonTrial)opts.onSeasonTrial(p, lv?Object.assign({},v,{level:lv}):v); },
            onOpen:function(p,lv){ if(opts.onSeasonOpen)opts.onSeasonOpen(p, lv?Object.assign({},v,{level:lv}):v); }});
        } else if(sm){ sm.innerHTML=''; }
      }
      setActive(key);
      // 시작 버튼 훅
      var sb2=contentEl.querySelector('[data-start]');
      if(sb2)sb2.addEventListener('click',function(){ if(opts.onToolStart)opts.onToolStart(key,v); });
      window.scrollTo({top:0,behavior:'smooth'});
    }

    function toggleSec(id){
      var sec=rootEl.querySelector('#'+id);
      var willOpen=sec.classList.contains('collapsed');
      rootEl.querySelectorAll('.navsec').forEach(function(s){ s.classList.add('collapsed'); });
      if(willOpen) sec.classList.remove('collapsed');
    }

    // 이벤트 바인딩
    rootEl.querySelectorAll('.navhead').forEach(function(h){ h.addEventListener('click',function(){ toggleSec(h.dataset.sec); }); });
    rootEl.querySelectorAll('.nav-i').forEach(function(n){ n.addEventListener('click',function(){ render(n.dataset.view); }); });
    rootEl.querySelector('#htray-t').addEventListener('click',function(){ rootEl.querySelector('#htray').classList.toggle('open'); });
    var lo=rootEl.querySelector('#ab2c-logout'); if(lo)lo.addEventListener('click',function(){ if(opts.onLogout)opts.onLogout(); });

    renderHome();
    return { render: render, home: renderHome };
  }

  window.ArcheParentMenu={ mount: mount };
})();
