/* ============================================================================
 * arche_penta_period.js · 펜타 정기(월간/분기/반기/연간) 성장 리포트
 * ----------------------------------------------------------------------------
 * - 학부모가 [분석 실행]으로 기간 종합 리포트를 생성(초안) → [발행]하면 자녀에게 표시.
 * - 비전(골드) / 트랙(라임 네이비) 스킨 자동 적용. 트랙 반기·연간엔 진로매칭 + 고1~고3 로드맵.
 * 데이터원: penta_submissions(status='sent') 집계 → penta-ai(task:'penta_period_report')
 *          → save_penta_period_report(RPC) 저장 → penta_period_reports.
 * API :
 *   ArchePentaPeriod.renderReport(mount, report)                 // 리포트만 렌더
 *   ArchePentaPeriod.mountManage(mount, ctx)                     // 발행자(학부모/컨설턴트) UI
 *      ctx = { studentId, name, grade, stage:'vision'|'track', level, sb(optional) }
 *   ArchePentaPeriod.mountViewer(mount, ctx)                     // 자녀·열람자용(발행분만)
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL = 'https://dvxepjctjazobrkjrkdw.supabase.co';
  function sb(){ return window.sb; }
  function esc(s){ return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function el(html){ var t=document.createElement('template'); t.innerHTML=String(html).trim(); return t.content.firstChild; }
  function num(v,d){ v=+v; return isFinite(v)?v:(d||0); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  // ── 스킨 CSS (비전=골드 / 트랙=라임) ────────────────────────────────────────
  var CSS = ""
  + ".ppr{--navy:#141a29;--navy2:#22293c;--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--faint:#b0b8c1;--mono:'JetBrains Mono',ui-monospace,monospace;"
  +      "font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;color:var(--ink);letter-spacing:-.012em;line-height:1.6;max-width:460px;margin:0 auto}"
  + ".ppr.vision{--acc:#c8a24a;--acc-d:#a9852f;--acc-l:#e6c877;--acc-soft:#f7efdb;--line:#e8e3d8;--line-soft:#f0ebe0;--bg:#f4f1ea}"
  + ".ppr.track{--acc:#6fa81c;--acc-d:#5c8f16;--acc-l:#b6e34a;--acc-soft:#eef7db;--line:#e5e8eb;--line-soft:#eef1f4;--bg:#eef1f5}"
  + ".ppr *{box-sizing:border-box}"
  + ".ppr .ppwrap{background:var(--bg);border-radius:20px;overflow:hidden;border:1px solid var(--line)}"
  + ".ppr .hd{background:linear-gradient(160deg,#141a29,#22293c 70%,var(--navy2));color:#fff;padding:18px 20px 20px;position:relative;overflow:hidden}"
  + ".ppr.vision .hd{background:linear-gradient(160deg,#171d2c,#2b3040 66%,#3a3524)}"
  + ".ppr.track .hd{background:linear-gradient(160deg,#10151f,#20304a 68%,#243a54)}"
  + ".ppr .hd:after{content:'';position:absolute;right:-40px;top:-30px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(182,227,74,.16),transparent 68%)}"
  + ".ppr.vision .hd:after{background:radial-gradient(circle,rgba(230,200,119,.2),transparent 68%)}"
  + ".ppr .hd .top{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;color:#9fb0c8;position:relative}"
  + ".ppr .hd .top b{color:var(--acc-l)}"
  + ".ppr .hd h1{font-size:21px;font-weight:800;margin:9px 0 3px;position:relative}"
  + ".ppr .hd .sub{font-size:12px;color:#aeb9c9;position:relative}"
  + ".ppr .hd .pub{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#0e2418;background:var(--acc-l);border-radius:20px;padding:4px 11px;margin-top:12px;position:relative}"
  + ".ppr .hd .grade{position:absolute;right:18px;top:46px;font-family:var(--mono);font-size:32px;font-weight:800;color:var(--acc-l);line-height:1;text-align:right}"
  + ".ppr .hd .grade small{display:block;font-size:9px;color:#9fb0c8;letter-spacing:.12em;font-weight:700;margin-top:3px}"
  + ".ppr .sect{font-size:12.5px;font-weight:800;color:var(--navy);padding:18px 18px 8px;display:flex;align-items:center;gap:8px}"
  + ".ppr .sect .n{font-family:var(--mono);font-size:10px;color:var(--faint);font-weight:800}"
  + ".ppr .sect .badge{font-family:var(--mono);font-size:9px;color:#123;background:var(--acc-l);border-radius:5px;padding:2px 6px;letter-spacing:.04em;margin-left:auto}"
  + ".ppr .brief{margin:2px 18px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 15px}"
  + ".ppr .brief .bt{font-size:11px;font-weight:800;color:var(--acc-d);letter-spacing:.04em;margin-bottom:8px}"
  + ".ppr .brief p{font-size:13px;color:#2c3547;line-height:1.82;margin:0 0 9px}"
  + ".ppr .brief p:last-child{margin:0}"
  + ".ppr .brief p b{color:var(--navy)}"
  + ".ppr .kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;padding:2px 18px}"
  + ".ppr .kpi{background:#fff;border:1px solid var(--line-soft);border-radius:13px;padding:12px 13px}"
  + ".ppr .kpi .v{font-size:19px;font-weight:800}.ppr .kpi .v em{font-style:normal;font-size:11.5px;color:var(--acc-d);font-weight:800}"
  + ".ppr .kpi .l{font-size:10px;color:var(--mute);margin-top:2px;font-weight:600}"
  + ".ppr .card{background:#fff;border:1px solid var(--line-soft);border-radius:15px;margin:2px 18px;padding:15px}"
  + ".ppr .radar-row{display:flex;align-items:center;gap:13px}"
  + ".ppr .radar-row .rt{font-size:12px;color:var(--dim);line-height:1.65}.ppr .radar-row .rt b{color:var(--ink)}"
  + ".ppr .lg{display:flex;gap:13px;font-size:10px;font-weight:700;margin-top:8px}.ppr .lg span{display:flex;align-items:center;gap:5px;color:var(--dim)}.ppr .lg .d{width:9px;height:9px;border-radius:3px}"
  + ".ppr .axis{margin-top:13px;border-top:1px solid var(--line-soft);padding-top:12px;display:grid;gap:10px}"
  + ".ppr .ax{display:flex;gap:10px}.ppr .ax .abar{width:56px;flex:none}"
  + ".ppr .ax .an{font-size:10px;font-weight:800;color:var(--ink);margin-bottom:3px}"
  + ".ppr .ax .trk{height:5px;border-radius:4px;background:var(--line);overflow:hidden}.ppr .ax .trk i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,var(--acc),var(--acc-l))}"
  + ".ppr .ax .av{font-family:var(--mono);font-size:9px;color:var(--acc-d);font-weight:800;margin-top:2px}"
  + ".ppr .ax .atx{font-size:11.5px;color:var(--dim);line-height:1.55;flex:1}.ppr .ax .atx b{color:var(--ink)}"
  + ".ppr .trend{display:flex;align-items:flex-end;gap:9px;padding:2px}"
  + ".ppr .trend .tc{flex:1;text-align:center}.ppr .trend .tb{height:70px;display:flex;align-items:flex-end;justify-content:center}"
  + ".ppr .trend .tb i{width:24px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--acc-l),var(--acc))}"
  + ".ppr .trend .tq{font-size:9.5px;color:var(--mute);margin-top:5px;font-weight:600}.ppr .trend .tv{font-size:9.5px;font-family:var(--mono);color:var(--acc-d);font-weight:800}"
  + ".ppr .tnote{font-size:11.5px;color:var(--dim);line-height:1.65;margin-top:11px;border-top:1px solid var(--line-soft);padding-top:10px}.ppr .tnote b{color:var(--ink)}"
  + ".ppr .tnote .qb{display:inline-block;font-family:var(--mono);font-size:9px;color:var(--acc-d);font-weight:800;margin-right:6px}"
  + ".ppr .evid{margin:2px 18px;display:grid;gap:8px}"
  + ".ppr .ev{background:#fff;border:1px solid var(--line-soft);border-radius:13px;padding:12px 14px;display:flex;gap:11px}"
  + ".ppr .ev .ei{width:30px;height:30px;flex:none;border-radius:9px;background:var(--acc-soft);display:grid;place-items:center;font-size:15px}"
  + ".ppr .ev .eh{font-size:12.5px;font-weight:800;color:var(--ink);margin-bottom:3px}.ppr .ev .ed{font-size:11.5px;color:var(--dim);line-height:1.55}"
  + ".ppr .coach{margin:2px 18px;display:grid;gap:9px}"
  + ".ppr .co{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:13px 14px;border-left:4px solid var(--acc)}"
  + ".ppr .co.warn{border-left-color:#e0b34a}.ppr .co.home{border-left-color:#8fb0d8}"
  + ".ppr .co .ct{font-size:12px;font-weight:800;color:var(--navy);display:flex;align-items:center;gap:7px;margin-bottom:6px}"
  + ".ppr .co .cg{font-size:9.5px;font-weight:800;color:#fff;background:var(--acc-d);border-radius:5px;padding:2px 7px}"
  + ".ppr .co.warn .cg{background:#c99326}.ppr .co.home .cg{background:#5f82ad}"
  + ".ppr .co .cd{font-size:11.5px;color:var(--dim);line-height:1.68}.ppr .co .cd b{color:var(--ink)}"
  + ".ppr .match{margin:2px 18px;display:grid;gap:10px}"
  + ".ppr .mrow{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:14px}"
  + ".ppr .mrow.top{border-color:var(--acc-l)}"
  + ".ppr .mtop{display:flex;align-items:center;gap:11px}"
  + ".ppr .mrow .rk{font-family:var(--mono);font-size:12px;font-weight:800;color:#fff;background:var(--navy);width:24px;height:24px;border-radius:8px;display:grid;place-items:center;flex:none}"
  + ".ppr .mrow.top .rk{background:#c8a24a}"
  + ".ppr .mrow .mn{font-size:14px;font-weight:800}.ppr .mrow .md{font-size:10.5px;color:var(--mute)}"
  + ".ppr .mrow .fit{margin-left:auto;text-align:right;flex:none}.ppr .mrow .fv{font-size:18px;font-weight:800;color:var(--acc-d)}.ppr .mrow .fl{font-size:8.5px;color:var(--mute);font-weight:700}"
  + ".ppr .mrow .fbar{display:flex;align-items:center;gap:8px;margin-top:10px}.ppr .mrow .fbar .bt{flex:1;height:7px;border-radius:5px;background:var(--line-soft);overflow:hidden}.ppr .mrow .fbar .bt i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--acc),var(--acc-l))}.ppr .mrow .fbar .bn{font-family:var(--mono);font-size:9px;color:var(--mute);font-weight:700}"
  + ".ppr .mrow .why{font-size:11.5px;color:var(--dim);line-height:1.62;margin-top:10px;padding-top:10px;border-top:1px solid var(--line-soft)}.ppr .mrow .why b{color:var(--ink)}"
  + ".ppr .mrow .tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.ppr .mrow .tags span{font-size:10px;font-weight:700;color:var(--dim);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:3px 8px}.ppr .mrow .tags .k{color:var(--acc-d);background:var(--acc-soft);border-color:var(--acc-l)}"
  + ".ppr .cninfo{margin-top:11px;padding-top:11px;border-top:1px dashed var(--line)}"
  + ".ppr .cninfo .cnh{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:var(--navy);margin-bottom:6px}"
  + ".ppr .cninfo .cnh .src{font-family:var(--mono);font-size:8.5px;color:#fff;background:#3182f6;border-radius:4px;padding:2px 6px;letter-spacing:.03em}"
  + ".ppr .cninfo .cnh .maj{color:var(--acc-d)}"
  + ".ppr .cninfo .sum{font-size:11.5px;color:var(--dim);line-height:1.65;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}"
  + ".ppr .cninfo .cnrow{display:flex;gap:7px;margin-top:6px;align-items:flex-start}"
  + ".ppr .cninfo .cnk{font-size:9.5px;font-weight:800;color:var(--mute);flex:none;width:52px;padding-top:3px}"
  + ".ppr .cninfo .cnv{display:flex;flex-wrap:wrap;gap:4px;flex:1}"
  + ".ppr .cninfo .cnv span{font-size:10px;font-weight:700;color:var(--dim);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:3px 7px}"
  + ".ppr .cninfo .cnv.subj span{color:#1b64da;background:#eef3ff;border-color:#d7e4fb}"
  + ".ppr .cninfo .cnv.job span{color:var(--acc-d);background:var(--acc-soft);border-color:var(--acc-l)}"
  + ".ppr .stair{display:flex;align-items:flex-end;gap:8px;margin:2px 18px 4px;background:#fff;border:1px solid var(--line-soft);border-radius:15px;padding:15px 13px 13px}"
  + ".ppr .stp{flex:1;border-radius:10px 10px 8px 8px;padding:10px 6px 9px;text-align:center;color:#fff}"
  + ".ppr .stp.s1{height:82px;background:#46527a}.ppr .stp.s2{height:102px;background:#2a3a58}.ppr .stp.s3{height:122px;background:var(--navy)}"
  + ".ppr .stp .sl{font-family:var(--mono);font-size:9px;font-weight:800;opacity:.72;display:block}.ppr .stp .sn{font-size:13px;font-weight:800;display:block;margin-top:4px}.ppr .stp.s3 .sn{color:var(--acc-l)}.ppr .stp .sd{font-size:9px;opacity:.82;display:block;margin-top:3px;line-height:1.3}"
  + ".ppr .roadhead{margin:2px 18px 4px;font-size:11.5px;color:var(--dim);line-height:1.65;background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:11px 13px}.ppr .roadhead b{color:var(--navy)}"
  + ".ppr .road{padding:6px 18px 4px}"
  + ".ppr .gnode{position:relative;padding:0 0 15px 46px}"
  + ".ppr .gnode .gl{position:absolute;left:16px;top:34px;bottom:-2px;width:2px;background:var(--line)}.ppr .gnode:last-child .gl{display:none}"
  + ".ppr .gnode .gdot{position:absolute;left:0;top:0;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-family:var(--mono);font-size:11px;font-weight:800;color:#fff}"
  + ".ppr .gnode.g1 .gdot{background:#46527a}.ppr .gnode.g2 .gdot{background:#2a3a58}.ppr .gnode.g3 .gdot{background:var(--navy);box-shadow:0 0 0 3px rgba(182,227,74,.32)}"
  + ".ppr .gcard{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:14px}"
  + ".ppr .gcard .gh{font-size:14.5px;font-weight:800}.ppr .gcard .gg{font-size:11px;color:var(--acc-d);font-weight:700;margin:2px 0 11px}"
  + ".ppr .grow{margin-bottom:11px}.ppr .grow:last-child{margin-bottom:0}"
  + ".ppr .grow .gk{display:inline-flex;align-items:center;font-size:10px;font-weight:800;color:#fff;background:var(--navy2);border-radius:6px;padding:3px 9px;margin-bottom:7px}"
  + ".ppr .grow .gk.t{background:var(--acc-d)}.ppr .grow .gk.s{background:#6b7688}"
  + ".ppr .subj{display:flex;flex-wrap:wrap;gap:6px}.ppr .subj .s{font-size:11px;font-weight:700;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:5px 9px;line-height:1.35}.ppr .subj .s b{color:var(--acc-d)}.ppr .subj .s .rz{display:block;font-size:9.5px;color:var(--mute);font-weight:600;margin-top:2px}"
  + ".ppr .tamgu{background:var(--acc-soft);border:1px solid var(--acc-l);border-radius:11px;padding:11px 12px}"
  + ".ppr .tamgu .tt{font-size:12.5px;font-weight:800;color:var(--navy);line-height:1.4}"
  + ".ppr .tamgu .tm{display:flex;gap:8px;font-size:11px;line-height:1.5;margin-top:7px}.ppr .tamgu .tm .mk{font-size:9.5px;font-weight:800;color:var(--acc-d);width:40px;flex:none;padding-top:1px}.ppr .tamgu .tm .mv{color:var(--dim);flex:1}.ppr .tamgu .tm .mv b{color:var(--ink)}"
  + ".ppr .setuk{font-size:11px;color:var(--dim);line-height:1.55;margin-top:8px}.ppr .setuk b{color:var(--ink)}"
  + ".ppr .todo{margin:2px 18px;display:grid;gap:7px}"
  + ".ppr .td{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:11px 13px;display:flex;gap:10px;align-items:flex-start}"
  + ".ppr .td .ck{width:17px;height:17px;flex:none;border-radius:6px;border:2px solid var(--acc);margin-top:1px;position:relative}.ppr .td .ck:after{content:'';position:absolute;left:4px;top:1px;width:4px;height:8px;border:solid var(--acc);border-width:0 2px 2px 0;transform:rotate(45deg)}"
  + ".ppr .td .tx{font-size:11.5px;color:var(--ink);line-height:1.5}.ppr .td .tx b{color:var(--navy)}.ppr .td .tx .when{font-size:9.5px;color:var(--acc-d);font-weight:700}"
  + ".ppr .foot{padding:14px 18px 20px}.ppr .foot .note{font-size:10.5px;color:var(--mute);line-height:1.7;background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px}.ppr .foot .note b{color:var(--dim)}"
  // ── 관리(발행) UI ──
  + ".ppm{font-family:'Pretendard Variable',Pretendard,sans-serif;max-width:460px;margin:0 auto;color:#243244}"
  + ".ppm .seg{display:flex;gap:6px;overflow:auto;padding:2px 0 4px}.ppm .seg::-webkit-scrollbar{height:0}"
  + ".ppm .seg button{flex:none;border:1px solid #dfe3ec;background:#fff;color:#4e5968;font:inherit;font-weight:700;font-size:12.5px;padding:8px 15px;border-radius:20px;cursor:pointer}"
  + ".ppm .seg button.on{background:#141a29;border-color:#141a29;color:#fff}"
  + ".ppm .keyrow{display:flex;align-items:center;gap:8px;margin:10px 0}.ppm .keyrow select{flex:1;border:1.5px solid #dfe3ec;border-radius:9px;padding:9px 11px;font:inherit;font-size:13px;background:#fff}"
  + ".ppm .pbtn{display:block;width:100%;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:14px;padding:14px;cursor:pointer;background:linear-gradient(135deg,#141a29,#2a3a58);color:#fff}"
  + ".ppm .pbtn.pub{background:linear-gradient(135deg,#5c8f16,#6fa81c);color:#fff;margin-top:9px}"
  + ".ppm .pbtn:disabled{opacity:.55;cursor:not-allowed}"
  + ".ppm .hint2{font-size:11.5px;color:#6b7688;line-height:1.6;margin:8px 2px;text-align:center}"
  + ".ppm .existing{margin-top:14px;display:grid;gap:8px}"
  + ".ppm .exr{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #eef1f6;border-radius:12px;padding:11px 13px}"
  + ".ppm .exr .xl{flex:1}.ppm .exr .xt{font-size:13px;font-weight:800;color:#141a29}.ppm .exr .xs{font-size:11px;color:#8b95a1;margin-top:1px}"
  + ".ppm .exr .st{font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px}.ppm .exr .st.sent{background:#e9f9ef;color:#137a44}.ppm .exr .st.draft{background:#fff4e0;color:#b8860b}"
  + ".ppm .exr button{border:0;border-radius:8px;font:inherit;font-weight:700;font-size:11.5px;padding:7px 11px;cursor:pointer;background:#141a29;color:#fff}"
  + ".ppm .empty2{text-align:center;color:#8b95a1;font-size:12.5px;padding:22px 16px;background:#f7f9fd;border-radius:12px;line-height:1.6}"
  + ".ppr-ov{position:fixed;inset:0;background:rgba(8,11,46,.6);z-index:2147483600;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 10px}"
  + ".ppr-ovc{max-width:462px;margin:0 auto;position:relative}"
  + ".ppr-ovx{position:sticky;top:0;display:flex;justify-content:flex-end;z-index:5;margin-bottom:8px}"
  + ".ppr-ovx button{font:inherit;font-weight:800;font-size:13px;padding:8px 14px;border-radius:10px;border:0;background:#141a29;color:#fff;cursor:pointer}"
  + ".ppr .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:pprspin .7s linear infinite;vertical-align:-2px;margin-right:6px}@keyframes pprspin{to{transform:rotate(360deg)}}"
  + ".ppm .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:pprspin .7s linear infinite;vertical-align:-2px;margin-right:6px}"
  + ".ppm .toast,.ppr .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#141a29;color:#fff;font-size:12.5px;font-weight:700;padding:11px 17px;border-radius:99px;z-index:2147483647;opacity:0;transition:.2s}.ppm .toast.on,.ppr .toast.on{opacity:1}";

  function inject(){ if(!document.getElementById('ppr-css')){ var s=document.createElement('style'); s.id='ppr-css'; s.textContent=CSS; document.head.appendChild(s); } }
  function toast(msg){ var t=el('<div class="toast"></div>'); t.textContent=msg; document.body.appendChild(t); requestAnimationFrame(function(){t.classList.add('on');}); setTimeout(function(){ t.classList.remove('on'); setTimeout(function(){t.remove();},250); },2200); }

  var PTLABEL={ monthly:'월간', quarterly:'분기', half:'반기', annual:'연간' };
  var STAGE_TITLE={ vision:'펜타 비전', track:'펜타 트랙' };

  // ── 레이더 SVG (5축, before/after) ──────────────────────────────────────
  function radarSVG(axes, before, after){
    var N=5, cx=60, cy=57, R=44;
    function pts(vals){ return vals.map(function(v,i){ var ang=-Math.PI/2 + i*2*Math.PI/N; var r=R*clamp(num(v,0),0,100)/100; return (cx+r*Math.cos(ang)).toFixed(1)+','+(cy+r*Math.sin(ang)).toFixed(1); }).join(' '); }
    function ring(f){ return pts([f*100,f*100,f*100,f*100,f*100]); }
    var labels=axes.map(function(a,i){ var ang=-Math.PI/2 + i*2*Math.PI/N; var lr=R+11; var x=cx+lr*Math.cos(ang), y=cy+lr*Math.sin(ang)+2; var anchor=Math.abs(Math.cos(ang))<0.3?'middle':(Math.cos(ang)>0?'start':'end'); return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" text-anchor="'+anchor+'" font-size="8" fill="#8b95a1" font-weight="700">'+esc(a)+'</text>'; }).join('');
    return '<svg width="118" height="118" viewBox="0 0 120 118">'
      + '<g fill="none" stroke="#e5e2d8" stroke-width="1.2"><polygon points="'+ring(1)+'"/><polygon points="'+ring(.66)+'"/><polygon points="'+ring(.33)+'"/></g>'
      + '<polygon points="'+pts(before)+'" fill="rgba(139,149,161,.14)" stroke="#b0b8c1" stroke-width="1.4"/>'
      + '<polygon points="'+pts(after)+'" fill="rgba(120,170,60,.2)" stroke="currentColor" stroke-width="2.3" class="rpoly"/>'
      + labels + '</svg>';
  }

  // ── 리포트 렌더 ─────────────────────────────────────────────────────────
  function renderReport(mount, report){
    inject();
    report=report||{};
    var stage=(report.stage==='track')?'track':'vision';
    var acc = stage==='track' ? '#6fa81c' : '#c8a24a';
    var wrap=el('<div class="ppr '+stage+'"></div>');
    var box=el('<div class="ppwrap"></div>'); wrap.appendChild(box);
    var stTitle=STAGE_TITLE[stage]; var ptl=PTLABEL[report.period_type]||'정기';
    var meta=report.meta||{};
    // 헤더
    box.appendChild(el('<div class="hd">'
      + '<div class="top">PENTA '+(stage==='track'?'TRACK':'VISION')+' <span style="color:#41506e">/</span> '+esc((report.period_type||'').toUpperCase()||'PERIOD')+' <span style="color:#41506e">/</span> <b>'+esc(report.period_key||'')+'</b></div>'
      + (report.grade?('<div class="grade">'+esc(report.grade)+'<small>종합 성장</small></div>'):'')
      + '<h1>'+esc(meta.name||'우리 아이')+'님의 '+esc(ptl)+' 리포트</h1>'
      + '<div class="sub">'+esc(stTitle)+(meta.grade?(' · '+esc(meta.grade)):'')+(report.period_label?(' · '+esc(report.period_label)):'')+'</div>'
      + (report.status==='sent'?'<div class="pub">✓ 부모님이 분석·발행함</div>':'<div class="pub" style="background:#fff4e0;color:#8a6d1f">초안 · 미발행</div>')
      + '</div>'));

    // 01 총평
    var brief=Array.isArray(report.brief)?report.brief:(report.brief?[report.brief]:[]);
    if(brief.length){ var bd=el('<div class="brief"><div class="bt">CONSULTANT BRIEFING</div></div>'); brief.forEach(function(pp){ bd.appendChild(el('<p>'+esc(pp)+'</p>')); }); box.appendChild(el('<div class="sect"><span class="n">01</span> 진단 컨설턴트 총평</div>')); box.appendChild(bd); }

    // 02 KPI
    var kpis=buildKpis(report, stage);
    if(kpis.length){ box.appendChild(el('<div class="sect"><span class="n">02</span> 한 기간 지표 요약</div>')); var kg=el('<div class="kpis"></div>'); kpis.forEach(function(k){ kg.appendChild(el('<div class="kpi"><div class="v">'+k.v+'</div><div class="l">'+esc(k.l)+'</div></div>')); }); box.appendChild(kg); }

    // 03 성향(레이더+축)
    var rd=report.radar||{}; var axesArr=report.axes||[];
    if(rd.axes&&rd.after){
      box.appendChild(el('<div class="sect"><span class="n">03</span> 성향 분석 · 5축 <span class="badge">다관점</span></div>'));
      var card=el('<div class="card"></div>');
      var row=el('<div class="radar-row"></div>');
      var svgWrap=el('<div style="color:'+acc+';flex:none"></div>'); svgWrap.innerHTML=radarSVG(rd.axes, rd.before||[0,0,0,0,0], rd.after);
      row.appendChild(svgWrap);
      row.appendChild(el('<div class="rt">'+esc(rd.note||'')+'</div>'));
      card.appendChild(row);
      card.appendChild(el('<div class="lg"><span><span class="d" style="background:#b0b8c1"></span>연초</span><span><span class="d" style="background:'+acc+'"></span>연말</span></div>'));
      if(axesArr.length){ var ax=el('<div class="axis"></div>'); axesArr.forEach(function(a){ ax.appendChild(el('<div class="ax"><div class="abar"><div class="an">'+esc(a.name||'')+'</div><div class="trk"><i style="width:'+clamp(num(a.score),0,100)+'%"></i></div><div class="av">'+clamp(num(a.score),0,100)+'</div></div><div class="atx">'+esc(a.note||'')+'</div></div>')); }); card.appendChild(ax); }
      box.appendChild(card);
    }

    // 04 발전추이
    var tr=report.trend||{};
    if(tr.points&&tr.points.length){
      box.appendChild(el('<div class="sect"><span class="n">04</span> 발전 추이</div>'));
      var tc=el('<div class="card"></div>'); var td=el('<div class="trend"></div>');
      tr.points.forEach(function(pt){ td.appendChild(el('<div class="tc"><div class="tb"><i style="height:'+clamp(num(pt.pct),6,100)+'%"></i></div><div class="tv">'+esc(pt.level||'')+'</div><div class="tq">'+esc(pt.q||'')+'</div></div>')); });
      tc.appendChild(td);
      if(tr.notes&&tr.notes.length){ var tn=el('<div class="tnote"></div>'); tr.notes.forEach(function(n,i){ tn.appendChild(el('<div'+(i?' style="margin-top:6px"':'')+'><span class="qb">'+esc(n.span||'')+'</span>'+esc(n.text||'')+'</div>')); }); tc.appendChild(tn); }
      box.appendChild(tc);
    }

    // 05 성장 장면
    if(report.moments&&report.moments.length){
      box.appendChild(el('<div class="sect"><span class="n">05</span> 눈에 띈 성장 장면</div>'));
      var ev=el('<div class="evid"></div>'); report.moments.forEach(function(m){ ev.appendChild(el('<div class="ev"><div class="ei">'+esc(m.icon||'✨')+'</div><div><div class="eh">'+esc(m.title||'')+'</div><div class="ed">'+esc(m.desc||'')+'</div></div></div>')); }); box.appendChild(ev);
    }

    var no=6;
    // 06 코칭(비전)
    if(report.coaching&&report.coaching.length){
      box.appendChild(el('<div class="sect"><span class="n">0'+(no++)+'</span> 영역별 코칭 포인트</div>'));
      var cg=el('<div class="coach"></div>'); report.coaching.forEach(function(c){ var k=(c.kind==='warn'?'warn':(c.kind==='home'?'home':'')); cg.appendChild(el('<div class="co '+k+'"><div class="ct"><span class="cg">'+esc(c.tag||'')+'</span> '+esc(c.title||'')+'</div><div class="cd">'+esc(c.desc||'')+'</div></div>')); }); box.appendChild(cg);
    }

    // 06/07 진로 매칭(트랙)
    if(report.career_match&&report.career_match.length){
      box.appendChild(el('<div class="sect"><span class="n">0'+(no++)+'</span> 진로 매칭 Top3 <span class="badge">TRACK</span></div>'));
      var mm=el('<div class="match"></div>');
      report.career_match.forEach(function(c,i){
        var fit=clamp(num(c.fit),0,100);
        var tags=(c.need||[]).map(function(n){return '<span class="k">필요역량 · '+esc(n)+'</span>';}).join('') + ((c.depts&&c.depts.length)?'<span>연계 학과 · '+esc(c.depts.join('/'))+'</span>':'');
        mm.appendChild(el('<div class="mrow'+(i===0?' top':'')+'">'
          + '<div class="mtop"><span class="rk">'+num(c.rank,i+1)+'</span><div><div class="mn">'+esc(c.name||'')+'</div><div class="md">'+esc(c.desc||'')+'</div></div><div class="fit"><div class="fv">'+fit+'</div><div class="fl">FIT</div></div></div>'
          + '<div class="fbar"><div class="bt"><i style="width:'+fit+'%"></i></div><span class="bn">'+fit+' / 100</span></div>'
          + (c.why?('<div class="why"><b>왜 잘 맞나요?</b> '+esc(c.why)+'</div>'):'')
          + (tags?('<div class="tags">'+tags+'</div>'):'')
          + cnInfoHTML(c.cn)
          + '</div>'));
      });
      box.appendChild(mm);
    }

    // 07/08 고교 로드맵(트랙)
    var rm=report.roadmap;
    if(rm&&rm.grades&&rm.grades.length){
      box.appendChild(el('<div class="sect"><span class="n">0'+(no++)+'</span> 고1~고3 로드맵 <span class="badge">TRACK</span></div>'));
      box.appendChild(el('<div class="roadhead">2022 개정 <b>고교학점제</b> 기준. <b>「'+esc(rm.target||'목표 진로')+'」</b>을 향해 선택과목·탐구·진로목표가 3년간 하나의 서사로 이어지도록 설계했어요.</div>'));
      var stairs=rm.stairs||[{g:'고1',label:'씨앗'},{g:'고2',label:'분석'},{g:'고3',label:'설계'}];
      var st=el('<div class="stair"></div>'); stairs.slice(0,3).forEach(function(s,i){ st.appendChild(el('<div class="stp s'+(i+1)+'"><span class="sl">'+esc(s.g||'')+'</span><span class="sn">'+esc(s.label||'')+'</span><span class="sd">'+esc(s.sub||'')+'</span></div>')); }); box.appendChild(st);
      var road=el('<div class="road"></div>');
      rm.grades.slice(0,3).forEach(function(g,i){
        var subj=(g.subjects||[]).map(function(s){ return '<div class="s"><b>'+esc(s.name||'')+'</b>'+(s.why?('<span class="rz">'+esc(s.why)+'</span>'):'')+'</div>'; }).join('');
        var tg=g.tamgu||{};
        road.appendChild(el('<div class="gnode g'+(i+1)+'"><span class="gl"></span><span class="gdot">'+esc(g.grade||('고'+(i+1)))+'</span>'
          + '<div class="gcard">'
          + '<div class="gh">'+esc(g.head||'')+'</div>'+(g.goal?('<div class="gg">'+esc(g.goal)+'</div>'):'')
          + (subj?('<div class="grow"><span class="gk">선택과목 · 왜</span><div class="subj">'+subj+'</div></div>'):'')
          + (tg.theme?('<div class="grow"><span class="gk t">탐구</span><div class="tamgu"><div class="tt">'+esc(tg.theme)+'</div>'
              + (tg.purpose?('<div class="tm"><span class="mk">목적</span><span class="mv">'+esc(tg.purpose)+'</span></div>'):'')
              + (tg.method?('<div class="tm"><span class="mk">방법</span><span class="mv">'+esc(tg.method)+'</span></div>'):'')
              + (tg.output?('<div class="tm"><span class="mk">산출물</span><span class="mv">'+esc(tg.output)+'</span></div>'):'')
              + '</div></div>'):'')
          + (g.career_goal?('<div class="grow"><span class="gk s">진로목표</span><div class="setuk">'+esc(g.career_goal)+'</div></div>'):'')
          + '</div></div>'));
      });
      box.appendChild(road);
    }

    // 마지막: 다음 액션
    if(report.actions&&report.actions.length){
      box.appendChild(el('<div class="sect"><span class="n">0'+(no++)+'</span> 다음 기간, 이것부터</div>'));
      var tv=el('<div class="todo"></div>'); report.actions.forEach(function(a){ tv.appendChild(el('<div class="td"><div class="ck"></div><div class="tx">'+esc(a.text||'')+(a.when?(' <span class="when">'+esc(a.when)+'</span>'):'')+'</div></div>')); }); box.appendChild(tv);
    }

    box.appendChild(el('<div class="foot"><div class="note">📌 이 리포트는 <b>'+esc((report.meta&&report.meta.name)||'자녀')+'</b>의 펜타 활동 로그·성향 분석을 근거로 <b>부모님이 직접 분석·발행</b>했습니다. 관심·활동이 바뀌면 <b>다시 분석해 갱신</b>할 수 있어요. '+(stage==='track'?'선택과목·학과명은 방향 예시이며 <b>합격 보장·서열화가 아니라 "탐구 서사 설계"</b>를 위한 것입니다.':'성장은 아이마다 속도가 달라요. <b>비교가 아닌, 어제의 아이와의 비교</b>로 읽어주세요.')+'</div></div>'));

    mount.innerHTML='';
    if(window.ArcheExport){
      var _rt=(((report.meta&&report.meta.name)||'자녀')+'님 '+(PTLABEL[report.period_type]||'정기')+' 리포트');
      var tb=el('<div class="ppr-toolbar" style="display:flex;justify-content:flex-end;gap:7px;margin:0 0 8px;flex-wrap:wrap"></div>');
      function _mk(lbl,fn){ var b=el('<button style="font:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:8px;border:1px solid '+acc+';background:#fff;color:'+acc+';cursor:pointer">'+lbl+'</button>'); b.addEventListener('click',fn); return b; }
      tb.appendChild(_mk('📄 PDF 저장·인쇄',function(){ ArcheExport.printNode(wrap,{title:_rt,styleIds:['ppr-css']}); }));
      tb.appendChild(_mk('📝 DOCX',function(){ ArcheExport.docx({title:_rt,html:wrap.innerHTML}); }));
      mount.appendChild(tb);
    }
    mount.appendChild(wrap);
    return wrap;
  }

  function buildKpis(report, stage){
    var out=[]; var rd=report.radar||{};
    if(report.grade) out.push({v:esc(report.grade)+'<em> 등급</em>', l:'종합 성장'});
    if(report.counts&&report.counts.total!=null) out.push({v:num(report.counts.total)+'<em>회</em>', l:'완주 회차'});
    // 최대 성장 축
    if(rd.before&&rd.after){ var best=-1,bi=-1; for(var i=0;i<(rd.after.length||0);i++){ var d=num(rd.after[i])-num(rd.before[i]); if(d>best){best=d;bi=i;} } if(bi>=0&&best>0&&rd.axes){ out.push({v:'+'+best+'<em>↑</em>', l:esc(rd.axes[bi])+' 성장'}); } }
    if(stage==='track'&&report.career_match&&report.career_match[0]) out.push({v:num(report.career_match[0].fit)+'<em>점</em>', l:'진로 적합 Top1'});
    return out.slice(0,4);
  }

  // 커리어넷 학과·진로 정보 블록(대학 목록 없음)
  function cnInfoHTML(cn){
    if(!cn || (!cn.summary && !(cn.subjects&&cn.subjects.length) && !(cn.jobs&&cn.jobs.length)))return '';
    var subj=(cn.subjects||[]).map(function(s){return '<span>'+esc(s)+'</span>';}).join('');
    var jobs=(cn.jobs||[]).map(function(s){return '<span>'+esc(s)+'</span>';}).join('');
    var rel=(cn.related||[]).map(function(s){return '<span>'+esc(s)+'</span>';}).join('');
    return '<div class="cninfo">'
      + '<div class="cnh"><span class="src">커리어넷</span> 관련 학과 · <span class="maj">'+esc(cn.major||'')+'</span>'+(cn.series?(' <span style="color:var(--mute);font-weight:600">('+esc(cn.series)+')</span>'):'')+'</div>'
      + (cn.summary?('<div class="sum">'+esc(cn.summary)+'</div>'):'')
      + (subj?('<div class="cnrow"><span class="cnk">관련 교과</span><div class="cnv subj">'+subj+'</div></div>'):'')
      + (jobs?('<div class="cnrow"><span class="cnk">관련 직업</span><div class="cnv job">'+jobs+'</div></div>'):'')
      + (rel?('<div class="cnrow"><span class="cnk">관련 학과</span><div class="cnv">'+rel+'</div></div>'):'')
      + '</div>';
  }

  // ── 발행자(학부모/컨설턴트) 관리 UI ─────────────────────────────────────
  var PERIODS=[{k:'monthly',n:'월간'},{k:'quarterly',n:'분기'},{k:'half',n:'반기'},{k:'annual',n:'연간'}];

  function yearOf(d){ return (d||'').slice(0,4); }
  function monthOf(d){ return (d||'').slice(0,7); }
  function quarterOf(d){ var m=+(d||'0-0').slice(5,7); return yearOf(d)+'-Q'+(Math.floor((m-1)/3)+1); }
  function halfOf(d){ var m=+(d||'0-0').slice(5,7); return yearOf(d)+'-H'+(m<=6?1:2); }
  function periodKey(type,d){ return type==='monthly'?monthOf(d):type==='quarterly'?quarterOf(d):type==='half'?halfOf(d):yearOf(d); }
  function periodLabel(type,key){ if(type==='monthly'){var p=key.split('-');return p[0]+'년 '+(+p[1])+'월';} if(type==='quarterly'){return key.replace('-Q','년 ')+'분기';} if(type==='half'){var q=key.split('-H');return q[0]+'년 '+(q[1]==='1'?'상반기':'하반기');} return key+'년';}

  async function loadSentSubs(studentId, stage, level){
    var q=sb().from('penta_submissions').select('id,stage,level,season,week,theme,title,report,status,sent_at,created_at,radar_before,radar_after,compass').eq('student_id',studentId).eq('status','sent').eq('stage',stage);
    var r=await q; if(r.error)throw r.error;
    return (r.data||[]).filter(function(s){ return (s.level||'')===(level||''); });
  }
  async function loadPeriodReports(studentId, stage, level){
    var r=await sb().from('penta_period_reports').select('*').eq('student_id',studentId).eq('stage',stage).order('period_key',{ascending:false});
    if(r.error)throw r.error; return (r.data||[]).filter(function(x){ return (x.level||'')===(level||''); });
  }
  function digestLesson(s){
    var rep=s.report||{};
    return { season:s.season, week:s.week, theme:s.theme, title:s.title, date:(s.sent_at||s.created_at||'').slice(0,10),
      radar_before:s.radar_before, radar_after:s.radar_after, compass:s.compass,
      golden:(rep.golden&&rep.golden.sentence)||'', velocity:(rep.velocity&&rep.velocity.score)||null,
      persona:(rep.persona&&rep.persona.name)||(rep.signature&&rep.signature.name)||'' };
  }
  async function token(){ try{var s=await sb().auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function callPeriod(payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/penta-ai';
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({task:'penta_period_report',payload:payload})});
    var d=await r.json(); if(!r.ok)throw new Error(d.error||'AI 오류'); return d;
  }
  // 커리어넷 학과·진로 정보 보강(대학 목록 없음). 실패해도 리포트는 그대로.
  async function callCareernet(payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/careernet';
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(payload)});
    var d=await r.json(); if(!r.ok)throw new Error(d.error||'careernet 오류'); return d;
  }
  function majorQueryOf(c){
    var q=(c.major_query||'').trim();
    if(!q){ var nm=String(c.name||''); var parts=nm.split(/[·・\/]/); q=(parts[parts.length-1]||nm).trim(); }
    return q;
  }
  async function enrichCareers(rep){
    if(!rep||!rep.career_match||!rep.career_match.length)return;
    await Promise.all(rep.career_match.slice(0,3).map(async function(c){
      try{
        var q=majorQueryOf(c); if(!q)return;
        var d=await callCareernet({action:'major_info',query:q});
        if(d&&d.found){
          var subj=[]; if(d.subjects&&d.subjects[0]) subj=String(d.subjects[0]).split(/[,ㆍ·]/).map(function(s){return s.trim();}).filter(Boolean).slice(0,6);
          c.cn={ series:d.series||'', major:d.major||'', summary:d.summary||'', subjects:subj, jobs:(d.jobs||[]).slice(0,5), related:(d.related_majors||[]).slice(0,6) };
        }
      }catch(_e){}
    }));
  }

  function mountManage(mount, ctx){
    inject(); ctx=ctx||{};
    var stage=ctx.stage==='track'?'track':'vision'; var level=ctx.level||'';
    var state={ type:'annual' };
    var root=el('<div class="ppm"></div>'); mount.innerHTML=''; mount.appendChild(root);
    root.appendChild(el('<div style="font-size:14px;font-weight:800;color:#141a29;margin-bottom:4px">📈 '+esc(STAGE_TITLE[stage])+' · 정기 성장 리포트</div>'));
    root.appendChild(el('<div class="hint2" style="text-align:left;margin:0 2px 10px">기간을 고르고 <b>[분석 실행]</b>을 누르면 그 기간의 활동을 종합한 리포트를 만들어요. 검토 후 <b>[발행]</b>하면 자녀 화면에 표시됩니다.</div>'));
    var seg=el('<div class="seg"></div>');
    PERIODS.forEach(function(p){ var b=el('<button'+(p.k===state.type?' class="on"':'')+'>'+p.n+'</button>'); b.addEventListener('click',function(){ state.type=p.k; seg.querySelectorAll('button').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); redraw(); }); seg.appendChild(b); });
    root.appendChild(seg);
    var body=el('<div id="ppm-body"></div>'); root.appendChild(body);

    async function redraw(){
      body.innerHTML='<div class="empty2">불러오는 중…</div>';
      var subs, existing;
      try{ subs=await loadSentSubs(ctx.studentId, stage, level); existing=await loadPeriodReports(ctx.studentId, stage, level); }
      catch(e){ body.innerHTML='<div class="empty2">불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
      // 기간 키 후보(제출물의 날짜 기준)
      var keys={}; subs.forEach(function(s){ var d=(s.sent_at||s.created_at||'').slice(0,10); if(!d)return; var k=periodKey(state.type,d); keys[k]=(keys[k]||0)+1; });
      var keyList=Object.keys(keys).sort().reverse();
      body.innerHTML='';
      if(!keyList.length){ body.appendChild(el('<div class="empty2">이 코스에서 <b>발행된 회차 리포트</b>가 아직 없어요.<br>회차 리포트를 먼저 발행하면 그걸 모아 '+esc(PTLABEL[state.type])+' 리포트를 만들 수 있어요.</div>')); }
      else {
        var kr=el('<div class="keyrow"><span style="font-size:12px;color:#6b7688;font-weight:700;flex:none">기간</span></div>');
        var ksel=el('<select></select>'); ksel.innerHTML=keyList.map(function(k){ return '<option value="'+esc(k)+'">'+esc(periodLabel(state.type,k))+' · '+keys[k]+'회차</option>'; }).join('');
        kr.appendChild(ksel); body.appendChild(kr);
        var gen=el('<button class="pbtn">✨ 이 기간 분석 실행</button>');
        gen.addEventListener('click', function(){ runGenerate(ksel.value, subs, gen); });
        body.appendChild(gen);
        if(stage==='track'&&(state.type==='half'||state.type==='annual')) body.appendChild(el('<div class="hint2">이 기간엔 <b>진로 매칭 + 고1~고3 로드맵</b>이 포함돼요.</div>'));
      }
      // 이미 만든 리포트
      var forType=existing.filter(function(x){return x.period_type===state.type;});
      if(forType.length){
        var ex=el('<div class="existing"></div>');
        forType.forEach(function(x){ var row=el('<div class="exr"><div class="xl"><div class="xt">'+esc(periodLabel(x.period_type,x.period_key))+'</div><div class="xs">'+(x.status==='sent'?'발행됨':'초안')+'</div></div><span class="st '+(x.status==='sent'?'sent':'draft')+'">'+(x.status==='sent'?'발행':'초안')+'</span></div>');
          var open=el('<button>열기</button>'); open.addEventListener('click',function(){ openReportOverlay(Object.assign({}, x.report, {stage:stage, period_type:x.period_type, period_key:x.period_key, period_label:x.period_label, status:x.status, meta:{name:ctx.name,grade:ctx.grade}})); });
          row.insertBefore(open, row.querySelector('.st'));
          if(x.status!=='sent'){ var pub=el('<button style="background:#5c8f16">발행</button>'); pub.addEventListener('click',function(){ publish(x, pub); }); row.insertBefore(pub, row.querySelector('.st')); }
          ex.appendChild(row);
        });
        body.appendChild(el('<div style="font-size:12px;font-weight:800;color:#6b7688;margin:16px 2px 2px">📁 만든 '+esc(PTLABEL[state.type])+' 리포트</div>'));
        body.appendChild(ex);
      }
    }

    async function runGenerate(key, subs, btn){
      var picked=subs.filter(function(s){ var d=(s.sent_at||s.created_at||'').slice(0,10); return periodKey(state.type,d)===key; });
      if(!picked.length){ toast('이 기간 회차가 없어요'); return; }
      btn.disabled=true; btn.innerHTML='<span class="spin"></span>분석 중… (최대 1분)';
      try{
        var lessons=picked.map(digestLesson);
        var career_hint=''; picked.forEach(function(s){ var c=s.report&&(s.report.career||(s.answers&&s.answers.career_choice)); if(c&&!career_hint)career_hint=c; });
        var payload={ stage:stage, level:level, period_type:state.type, period_key:key, period_label:periodLabel(state.type,key),
          student:{name:ctx.name||'',grade:ctx.grade||''}, lessons:lessons, counts:{total:lessons.length}, career_hint:career_hint };
        var res=await callPeriod(payload);
        var ai; try{ ai=JSON.parse(res.text); }catch(pe){ throw new Error('AI 응답 파싱 실패'); }
        ai.stage=stage; ai.period_type=state.type; ai.period_key=key; ai.period_label=payload.period_label; ai.counts={total:lessons.length}; ai.meta={name:ctx.name,grade:ctx.grade}; ai.status='draft';
        if(stage==='track'){ try{ await enrichCareers(ai); }catch(_ce){} }
        await sb().rpc('save_penta_period_report',{ p_student:ctx.studentId, p_stage:stage, p_level:level, p_period_type:state.type, p_period_key:key, p_period_label:payload.period_label, p_report:ai, p_status:'draft' });
        toast('분석 완료 · 초안 생성됨'); openReportOverlay(ai); redraw();
      }catch(e){ toast('실패: '+(e.message||e)); btn.disabled=false; btn.innerHTML='✨ 이 기간 분석 실행'; }
    }

    async function publish(row, btn){
      btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
      try{ var rep=Object.assign({},row.report,{status:'sent'}); await sb().rpc('save_penta_period_report',{ p_student:ctx.studentId, p_stage:stage, p_level:level, p_period_type:row.period_type, p_period_key:row.period_key, p_period_label:row.period_label, p_report:rep, p_status:'sent' }); toast('자녀에게 발행했어요 ✅'); redraw(); }
      catch(e){ toast('발행 실패: '+(e.message||e)); btn.disabled=false; btn.textContent='발행'; }
    }

    function openReportOverlay(report){
      var ov=el('<div class="ppr-ov"><div class="ppr-ovc"><div class="ppr-ovx"></div><div class="rpmount"></div></div></div>');
      var xbtn=el('<button>✕ 닫기</button>'); xbtn.addEventListener('click',function(){ov.remove();}); ov.querySelector('.ppr-ovx').appendChild(xbtn);
      // 초안이면 발행 버튼도
      if(report.status!=='sent'){ var pb=el('<button style="background:#5c8f16;margin-right:8px">📤 발행하기</button>'); pb.addEventListener('click',async function(){ pb.disabled=true; pb.innerHTML='<span class="spin"></span>'; try{ var rep=Object.assign({},report,{status:'sent'}); await sb().rpc('save_penta_period_report',{ p_student:ctx.studentId, p_stage:stage, p_level:level, p_period_type:report.period_type, p_period_key:report.period_key, p_period_label:report.period_label, p_report:rep, p_status:'sent' }); toast('발행 완료 ✅'); ov.remove(); redraw(); }catch(e){ toast('발행 실패: '+(e.message||e)); pb.disabled=false; pb.textContent='📤 발행하기'; } }); ov.querySelector('.ppr-ovx').insertBefore(pb, xbtn); }
      document.body.appendChild(ov);
      renderReport(ov.querySelector('.rpmount'), report);
    }

    redraw();
  }

  // ── 자녀·열람자용(발행분만) ─────────────────────────────────────────────
  function mountViewer(mount, ctx){
    inject(); ctx=ctx||{};
    var root=el('<div class="ppm"></div>'); mount.innerHTML=''; mount.appendChild(root);
    root.appendChild(el('<div style="font-size:14px;font-weight:800;color:#141a29;margin-bottom:8px">📈 정기 성장 리포트</div>'));
    var body=el('<div class="empty2">불러오는 중…</div>'); root.appendChild(body);
    (async function(){
      var r; try{ r=await sb().from('penta_period_reports').select('*').eq('student_id',ctx.studentId).eq('status','sent').order('period_key',{ascending:false}); if(r.error)throw r.error; }
      catch(e){ body.outerHTML='<div class="empty2">불러오지 못했어요.</div>'; return; }
      var rows=r.data||[];
      if(ctx.stage){ rows=rows.filter(function(x){return x.stage===ctx.stage;}); }
      if(!rows.length){ body.outerHTML='<div class="empty2">아직 발행된 정기 리포트가 없어요.</div>'; return; }
      var ex=el('<div class="existing"></div>');
      rows.forEach(function(x){ var row=el('<div class="exr"><div class="xl"><div class="xt">'+esc((STAGE_TITLE[x.stage]||'')+' · '+periodLabel(x.period_type,x.period_key))+'</div><div class="xs">'+esc(x.period_label||'')+'</div></div></div>');
        var open=el('<button>리포트 보기</button>'); open.addEventListener('click',function(){ var report=Object.assign({},x.report,{stage:x.stage,period_type:x.period_type,period_key:x.period_key,period_label:x.period_label,status:'sent',meta:{name:ctx.name,grade:ctx.grade}}); var ov=el('<div class="ppr-ov"><div class="ppr-ovc"><div class="ppr-ovx"></div><div class="rpmount"></div></div></div>'); var xb=el('<button>✕ 닫기</button>'); xb.addEventListener('click',function(){ov.remove();}); ov.querySelector('.ppr-ovx').appendChild(xb); document.body.appendChild(ov); renderReport(ov.querySelector('.rpmount'), report); });
        row.appendChild(open); ex.appendChild(row); });
      root.replaceChild(ex, body);
    })();
  }

  window.ArchePentaPeriod = { renderReport: renderReport, mountManage: mountManage, mountViewer: mountViewer, version:'1.0' };
})();
