/* ============================================================================
 * arche_studyplan.js · 학습 스케줄러 (자기주도학습 관리)
 * ----------------------------------------------------------------------------
 * 흐름: 학생 작성 → 제출 → 강사 조율(메시지·직접 수정) → 최종 확정 → 학생 완료체크·소감 → 강사 코멘트·응원
 * 의존 전역: window.sb, window._acadId, window._myUid, window._role('stu'|…), window._activeStudent,
 *            window._isOwner, window._myRole ('owner'|'manager'|'staff'…)
 * DB: study_mentees / study_plans / study_items / study_plan_msgs + RPC sp_set_status, sp_my_mentor, sp_mentor_candidates
 * 제공: window.mountStudyPlanner(host)
 * ==========================================================================*/
(function(){
  "use strict";
  var DAYS=['월','화','수','목','금','토','일'];
  var SUBJ=['국어','수학','영어','과학','사회','기타'];
  var SJC={'국어':'k','수학':'m','영어':'e','과학':'s','사회':'h','기타':'x'};
  var CHEERS=['👏','🔥','💪','🌟','❤️'];
  var STATUS={draft:'작성 중',proposed:'강사 검토 대기',revising:'조율 중 (수정 요청)',confirmed:'최종 확정'};

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sbc(){ return window.sb; }
  function pad(n){ return n<10?'0'+n:''+n; }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parseYmd(s){ var p=String(s).split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function addDays(d,n){ var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()+n); return x; }
  function todayStart(){ var n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); }
  function isoDow(d){ return ((d.getDay()+6)%7)+1; }
  /* 계획 구간 = 시작일(week_start)부터 7일. dow(1=월..7=일)는 요일 그대로이고, 날짜는 시작일 이후 처음 오는 해당 요일 */
  function dateOf(start,dow){ var a=parseYmd(start); return addDays(a,(dow-isoDow(a)+7)%7); }
  function dowOrder(start){ var a=isoDow(parseYmd(start)),r=[],i; for(i=0;i<7;i++) r.push(((a-1+i)%7)+1); return r; }
  function md(d){ return (d.getMonth()+1)+'/'+d.getDate(); }
  function weekLabel(start){ var a=parseYmd(start),b=addDays(a,6); return md(a)+'('+DAYS[isoDow(a)-1]+') ~ '+md(b)+'('+DAYS[isoDow(b)-1]+')'; }
  function hhmm(t){ return t?String(t).slice(0,5):''; }
  /* 완료 시각 표시: '✓ 완료 10/30 14:32' (예정일 이후 완료면 '· 기한 후') */
  function doneTag(x,dt){
    if(!x.done||!x.done_at) return '';
    var d=new Date(x.done_at); if(isNaN(d)) return '';
    var late=ymd(d)>ymd(dt);
    return '<div class="dtm'+(late?' late':'')+'">✓ 완료 '+md(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes())+(late?' · 기한 후 완료':'')+'</div>';
  }

  /* ----------------------------- 상태 ----------------------------- */
  var S={ host:null, ref:ymd(todayStart()), starts:[], sel:null, form:null, busy:false,
          mentees:[], cands:[], plans:{}, items:{}, cur:null, msgs:[], mentor:null, filter:'' };

  function isStu(){ return window._role==='stu'; }
  function isMgr(){ return window._isOwner===true || window._myRole==='manager' || window._canManage===true; }
  function myUid(){ return window._myUid||null; }

  function toast(t){
    var e=document.getElementById('spl-toast'); if(!e){ e=document.createElement('div'); e.id='spl-toast'; e.className='spl-toast'; document.body.appendChild(e); }
    e.textContent=t; e.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){ e.classList.remove('show'); },1900);
  }
  function fail(r,fallback){ var m=(r&&r.error&&(r.error.message||r.error))||fallback||'처리하지 못했습니다.'; alert(m); }

  /* ----------------------------- 스타일 ----------------------------- */
  function css(){
    if(document.getElementById('spl-css')) return;
    var s=document.createElement('style'); s.id='spl-css';
    s.textContent=[
    '.spl{font-size:14px;line-height:1.5;color:var(--ink,#191f28)}',
    '.spl *{box-sizing:border-box}',
    '.spl button{font-family:inherit;cursor:pointer}',
    '.spl .card{background:#fff;border:1px solid #e5e8eb;border-radius:14px;padding:16px;margin-top:12px}',
    '.spl .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}',
    '.spl .rowb{justify-content:space-between}',
    '.spl .h3{font-size:15px;font-weight:800;margin:0}',
    '.spl .hint{font-size:12px;color:#8b95a1}',
    '.spl .chip{display:inline-flex;align-items:center;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px;white-space:nowrap}',
    '.spl .c-draft{background:#eef0f3;color:#4e5968}.spl .c-proposed{background:#f0ebff;color:#6741d9}',
    '.spl .c-revising{background:#fff1e6;color:#e8590c}.spl .c-confirmed{background:#e6f6ec;color:#12a150}.spl .c-none{background:#f1f3f5;color:#8b95a1}',
    '.spl .btn{border:1px solid #e5e8eb;background:#fff;color:#191f28;padding:8px 14px;border-radius:9px;font-size:13px;font-weight:700}',
    '.spl .btn:hover{background:#f7f9fc}',
    '.spl .btn.pri{background:#1b64da;border-color:#1b64da;color:#fff}.spl .btn.pri:hover{background:#1757bd}',
    '.spl .btn.ok{background:#12a150;border-color:#12a150;color:#fff}',
    '.spl .btn.warn{border-color:#e8590c;color:#e8590c}',
    '.spl .btn.sm{padding:4px 10px;font-size:12px;border-radius:7px}',
    '.spl .btn[disabled]{opacity:.5;cursor:not-allowed}',
    '.spl .steps{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}',
    '.spl .step{flex:1;min-width:110px;border-radius:10px;padding:8px 11px;background:#f1f3f6;color:#8b95a1;font-size:12px;font-weight:700;border:1.5px solid transparent}',
    '.spl .step i{font-style:normal;display:block;font-size:10.5px;font-weight:600}',
    '.spl .step.done{background:#e6f6ec;color:#12a150}.spl .step.now{background:#e8f1ff;color:#1b64da;border-color:#1b64da}',
    '.spl .bar{height:9px;background:#edf0f4;border-radius:99px;overflow:hidden;margin-top:8px}',
    '.spl .bar>span{display:block;height:100%;background:linear-gradient(90deg,#4c9aff,#1b64da);border-radius:99px;transition:width .35s}',
    '.spl .bar.ok>span{background:linear-gradient(90deg,#51cf66,#12a150)}',
    '.spl .stat{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px}',
    '.spl .stat b{font-size:19px;display:block}.spl .stat span{font-size:11.5px;color:#8b95a1}',
    '.spl .alert{display:flex;gap:10px;align-items:flex-start;background:#fff1e6;border:1px solid #ffc9a3;color:#8f3a05;border-radius:12px;padding:11px 14px;margin-top:12px;font-size:13px}',
    '.spl .alert.info{background:#e8f1ff;border-color:#b9d3ff;color:#174a9c}',
    '.spl .alert b{font-weight:800}',
    '.spl .board{display:grid;grid-template-columns:repeat(auto-fit,minmax(142px,1fr));gap:8px;margin-top:12px}',
    '.spl .day{background:#f8f9fb;border:1px solid #e5e8eb;border-radius:12px;padding:8px;min-height:140px;display:flex;flex-direction:column;gap:7px}',
    '.spl .day.today{border-color:#1b64da;background:#f3f8ff}',
    '.spl .dh{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:13px}',
    '.spl .dh small{color:#8b95a1;font-weight:600;font-size:11px}',
    '.spl .day.today .dh span:first-child{color:#1b64da}',
    '.spl .it{background:#fff;border:1px solid #e5e8eb;border-radius:10px;padding:8px 9px;font-size:12.5px;position:relative}',
    '.spl .it.done{background:#f1faf4;border-color:#b7e4c7}.spl .it.late{border-color:#ffb98a;background:#fffaf5}',
    '.spl .it .t{font-weight:700;word-break:keep-all;padding-right:34px}',
    '.spl .it .m{color:#8b95a1;font-size:11px;margin-top:2px}',
    '.spl .sj{display:inline-block;font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:99px;margin-right:4px}',
    '.spl .sj.k{background:#fff0f0;color:#c92a2a}.spl .sj.m{background:#e7f5ff;color:#1864ab}.spl .sj.e{background:#fff9db;color:#946200}',
    '.spl .sj.s{background:#ebfbee;color:#2b8a3e}.spl .sj.h{background:#f3f0ff;color:#5f3dc4}.spl .sj.x{background:#f1f3f5;color:#495057}',
    '.spl .chk{display:flex;gap:8px;align-items:flex-start;cursor:pointer}',
    '.spl .chk input{width:18px;height:18px;margin-top:1px;accent-color:#12a150;flex:none;cursor:pointer}',
    '.spl .tools{position:absolute;top:4px;right:5px;display:flex;gap:2px}',
    '.spl .tools button{border:0;background:transparent;color:#adb5bd;font-size:13px;line-height:1;padding:2px 3px}',
    '.spl .tools button:hover{color:#1b64da}.spl .tools button.x:hover{color:#e03131}',
    '.spl .add{border:1.5px dashed #c8d0da;background:transparent;color:#8b95a1;border-radius:10px;padding:6px;font-size:12px;font-weight:700}',
    '.spl .add:hover{border-color:#1b64da;color:#1b64da}',
    '.spl .frm{background:#fff;border:1.5px solid #1b64da;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px}',
    '.spl input[type=text],.spl input[type=time],.spl input[type=number],.spl select,.spl textarea{width:100%;border:1px solid #e5e8eb;border-radius:7px;padding:6px 8px;font:inherit;font-size:12.5px;background:#fff;color:#191f28}',
    '.spl textarea{resize:vertical;min-height:50px}',
    '.spl .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.spl .refl{margin-top:7px;background:#fff;border:1px dashed #9bd8b2;border-radius:8px;padding:6px 8px}',
    '.spl .refl label{font-size:10.5px;font-weight:800;color:#12a150;display:block;margin-bottom:3px}',
    '.spl .refl .txt{font-size:12px;color:#4e5968;white-space:pre-wrap}',
    '.spl .cm{margin-top:7px;background:#fff8e1;border:1px solid #f1dc9a;border-radius:8px;padding:6px 8px;font-size:12px}',
    '.spl .cm b{color:#b7791f;font-size:11px}',
    '.spl .cheers{display:flex;gap:3px;flex-wrap:wrap;margin-top:6px}',
    '.spl .cheers button{border:1px solid #e5e8eb;background:#fff;border-radius:99px;padding:2px 7px;font-size:14px}',
    '.spl .cheers button.on{background:#fff8e1;border-color:#f1c85a}',
    '.spl .late-tag{font-size:10.5px;font-weight:800;color:#e8590c}',
    '.spl .thread{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto;padding:2px;margin-top:8px}',
    '.spl .msg{max-width:86%;padding:8px 11px;border-radius:12px;font-size:13px;white-space:pre-wrap;word-break:break-word}',
    '.spl .msg .n{font-size:10.5px;font-weight:800;margin-bottom:1px;opacity:.75}',
    '.spl .msg.student{background:#e8f1ff;align-self:flex-start;border-top-left-radius:3px}',
    '.spl .msg.mentor{background:#fff3d6;align-self:flex-end;border-top-right-radius:3px}',
    '.spl .msg.sys{background:#f1f3f6;color:#4e5968;align-self:center;font-size:12px;text-align:center;max-width:96%}',
    '.spl .send{display:flex;gap:6px;margin-top:10px}',
    '.spl .send input{flex:1;border:1px solid #e5e8eb;border-radius:9px;padding:9px 11px;font:inherit;font-size:13px}',
    '.spl .mgrid{display:grid;grid-template-columns:290px minmax(0,1fr);gap:14px;margin-top:12px}',
    '.spl .sl{display:flex;flex-direction:column;gap:8px;margin-top:8px}',
    '.spl .si{border:1.5px solid #e5e8eb;background:#fff;border-radius:12px;padding:11px 12px;text-align:left;width:100%}',
    '.spl .si.on{border-color:#1b64da;background:#f3f8ff}',
    '.spl .si .nm{font-weight:800;display:flex;justify-content:space-between;align-items:center;gap:6px}',
    '.spl .si .mt{font-size:11.5px;color:#8b95a1;margin:2px 0 0}',
    '.spl .badge{background:#e03131;color:#fff;font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:99px}',
    '.spl .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}',
    '.spl .kpi{background:#fff;border:1px solid #e5e8eb;border-radius:12px;padding:12px}',
    '.spl .kpi b{font-size:22px;display:block}.spl .kpi span{font-size:11.5px;color:#8b95a1}',
    '.spl .empty{border:1.5px dashed #d5dae1;border-radius:14px;padding:34px 20px;text-align:center;background:#fff;margin-top:12px;color:#4e5968}',
    '.spl .empty .big{font-size:30px}',
    '.spl .weeknav{display:flex;align-items:center;gap:8px}',
    '.spl .dtm{margin-top:4px;font-size:11.5px;font-weight:700;color:#12a150}','.spl .dtm.late{color:#e8590c}',
    '.spl .weeknav b{font-size:15px}',
    '.spl .ov{position:fixed;inset:0;background:rgba(15,20,30,.45);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px}',
    '.spl-ov{position:fixed;inset:0;background:rgba(15,20,30,.45);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px}',
    '.spl-ov .box{background:#fff;border-radius:16px;padding:20px;width:100%;max-width:460px;max-height:88vh;overflow:auto;font-size:14px}',
    '.spl-ov .box h3{font-size:16px;font-weight:800;margin:0 0 10px}',
    '.spl-ov .box label{display:block;font-size:12px;font-weight:700;color:#4e5968;margin:10px 0 4px}',
    '.spl-ov .box input,.spl-ov .box select{width:100%;border:1px solid #e5e8eb;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}',
    '.spl-ov .lst{border:1px solid #e5e8eb;border-radius:10px;max-height:220px;overflow:auto;margin-top:6px}',
    '.spl-ov .lst div{padding:8px 11px;border-bottom:1px solid #f1f3f5;cursor:pointer;font-size:13px}',
    '.spl-ov .lst div:last-child{border-bottom:0}.spl-ov .lst div:hover{background:#f3f8ff}.spl-ov .lst div.on{background:#e8f1ff;font-weight:800}',
    '.spl-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#191f28;color:#fff;padding:10px 18px;border-radius:99px;font-size:13px;font-weight:700;opacity:0;pointer-events:none;transition:.25s;z-index:4000;max-width:90vw}',
    '.spl-toast.show{opacity:1}',
    '@media(max-width:900px){.spl .board{grid-template-columns:1fr}.spl .day{min-height:0}.spl .mgrid{grid-template-columns:1fr}.spl .kpis{grid-template-columns:repeat(2,1fr)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ----------------------------- 계산 ----------------------------- */
  function rate(items){ var n=items.length,d=items.filter(function(x){return x.done;}).length; return {n:n,d:d,pct:n?Math.round(d*100/n):0}; }
  function minsDone(items){ return items.filter(function(x){return x.done;}).reduce(function(a,x){return a+(x.minutes||0);},0); }
  function lateItems(plan,items){
    if(!plan||plan.status!=='confirmed') return [];
    var t=todayStart();
    return items.filter(function(x){ return !x.done && dateOf(plan.week_start,x.dow)<t; });
  }
  function chip(s){ return '<span class="chip c-'+s+'">'+(STATUS[s]||'계획 없음')+'</span>'; }
  function sortItems(a){ return a.slice().sort(function(x,y){ return (x.dow-y.dow)||String(x.start_time||'').localeCompare(String(y.start_time||''))||(x.sort-y.sort); }); }

  /* ----------------------------- 공통 조각 ----------------------------- */
  function curWin(){
    var p=S.cur&&S.cur.plan; var st=p?p.week_start:S.ref;
    return {start:st,end:ymd(addDays(parseYmd(st),6)),plan:p};
  }
  function weekBar(){
    var t=ymd(todayStart());
    if(isStu()){
      var w=curWin(), has=w.start<=t&&t<=w.end, hasPrev=S.starts.some(function(x){return x<w.start;});
      return '<div class="weeknav"><button class="btn sm" '+(hasPrev?'':'disabled ')+'onclick="SPL.week(-1)">‹ 이전 계획</button><b>'+weekLabel(w.start)+(has?' · 오늘 포함':'')+'</b>'
        +'<button class="btn sm" onclick="SPL.week(1)">다음 7일 ›</button>'+(has?'':'<button class="btn sm" onclick="SPL.week(0)">오늘로</button>')+'</div>';
    }
    var r=parseYmd(S.ref);
    return '<div class="weeknav"><button class="btn sm" onclick="SPL.week(-1)">‹ 7일 전</button><b>기준일 '+md(r)+'('+DAYS[isoDow(r)-1]+')'+(S.ref===t?' · 오늘':'')+'</b>'
      +'<input type="date" value="'+S.ref+'" style="border:1px solid #e5e8eb;border-radius:7px;padding:4px 7px;font:inherit;font-size:12.5px" onchange="SPL.setRef(this.value)">'
      +'<button class="btn sm" onclick="SPL.week(1)">7일 후 ›</button>'+(S.ref!==t?'<button class="btn sm" onclick="SPL.week(0)">오늘로</button>':'')+'</div>';
  }
  function stepper(plan){
    var s=plan?plan.status:'none', i=(s==='draft'||s==='none')?0:(s==='confirmed'?3:1);
    var L=[['① 학생 작성','계획 짜기'],['② 강사 검토·조율','메시지로 상의'],['③ 최종 확정','강사가 확정'],['④ 실천·기록','체크·소감·코멘트']];
    return '<div class="steps">'+L.map(function(x,k){ var c=k<i?'done':(k===i?'now':''); return '<div class="step '+c+'">'+(k<i?'✓ ':'')+x[0]+'<i>'+x[1]+'</i></div>'; }).join('')+'</div>';
  }
  function progress(plan,items){
    var r=rate(items), l=lateItems(plan,items).length, mn=minsDone(items);
    return '<div class="card"><div class="row rowb"><div class="h3">주간 달성률</div><b style="font-size:20px;color:'+(r.pct>=70?'#12a150':'#1b64da')+'">'+r.pct+'%</b></div>'
      +'<div class="bar '+(r.pct>=70?'ok':'')+'"><span style="width:'+r.pct+'%"></span></div>'
      +'<div class="stat"><div><b>'+r.d+' / '+r.n+'</b><span>완료 / 전체 항목</span></div><div><b>'+Math.floor(mn/60)+'시간 '+(mn%60)+'분</b><span>실제 학습 시간</span></div>'
      +'<div><b style="color:'+(l?'#e8590c':'#12a150')+'">'+l+'개</b><span>기한 지난 미완료</span></div></div></div>';
  }
  function thread(msgs,ph){
    return '<div class="card"><div class="h3">📨 조율 대화 <span class="hint" style="font-weight:600">· 학생과 강사가 계획을 상의하는 공간</span></div><div class="thread" id="spl-thr">'
      +(msgs.length?msgs.map(function(m){
        return m.kind==='system'?'<div class="msg sys">'+esc(m.body)+'</div>':'<div class="msg '+(m.author_role==='student'?'student':'mentor')+'"><div class="n">'+esc(m.author_name||'')+'</div>'+esc(m.body)+'</div>';
      }).join(''):'<div class="hint" style="text-align:center;padding:10px">아직 대화가 없습니다.</div>')
      +'</div><div class="send"><input type="text" id="spl-mi" maxlength="500" placeholder="'+esc(ph)+'" onkeydown="if(event.key===\'Enter\')SPL.send()"><button class="btn pri" onclick="SPL.send()">보내기</button></div></div>';
  }
  function afterPaint(){ var t=document.getElementById('spl-thr'); if(t) t.scrollTop=t.scrollHeight; }

  /* ----------------------------- 주간 보드 ----------------------------- */
  function board(plan,items,me){
    var st=plan.status;
    var editable=(me==='stu')?(st==='draft'||st==='revising'):(st!=='confirmed');
    var conf=(st==='confirmed'), today=todayStart(), h='<div class="board">';
    var sorted=sortItems(items);
    dowOrder(plan.week_start).forEach(function(d,i){
      var dt=addDays(parseYmd(plan.week_start),i), isToday=(ymd(dt)===ymd(today));
      h+='<div class="day'+(isToday?' today':'')+'"><div class="dh"><span>'+DAYS[d-1]+(isToday?' · 오늘':'')+'</span><small>'+md(dt)+'</small></div>';
      sorted.filter(function(x){return x.dow===d;}).forEach(function(x){
        if(S.form&&S.form.id===x.id) h+=formHTML(S.form); else h+=itemHTML(plan,x,me,editable,conf,dt,today);
      });
      if(editable){
        if(S.form&&!S.form.id&&S.form.dow===d) h+=formHTML(S.form);
        else h+='<button class="add" onclick="SPL.form(null,'+d+')">+ 항목</button>';
      }
      h+='</div>';
    });
    return h+'</div>';
  }
  function formHTML(f){
    return '<div class="frm"><select id="spl-f-subj">'+SUBJ.map(function(k){return '<option'+(f.subject===k?' selected':'')+'>'+k+'</option>';}).join('')+'</select>'
      +'<input type="text" id="spl-f-title" maxlength="200" placeholder="무엇을 할까요? (예: 미분 유제 20문항)" value="'+esc(f.title||'')+'">'
      +'<div class="two"><input type="time" id="spl-f-time" value="'+esc(hhmm(f.start_time))+'"><input type="number" id="spl-f-min" min="1" max="720" placeholder="분" value="'+esc(f.minutes||'')+'"></div>'
      +'<div class="row" style="gap:6px"><button class="btn pri sm" onclick="SPL.saveItem()">'+(f.id?'저장':'추가')+'</button><button class="btn sm" onclick="SPL.cancel()">취소</button></div></div>';
  }
  function itemHTML(plan,x,me,editable,conf,dt,today){
    var isLate=conf&&!x.done&&dt<today;
    var canCheck=conf&&me==='stu'&&dt<=today;
    var h='<div class="it'+(x.done?' done':'')+(isLate?' late':'')+'">';
    if(editable) h+='<div class="tools"><button title="수정" onclick="SPL.form(\''+x.id+'\')">✎</button><button class="x" title="삭제" onclick="SPL.del(\''+x.id+'\')">×</button></div>';
    if(canCheck) h+='<label class="chk"><input type="checkbox" '+(x.done?'checked':'')+' onchange="SPL.toggle(\''+x.id+'\')"><span class="t">'+esc(x.title)+'</span></label>';
    else h+='<div class="t">'+(conf&&me==='men'?(x.done?'✅ ':'⬜ '):'')+esc(x.title)+'</div>';
    h+='<div class="m"><span class="sj '+(SJC[x.subject]||'x')+'">'+esc(x.subject||'기타')+'</span>'+(x.start_time?hhmm(x.start_time):'')+(x.minutes?' · '+x.minutes+'분':'')+(isLate?' <span class="late-tag">· 미완료</span>':'')+'</div>';
    h+=doneTag(x,dt);
    if(conf&&x.done){
      if(me==='stu'){
        h+='<div class="refl"><label>✍️ 오늘 인상 깊었던 점</label><textarea maxlength="500" placeholder="짧게 적어보세요 (선택)" onchange="SPL.refl(\''+x.id+'\',this.value)">'+esc(x.reflection||'')+'</textarea></div>';
        if(x.mentor_comment||x.cheer) h+='<div class="cm"><b>'+esc(x.cheer||'💬')+' '+esc(x.comment_by_name||'선생님')+'</b><div>'+esc(x.mentor_comment||'')+'</div></div>';
      } else {
        h+=x.reflection?'<div class="refl"><label>✍️ 학생 소감</label><div class="txt">'+esc(x.reflection)+'</div></div>':'<div class="m" style="margin-top:5px">소감 없음</div>';
        h+='<div class="cheers">'+CHEERS.map(function(c){return '<button class="'+(x.cheer===c?'on':'')+'" onclick="SPL.cheer(\''+x.id+'\',\''+c+'\')">'+c+'</button>';}).join('')+'</div>'
          +'<input type="text" maxlength="500" style="margin-top:6px" placeholder="짧은 코멘트 (Enter)" value="'+esc(x.mentor_comment||'')+'" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="SPL.cm(\''+x.id+'\',this.value)">';
      }
    }
    if(conf&&!x.done){
      // 미완료 항목: 강사 독려 코멘트 (이모지 응원은 완료 항목 전용)
      if(me==='men'){
        h+='<input type="text" maxlength="500" style="margin-top:6px" placeholder="'+(isLate?'독려 메시지 (Enter)':'미리 남기는 한마디 (Enter)')+'" value="'+esc(x.mentor_comment||'')+'" onkeydown="if(event.key===\'Enter\')this.blur()" onchange="SPL.cm(\''+x.id+'\',this.value)">';
      } else if(x.mentor_comment){
        h+='<div class="cm"><b>💬 '+esc(x.comment_by_name||'선생님')+'</b><div>'+esc(x.mentor_comment)+'</div></div>';
      }
    }
    return h+'</div>';
  }

  /* ----------------------------- 데이터 로드 ----------------------------- */
  async function loadPlanFor(sid){
    // 기준일(S.ref)이 속한 7일 구간의 계획: week_start ∈ [ref-6, ref]
    var lo=ymd(addDays(parseYmd(S.ref),-6));
    var r=await sbc().from('study_plans').select('*').eq('student_id',sid).gte('week_start',lo).lte('week_start',S.ref).order('week_start',{ascending:false}).limit(1);
    if(r.error){ fail(r); return {plan:null,items:[],msgs:[]}; }
    var sr=await sbc().from('study_plans').select('week_start').eq('student_id',sid).order('week_start');
    S.starts=(sr.data||[]).map(function(x){return x.week_start;});
    var plan=r.data&&r.data[0]; if(!plan) return {plan:null,items:[],msgs:[]};
    var q=await Promise.all([
      sbc().from('study_items').select('*').eq('plan_id',plan.id).order('dow').order('start_time',{nullsFirst:true}),
      sbc().from('study_plan_msgs').select('*').eq('plan_id',plan.id).order('created_at')]);
    return { plan:plan, items:q[0].data||[], msgs:q[1].data||[] };
  }
  async function createPlan(sid){
    var st=S.ref, nxt=S.starts.filter(function(x){return x>st&&x<=ymd(addDays(parseYmd(st),6));})[0];
    if(nxt){ toast('다음 계획('+md(parseYmd(nxt))+' 시작)과 기간이 겹쳐요. 시작일을 '+md(addDays(parseYmd(nxt),-7))+' 이전으로 골라주세요.'); return false; }
    var r=await sbc().from('study_plans').insert({student_id:sid,week_start:st}).select().limit(1);
    if(r.error){ fail(r); return false; }
    return true;
  }
  async function copyPrev(sid,planId,start){
    var p=await sbc().from('study_plans').select('id,week_start').eq('student_id',sid).lt('week_start',start).order('week_start',{ascending:false}).limit(1);
    if(p.error){ fail(p); return; }
    if(!p.data||!p.data[0]){ toast('복사할 지난 계획이 없습니다.'); return; }
    var it=await sbc().from('study_items').select('dow,start_time,minutes,subject,title,detail,sort').eq('plan_id',p.data[0].id);
    if(it.error){ fail(it); return; }
    if(!it.data||!it.data.length){ toast('지난 계획에 항목이 없습니다.'); return; }
    var rows=it.data.map(function(x){ return {plan_id:planId,student_id:sid,dow:x.dow,start_time:x.start_time,minutes:x.minutes,subject:x.subject,title:x.title,detail:x.detail,sort:x.sort||0}; });
    var ins=await sbc().from('study_items').insert(rows);
    if(ins.error){ fail(ins); return; }
    toast('지난 계획('+weekLabel(p.data[0].week_start)+')을 요일 그대로 복사했어요.');
  }

  /* ----------------------------- 학생 화면 ----------------------------- */
  async function renderStudent(){
    var h=S.host, stu=window._activeStudent;
    if(!stu){ h.innerHTML='<div class="spl"><div class="empty">학생 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</div></div>'; return; }
    var mr=await sbc().rpc('sp_my_mentor'); var mentor=mr.data&&mr.data[0];
    if(!mentor||!mentor.active){
      h.innerHTML='<div class="spl"><div class="hint" style="font-weight:800;letter-spacing:1px;color:#1b64da">STUDY PLANNER</div><div style="font-size:22px;font-weight:800;margin:2px 0 4px">나의 학습 스케줄러</div>'
        +'<div class="empty"><div class="big">🗓️</div><div style="font-weight:800;font-size:15px;margin-top:6px">아직 학습 스케줄러 대상이 아니에요</div><div class="hint" style="margin-top:6px">자기주도학습 관리가 필요하면 담당 선생님께 신청해 보세요.</div></div></div>';
      return;
    }
    S.mentor=mentor;
    var d=await loadPlanFor(stu.id); S.cur=d; S.msgs=d.msgs;
    var plan=d.plan, items=d.items, late=lateItems(plan,items), o='';
    o+='<div class="spl"><div class="hint" style="font-weight:800;letter-spacing:1px;color:#1b64da">STUDY PLANNER</div><div style="font-size:22px;font-weight:800;margin:2px 0 4px">나의 학습 스케줄러</div>'
      +'<div style="color:#4e5968;font-size:13px">담당 선생님과 상의해서 오늘부터 7일간의 자기주도학습 계획을 만들고, 매일 실천한 만큼 체크해요.</div>';
    o+='<div class="card"><div class="row rowb">'+weekBar()+chip(plan?plan.status:'none')+'</div>'
      +'<div class="hint" style="margin-top:8px">담당 선생님 : '+esc(mentor.mentor_name)+(mentor.goal?' · 목표 : '+esc(mentor.goal):'')+'</div>'+stepper(plan)+'</div>';
    if(!plan){
      o+='<div class="empty"><div class="big">✏️</div><div style="font-weight:800;font-size:15px;margin-top:6px">이 기간의 계획이 아직 없어요</div><div class="hint" style="margin:6px 0 10px">시작일부터 7일 동안의 공부 계획을 직접 짜 보세요.</div>'
        +'<div class="row" style="justify-content:center;margin-bottom:10px"><span class="hint">시작일</span><input type="date" value="'+S.ref+'" style="border:1px solid #e5e8eb;border-radius:7px;padding:5px 8px;font:inherit;font-size:13px" onchange="SPL.setRef(this.value)"></div>'
        +'<div class="row" style="justify-content:center"><button class="btn pri" onclick="SPL.newPlan()">계획 만들기</button><button class="btn" onclick="SPL.newPlan(true)">지난 계획 복사해서 시작</button></div></div></div>';
      h.innerHTML=o; return;
    }
    var st=plan.status;
    if(st==='confirmed'&&late.length) o+='<div class="alert"><div style="font-size:18px">⏰</div><div><b>아직 체크하지 않은 학습이 '+late.length+'개 있어요.</b><br>'
      +late.map(function(x){return DAYS[x.dow-1]+' · '+esc(x.title);}).join('<br>')+'<br><span style="opacity:.8">했다면 체크하고, 못 했다면 선생님께 메시지로 알려주세요.</span></div></div>';
    if(st==='draft') o+='<div class="alert info"><div style="font-size:18px">✏️</div><div><b>요일별로 학습 계획을 직접 짜 보세요.</b><br>다 짰으면 [선생님께 제출]을 눌러요. 선생님과 상의해서 최종 확정해요.</div></div>';
    if(st==='proposed') o+='<div class="alert info"><div style="font-size:18px">⏳</div><div><b>선생님이 계획을 검토하고 있어요.</b><br>검토 중에는 수정할 수 없어요. 궁금한 점은 아래 대화로 남겨주세요.</div></div>';
    if(st==='revising') o+='<div class="alert"><div style="font-size:18px">🛠️</div><div><b>선생님과 계획을 조율하는 중이에요.</b><br>아래 대화를 확인하고 계획을 고친 뒤 다시 제출해요.</div></div>';
    if(st==='confirmed') o+=progress(plan,items);
    o+='<div class="card"><div class="row rowb"><div class="h3">계획표 <span class="hint" style="font-weight:600">· '+weekLabel(plan.week_start)+'</span></div>';
    if(st==='draft'||st==='revising'){
      o+='<div class="row" style="gap:8px">'+(items.length?'':'<button class="btn sm" onclick="SPL.copyPrev()">지난 계획 복사</button>')+'<button class="btn pri" onclick="SPL.act(\'submit\')">선생님께 제출</button></div>';
    }
    o+='</div>'+board(plan,items,'stu')+'</div>';
    o+=thread(d.msgs,'선생님께 하고 싶은 말을 적어보세요')+'</div>';
    h.innerHTML=o; afterPaint();
  }

  /* ----------------------------- 강사 화면 ----------------------------- */
  async function renderMentor(){
    var h=S.host;
    var r=await sbc().from('study_mentees').select('*, students(id,name,grade,school)').eq('active',true).order('created_at');
    if(r.error){ h.innerHTML='<div class="spl"><div class="empty">불러오지 못했습니다: '+esc(r.error.message)+'</div></div>'; return; }
    S.mentees=(r.data||[]).filter(function(m){return m.students;});
    var cr=await sbc().rpc('sp_mentor_candidates'); S.cands=cr.data||[];
    var ids=S.mentees.map(function(m){return m.student_id;});
    S.plans={}; S.items={};
    if(ids.length){
      var pr=await sbc().from('study_plans').select('*').gte('week_start',ymd(addDays(parseYmd(S.ref),-6))).lte('week_start',S.ref).in('student_id',ids);
      (pr.data||[]).forEach(function(p){ S.plans[p.student_id]=p; });
      var pids=(pr.data||[]).map(function(p){return p.id;});
      if(pids.length){
        var ir=await sbc().from('study_items').select('*').in('plan_id',pids);
        (ir.data||[]).forEach(function(x){ (S.items[x.plan_id]=S.items[x.plan_id]||[]).push(x); });
      }
    }
    var mine=S.mentees;
    if(isMgr()&&S.filter){ mine=S.mentees.filter(function(m){return m.mentor_uid===S.filter;}); }
    if(!S.sel||!mine.some(function(m){return m.student_id===S.sel;})) S.sel=mine[0]?mine[0].student_id:null;
    var detail=null;
    if(S.sel){ detail=await loadPlanFor(S.sel); S.cur=detail; S.msgs=detail.msgs; }
    paintMentor(mine,detail);
  }
  function mentorName(uid){ var c=S.cands.filter(function(x){return x.uid===uid;})[0]; return c?c.name:'담당 선생님'; }

  function paintMentor(mine,detail){
    var h=S.host, o='', wait=0, lateTot=0, tot=0, dn=0, alerts=[];
    mine.forEach(function(m){
      var p=S.plans[m.student_id], it=p?(S.items[p.id]||[]):[], nm=m.students.name;
      if(p&&p.status==='confirmed'){ var r=rate(it); tot+=r.n; dn+=r.d; }
      if(p&&p.status==='proposed'){ wait++; alerts.push('<b>'+esc(nm)+'</b> 계획 제출 — 검토·확정이 필요해요'); }
      var l=lateItems(p,it); lateTot+=l.length;
      if(l.length) alerts.push('<b>'+esc(nm)+'</b> '+l.length+'개 미완료 ('+l.slice(0,3).map(function(x){return DAYS[x.dow-1]+' '+esc(x.title);}).join(', ')+(l.length>3?' 외':'')+')');
    });
    o+='<div class="spl"><div class="hint" style="font-weight:800;letter-spacing:1px;color:#1b64da">STUDY PLANNER · MENTOR</div><div style="font-size:22px;font-weight:800;margin:2px 0 4px">학습 스케줄러 — 자기주도 관리</div>'
      +'<div style="color:#4e5968;font-size:13px">담당 학생의 주간 계획을 조율·확정하고, 학생이 완료한 학습에 코멘트와 응원을 남겨요.</div>';
    o+='<div class="row rowb" style="margin-top:12px">'+weekBar()+'<button class="btn sm" onclick="SPL.reload()">↻ 새로고침</button></div>';
    o+='<div class="kpis"><div class="kpi"><b>'+mine.length+'명</b><span>관리 대상 학생</span></div>'
      +'<div class="kpi"><b style="color:'+(wait?'#6741d9':'inherit')+'">'+wait+'명</b><span>검토 대기 중인 계획</span></div>'
      +'<div class="kpi"><b>'+(tot?Math.round(dn*100/tot):0)+'%</b><span>확정 계획 평균 달성률</span></div>'
      +'<div class="kpi"><b style="color:'+(lateTot?'#e8590c':'#12a150')+'">'+lateTot+'개</b><span>기한 지난 미완료</span></div></div>';
    if(alerts.length) o+='<div class="alert"><div style="font-size:18px">🔔</div><div><b>확인이 필요한 항목</b><br>'+alerts.join('<br>')+'</div></div>';
    o+='<div class="mgrid"><div><div class="row rowb" style="margin-top:4px"><div class="h3">관리 대상 학생</div><button class="btn sm" onclick="SPL.addMentee()">+ 학생 추가</button></div>';
    if(isMgr()&&S.cands.length>1){
      var owners={}; S.mentees.forEach(function(m){owners[m.mentor_uid]=1;});
      o+='<select style="margin-top:8px;width:100%;border:1px solid #e5e8eb;border-radius:8px;padding:7px 9px;font:inherit;font-size:12.5px" onchange="SPL.filter(this.value)"><option value="">담당 강사: 전체</option>'
        +S.cands.filter(function(c){return owners[c.uid];}).map(function(c){return '<option value="'+c.uid+'"'+(S.filter===c.uid?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>';
    }
    o+='<div class="sl">';
    if(!mine.length) o+='<div class="empty" style="margin-top:0;padding:22px 12px"><div class="hint">관리 대상 학생이 없습니다.<br>[+ 학생 추가]로 지정해 주세요.</div></div>';
    mine.forEach(function(m){
      var p=S.plans[m.student_id], it=p?(S.items[p.id]||[]):[], r=rate(it), l=lateItems(p,it).length;
      o+='<button class="si'+(S.sel===m.student_id?' on':'')+'" onclick="SPL.pick(\''+m.student_id+'\')"><div class="nm"><span>'+esc(m.students.name)+' <small style="color:#8b95a1;font-weight:600">'+esc(m.students.grade||'')+'</small></span>'+(l?'<span class="badge">'+l+'</span>':'')+'</div>'
        +'<div class="mt">'+(p?STATUS[p.status]:'이 기간 계획 없음')+(p&&p.status==='confirmed'?' · '+r.d+'/'+r.n+' 완료':'')+(isMgr()?' · '+esc(mentorName(m.mentor_uid)):'')+'</div>'
        +'<div class="bar'+(r.pct>=70?' ok':'')+'"><span style="width:'+(p&&p.status==='confirmed'?r.pct:0)+'%"></span></div></button>';
    });
    o+='</div></div><div>';
    if(!S.sel){ o+='<div class="empty" style="margin-top:4px"><div class="big">🗓️</div><div style="margin-top:6px">왼쪽에서 학생을 선택하거나 새로 추가하세요.</div></div>'; }
    else {
      var m=S.mentees.filter(function(x){return x.student_id===S.sel;})[0], plan=detail&&detail.plan, items=detail?detail.items:[];
      o+='<div class="card" style="margin-top:4px"><div class="row rowb"><div><div style="font-weight:800;font-size:16px">'+esc(m.students.name)+' · '+esc(m.students.grade||'')+(m.students.school?' · '+esc(m.students.school):'')+'</div>'
        +'<div class="row" style="gap:6px;margin-top:6px"><span class="hint">목표</span><input type="text" id="spl-goal" maxlength="100" style="width:260px;max-width:100%;border:1px solid #e5e8eb;border-radius:7px;padding:5px 8px;font:inherit;font-size:12.5px" value="'+esc(m.goal||'')+'" placeholder="학습 목표 (선택)" onchange="SPL.goal(this.value)"></div></div>'
        +'<div class="row" style="gap:8px">'+chip(plan?plan.status:'none')
        +(isMgr()?'<select style="border:1px solid #e5e8eb;border-radius:7px;padding:5px 8px;font:inherit;font-size:12px" onchange="SPL.mentor(this.value)">'+S.cands.map(function(c){return '<option value="'+c.uid+'"'+(c.uid===m.mentor_uid?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>':'')
        +'<button class="btn sm" onclick="SPL.release()">관리 해제</button></div></div>'+stepper(plan)+'</div>';
      if(!plan){
        o+='<div class="empty"><div class="big">📝</div><div style="font-weight:800;margin-top:6px">기준일('+md(parseYmd(S.ref))+')이 속한 기간의 계획이 아직 없어요</div><div class="hint" style="margin:6px 0 10px">학생이 작성하면 여기에 표시돼요. 강사가 먼저 초안을 만들 수도 있어요. (기준일부터 7일 구간으로 생성)</div>'
          +'<div class="row" style="justify-content:center"><button class="btn pri" onclick="SPL.newPlan()">초안 직접 만들기</button><button class="btn" onclick="SPL.newPlan(true)">지난 계획 복사해서 시작</button></div></div>';
      } else {
        var st=plan.status;
        if(st==='confirmed') o+=progress(plan,items);
        o+='<div class="card"><div class="row rowb"><div class="h3">계획표 <span class="hint" style="font-weight:600">· '+weekLabel(plan.week_start)+'</span></div><div class="row" style="gap:8px">';
        if(st==='proposed') o+='<button class="btn warn" onclick="SPL.act(\'revise\')">수정 요청</button><button class="btn ok" onclick="SPL.act(\'confirm\')">이 계획으로 확정</button>';
        if(st==='draft'||st==='revising') o+='<button class="btn ok" onclick="SPL.act(\'confirm\')">이 계획으로 확정</button>';
        if(st==='confirmed') o+='<button class="btn sm" onclick="SPL.act(\'reopen\')">다시 조율하기</button>';
        o+='</div></div>';
        if(st==='proposed') o+='<div class="hint" style="margin-top:6px">학생이 제출한 계획입니다. 항목을 직접 고치거나(✎ 수정 · × 삭제 · + 항목), 메시지로 조율한 뒤 확정하세요.</div>';
        if(st==='draft') o+='<div class="hint" style="margin-top:6px">학생이 아직 제출하지 않은 초안입니다. 강사가 바로 확정할 수도 있어요.</div>';
        if(st==='confirmed') o+='<div class="hint" style="margin-top:6px">완료된 학습에 응원 이모지와 짧은 코멘트를 남기면 학생 화면에 바로 표시돼요.</div>';
        o+=board(plan,items,'men')+'</div>'+thread(detail.msgs,'학생에게 보낼 메시지');
      }
    }
    o+='</div></div></div>';
    h.innerHTML=o; afterPaint();
  }

  /* ----------------------------- 렌더 진입 ----------------------------- */
  async function render(){
    if(!S.host) return;
    if(S.busy) return; S.busy=true;
    var y=window.scrollY;
    try{ if(isStu()) await renderStudent(); else await renderMentor(); }
    catch(e){ S.host.innerHTML='<div class="spl"><div class="empty">화면을 불러오지 못했습니다. ('+esc(e.message||e)+')</div></div>'; console.error('[studyplan]',e); }
    S.busy=false; try{ window.scrollTo(0,y); }catch(_e){}
  }
  async function rerenderLocal(){
    // 데이터 재조회 없이 현재 상태만 다시 그림 (폼 열기/닫기)
    var y=window.scrollY;
    if(isStu()){ await renderStudent(); }
    else {
      var mine=S.mentees; if(isMgr()&&S.filter) mine=S.mentees.filter(function(m){return m.mentor_uid===S.filter;});
      paintMentor(mine,S.cur);
    }
    try{ window.scrollTo(0,y); }catch(_e){}
  }
  function curStudentId(){ return isStu()?(window._activeStudent&&window._activeStudent.id):S.sel; }
  function findItem(id){ var a=(S.cur&&S.cur.items)||[]; for(var i=0;i<a.length;i++){ if(a[i].id===id) return a[i]; } return null; }

  /* ----------------------------- 동작(전역 SPL) ----------------------------- */
  var SPL={
    week:function(d){
      S.form=null; var t=todayStart();
      if(d===0){ S.ref=ymd(t); }
      else if(isStu()){
        var w=curWin(), c;
        if(d<0){ c=S.starts.filter(function(x){return x<w.start;}); if(!c.length) return; S.ref=c[c.length-1]; }
        else { c=S.starts.filter(function(x){return x>w.start;}); var e1=addDays(parseYmd(w.end),1); S.ref=c.length?c[0]:ymd(e1>t?e1:t); }
      } else { S.ref=ymd(addDays(parseYmd(S.ref),7*d)); }
      render();
    },
    setRef:function(v){ if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')) return; S.form=null; S.ref=v; render(); },
    reload:function(){ render(); },
    pick:function(sid){ S.sel=sid; S.form=null; render(); },
    filter:function(v){ S.filter=v||''; S.sel=null; render(); },
    form:function(id,dow){
      if(id){ var x=findItem(id); if(!x) return; S.form={id:x.id,dow:x.dow,subject:x.subject,title:x.title,start_time:x.start_time,minutes:x.minutes}; }
      else S.form={id:null,dow:dow,subject:'수학'};
      rerenderLocal().then(function(){ var t=document.getElementById('spl-f-title'); if(t) t.focus(); });
    },
    cancel:function(){ S.form=null; rerenderLocal(); },
    saveItem:async function(){
      var f=S.form; if(!f) return;
      var title=(document.getElementById('spl-f-title').value||'').trim();
      if(!title){ toast('할 일을 입력해 주세요'); return; }
      var row={ subject:document.getElementById('spl-f-subj').value, title:title,
                start_time:document.getElementById('spl-f-time').value||null,
                minutes:parseInt(document.getElementById('spl-f-min').value,10)||null };
      var r;
      if(f.id){ r=await sbc().from('study_items').update(row).eq('id',f.id); }
      else { row.plan_id=S.cur.plan.id; row.student_id=S.cur.plan.student_id; row.dow=f.dow; r=await sbc().from('study_items').insert(row); }
      if(r.error){ fail(r); return; }
      S.form=null; await reloadCur();
    },
    del:async function(id){
      if(!confirm('이 항목을 삭제할까요?')) return;
      var r=await sbc().from('study_items').delete().eq('id',id); if(r.error){ fail(r); return; }
      await reloadCur();
    },
    toggle:async function(id){
      var x=findItem(id); if(!x) return;
      var r=await sbc().from('study_items').update({done:!x.done}).eq('id',id); if(r.error){ fail(r); await reloadCur(); return; }
      if(!x.done) toast('완료! 오늘 인상 깊었던 점도 짧게 남겨보세요 ✍️');
      await reloadCur();
    },
    refl:async function(id,v){
      var r=await sbc().from('study_items').update({reflection:(v||'').trim()||null}).eq('id',id); if(r.error){ fail(r); return; }
      var x=findItem(id); if(x) x.reflection=(v||'').trim()||null; toast('소감이 저장되었어요');
    },
    cm:async function(id,v){
      var r=await sbc().from('study_items').update({mentor_comment:(v||'').trim()||null}).eq('id',id); if(r.error){ fail(r); return; }
      toast('코멘트를 남겼어요'); await reloadCur();
    },
    cheer:async function(id,c){
      var x=findItem(id); if(!x) return; var nv=(x.cheer===c)?null:c;
      var r=await sbc().from('study_items').update({cheer:nv}).eq('id',id); if(r.error){ fail(r); return; }
      toast(nv?'응원을 보냈어요 '+nv:'응원을 취소했어요'); await reloadCur();
    },
    send:async function(){
      var el=document.getElementById('spl-mi'); var v=el&&el.value.trim(); if(!v||!S.cur||!S.cur.plan) return;
      var r=await sbc().from('study_plan_msgs').insert({plan_id:S.cur.plan.id,body:v}); if(r.error){ fail(r); return; }
      await reloadCur();
    },
    act:async function(a){
      var p=S.cur&&S.cur.plan; if(!p) return;
      if(a==='confirm'&&!confirm('이 계획으로 확정할까요? 확정 후에는 학생이 체크·소감만 입력할 수 있어요.')) return;
      var r=await sbc().rpc('sp_set_status',{p_plan:p.id,p_action:a}); if(r.error){ fail(r); return; }
      toast({submit:'선생님께 제출했어요',revise:'수정을 요청했어요',confirm:'계획을 확정했어요 ✅',reopen:'수정 단계로 되돌렸어요'}[a]||'처리했어요');
      render();
    },
    newPlan:async function(copy){
      var sid=curStudentId(); if(!sid) return;
      var ok=await createPlan(sid); if(!ok) return;
      if(copy){ var d=await loadPlanFor(sid); if(d.plan) await copyPrev(sid,d.plan.id,d.plan.week_start); }
      render();
    },
    copyPrev:async function(){ if(!S.cur||!S.cur.plan) return; await copyPrev(S.cur.plan.student_id,S.cur.plan.id,S.cur.plan.week_start); render(); },
    goal:async function(v){
      var m=S.mentees.filter(function(x){return x.student_id===S.sel;})[0]; if(!m) return;
      var r=await sbc().from('study_mentees').update({goal:(v||'').trim()||null}).eq('id',m.id); if(r.error){ fail(r); return; }
      m.goal=(v||'').trim()||null; toast('목표를 저장했어요');
    },
    mentor:async function(uid){
      var m=S.mentees.filter(function(x){return x.student_id===S.sel;})[0]; if(!m) return;
      var r=await sbc().from('study_mentees').update({mentor_uid:uid}).eq('id',m.id); if(r.error){ fail(r); render(); return; }
      toast('담당 강사를 변경했어요'); render();
    },
    release:async function(){
      var m=S.mentees.filter(function(x){return x.student_id===S.sel;})[0]; if(!m) return;
      if(!confirm(m.students.name+' 학생의 학습 스케줄러 관리를 해제할까요?\n(기존 계획·기록은 보존되며, 다시 지정하면 이어서 볼 수 있어요)')) return;
      var r=await sbc().from('study_mentees').update({active:false}).eq('id',m.id); if(r.error){ fail(r); return; }
      S.sel=null; toast('관리를 해제했어요'); render();
    },
    addMentee:function(){ openAdd(); }
  };
  async function reloadCur(){ await render(); }

  /* ----------------------------- 학생 추가(관리 대상 지정) ----------------------------- */
  async function openAdd(){
    var have={}; S.mentees.forEach(function(m){have[m.student_id]=1;});
    var studs=[];
    if(isMgr()){
      var r=await sbc().from('students').select('id,name,grade,school').eq('academy_id',window._acadId).order('name').limit(2000);
      if(r.error){ fail(r); return; } studs=r.data||[];
    } else {
      var c=await sbc().from('academy_classes').select('id').eq('teacher_id',myUid());
      var cids=(c.data||[]).map(function(x){return x.id;});
      if(cids.length){
        var e=await sbc().from('student_enrollments').select('student_id').in('class_id',cids);
        var sids=Array.from(new Set((e.data||[]).map(function(x){return x.student_id;})));
        if(sids.length){ var s2=await sbc().from('students').select('id,name,grade,school').in('id',sids).order('name'); studs=s2.data||[]; }
      }
    }
    studs=studs.filter(function(s){return !have[s.id];});
    var ov=document.createElement('div'); ov.className='spl-ov'; ov.id='spl-ov';
    var picked=null;
    function listHTML(q){
      q=(q||'').trim();
      var a=studs.filter(function(s){return !q||(s.name||'').indexOf(q)>=0;}).slice(0,200);
      return a.length?a.map(function(s){return '<div data-id="'+s.id+'" class="'+(picked===s.id?'on':'')+'">'+esc(s.name)+' <small style="color:#8b95a1">'+esc(s.grade||'')+(s.school?' · '+esc(s.school):'')+'</small></div>';}).join(''):'<div style="cursor:default;color:#8b95a1">대상 학생이 없습니다.'+(isMgr()?'':' (내가 담당하는 반의 학생만 표시돼요)')+'</div>';
    }
    ov.innerHTML='<div class="box"><h3>학습 스케줄러 관리 대상 추가</h3>'
      +'<label>학생 선택</label><input type="text" id="spl-aq" placeholder="이름 검색"><div class="lst" id="spl-al">'+listHTML('')+'</div>'
      +'<label>담당 강사(멘토)</label>'
      +(isMgr()?'<select id="spl-am">'+S.cands.map(function(c){return '<option value="'+c.uid+'"'+(c.uid===myUid()?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>'
               :'<input type="text" value="본인(내가 멘토)" disabled>')
      +'<label>학습 목표 (선택)</label><input type="text" id="spl-ag" maxlength="100" placeholder="예: 내신 수학 1등급 · 영어 단어 매일 30개">'
      +'<div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px"><button class="btn spl-x" id="spl-ax">취소</button><button class="btn pri" id="spl-ao">지정</button></div></div>';
    document.body.appendChild(ov);
    var close=function(){ ov.remove(); };
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    ov.querySelector('#spl-ax').onclick=close;
    ov.querySelector('#spl-aq').oninput=function(){ ov.querySelector('#spl-al').innerHTML=listHTML(this.value); };
    ov.querySelector('#spl-al').onclick=function(e){ var t=e.target.closest('[data-id]'); if(!t) return; picked=t.getAttribute('data-id'); ov.querySelector('#spl-al').innerHTML=listHTML(ov.querySelector('#spl-aq').value); };
    ov.querySelector('#spl-ao').onclick=async function(){
      if(!picked){ alert('학생을 선택해 주세요.'); return; }
      var mentor=isMgr()?ov.querySelector('#spl-am').value:myUid();
      var goal=(ov.querySelector('#spl-ag').value||'').trim()||null;
      // 이전에 해제한 학생이면 되살리기
      var ex=await sbc().from('study_mentees').select('id').eq('student_id',picked).limit(1);
      var r;
      if(ex.data&&ex.data[0]) r=await sbc().from('study_mentees').update({active:true,mentor_uid:mentor,goal:goal}).eq('id',ex.data[0].id);
      else r=await sbc().from('study_mentees').insert({student_id:picked,mentor_uid:mentor,goal:goal,active:true,academy_id:window._acadId});
      if(r.error){
        if(r.error.code==='23505'||/duplicate|unique|row-level/i.test(r.error.message||'')) alert('이미 다른 강사가 관리했던 학생이라 지정할 수 없어요. 원장·실장님께 요청해 주세요.');
        else fail(r);
        return;
      }
      close(); S.sel=picked; toast('학습 스케줄러 대상으로 지정했어요'); render();
    };
  }

  /* ----------------------------- 마운트 ----------------------------- */
  window.SPL=SPL;
  window.mountStudyPlanner=function(host){
    if(!host) return; css();
    S.host=host; S.form=null; S.busy=false;
    if(!sbc()){ host.innerHTML='<div class="spl"><div class="empty">DB 연결 전입니다. 새로고침 해주세요.</div></div>'; return; }
    host.innerHTML='<div class="spl"><div class="hint" style="padding:14px">불러오는 중…</div></div>';
    render();
  };
})();
