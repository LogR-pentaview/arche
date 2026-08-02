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

  var CSS = `
/* ══ 펜타 워크북 · 모바일 C 리스킨 (학습맵+포커스스텝) ══
   스킨: .apw.vision(골드·친근) / .apw.track(라임 콘솔·전문). JS 참조 클래스명은 모두 보존. */
.apw{--navy:#141a29;--navy2:#20283c;--ink:#191f28;--dim:#4e5968;--muted:#8b95a1;--faint:#b0b8c1;--line:#e9ecf1;--line-soft:#f1f3f6;--sky:#eef3ff;
  --acc:#c8a24a;--acc-d:#a9852f;--acc-l:#e6c877;--acc-soft:#f7efdb;--cream:#fffdf4;--gold:#c8a24a;--golds:#e6c877;--bg:#f5f6f8;
  max-width:480px;width:100%;margin:0 auto;font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,sans-serif;color:var(--ink);line-height:1.7;letter-spacing:-.012em;word-break:keep-all;overflow-wrap:break-word;-webkit-font-smoothing:antialiased;padding-bottom:78px}
.apw.track{--acc:#6fa81c;--acc-d:#5c8f16;--acc-l:#b6e34a;--acc-soft:#eef7db;--cream:#f6faef;--gold:#6fa81c;--golds:#b6e34a;--bg:#eef1f5}
.apw *{box-sizing:border-box;min-width:0}
.apw h1,.apw h2,.apw h3,.apw h4,.apw h5,.apw p,.apw div,.apw span,.apw li{word-break:keep-all;overflow-wrap:break-word}
.apw .serif{font-family:'Playfair Display',serif}
/* ── 상단: 학습 맵 + 진행바 ── */
.apw .apw-top{position:sticky;top:0;z-index:20;background:rgba(20,26,41,.97);backdrop-filter:blur(10px);color:#fff;border-radius:0 0 18px 18px;box-shadow:0 6px 18px -10px rgba(20,26,41,.5)}
.apw.track .apw-top{background:rgba(16,21,31,.97)}
.apw .apw-topin{padding:11px 15px 9px;display:flex;align-items:center;gap:10px}
.apw .apw-brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:14px;min-width:0}
.apw .apw-mk{width:30px;height:30px;flex:none;border-radius:9px;background:linear-gradient(135deg,var(--acc),var(--acc-d));color:#fff;display:grid;place-items:center;font-family:'Playfair Display',serif;font-weight:900;font-size:15px}
.apw.track .apw-mk{color:#0e2418;background:linear-gradient(135deg,var(--acc-l),var(--acc))}
.apw .apw-brand>div{min-width:0}
.apw .apw-brand small{display:block;color:var(--acc-l);font-weight:600;font-size:10px;letter-spacing:.02em;line-height:1.3;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.apw .apw-steps{display:flex;gap:6px;margin:0 0 2px;padding:2px 12px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.apw .apw-steps::-webkit-scrollbar{display:none;height:0}
.apw .apw-steps button{flex:none;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);color:#c7cdda;padding:6px 12px;border-radius:20px;font-size:11.5px;cursor:pointer;font-family:inherit;font-weight:700;white-space:nowrap;display:flex;align-items:center;gap:6px}
.apw .apw-steps button::before{content:counter(a);counter-increment:a;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:9.5px;display:grid;place-items:center;font-weight:800}
.apw .apw-steps{counter-reset:a}
.apw .apw-steps button.on{background:var(--acc);border-color:var(--acc);color:#fff}
.apw.track .apw-steps button.on{background:var(--acc-l);border-color:var(--acc-l);color:#0e2418}
.apw .apw-steps button.on::before{background:rgba(255,255,255,.35)}
.apw.track .apw-steps button.on::before{background:rgba(14,36,24,.25)}
.apw .apw-steps button.done{color:#fff;border-color:var(--acc-d);background:rgba(255,255,255,.04)}
.apw .apw-steps button.done::before{content:"✓";background:var(--acc-d)}
.apw .apw-prog{height:4px;background:rgba(255,255,255,.14)}
.apw .apw-prog>i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc-l));width:0;transition:width .35s;border-radius:0 3px 3px 0}
/* ── 뷰/페이지 ── */
.apw .apw-view{display:none;padding:16px 14px 4px}
.apw .apw-view.on{display:block;animation:apwfade .32s cubic-bezier(.2,.9,.25,1)}
@keyframes apwfade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.apw .page{background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:0 10px 30px -18px rgba(20,26,41,.28);padding:22px 18px;margin-bottom:14px;position:relative;overflow:hidden}
.apw .page::before{content:'';position:absolute;top:0;left:0;width:100%;height:5px;background:linear-gradient(90deg,var(--navy),var(--acc))}
.apw .eyebrow{font-size:11px;letter-spacing:.06em;color:var(--acc-d);font-weight:800;text-transform:uppercase}
.apw .ph{display:flex;align-items:center;gap:11px;margin:9px 0 6px}
.apw .ph .no{font-family:'Playfair Display',serif;font-size:30px;font-weight:900;color:var(--navy);opacity:.16;line-height:1}
.apw h2.title{font-size:21px;color:var(--navy);font-weight:800;letter-spacing:-.02em;margin:0;line-height:1.3}
.apw .lead{color:var(--dim);margin:8px 0 14px;font-size:14px;line-height:1.75}
.apw .stgdesc{color:var(--dim);font-size:13px;margin:6px 0 14px;line-height:1.7}
/* ── 커버(친근한 히어로) ── */
.apw .cover{background:linear-gradient(155deg,var(--navy) 0%,#0d1220 90%);color:#fff;border-radius:22px;padding:34px 22px 30px;text-align:center;position:relative;overflow:hidden;margin-bottom:14px}
.apw.track .cover{background:linear-gradient(155deg,#10151f,#1c2740 70%,#22303f)}
.apw .cover::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 8%,rgba(200,162,74,.28),transparent 46%)}
.apw.track .cover::after{background:radial-gradient(circle at 80% 8%,rgba(182,227,74,.22),transparent 46%)}
.apw .cover .badge{position:relative;font-size:11px;letter-spacing:.04em;color:var(--acc-l);border:1px solid rgba(230,200,119,.45);display:inline-block;padding:6px 14px;border-radius:20px;font-weight:700}
.apw.track .cover .badge{border-color:rgba(182,227,74,.4)}
.apw .cover .fusiontag{position:relative;display:inline-block;margin-top:12px;font-size:11.5px;font-weight:800;color:#0e2418;background:linear-gradient(90deg,var(--acc),var(--acc-l));border-radius:20px;padding:5px 13px}
.apw .cover h1{position:relative;font-size:27px;font-weight:900;margin:14px 0 8px;line-height:1.28}
.apw .cover h1 em{color:var(--acc-l);font-style:normal}
.apw .cover .csub{position:relative;color:#c7cdda;font-size:14px;margin:0 auto 20px;line-height:1.8}
.apw .cover .idcard{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left}
.apw .cover .idcard .f{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:13px;padding:11px 13px}
.apw .cover .idcard label{font-size:11px;color:var(--acc-l);display:block;margin-bottom:5px}
.apw .cover .idcard .val{font-size:14.5px;color:#fff;font-weight:700;min-height:19px}
.apw .cover .idcard input{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.3);color:#fff;font-family:inherit;font-size:16px;padding:4px 0}
.apw .cover .idcard input:focus{outline:0;border-color:var(--acc-l)}
/* ── 로드맵(오늘의 순서) ── */
.apw .roadmap{display:grid;grid-template-columns:1fr;gap:9px}
.apw .rm{background:#fff;border:1px solid var(--line);border-radius:15px;padding:13px 15px;display:flex;align-items:flex-start;gap:13px;text-align:left;box-shadow:0 4px 14px -12px rgba(20,26,41,.25)}
.apw .rm .em{font-size:24px;flex:none;line-height:1.2;width:40px;height:40px;border-radius:12px;background:var(--acc-soft);display:grid;place-items:center}
.apw .rm .rmtx{min-width:0}
.apw .rm h4{color:var(--navy);font-size:14.5px;margin:0 0 3px;font-weight:800}
.apw .rm p{font-size:12.5px;color:var(--dim);line-height:1.55}
.apw .pill-row{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 0}
.apw .pill{font-size:12px;background:var(--acc-soft);color:var(--acc-d);border:1px solid var(--acc-l);border-radius:20px;padding:6px 12px;font-weight:700}
.apw .help{background:var(--sky);border-radius:13px;padding:13px 15px;font-size:13px;color:var(--navy);margin-top:14px;line-height:1.7}
.apw.track .help{background:var(--acc-soft);color:#33420f}
/* ── 블록: 질문/답변(모바일 세로 스택) ── */
.apw .blk{margin-top:16px}
.apw .sym{display:grid;grid-template-columns:1fr;gap:11px;align-items:stretch}
.apw .qbox,.apw .abox{border-radius:16px;padding:16px;display:flex;flex-direction:column}
.apw .qbox{background:linear-gradient(155deg,var(--navy),#0f1526);color:#eef1ff}
.apw.track .qbox{background:linear-gradient(155deg,#141a29,#1b2740)}
.apw .qbox h4{font-size:14.5px;color:var(--acc-l);margin:0 0 8px;font-weight:800}
.apw .qbox p{font-size:15px;color:#e6e9f4;line-height:1.75;margin:0}
.apw .qbox .mission{margin-top:12px;background:rgba(200,162,74,.16);border:1px dashed var(--acc);border-radius:11px;padding:10px 12px;font-size:13px;color:#fff}
.apw.track .qbox .mission{background:rgba(182,227,74,.14);border-color:var(--acc-l)}
.apw .abox{background:#fff;border:1.5px solid var(--line)}
.apw .abox label{font-size:13px;font-weight:800;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.apw .abox label .pen{color:var(--acc-d)}
.apw textarea{width:100%;flex:1;min-height:130px;border:1.5px solid var(--line);border-radius:12px;padding:13px;font-family:inherit;font-size:16px;line-height:1.8;resize:vertical;background:#fbfcfe;color:var(--ink);-webkit-appearance:none}
.apw textarea:focus{outline:none;border-color:var(--acc);background:#fff;box-shadow:0 0 0 3px var(--acc-soft)}
.apw textarea::placeholder{color:var(--faint)}
.apw input[type=text]{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:13px;font-family:inherit;font-size:16px;background:#fbfcfe;color:var(--ink)}
.apw input[type=text]:focus{outline:none;border-color:var(--acc);background:#fff;box-shadow:0 0 0 3px var(--acc-soft)}
/* ── S펜(필기) 입력 ── */
.apw .inpmode{display:inline-flex;margin-bottom:9px;border:1.5px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}
.apw .inpmode button{border:0;background:#fff;color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:800;padding:7px 15px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:.12s}
.apw .inpmode button.on{background:var(--acc);color:#fff}
.apw.track .inpmode button.on{color:#0e2418}
.apw .inkwrap{margin-top:2px}
.apw .inktools{display:flex;gap:6px;margin-bottom:7px;flex-wrap:wrap}
.apw .inktools button{border:1.5px solid var(--line);background:#fff;color:var(--dim);font-family:inherit;font-size:12px;font-weight:700;padding:6px 11px;border-radius:9px;cursor:pointer}
.apw .inktools button.on{border-color:var(--acc);color:var(--acc-d);background:var(--acc-soft)}
.apw .inkpad{width:100%;height:230px;border:1.5px solid var(--line);border-radius:12px;background-color:#fff;background-image:repeating-linear-gradient(transparent,transparent 37px,#eef1f5 37px,#eef1f5 38px);touch-action:none;display:block;cursor:crosshair}
.apw .inknote{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.5}
.apw .inkview{width:100%;border:1.5px solid var(--line);border-radius:12px;margin-top:6px;background:#fff;display:block}
.apw.ro .inpmode,.apw.ro .inktools{display:none}
/* ── 블록: 읽기/정보 ── */
.apw .rc{background:var(--cream);border:1px solid var(--acc-l);border-radius:15px;padding:16px 17px;position:relative;margin-top:12px}
.apw .rc::before{content:'';position:absolute;top:0;left:0;width:100%;height:5px;background:var(--acc);border-radius:15px 15px 0 0}
.apw .rc .who{font-weight:800;color:var(--navy);font-size:15px;margin:4px 0 8px;display:flex;align-items:center;gap:7px}
.apw .rc .core{font-size:14px;color:#39465a;line-height:1.85;white-space:pre-wrap}
.apw .rc .core b{color:var(--navy)}
.apw .rc .src{font-size:11.5px;color:var(--muted);margin-top:8px}
.apw .infobox{background:#f6f8fc;border:1px solid #e4e9f2;border-left:4px solid var(--navy);border-radius:13px;padding:15px 16px;margin-top:12px}
.apw .infobox .it{font-size:14px;font-weight:800;color:var(--navy);margin-bottom:6px}
.apw .infobox .ib{font-size:14px;color:#39465a;line-height:1.85}
/* ── 블록: 통계 ── */
.apw .stats{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
.apw .stat{flex:1;min-width:calc(50% - 5px);background:linear-gradient(155deg,var(--navy),#0f1526);color:#fff;border-radius:13px;padding:13px 15px}
.apw.track .stat{background:linear-gradient(155deg,#141a29,#1b2740)}
.apw .stat .sv{font-size:21px;font-weight:900;font-family:'Playfair Display',serif;color:var(--acc-l)}
.apw .stat .sk{font-size:11.5px;color:#c7cdda;margin-top:3px;line-height:1.45}
/* ── 블록: 레이더(세로) ── */
.apw .radar-wrap{display:grid;grid-template-columns:1fr;gap:8px;align-items:center;margin-top:12px}
.apw .radar-wrap svg{width:100%;max-width:300px;height:auto;margin:0 auto;display:block}
.apw .frq{margin-bottom:14px}
.apw .frq .top{display:flex;justify-content:space-between;font-size:13.5px;font-weight:800;margin-bottom:4px}
.apw .frq .top b{color:var(--navy)}
.apw .frq .top .v{color:var(--acc-d);font-family:'Playfair Display',serif;font-size:16px}
.apw .frq small{color:var(--muted);font-size:12px;font-weight:500}
.apw .frq input[type=range]{width:100%;accent-color:var(--acc);height:30px}
.apw .legend{display:flex;gap:16px;justify-content:center;margin-top:4px;font-size:12px;font-weight:700}
.apw .legend .sw{width:15px;height:5px;border-radius:3px;display:inline-block;margin-right:6px;vertical-align:middle}
.apw .growth{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#0f9d8f,#12b76a);border-radius:15px;padding:15px 16px;color:#fff;margin-top:14px}
.apw .growth .p{font-size:30px;font-weight:900;font-family:'Playfair Display',serif;line-height:1}
.apw .growth .t{font-size:13px;font-weight:800}.apw .growth .d{font-size:12px;opacity:.92;margin-top:2px}
/* ── 블록: 컴퍼스 ── */
.apw .compass{background:#fbfcfe;border:1px solid var(--line);border-radius:15px;padding:18px;margin-top:12px}
.apw .compass .ends{display:flex;justify-content:space-between;font-size:12.5px;font-weight:800}
.apw .compass .ends .l{color:var(--navy)}.apw .compass .ends .r{color:var(--acc-d)}
.apw .compass .barwrap{position:relative;height:44px;margin:12px 0 2px}
.apw .compass .track{position:absolute;top:20px;left:0;right:0;height:8px;border-radius:8px;background:linear-gradient(90deg,var(--navy),var(--acc))}
.apw .compass input[type=range]{width:100%;position:absolute;top:6px;accent-color:var(--acc);height:32px}
.apw .compass .cval{text-align:center;font-weight:800;color:var(--navy);font-size:13px}
/* ── 블록: 선택지/카드(큰 터치 타깃) ── */
.apw .q{font-size:15.5px;font-weight:800;color:var(--ink);line-height:1.6;margin-bottom:8px}
.apw .q .qn{display:inline-block;min-width:24px;height:24px;line-height:24px;text-align:center;font-size:11px;background:var(--navy);color:#fff;border-radius:7px;margin-right:8px;font-weight:900}
.apw .hint{font-size:12.5px;color:var(--muted);line-height:1.6;margin:-4px 0 10px}
.apw .opts{display:flex;flex-direction:column;gap:9px}
.apw .opt{border:1.5px solid var(--line);border-radius:13px;padding:14px 15px;cursor:pointer;background:#fbfcfe;transition:.14s;-webkit-tap-highlight-color:transparent}
.apw .opt:active{transform:scale(.99)}
.apw .opt.on{border-color:var(--acc);background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc)}
.apw .opt .ol{font-size:14.5px;font-weight:800;color:var(--ink)}
.apw .opt .od{font-size:12.5px;color:var(--dim);margin-top:2px;line-height:1.5}
.apw .cards{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.apw .card{border:1.5px solid var(--line);border-radius:14px;padding:13px;cursor:pointer;background:#fbfcfe;transition:.14s;-webkit-tap-highlight-color:transparent}
.apw .card:active{transform:scale(.99)}
.apw .card.on{border-color:var(--acc);background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc)}
.apw .card .cn{font-size:14px;font-weight:900;color:var(--navy)}
.apw .card .cd{font-size:11.5px;color:var(--dim);line-height:1.5;margin:4px 0 7px}
.apw .card .csub{font-size:10.5px;font-weight:700;color:var(--acc-d);background:var(--acc-soft);border-radius:7px;padding:4px 7px;line-height:1.5}
/* ── 블록: 영상 ── */
.apw .vlinks{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.apw .vlinks a{font-size:13px;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700}
.apw .vlinks a.primary{background:var(--acc);color:#fff}
.apw.track .vlinks a.primary{background:var(--acc-l);color:#0e2418}
.apw .vlinks a.search{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3)}
.apw .vsearch{margin-top:10px;font-size:12.5px;color:#fff;background:rgba(200,162,74,.2);border:1px dashed var(--acc);border-radius:10px;padding:8px 12px}
/* ── 다짐/씰 ── */
.apw .declare{background:linear-gradient(150deg,var(--navy),#0f1526);color:#fff;border-radius:18px;padding:22px 20px;margin:14px}
.apw.track .declare{background:linear-gradient(150deg,#141a29,#1b2740)}
.apw .declare h3{font-family:'Playfair Display',serif;color:var(--acc-l);font-size:19px;margin:0 0 6px}
.apw .declare p{color:#c7cdda;font-size:13.5px;margin:0 0 10px}
.apw .declare textarea{background:rgba(255,255,255,.07);color:#fff;border-color:rgba(255,255,255,.2);min-height:96px}
.apw .declare textarea:focus{background:rgba(255,255,255,.1);box-shadow:none}
.apw .seal{width:92px;height:92px;border-radius:50%;border:2.5px solid var(--acc-l);color:var(--acc-l);display:grid;place-items:center;text-align:center;font-size:12px;font-weight:800;margin:16px auto 0;font-family:'Playfair Display',serif;letter-spacing:1px;line-height:1.4}
/* ── 하단 내비(탭바형 고정) ── */
.apw .navbtns{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px calc(11px + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);backdrop-filter:blur(10px);border-top:1px solid var(--line);box-shadow:0 -6px 20px -12px rgba(20,26,41,.3)}
.apw .navbtns .mid{font-size:11.5px;color:var(--muted);text-align:center;flex:1}
.apw .navbtns .mid b{color:var(--navy)}
.apw .navbtns button{background:var(--navy);color:#fff;border:0;padding:14px 22px;border-radius:14px;font-weight:800;cursor:pointer;font-family:inherit;font-size:15px;min-width:96px}
.apw .navbtns button.sec{background:#fff;color:var(--navy);border:1.5px solid var(--line);min-width:64px;padding:14px 16px}
.apw .navbtns button:disabled{opacity:.45;cursor:not-allowed}
.apw .subbtn{background:linear-gradient(135deg,var(--acc),var(--acc-d))!important;color:#fff!important;box-shadow:0 6px 18px -6px rgba(169,133,47,.5)}
.apw.track .subbtn{background:linear-gradient(135deg,var(--acc-l),var(--acc))!important;color:#0e2418!important}
.apw .msg{margin:12px 14px 0;border-radius:12px;padding:13px 15px;font-size:13.5px;line-height:1.6;display:none}
.apw .msg.ok{display:block;background:#f0fbf4;border:1px solid #bfe6cd;color:#137a44}
.apw .msg.err{display:block;background:#fdf0f1;border:1px solid #f3c0c5;color:#c0313d}
.apw.ro textarea,.apw.ro input,.apw.ro .opt,.apw.ro .card{pointer-events:none;opacity:.85}
.apw.ro .navbtns{position:sticky}
@media(min-width:900px){.apw{max-width:560px}.apw .navbtns{position:sticky;bottom:8px;border-radius:16px;border:1px solid var(--line)}.apw{padding-bottom:8px}}
@media print{.apw{padding-bottom:0}.apw .apw-top,.apw .navbtns{display:none!important}.apw .apw-view{display:block!important;page-break-after:always}.apw .page{box-shadow:none;border:1px solid #ddd}}
`;

  function inject(){
    if(!document.getElementById('apw-css')){var s=document.createElement('style');s.id='apw-css';s.textContent=CSS;document.head.appendChild(s);}
    if(!document.getElementById('apw-font')){var l=document.createElement('link');l.id='apw-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap';document.head.appendChild(l);}
  }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  // 신뢰된 콘텐츠(카탈로그)용: 이스케이프 후 <b>·<br>만 복원
  function richEsc(s){return esc(s).replace(/&lt;b&gt;/g,'<b>').replace(/&lt;\/b&gt;/g,'</b>').replace(/&lt;br\s*\/?&gt;/g,'<br>');}
  function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}
  function ytSearch(q){return 'https://www.youtube.com/results?search_query='+encodeURIComponent(q);}
  function gSearch(q){return 'https://www.google.com/search?q='+encodeURIComponent(q);}
  // 질문 박스 색조: navy(기본) · shadow(어려운점) · green(안전장치) · gold(나의 답)
  function toneStyle(tone){
    if(tone==='shadow') return {box:'background:#4a2d1d',h:'color:#ffe0c2',p:'color:#ffe9d6',m:'border-color:#ffcfa3;background:rgba(255,180,120,.16)'};
    if(tone==='green')  return {box:'background:#1d3a2e',h:'color:#c6f6d5',p:'color:#d9fbe6',m:'border-color:#86efac;background:rgba(134,239,172,.16)'};
    if(tone==='gold')   return {box:'background:var(--gold)',h:'color:var(--navy2)',p:'color:var(--navy2)',m:'border-color:var(--navy2);background:rgba(15,21,72,.12);color:var(--navy2)'};
    return {box:'',h:'',p:'',m:''};
  }

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
    var _preAns=Object.assign({}, pre.answers||{});
    var _preInk=(_preAns._ink&&typeof _preAns._ink==='object')?_preAns._ink:(pre.ink||{});
    try{ delete _preAns._ink; }catch(_e){}
    var state = {
      answers: _preAns,
      ink: Object.assign({}, _preInk),   // 문항id → 손글씨 dataURL(원본 보관)
      inkmode: {},                        // 문항id → 'pen'|'type'
      radar_before: (pre.radar_before||axes.map(function(){return 5;})).slice(),
      radar_after:  (pre.radar_after ||axes.map(function(){return 5;})).slice(),
      compass: (pre.compass!=null?pre.compass:50)
    };
    var required = [];   // 필수 입력 id 목록(진행률)

    var root=document.createElement('div'); root.className='apw '+((L.stage==='track')?'track':'vision')+(ro?' ro':'');

    // ── 상단 스텝바 (뷰 구성 이후 채움) ──────────────────────────
    var top=el('<div class="apw-top"><div class="apw-topin">'
      +'<div class="apw-brand"><span class="apw-mk">P</span><div>'+esc(L.stage==='track'?'펜타 트랙':'펜타 비전')+'<small>'+esc((L.gradeBand||'')+' · '+(L.theme||'워크북'))+(L.fusion?'  ·  🔀 '+esc(L.fusion):'')+'</small></div></div>'
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
        +(L.fusion?'<div class="fusiontag">🔀 학문융합 · '+esc(L.fusion)+'</div>':'')
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
      stages.forEach(function(s){ rm+='<div class="rm"><div class="em">'+esc(s.icon||'✦')+'</div><div class="rmtx"><h4>'+esc((s.name||'').replace(/^(STAGE|STEP)\s*\d+\s*·?\s*/i,''))+'</h4><p>'+esc(s.desc||'')+'</p></div></div>'; });
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
      var v=addView((stg.name||'').replace(/^(STAGE|STEP)\s*\d+\s*·?\s*/i,'').trim().slice(0,10) || ('단계'+(si+1)));
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
    function hasAns(id){ var a=state.answers[id]; if(a!=null && a.toString().trim().length>0) return true; if(state.ink && state.ink[id]) return true; return false; }
    function reqDone(){ return required.filter(hasAns).length; }
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

    // ── 손글씨 OCR (penta-ai penta_ocr) ──────────────────────────
    function pentaOcr(dataURL){
      var b64=String(dataURL).replace(/^data:image\/\w+;base64,/,'');
      return Promise.resolve((window.sb&&window.sb.auth)?window.sb.auth.getSession():null).then(function(s){
        var tok=(s&&s.data&&s.data.session)?s.data.session.access_token:'';
        var url=(window.SB_URL||'https://dvxepjctjazobrkjrkdw.supabase.co')+'/functions/v1/penta-ai';
        return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({task:'penta_ocr',payload:{images:[b64]}})});
      }).then(function(r){ return r.json().then(function(d){ if(!r.ok)throw new Error(d.error||'OCR 실패'); return (d.text||'').trim(); }); });
    }

    // ── 제출 ──────────────────────────────────────────────────────
    function doSubmit(){
      var miss=required.filter(function(id){ return !hasAns(id); });
      if(miss.length){ msg.className='msg err'; msg.textContent='아직 '+miss.length+'개 문항이 비어 있어요. 모두 채운 뒤 제출해 주세요.';
        try{ var node=root.querySelector('[data-id="'+miss[0]+'"]'); if(node){ // 해당 스텝으로 이동
          for(var vi=0;vi<views.length;vi++){ if(views[vi].node.contains(node)){ go(vi); break; } }
          setTimeout(function(){node.scrollIntoView({behavior:'smooth',block:'center'});},60);
        }}catch(_){}
        return;
      }
      // 손글씨(pen) 답안 → OCR 전사 후 실제 저장 진행
      var inkIds=Object.keys(state.ink||{}).filter(function(id){ return state.ink[id] && !(state.answers[id]&&String(state.answers[id]).trim().length); });
      if(inkIds.length && mode!=='preview' && window.sb){
        busy(true,'✍️ 필기 인식 중…');
        var chain=Promise.resolve();
        inkIds.forEach(function(id){ chain=chain.then(function(){ return pentaOcr(state.ink[id]).then(function(txt){ if(txt) state.answers[id]=txt; }, function(){}); }); });
        chain.then(function(){ busy(false); _save(); });
        return;
      }
      _save();
    }
    function _save(){
      // 손글씨 원본 보관(리포트 생성 시 penta-ai가 _ink를 스트립함)
      if(state.ink && Object.keys(state.ink).length){ state.answers._ink=state.ink; } else { try{ delete state.answers._ink; }catch(_e){} }
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

      function done(){ btnNext.style.display='none'; }
    }
    function busy(on,label){ btnNext.disabled=on; btnNext.textContent=on?(label||'제출 중…'):((L.submit&&L.submit.label)||'제출하기'); }
    function ok(t){ msg.className='msg ok'; msg.textContent=t; try{msg.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){}}

    // ── S펜(필기) 입력: 자판/S펜 토글 + 캔버스 드로잉 ──────────────
    function setupInkBlock(w, id, ta){
      var inp=w.querySelector('.inpmode'), inkwrap=w.querySelector('.inkwrap'); if(!inp||!inkwrap) return;
      var cv=inkwrap.querySelector('canvas'), ctx=cv.getContext('2d');
      var pen='pen', drawing=false, sized=false, last=null;
      function size(){
        if(sized) return; var wpx=cv.clientWidth||0, hpx=cv.clientHeight||230; if(!wpx) return; sized=true;
        var dpr=Math.min(window.devicePixelRatio||1,2);
        cv.width=Math.round(wpx*dpr); cv.height=Math.round(hpx*dpr);
        ctx.scale(dpr,dpr); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#141a29';
        if(state.ink[id]){ var im=new Image(); im.onload=function(){ try{ctx.drawImage(im,0,0,wpx,hpx);}catch(_){} }; im.src=state.ink[id]; }
      }
      function pos(e){ var r=cv.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; }
      function down(e){ if(e.pointerType==='mouse'&&e.button!==0)return; e.preventDefault(); size(); if(!sized)return; drawing=true; last=pos(e); try{cv.setPointerCapture(e.pointerId);}catch(_){} }
      function move(e){ if(!drawing)return; e.preventDefault(); var p=pos(e);
        var pr=(e.pressure>0&&e.pressure<1)?e.pressure:0.5;
        ctx.globalCompositeOperation=(pen==='era')?'destination-out':'source-over';
        ctx.lineWidth=(pen==='era')?20:(1.4+pr*2.8);
        ctx.beginPath(); ctx.moveTo(last[0],last[1]); ctx.lineTo(p[0],p[1]); ctx.stroke(); last=p; }
      function upfn(){ if(!drawing)return; drawing=false; try{ state.ink[id]=cv.toDataURL('image/png'); }catch(_){} updateNav(); }
      cv.addEventListener('pointerdown',down); cv.addEventListener('pointermove',move);
      cv.addEventListener('pointerup',upfn); cv.addEventListener('pointercancel',upfn);
      var bp=inkwrap.querySelector('.ink-pen'), be=inkwrap.querySelector('.ink-era'), bc=inkwrap.querySelector('.ink-clr');
      bp.addEventListener('click',function(){pen='pen';bp.classList.add('on');be.classList.remove('on');});
      be.addEventListener('click',function(){pen='era';be.classList.add('on');bp.classList.remove('on');});
      bc.addEventListener('click',function(){ if(sized)ctx.clearRect(0,0,cv.width,cv.height); delete state.ink[id]; updateNav(); });
      inp.addEventListener('click',function(e){ var btn=e.target&&e.target.closest?e.target.closest('button'):null; if(!btn)return;
        var m=btn.getAttribute('data-m'); [].forEach.call(inp.children,function(x){x.classList.toggle('on',x===btn);});
        if(m==='pen'){ ta.style.display='none'; inkwrap.style.display='block'; state.inkmode[id]='pen'; setTimeout(size,20); }
        else { ta.style.display=''; inkwrap.style.display='none'; state.inkmode[id]='type'; }
      });
    }

    // ── 블록 렌더러 ───────────────────────────────────────────────
    function renderBlock(b, noRef){
      var w=document.createElement('div'); w.className='blk';
      if(b.id) w.setAttribute('data-id', b.id);
      var t=b.t||b.type;

      if(t==='info'){
        w.innerHTML='<div class="infobox">'+(b.title?'<div class="it">'+esc(b.title)+'</div>':'')+'<div class="ib">'+richEsc(b.body||'')+'</div></div>';
        return w;
      }
      if(t==='read'){
        w.innerHTML='<div class="rc"><div class="who">'+(/^\p{Emoji}/u.test(b.title||'')?'':'📖 ')+esc(b.title||'읽기 자료')+'</div>'
          +'<div class="core">'+richEsc(b.body||'')+'</div>'
          +(b.source?'<div class="src">— '+esc(b.source)+'</div>':'')+'</div>';
        return w;
      }
      if(t==='video'){
        var links='<div class="vlinks">';
        if(b.url){ links+='<a class="primary" href="'+esc(b.url)+'" target="_blank" rel="noopener">▶ 영상 보기</a>'; if(b.search){ links+='<a class="search" href="'+esc(ytSearch(b.search))+'" target="_blank" rel="noopener">▶ 다른 영상 더 찾기</a>'; } }
        else if(b.search){
          // 영상 찾기 우선순위: ①지식채널e ②유튜브 10분 내외 ③추천순
          links+='<a class="primary" href="'+esc(ytSearch('지식채널e '+b.search))+'" target="_blank" rel="noopener">▶ 지식채널e에서 찾기</a>'
            +'<a class="search" href="'+esc(ytSearch(b.search))+'" target="_blank" rel="noopener">▶ 유튜브(10분 내외)</a>';
        }
        links+='</div>';
        var mid='';
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
        var tn=toneStyle(b.tone);
        var head=b.head || ('🤔 '+(isKid?'만약에?':'생각해 보기'));
        var _sokeBtn=((b.soke!==false && !ro && window.ArcheSoke)?'<button type="button" class="soke-ask" style="margin-top:8px;align-self:flex-start;display:inline-flex;align-items:center;gap:6px;background:'+(L.stage==='track'?'#eef7db':'#eef3ff')+';color:'+(L.stage==='track'?'#4c7a12':'#1b64da')+';border:1px solid '+(L.stage==='track'?'#cfe89a':'#cfe0ff')+';border-radius:20px;padding:7px 13px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer">🤔 소크에게 물어보기</button>':'');
        var _abox;
        if(ro){
          _abox='<div class="abox"><label><span class="pen">✎</span> '+esc(b.ansLabel||'내 생각')+'</label>'
            +'<textarea readonly rows="'+(b.rows||4)+'">'+esc(state.answers[b.id]||'')+'</textarea>'
            +(state.ink[b.id]?'<div class="inknote">✍️ 손글씨 원본</div><img class="inkview" src="'+esc(state.ink[b.id])+'" alt="손글씨 답안">':'')
            +'</div>';
        } else {
          _abox='<div class="abox"><label><span class="pen">✎</span> '+esc(b.ansLabel||'내 생각')+'</label>'
            +'<div class="inpmode"><button type="button" data-m="type" class="on">⌨ 자판</button><button type="button" data-m="pen">✍️ S펜</button></div>'
            +'<textarea rows="'+(b.rows||4)+'" placeholder="'+esc(b.placeholder||'여기에 생각을 적어 보세요')+'">'+esc(state.answers[b.id]||'')+'</textarea>'
            +'<div class="inkwrap" style="display:none"><div class="inktools"><button type="button" class="ink-pen on">✏️ 펜</button><button type="button" class="ink-era">🩹 지우개</button><button type="button" class="ink-clr">🗑 전체 지우기</button></div>'
              +'<canvas class="inkpad"></canvas><div class="inknote">✍️ S펜이나 손가락으로 답을 써보세요 · 제출할 때 자동으로 글자로 바뀌고, 손글씨 원본도 함께 저장돼요.</div></div>'
            +_sokeBtn
            +'</div>';
        }
        w.innerHTML='<div class="sym">'
          +'<div class="qbox" style="'+tn.box+'"><h4 style="'+tn.h+'">'+esc(head)+'</h4><p style="'+tn.p+'">'+qn+esc(b.q||'')+'</p>'
            +(b.hint?'<div class="mission" style="'+tn.m+'">✏️ '+esc(b.hint)+'</div>':(isKid&&b.tone==null?'<div class="mission">✏️ 정답은 없어요. 네 생각을 자유롭게 써봐요!</div>':''))+'</div>'
          +_abox+'</div>';
        var ta=w.querySelector('textarea'); ta.addEventListener('input',function(){state.answers[b.id]=ta.value;});
        if(!ro) setupInkBlock(w, b.id, ta);
        var sokeBtn=w.querySelector('.soke-ask');
        if(sokeBtn){ sokeBtn.addEventListener('click',function(){
          window.ArcheSoke.open({
            stage:L.stage, level:L.level,
            topic:(L.theme||L.title||''), question:(b.q||b.head||''),
            skin:(L.stage==='track'?'track':'vision'),
            getPartial:function(){ return ta.value; },
            studentId:(opts.studentId||window._activeStudent||window._activeStudentId||''),
            lessonKey:(String(L.stage||'')+':'+String(L.season||'')+':'+String(L.week||'')+':'+String(b.id||'')),
            tier:L.tier
          });
        }); }
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

  window.ArchePentaWorkbook = { render: render, version: '2.1' };
})();
