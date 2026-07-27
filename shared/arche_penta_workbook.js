/* ============================================================================
 * arche_penta_workbook.js · 펜타 시리즈 데이터 기반 워크북 엔진 (v2 · 스텝 위저드)
 * ----------------------------------------------------------------------------
 * 목적: 회차 콘텐츠(penta_catalog.content)를 받아 목업 수준의 다단계 인터랙티브
 *       워크북을 렌더하고, 학생이 [제출]만 누르면 save_penta_submission RPC로 저장.
 *       (컨설턴트가 회차만 선택 → 학생 진행 → 제출 → 리포트 생성 흐름)
 *
 *  v2 변경점(디자인 개편):
 *   · 단일 스크롤 → 스텝 위저드(표지 → 오늘의 순서 → 스테이지별 페이지)
 *   · 상단 스텝 칩 + 진행바, 하단 이전/다음/제출 내비게이션(고정)
 *   · text 블록 = 2단(질문 navy박스 / 답변 박스) 목업 레이아웃
 *   · radar = SVG 오각형 + 슬라이더 나란히, 후(after)엔 성장률 태그
 *   · scale(compass) = 큰 컴퍼스 바, read/info = 카드, video = 링크 버튼
 *   · 인쇄(print) 지원
 *
 * API(이전과 동일):
 *   ArchePentaWorkbook.render(mount, opts)
 *     opts = {
 *       lesson : {stage,level,season,week,theme,title,subtitle,gradeBand,
 *                 radarAxes:[5], intro, stages:[{key,name,icon,desc,blocks:[...]}],
 *                 submit:{label,note}},
 *       academyId, studentId,               // 미지정 시 window._acadId / window._activeStudent 사용
 *       mode      : 'live'|'preview',        // preview는 실제 저장 안 함
 *       prefill   : {answers, radar_before, radar_after, compass},  // 재열람용(선택)
 *       readOnly  : false,
 *       submitFn  : function(data){...},     // 커스텀 저장 훅(선택)
 *       submitOkText, onSubmit
 *     }
 *   반환: { root, state, collect(), go(i) }
 * 블록 타입: info · read · video · stats · radar · scale · text · choice · career
 * ==========================================================================*/
(function () {
  "use strict";

  var CSS = ""
    // ── 컨테이너/폰트 ─────────────────────────────────────────────
    + ".apw{--navy:#1A237E;--navy2:#0F1548;--gold:#D4AF37;--golds:#E8D9A0;--ink:#243244;--muted:#6b7688;--line:#e6e9f0;--sky:#eaf1ff;--cream:#FFFDF4;max-width:900px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:var(--ink);line-height:1.85}"
    + ".apw *{box-sizing:border-box}"
    + ".apw .serif{font-family:'Playfair Display',serif}"
    // ── 상단 스텝바 ───────────────────────────────────────────────
    + ".apw .apw-top{position:sticky;top:0;z-index:6;background:rgba(15,21,72,.97);backdrop-filter:blur(8px);color:#fff;border-bottom:3px solid var(--gold);border-radius:14px 14px 0 0;margin-bottom:2px}"
    + ".apw .apw-topin{padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}"
    + ".apw .apw-brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:14px}"
    + ".apw .apw-mk{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--gold),#b8860b);color:var(--navy2);display:grid;place-items:center;font-family:'Playfair Display',serif;font-weight:900}"
    + ".apw .apw-brand small{display:block;color:var(--golds);font-weight:500;font-size:10.5px;letter-spacing:.5px;line-height:1;margin-top:2px}"
    + ".apw .apw-steps{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}"
    + ".apw .apw-steps button{background:transparent;border:1px solid rgba(255,255,255,.25);color:#cdd2ea;padding:5px 10px;border-radius:20px;font-size:11.5px;cursor:pointer;font-family:inherit;font-weight:600;white-space:nowrap}"
    + ".apw .apw-steps button.on{background:var(--gold);border-color:var(--gold);color:var(--navy2);font-weight:800}"
    + ".apw .apw-steps button.done{color:#fff;border-color:rgba(212,175,55,.55)}"
    + ".apw .apw-prog{height:4px;background:rgba(255,255,255,.15)}"
    + ".apw .apw-prog>i{display:block;height:100%;background:var(--gold);width:0;transition:width .3s;border-radius:0 0 0 0}"
    // ── 뷰/페이지 ─────────────────────────────────────────────────
    + ".apw .apw-view{display:none;padding:20px 0 6px}"
    + ".apw .apw-view.on{display:block;animation:apwfade .3s}"
    + "@keyframes apwfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"
    + ".apw .page{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 8px 30px rgba(16,21,72,.08);padding:26px 24px;margin-bottom:16px;position:relative;overflow:hidden}"
    + ".apw .page::before{content:'';position:absolute;top:0;left:0;width:100%;height:6px;background:linear-gradient(90deg,var(--navy),var(--gold))}"
    + ".apw .eyebrow{font-size:12px;letter-spacing:1px;color:var(--gold);font-weight:800}"
    + ".apw .ph{display:flex;align-items:center;gap:12px;margin:8px 0 6px}"
    + ".apw .ph .no{font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:var(--navy);opacity:.22;line-height:1}"
    + ".apw h2.title{font-size:22px;color:var(--navy);font-weight:900;letter-spacing:-.01em;margin:0}"
    + ".apw .lead{color:var(--muted);margin:8px 0 14px;font-size:14.5px}"
    + ".apw .stgdesc{color:var(--muted);font-size:13px;margin:6px 0 14px;line-height:1.7}"
    // ── 커버 ──────────────────────────────────────────────────────
    + ".apw .cover{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 60%,#080b2e 100%);color:#fff;border-radius:20px;padding:42px 30px;text-align:center;position:relative;overflow:hidden}"
    + ".apw .cover::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 82% 12%,rgba(212,175,55,.22),transparent 45%)}"
    + ".apw .cover .badge{position:relative;font-size:12px;letter-spacing:1px;color:var(--golds);border:1px solid rgba(212,175,55,.5);display:inline-block;padding:6px 15px;border-radius:20px;font-weight:700}"
    + ".apw .cover h1{position:relative;font-size:32px;font-weight:900;margin:16px 0 8px;line-height:1.25}"
    + ".apw .cover h1 em{color:var(--gold);font-style:normal}"
    + ".apw .cover .csub{position:relative;color:#c7cdf0;font-size:14.5px;max-width:540px;margin:0 auto 22px;line-height:1.8}"
    + ".apw .cover .idcard{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;max-width:640px;margin:0 auto;text-align:left}"
    + ".apw .cover .idcard .f{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:11px 14px}"
    + ".apw .cover .idcard label{font-size:11.5px;color:var(--golds);display:block;margin-bottom:5px}"
    + ".apw .cover .idcard .val{font-size:15px;color:#fff;font-weight:700;min-height:20px}"
    + ".apw .cover .idcard input{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.3);color:#fff;font-family:inherit;font-size:15px;padding:4px 0}"
    + ".apw .cover .idcard input:focus{outline:0;border-color:var(--gold)}"
    // ── 로드맵 ────────────────────────────────────────────────────
    + ".apw .roadmap{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}"
    + ".apw .rm{background:#f7f9fd;border:1px solid var(--line);border-radius:14px;padding:15px;text-align:center}"
    + ".apw .rm .em{font-size:26px}"
    + ".apw .rm h4{color:var(--navy);font-size:14px;margin:6px 0 4px}"
    + ".apw .rm p{font-size:12.5px;color:var(--muted);line-height:1.6}"
    + ".apw .pill-row{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0}"
    + ".apw .pill{font-size:12.5px;background:var(--sky);color:var(--navy);border-radius:20px;padding:6px 12px;font-weight:700}"
    + ".apw .help{background:var(--sky);border-radius:12px;padding:12px 15px;font-size:13.5px;color:var(--navy);margin-top:14px;line-height:1.7}"
    // ── 블록: 2단 질문/답변 ───────────────────────────────────────
    + ".apw .blk{margin-top:16px}"
    + ".apw .sym{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:stretch}"
    + "@media(max-width:720px){.apw .sym{grid-template-columns:1fr}}"
    + ".apw .qbox,.apw .abox{border-radius:14px;padding:16px;display:flex;flex-direction:column}"
    + ".apw .qbox{background:var(--navy);color:#eef1ff}"
    + ".apw .qbox h4{font-size:15px;color:var(--golds);margin:0 0 8px}"
    + ".apw .qbox p{font-size:14.5px;color:#e3e7ff;line-height:1.8;margin:0}"
    + ".apw .qbox .mission{margin-top:12px;background:rgba(212,175,55,.18);border:1px dashed var(--gold);border-radius:10px;padding:10px 12px;font-size:13px;color:#fff}"
    + ".apw .abox{background:#f7f9fd;border:1px solid var(--line)}"
    + ".apw .abox label{font-size:13.5px;font-weight:800;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:6px}"
    + ".apw .abox label .pen{color:var(--gold)}"
    + ".apw textarea{width:100%;flex:1;min-height:110px;border:1px solid var(--line);border-radius:10px;padding:12px;font-family:inherit;font-size:14.5px;line-height:1.85;resize:vertical;background:#fff;color:var(--ink)}"
    + ".apw textarea:focus{outline:2px solid var(--gold);border-color:var(--gold)}"
    + ".apw input[type=text]{width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 12px;font-family:inherit;font-size:14.5px;background:#fff;color:var(--ink)}"
    + ".apw input[type=text]:focus{outline:2px solid var(--gold);border-color:var(--gold)}"
    // ── 블록: 읽기/정보 카드 ──────────────────────────────────────
    + ".apw .rc{background:var(--cream);border:1px solid var(--golds);border-radius:14px;padding:16px 18px;position:relative;margin-top:12px}"
    + ".apw .rc::before{content:'';position:absolute;top:0;left:0;width:100%;height:5px;background:var(--gold);border-radius:14px 14px 0 0}"
    + ".apw .rc .who{font-weight:900;color:var(--navy);font-size:16px;margin:2px 0 8px;display:flex;align-items:center;gap:7px}"
    + ".apw .rc .core{font-size:14px;color:#39465a;line-height:1.85;white-space:pre-wrap}"
    + ".apw .rc .core b{color:var(--navy)}"
    + ".apw .rc .src{font-size:11.5px;color:#8b95a1;margin-top:8px}"
    + ".apw .infobox{background:#f4f7fc;border:1px solid #e0e7f3;border-left:4px solid var(--navy);border-radius:12px;padding:15px 17px;margin-top:12px}"
    + ".apw .infobox .it{font-size:14px;font-weight:800;color:var(--navy);margin-bottom:6px}"
    + ".apw .infobox .ib{font-size:14px;color:#39465a;line-height:1.85}"
    // ── 블록: 통계 ────────────────────────────────────────────────
    + ".apw .stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}"
    + ".apw .stat{flex:1;min-width:110px;background:var(--navy2);color:#fff;border-radius:12px;padding:13px 15px}"
    + ".apw .stat .sv{font-size:20px;font-weight:900;font-family:'Playfair Display',serif;color:var(--golds)}"
    + ".apw .stat .sk{font-size:11.5px;color:#c7cdf0;margin-top:3px;line-height:1.4}"
    // ── 블록: 레이더 ──────────────────────────────────────────────
    + ".apw .radar-wrap{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:center;margin-top:12px}"
    + "@media(max-width:720px){.apw .radar-wrap{grid-template-columns:1fr}}"
    + ".apw .radar-wrap svg{width:100%;height:auto}"
    + ".apw .frq{margin-bottom:13px}"
    + ".apw .frq .top{display:flex;justify-content:space-between;font-size:13.5px;font-weight:800;margin-bottom:2px}"
    + ".apw .frq .top b{color:var(--navy)}"
    + ".apw .frq .top .v{color:var(--gold);font-family:'Playfair Display',serif;font-size:16px}"
    + ".apw .frq small{color:var(--muted);font-size:12px;font-weight:500}"
    + ".apw .frq input[type=range]{width:100%;accent-color:var(--navy);height:24px}"
    + ".apw .legend{display:flex;gap:16px;justify-content:center;margin-top:4px;font-size:12px;font-weight:700}"
    + ".apw .legend .sw{width:15px;height:5px;border-radius:3px;display:inline-block;margin-right:6px;vertical-align:middle}"
    + ".apw .growth{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#0f9d8f,#12b76a);border-radius:14px;padding:14px 16px;color:#fff;margin-top:14px}"
    + ".apw .growth .p{font-size:30px;font-weight:900;font-family:'Playfair Display',serif;line-height:1}"
    + ".apw .growth .t{font-size:13px;font-weight:800}.apw .growth .d{font-size:12px;opacity:.92;margin-top:2px}"
    // ── 블록: 컴퍼스 ──────────────────────────────────────────────
    + ".apw .compass{background:#f7f9fd;border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:12px}"
    + ".apw .compass .ends{display:flex;justify-content:space-between;font-size:12.5px;font-weight:800}"
    + ".apw .compass .ends .l{color:var(--navy)}.apw .compass .ends .r{color:#b8860b}"
    + ".apw .compass .barwrap{position:relative;height:40px;margin:12px 0 2px}"
    + ".apw .compass .track{position:absolute;top:18px;left:0;right:0;height:8px;border-radius:8px;background:linear-gradient(90deg,var(--navy),#c9a227)}"
    + ".apw .compass input[type=range]{width:100%;position:absolute;top:6px;accent-color:var(--gold)}"
    + ".apw .compass .cval{text-align:center;font-weight:800;color:var(--navy);font-size:13px}"
    // ── 블록: 선택지/카드 ─────────────────────────────────────────
    + ".apw .q{font-size:15px;font-weight:800;color:var(--ink);line-height:1.6;margin-bottom:8px}"
    + ".apw .q .qn{display:inline-block;min-width:22px;height:22px;line-height:22px;text-align:center;font-size:11px;background:var(--navy);color:#fff;border-radius:6px;margin-right:8px;font-weight:900}"
    + ".apw .hint{font-size:12.5px;color:#8b95a1;line-height:1.6;margin:-4px 0 10px 0}"
    + ".apw .opts{display:flex;flex-direction:column;gap:9px}"
    + ".apw .opt{border:1.5px solid #dfe3ec;border-radius:12px;padding:12px 14px;cursor:pointer;background:#fbfcfe;transition:.12s}"
    + ".apw .opt:hover{border-color:#9aa6c8}"
    + ".apw .opt.on{border-color:var(--navy);background:var(--sky);box-shadow:inset 0 0 0 1px var(--navy)}"
    + ".apw .opt .ol{font-size:14px;font-weight:800;color:var(--ink)}"
    + ".apw .opt .od{font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.5}"
    + ".apw .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}"
    + ".apw .card{border:1.5px solid #dfe3ec;border-radius:13px;padding:13px;cursor:pointer;background:#fbfcfe;transition:.12s}"
    + ".apw .card:hover{border-color:#9aa6c8}"
    + ".apw .card.on{border-color:#12b76a;background:#f0fbf4;box-shadow:inset 0 0 0 1px #12b76a}"
    + ".apw .card .cn{font-size:14px;font-weight:900;color:var(--navy)}"
    + ".apw .card .cd{font-size:11.5px;color:var(--muted);line-height:1.5;margin:4px 0 7px}"
    + ".apw .card .csub{font-size:10.5px;font-weight:700;color:#b8860b;background:rgba(212,175,55,.12);border-radius:6px;padding:4px 7px;line-height:1.5}"
    // ── 블록: 영상 ────────────────────────────────────────────────
    + ".apw .vlinks{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}"
    + ".apw .vlinks a{font-size:13px;text-decoration:none;padding:8px 13px;border-radius:9px;font-weight:700}"
    + ".apw .vlinks a.primary{background:var(--gold);color:var(--navy2)}"
    + ".apw .vlinks a.search{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3)}"
    + ".apw .vsearch{margin-top:10px;font-size:12.5px;color:#fff;background:rgba(212,175,55,.2);border:1px dashed var(--gold);border-radius:9px;padding:8px 12px}"
    // ── 다짐/씰 ───────────────────────────────────────────────────
    + ".apw .declare{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;border-radius:16px;padding:24px;margin-top:16px}"
    + ".apw .declare h3{font-family:'Playfair Display',serif;color:var(--gold);font-size:20px;margin:0 0 6px}"
    + ".apw .declare p{color:#c7cdf0;font-size:14px;margin:0 0 10px}"
    + ".apw .declare textarea{background:rgba(255,255,255,.07);color:#fff;border-color:rgba(255,255,255,.2);min-height:90px}"
    + ".apw .seal{width:96px;height:96px;border-radius:50%;border:3px solid var(--gold);color:var(--gold);display:grid;place-items:center;text-align:center;font-size:12px;font-weight:800;margin:16px auto 0;font-family:'Playfair Display',serif;letter-spacing:1px;line-height:1.4}"
    // ── 하단 내비 / 제출 ──────────────────────────────────────────
    + ".apw .navbtns{position:sticky;bottom:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;padding:12px;background:rgba(255,255,255,.97);backdrop-filter:blur(6px);border:1px solid var(--line);border-radius:14px}"
    + ".apw .navbtns .mid{font-size:12px;color:var(--muted);text-align:center;flex:1}"
    + ".apw .navbtns .mid b{color:var(--navy)}"
    + ".apw .navbtns button{background:var(--navy);color:#fff;border:0;padding:12px 22px;border-radius:12px;font-weight:800;cursor:pointer;font-family:inherit;font-size:14.5px}"
    + ".apw .navbtns button.sec{background:#fff;color:var(--navy);border:1.5px solid var(--navy)}"
    + ".apw .navbtns button:disabled{opacity:.45;cursor:not-allowed}"
    + ".apw .subbtn{background:linear-gradient(135deg,var(--gold),#b8860b)!important;color:var(--navy2)!important;box-shadow:0 4px 14px rgba(184,134,11,.3)}"
    + ".apw .msg{margin:12px 0 0;border-radius:11px;padding:12px 15px;font-size:13.5px;line-height:1.6;display:none}"
    + ".apw .msg.ok{display:block;background:#f0fbf4;border:1px solid #bfe6cd;color:#137a44}"
    + ".apw .msg.err{display:block;background:#fdf0f1;border:1px solid #f3c0c5;color:#c0313d}"
    + ".apw.ro textarea,.apw.ro input,.apw.ro .opt,.apw.ro .card{pointer-events:none;opacity:.85}"
    + "@media print{.apw .apw-top,.apw .navbtns{display:none!important}.apw .apw-view{display:block!important;page-break-after:always}.apw .page{box-shadow:none;border:1px solid #ddd}}";

  function inject(){
    if(!document.getElementById('apw-css')){var s=document.createElement('style');s.id='apw-css';s.textContent=CSS;document.head.appendChild(s);}
    if(!document.getElementById('apw-font')){var l=document.createElement('link');l.id='apw-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap';document.head.appendChild(l);}
  }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}
  function ytSearch(q){return 'https://www.youtube.com/results?search_query='+encodeURIComponent(q);}
  function gSearch(q){return 'https://www.google.com/search?q='+encodeURIComponent(q);}

  function render(mount, opts){
    inject();
    opts=opts||{}; var L=opts.lesson||{}; var mode=opts.mode||'live'; var ro=!!opts.readOnly;
    var pre=opts.prefill||{};
    var academyId = opts.academyId || window._acadId || (window._academy&&window._academy.id) || null;
    var studentId = opts.studentId || (window._activeStudent&&window._activeStudent.id) || null;
    var stu = window._activeStudent || {};
    var axes = L.radarAxes || ['영역1','영역2','영역3','영역4','영역5'];
    var isKid = (L.level==='starter');

    // 상태
    var state = {
      answers: Object.assign({}, pre.answers||{}),
      radar_before: (pre.radar_before||axes.map(function(){return 5;})).slice(),
      radar_after:  (pre.radar_after ||axes.map(function(){return 5;})).slice(),
      compass: (pre.compass!=null?pre.compass:50)
    };
    var required = [];   // 필수 입력 id 목록(진행률)

    var root=document.createElement('div'); root.className='apw'+(ro?' ro':'');

    // ── 상단 스텝바 (뷰 구성 이후 채움) ──────────────────────────
    var top=el('<div class="apw-top"><div class="apw-topin">'
      +'<div class="apw-brand"><span class="apw-mk">P</span><div>'+esc(L.stage==='track'?'펜타 트랙':'펜타 비전')+'<small>'+esc((L.gradeBand||'')+' · '+(L.theme||'워크북'))+'</small></div></div>'
      +'<div class="apw-steps"></div></div><div class="apw-prog"><i></i></div></div>');
    root.appendChild(top);
    var stepsWrap=top.querySelector('.apw-steps');
    var progBar=top.querySelector('.apw-prog>i');

    var viewsHost=document.createElement('div'); root.appendChild(viewsHost);
    var views=[];      // {label, node}
    function addView(label){ var v=document.createElement('section'); v.className='apw-view'; viewsHost.appendChild(v); views.push({label:label,node:v}); return v; }

    // ── 0) 표지 ───────────────────────────────────────────────────
    (function(){
      var v=addView('표지');
      var titleHtml=esc(L.title||'펜타 워크북');
      var page='<div class="cover">'
        +'<span class="badge">'+esc((L.stage==='track'?'펜타 트랙':'펜타 비전')+' · '+(L.gradeBand||'')+(L.season?(' · 시즌'+L.season):''))+'</span>'
        +'<h1 class="serif">'+titleHtml+'</h1>'
        +(L.subtitle?'<div class="csub">'+esc(L.subtitle)+'</div>':(L.intro?'<div class="csub">'+esc(L.intro)+'</div>':''))
        +'<div class="idcard">'
          +'<div class="f"><label>이름</label>'+(stu.name?'<div class="val">'+esc(stu.name)+'</div>':'<input id="apw-name" placeholder="이름">')+'</div>'
          +'<div class="f"><label>학년</label>'+(stu.grade?'<div class="val">'+esc(stu.grade)+'</div>':'<input id="apw-grade" placeholder="예: '+esc(isKid?'초5':'중2')+'">')+'</div>'
          +'<div class="f"><label>주차</label><div class="val">시즌'+esc(L.season||1)+' · '+esc(L.week||1)+'주차</div></div>'
          +'<div class="f"><label>주제</label><div class="val">'+esc(L.theme||'')+'</div></div>'
        +'</div></div>';
      v.innerHTML='<div>'+page+'</div>';
    })();

    // ── 1) 오늘의 순서(로드맵) ────────────────────────────────────
    var stages=(L.stages||[]);
    if(stages.length>=2){
      var v=addView('순서');
      var rm='';
      stages.forEach(function(s){ rm+='<div class="rm"><div class="em">'+esc(s.icon||'✦')+'</div><h4>'+esc((s.name||'').replace(/^STAGE\s*\d+\s*·?\s*/,''))+'</h4><p>'+esc(s.desc||'')+'</p></div>'; });
      var pills=axes.map(function(a){return '<span class="pill">'+esc(a)+'</span>';}).join('');
      v.innerHTML='<div class="page"><span class="eyebrow">오늘의 순서</span>'
        +'<div class="ph"><h2 class="title serif">'+(isKid?'이렇게 해볼 거예요':'오늘의 탐구 흐름')+'</h2></div>'
        +'<p class="lead">'+esc(L.intro||(isKid?'단계별로 천천히, 재미있게 생각을 키워봐요. 끝까지 하면 생각이 얼마나 자랐는지 보여줄게요!':'각 단계를 거치며 개념을 이해하고, 나만의 논지를 세워 봅니다.'))+'</p>'
        +'<div class="roadmap">'+rm+'</div>'
        +'<div class="pill-row">'+pills+'</div>'
        +'<div class="help">💡 <b>'+esc(isKid?'5가지 눈':'5대 지성')+'</b>은 세상을 바라보는 다섯 가지 방법이에요. 탐구 전후로 스스로 진단하며 성장을 확인해요.</div></div>';
    }

    // ── 2~) 스테이지별 페이지 ─────────────────────────────────────
    var stepNoRef={n:0};
    stages.forEach(function(stg,si){
      var v=addView((stg.name||'').replace(/^STAGE\s*\d+\s*·?\s*/,'').slice(0,8) || ('단계'+(si+1)));
      var page=document.createElement('div'); page.className='page';
      var rawName=stg.name||('STAGE '+(si+1));
      var shortName=rawName.replace(/^(STAGE|STEP)\s*\d+\s*·?\s*/i,'').trim()||rawName;
      page.innerHTML='<span class="eyebrow">'+esc(stg.icon||'✦')+' '+esc(rawName)+'</span>'
        +'<div class="ph"><span class="no">'+('0'+(si+1)).slice(-2)+'</span><h2 class="title serif">'+esc(shortName)+'</h2></div>'
        +(stg.desc?'<div class="stgdesc">'+esc(stg.desc)+'</div>':'');
      (stg.blocks||[]).forEach(function(b){ page.appendChild(renderBlock(b, stepNoRef)); });
      v.appendChild(page);

      // 마지막 스테이지: 다짐 카드 추가(있으면)
      if(si===stages.length-1){
        var decl=document.createElement('div'); decl.className='declare';
        decl.innerHTML='<h3 class="serif">'+(isKid?'🏅 나의 다짐':'✦ 오늘의 황금 문장')+'</h3>'
          +'<p>'+esc(isKid?'오늘 배운 걸 한 문장으로 다짐해봐요. 이 문장이 리포트의 「오늘의 멋진 말」로 실려요!':'오늘 탐구에서 도달한 통찰을 한 문장으로. 리포트의 「황금 문장」이 됩니다.')+'</p>'
          +'<textarea data-k="declaration" placeholder="'+(isKid?'나 ___는 약속해요…':'나의 결론 한 문장…')+'">'+esc(state.answers.declaration||'')+'</textarea>'
          +'<div class="seal">'+(isKid?'참<br>잘했어요<br>PENTA':'PENTA<br>VIEW<br>✦')+'</div>';
        var dta=decl.querySelector('textarea'); dta.addEventListener('input',function(){state.answers.declaration=dta.value;});
        v.appendChild(decl);
      }
    });

    // ── 하단 내비게이션 ───────────────────────────────────────────
    var nav=el('<div class="navbtns"><button class="sec" type="button">← 이전</button>'
      +'<div class="mid"></div>'
      +'<button type="button">다음 →</button></div>');
    root.appendChild(nav);
    var btnPrev=nav.children[0], midEl=nav.children[1], btnNext=nav.children[2];
    var msg=document.createElement('div'); msg.className='msg'; root.appendChild(msg);

    // 스텝 칩
    views.forEach(function(v,i){
      var b=document.createElement('button'); b.type='button'; b.textContent=v.label;
      b.addEventListener('click',function(){ go(i); });
      stepsWrap.appendChild(b);
    });

    var cur=0;
    function reqDone(){ return required.filter(function(id){ var a=state.answers[id]; return (a!=null && a.toString().trim().length>0); }).length; }
    function refreshChips(){
      [].slice.call(stepsWrap.children).forEach(function(b,k){ b.classList.toggle('on',k===cur); b.classList.toggle('done',k<cur); });
    }
    function updateNav(){
      btnPrev.style.visibility = cur===0 ? 'hidden':'visible';
      var last = cur===views.length-1;
      if(last && !ro){
        btnNext.textContent = (L.submit&&L.submit.label)||'제출하기';
        btnNext.classList.add('subbtn');
      } else {
        btnNext.textContent = '다음 →';
        btnNext.classList.remove('subbtn');
        if(last) btnNext.style.visibility='hidden'; else btnNext.style.visibility='visible';
      }
      midEl.innerHTML='<b>'+(cur+1)+'</b> / '+views.length+' 단계'+(required.length?(' · 작성 <b>'+reqDone()+'</b>/'+required.length):'');
      progBar.style.width=((cur)/(views.length-1)*100)+'%';
    }
    function go(i){
      if(i<0||i>=views.length) return;
      cur=i;
      views.forEach(function(v,k){ v.node.classList.toggle('on',k===cur); });
      refreshChips(); updateNav();
      try{ (root.closest&&root.closest('.pnta-ovc,.acb-ovc'))||window.scrollTo({top: root.getBoundingClientRect().top+window.scrollY-70, behavior:'smooth'}); }catch(_){}
    }
    btnPrev.addEventListener('click',function(){ go(cur-1); });
    btnNext.addEventListener('click',function(){
      if(cur<views.length-1){ go(cur+1); return; }
      if(!ro) doSubmit();
    });
    root.addEventListener('input', updateNav);

    // ── 제출 ──────────────────────────────────────────────────────
    function doSubmit(){
      var miss=required.filter(function(id){ var a=state.answers[id]; return !(a!=null && a.toString().trim().length>0); });
      if(miss.length){ msg.className='msg err'; msg.textContent='아직 '+miss.length+'개 문항이 비어 있어요. 모두 채운 뒤 제출해 주세요.';
        try{ var node=root.querySelector('[data-id="'+miss[0]+'"]'); if(node){ // 해당 스텝으로 이동
          for(var vi=0;vi<views.length;vi++){ if(views[vi].node.contains(node)){ go(vi); break; } }
          setTimeout(function(){node.scrollIntoView({behavior:'smooth',block:'center'});},60);
        }}catch(_){}
        return;
      }
      var data={answers:state.answers, radar_before:state.radar_before, radar_after:state.radar_after, compass:+state.compass};
      if(typeof opts.submitFn==='function'){
        if(mode==='preview'){ ok('미리보기 모드 — 저장하지 않았어요. 내용은 잘 작성됐습니다! 👍'); if(opts.onSubmit)opts.onSubmit({preview:true,data:data}); return; }
        busy(true);
        Promise.resolve(opts.submitFn(data)).then(function(r){ busy(false);
          if(r&&r.error){ msg.className='msg err'; msg.textContent='제출 실패: '+((r.error&&r.error.message)||r.error); }
          else { ok((opts.submitOkText)||'제출 완료! 🎉'); done(); if(opts.onSubmit)opts.onSubmit({data:data,result:r}); }
        }, function(e){ busy(false); msg.className='msg err'; msg.textContent='제출 실패: '+((e&&e.message)||e); });
        return;
      }
      var payload={
        p_academy: academyId, p_student: studentId,
        p_stage: L.stage||'vision', p_level: L.level||'',
        p_season: L.season||1, p_week: L.week||1,
        p_theme: L.theme||'', p_title: L.title||'',
        p_answers: state.answers, p_radar_before: state.radar_before,
        p_radar_after: state.radar_after, p_compass: +state.compass
      };
      if(mode==='preview' || !(window.sb&&window.sb.rpc&&academyId&&studentId)){
        ok(mode==='preview' ? '미리보기 모드 — 실제 저장은 하지 않았어요. 내용은 잘 작성됐습니다! 👍'
                            : '로그인/학생 선택 상태에서 제출됩니다. (지금은 미리보기)');
        if(opts.onSubmit)opts.onSubmit({preview:true,payload:payload});
        return;
      }
      busy(true);
      window.sb.rpc('save_penta_submission', payload).then(function(res){ busy(false);
        if(res&&res.error){ msg.className='msg err'; msg.textContent='제출 실패: '+res.error.message; }
        else { ok('제출 완료! 🎉 선생님이 확인한 뒤 나만의 리포트를 만들어 주실 거예요.'); done(); if(opts.onSubmit)opts.onSubmit({id:res&&res.data,payload:payload}); }
      }, function(e){ busy(false); msg.className='msg err'; msg.textContent='제출 실패: '+e; });

      function busy(on){ btnNext.disabled=on; btnNext.textContent=on?'제출 중…':((L.submit&&L.submit.label)||'제출하기'); }
      function done(){ btnNext.style.display='none'; }
    }
    function ok(t){ msg.className='msg ok'; msg.textContent=t; try{msg.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){}}

    // ── 블록 렌더러 ───────────────────────────────────────────────
    function renderBlock(b, noRef){
      var w=document.createElement('div'); w.className='blk';
      if(b.id) w.setAttribute('data-id', b.id);
      var t=b.t||b.type;

      if(t==='info'){
        w.innerHTML='<div class="infobox">'+(b.title?'<div class="it">'+esc(b.title)+'</div>':'')+'<div class="ib">'+esc(b.body||'')+'</div></div>';
        return w;
      }
      if(t==='read'){
        w.innerHTML='<div class="rc"><div class="who">📖 '+esc(b.title||'읽기 자료')+'</div>'
          +'<div class="core">'+esc(b.body||'')+'</div>'
          +(b.source?'<div class="src">— '+esc(b.source)+'</div>':'')+'</div>';
        return w;
      }
      if(t==='video'){
        var q=b.search||b.title||'';
        var links='<div class="vlinks">';
        if(b.url) links+='<a class="primary" href="'+esc(b.url)+'" target="_blank" rel="noopener">▶ 영상 보기</a>';
        else if(b.search){ links+='<a class="primary" href="'+esc(ytSearch(b.search))+'" target="_blank" rel="noopener">▶ 유튜브에서 보기</a>'
          +'<a class="search" href="'+esc(gSearch(b.search))+'" target="_blank" rel="noopener">🔍 검색</a>'; }
        links+='</div>';
        var mid=b.search&&!b.url ? '<div class="vsearch">🔎 추천 검색어: <b>'+esc(b.search)+'</b></div>':'';
        var hasAns = b.id||b.ask;
        var qbox='<div class="qbox"><h4>🎬 '+esc(b.title||'영상으로 생각 넓히기')+'</h4>'
          +(b.body?'<p>'+esc(b.body)+'</p>':'')+links+mid
          +(b.mission?'<div class="mission">✏️ '+esc(b.mission)+'</div>':'')+'</div>';
        if(hasAns){
          var vid=b.id||('video_'+(noRef.n++));
          if(!b.optional) required.push(vid);
          w.innerHTML='<div class="sym">'+qbox
            +'<div class="abox"><label><span class="pen">✎</span> '+esc(b.ansLabel||'느낀 점')+'</label>'
            +'<textarea placeholder="'+esc(b.placeholder||'영상에서 기억에 남는 점과 이유…')+'">'+esc(state.answers[vid]||'')+'</textarea></div></div>';
          var vta=w.querySelector('textarea'); vta.addEventListener('input',function(){state.answers[vid]=vta.value;});
        } else {
          w.innerHTML=qbox;
        }
        return w;
      }
      if(t==='stats'){
        var s='<div class="stats">';
        (b.items||[]).forEach(function(it){ s+='<div class="stat"><div class="sv">'+esc(it.v)+'</div><div class="sk">'+esc(it.k)+'</div></div>'; });
        w.innerHTML=s+'</div>'; return w;
      }
      if(t==='text'){
        if(!b.optional && b.id) required.push(b.id);
        var qn=b.n?'<span style="display:inline-block;min-width:22px;height:22px;line-height:22px;text-align:center;font-size:11px;background:var(--gold);color:var(--navy2);border-radius:6px;margin-right:7px;font-weight:900">'+esc(b.n)+'</span>':'';
        w.innerHTML='<div class="sym">'
          +'<div class="qbox"><h4>🤔 '+(isKid?'만약에?':'생각해 보기')+'</h4><p>'+qn+esc(b.q||'')+'</p>'
            +(b.hint?'<div class="mission">✏️ '+esc(b.hint)+'</div>':(isKid?'<div class="mission">✏️ 정답은 없어요. 네 생각을 자유롭게 써봐요!</div>':''))+'</div>'
          +'<div class="abox"><label><span class="pen">✎</span> 내 생각</label>'
            +'<textarea rows="'+(b.rows||4)+'" placeholder="'+esc(b.placeholder||'여기에 생각을 적어 보세요')+'">'+esc(state.answers[b.id]||'')+'</textarea></div></div>';
        var ta=w.querySelector('textarea'); ta.addEventListener('input',function(){state.answers[b.id]=ta.value;});
        return w;
      }
      if(t==='scale'){
        var isCompass=(b.role==='compass'||b.id==='compass');
        var cur0=isCompass?state.compass:(state.answers[b.id]!=null?state.answers[b.id]:Math.round(((b.min||0)+(b.max||100))/2));
        w.innerHTML='<div class="q">'+(b.n?'<span class="qn">'+esc(b.n)+'</span>':'')+esc(b.q||'')+'</div>'+(b.hint?'<div class="hint">'+esc(b.hint)+'</div>':'')
          +'<div class="compass"><div class="ends"><span class="l">◀ '+esc(b.minLabel||b.min||0)+'</span><span class="r">'+esc(b.maxLabel||b.max||100)+' ▶</span></div>'
          +'<div class="barwrap"><div class="track"></div><input type="range" min="'+(b.min||0)+'" max="'+(b.max||100)+'" value="'+cur0+'"></div>'
          +'<div class="cval"><span class="cv">'+cur0+'</span> / '+(b.max||100)+'</div></div>';
        var rg=w.querySelector('input'), vv=w.querySelector('.cv');
        rg.addEventListener('input',function(){ vv.textContent=rg.value; if(isCompass)state.compass=+rg.value; else state.answers[b.id]=+rg.value; });
        if(isCompass)state.compass=+cur0; else if(b.id)state.answers[b.id]=+cur0;
        return w;
      }
      if(t==='radar'){
        var isBefore=(b.mode==='before');
        var arr=isBefore?state.radar_before:state.radar_after;
        var rax=b.axes||axes;
        var svgId='apw-radar-'+(noRef.n++);
        var head='<div class="q">'+esc(b.q||(isBefore?'지금 나의 지성 주파수는? (탐구 전)':'탐구를 마친 지금은? (탐구 후)'))+'</div>';
        var sliders='';
        rax.forEach(function(ax,i){
          var val=(arr[i]!=null?arr[i]:5);
          sliders+='<div class="frq" data-i="'+i+'"><div class="top"><b>'+esc(ax)+'</b><span class="v">'+val+'</span></div>'
            +'<input type="range" min="0" max="10" step="1" value="'+val+'"></div>';
        });
        var growth = (!isBefore) ? '<div class="growth"><div class="p" data-role="gp">+0%</div><div><div class="t">'+esc(isKid?'생각의 힘':'지적 영토')+' 성장</div><div class="d">금색(처음)보다 남색(지금)이 넓어진 만큼 자란 거예요.</div></div></div>' : '';
        var legend='<div class="legend"><span style="color:#b8860b"><span class="sw" style="background:#D4AF37"></span>탐구 전</span><span style="color:#1A237E"><span class="sw" style="background:#1A237E"></span>탐구 후</span></div>';
        w.innerHTML=head+'<div class="radar-wrap"><div><svg id="'+svgId+'" viewBox="0 0 320 300"></svg>'+(isBefore?'':legend)+'</div><div class="sliders">'+sliders+'</div></div>'+growth;
        var svg=w.querySelector('svg');
        function drawThis(){ svg.innerHTML=radarSVG(rax, isBefore?arr:state.radar_before, isBefore?null:arr); if(!isBefore)updGrowth(w); }
        drawThis();
        w.querySelectorAll('.frq').forEach(function(rowEl){
          var i=+rowEl.getAttribute('data-i'), rg2=rowEl.querySelector('input'), vv2=rowEl.querySelector('.v');
          rg2.addEventListener('input',function(){ vv2.textContent=rg2.value; arr[i]=+rg2.value; drawThis(); });
        });
        return w;
      }
      if(t==='choice'){
        if(!b.optional && b.id) required.push(b.id);
        var multi=!!b.multi;
        var chosen = multi ? (Array.isArray(state.answers[b.id])?state.answers[b.id].slice():[]) : (state.answers[b.id]||'');
        var s3='<div class="q">'+(b.n?'<span class="qn">'+esc(b.n)+'</span>':'')+esc(b.q||'')+'</div>'+(b.hint?'<div class="hint">'+esc(b.hint)+'</div>':'')+'<div class="opts">';
        (b.options||[]).forEach(function(o){
          var on = multi ? (chosen.indexOf(o.v)>=0) : (chosen===o.v);
          s3+='<div class="opt'+(on?' on':'')+'" data-v="'+esc(o.v)+'"><div class="ol">'+esc(o.label||o.v)+'</div>'+(o.desc?'<div class="od">'+esc(o.desc)+'</div>':'')+'</div>';
        });
        w.innerHTML=s3+'</div>';
        w.querySelectorAll('.opt').forEach(function(op){
          op.addEventListener('click',function(){
            if(ro)return;
            var v2=op.getAttribute('data-v');
            if(multi){
              var a=Array.isArray(state.answers[b.id])?state.answers[b.id]:[];
              var k=a.indexOf(v2); if(k>=0)a.splice(k,1); else a.push(v2);
              state.answers[b.id]=a; op.classList.toggle('on');
            } else {
              state.answers[b.id]=v2;
              w.querySelectorAll('.opt').forEach(function(x){x.classList.remove('on');});
              op.classList.add('on');
            }
            root.dispatchEvent(new Event('input'));
          });
        });
        return w;
      }
      if(t==='career'){
        var cid=b.id||'career_choice'; var rid=b.reasonId||(cid+'_reason');
        if(b.id) required.push(cid); required.push(rid);
        var chosenC=state.answers[cid]||'';
        var s4='<div class="q">'+(b.n?'<span class="qn">'+esc(b.n)+'</span>':'')+esc(b.q||'가장 끌리는 진로를 골라 보세요')+'</div><div class="cards">';
        (b.options||[]).forEach(function(o){
          var on=(chosenC===o.n);
          s4+='<div class="card'+(on?' on':'')+'" data-v="'+esc(o.n)+'"><div class="cn">'+esc(o.n)+'</div>'+(o.d?'<div class="cd">'+esc(o.d)+'</div>':'')+(o.subj?'<div class="csub">관련 과목 · '+esc(o.subj)+'</div>':'')+'</div>';
        });
        s4+='</div><div class="sym" style="margin-top:14px"><div class="qbox"><h4>✎ 선택한 이유</h4><p>'+esc(b.reasonQ||'왜 그 진로에 끌렸는지 적어 보세요')+'</p></div>'
          +'<div class="abox"><label><span class="pen">✎</span> 내 생각</label><textarea rows="3" placeholder="내 관심사와 연결되는 이유…">'+esc(state.answers[rid]||'')+'</textarea></div></div>';
        w.innerHTML=s4;
        w.querySelectorAll('.card').forEach(function(cd){
          cd.addEventListener('click',function(){ if(ro)return; state.answers[cid]=cd.getAttribute('data-v'); w.querySelectorAll('.card').forEach(function(x){x.classList.remove('on');}); cd.classList.add('on'); root.dispatchEvent(new Event('input')); });
        });
        var rta=w.querySelector('textarea'); rta.addEventListener('input',function(){state.answers[rid]=rta.value;});
        return w;
      }
      w.style.display='none'; return w;
    }

    // 레이더 SVG (before=금색 점선, after=남색 채움)
    function radarSVG(ax,before,after){
      var C=160,cy=145,R=105,N=ax.length||5;
      function pt(i,r){var a=-Math.PI/2+i*2*Math.PI/N;return [C+r*Math.cos(a),cy+r*Math.sin(a)];}
      var g='';
      for(var ring=1;ring<=5;ring++){var p=[];for(var i=0;i<N;i++){var xy=pt(i,R*ring/5);p.push(xy[0].toFixed(0)+','+xy[1].toFixed(0));}g+='<polygon points="'+p.join(' ')+'" fill="none" stroke="#eef1f4" stroke-width="1"/>';}
      for(var i2=0;i2<N;i2++){var xy2=pt(i2,R);g+='<line x1="160" y1="145" x2="'+xy2[0].toFixed(0)+'" y2="'+xy2[1].toFixed(0)+'" stroke="#e6e9f0"/>';}
      function poly(vals,fill,stroke,dash){var p=[];for(var i=0;i<N;i++){var v=Math.max(0,Math.min(10,vals[i]||0));var xy=pt(i,R*v/10);p.push(xy[0].toFixed(0)+','+xy[1].toFixed(0));}return '<polygon points="'+p.join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(dash?2:2.5)+'"'+(dash?' stroke-dasharray="4 3"':'')+' stroke-linejoin="round"/>';}
      if(before) g+=poly(before,'rgba(212,175,55,.18)','#D4AF37',true);
      if(after){ g+=poly(after,'rgba(26,35,126,.26)','#1A237E',false); for(var k=0;k<N;k++){var xy3=pt(k,R*Math.max(0,Math.min(10,after[k]||0))/10);g+='<circle cx="'+xy3[0].toFixed(0)+'" cy="'+xy3[1].toFixed(0)+'" r="3.5" fill="#1A237E"/>';} }
      for(var j=0;j<N;j++){var xy4=pt(j,R+22);g+='<text x="'+xy4[0].toFixed(0)+'" y="'+xy4[1].toFixed(0)+'" font-size="11" font-weight="800" fill="#1A237E" text-anchor="middle" dominant-baseline="middle">'+esc(ax[j])+'</text>';}
      return g;
    }
    function updGrowth(w){
      function area(a){var s=0;for(var i=0;i<5;i++){s+=(a[i]||0)*(a[(i+1)%5]||0);}return s;}
      var b=area(state.radar_before), f=area(state.radar_after);
      var pct=b>0?Math.round((f-b)/b*100):0;
      var gp=w.querySelector('[data-role="gp"]'); if(gp)gp.textContent=(pct>=0?'+':'')+pct+'%';
    }

    // 커버 입력 → 학생 정보 저장(비로그인 미리보기용)
    var nm=root.querySelector('#apw-name'), gr=root.querySelector('#apw-grade');
    if(nm) nm.addEventListener('input',function(){ stu.name=nm.value; });
    if(gr) gr.addEventListener('input',function(){ stu.grade=gr.value; });

    go(0);
    mount.innerHTML=''; mount.appendChild(root);
    return { root:root, state:state, go:go,
      collect:function(){ return { answers:state.answers, radar_before:state.radar_before, radar_after:state.radar_after, compass:+state.compass }; } };
  }

  window.ArchePentaWorkbook = { render: render, version: '2.0' };
})();
