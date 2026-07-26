/* ============================================================================
 * arche_penta_app.js · 펜타 시리즈 앱 통합 패널 (학생 / 컨설턴트 / 학부모)
 * ----------------------------------------------------------------------------
 * 흐름: 컨설턴트가 회차(catalog) 배정 → 학생이 워크북 작성·[제출] → 컨설턴트가
 *       리포트 생성(penta-ai)·검토·수정 → 학부모에게 발행. 학생은 [제출]만.
 * 의존: window.sb(Supabase), window._acadId, window._activeStudent, window._role,
 *       ArchePentaWorkbook(워크북 엔진), ArchePentaReport(리포트 렌더)
 * API : ArchePentaApp.mount(container)   // container 미지정 시 #penta-mount
 *       ArchePentaApp.mountRole(container, 'student'|'staff'|'parent')
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL = 'https://dvxepjctjazobrkjrkdw.supabase.co';

  var CSS = ""
    + ".pnta{max-width:960px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#243244}"
    + ".pnta *{box-sizing:border-box}"
    + ".pnta .ph{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}"
    + ".pnta .ph h2{font-size:20px;font-weight:900;color:#1A237E;margin:0}"
    + ".pnta .ph .sub{font-size:12.5px;color:#6b7688;margin-top:2px}"
    + ".pnta .pick{display:flex;align-items:center;gap:8px;font-size:13px}"
    + ".pnta select,.pnta input[type=text]{border:1.5px solid #dfe3ec;border-radius:9px;padding:8px 11px;font:inherit;font-size:13px;background:#fff;color:#243244}"
    + ".pnta .tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid #e6e9f0}"
    + ".pnta .tabs button{font:inherit;font-weight:800;font-size:13.5px;padding:9px 16px;border:0;background:transparent;color:#8b95a1;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px}"
    + ".pnta .tabs button.on{color:#1A237E;border-bottom-color:#1A237E}"
    + ".pnta .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}"
    + ".pnta .c{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:15px 16px;box-shadow:0 1px 3px rgba(0,23,51,.04);display:flex;flex-direction:column}"
    + ".pnta .c .stg{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8b95a1}"
    + ".pnta .c .ti{font-size:15px;font-weight:900;color:#1A237E;margin:3px 0 2px;line-height:1.4}"
    + ".pnta .c .th{font-size:12px;color:#6b7688}"
    + ".pnta .c .meta{font-size:11px;color:#9aa6b4;margin-top:6px}"
    + ".pnta .badge{display:inline-block;font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:99px;align-self:flex-start;margin-top:9px}"
    + ".pnta .b-assigned{background:#eef1ff;color:#1A237E}.pnta .b-submitted{background:#fff4e0;color:#b8860b}"
    + ".pnta .b-reviewed{background:#e7f0ff;color:#2b64c4}.pnta .b-sent{background:#e9f9ef;color:#137a44}.pnta .b-none{background:#f0f2f6;color:#8b95a1}"
    + ".pnta .b-done{background:#12b76a;color:#fff}"
    + ".pnta .c.done{border-color:#12b76a;background:#f6fdf9}"
    + ".pnta .c .donetag{position:absolute;top:10px;right:10px;background:#12b76a;color:#fff;font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:99px}"
    + ".pnta .c{position:relative}"
    + ".pnta .row{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}"
    + ".pnta button.act{font:inherit;font-weight:800;font-size:12.5px;padding:9px 14px;border-radius:10px;border:0;cursor:pointer}"
    + ".pnta .act.pri{background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff}"
    + ".pnta .act.gd{background:#D4AF37;color:#1A237E}"
    + ".pnta .act.gh{background:#eef1ff;color:#1A237E}"
    + ".pnta .act.dn{background:linear-gradient(135deg,#0f9d8f,#12b76a);color:#fff}"
    + ".pnta .act.mut{background:#f0f2f6;color:#6b7688}"
    + ".pnta .act:disabled{opacity:.5;cursor:not-allowed}"
    + ".pnta .empty{text-align:center;color:#8b95a1;font-size:13.5px;padding:40px 20px;background:#f7f9fd;border-radius:14px;line-height:1.7}"
    + ".pnta .warn{background:#fdf6e9;border:1px solid #efd9a6;color:#8a6d1f;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.7}"
    + ".pnta .cat{background:#fff;border:1px solid #e6e9f0;border-radius:13px;padding:13px 15px;display:flex;align-items:center;gap:12px;margin-bottom:9px}"
    + ".pnta .cat .cc{flex:1}.pnta .cat .cc .ti{font-size:14px;font-weight:900;color:#1A237E}.pnta .cat .cc .th{font-size:12px;color:#6b7688;margin-top:2px}"
    + ".pnta .chip{font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:6px;background:#eef1ff;color:#1A237E}"
    + ".pnta-ov{position:fixed;inset:0;background:rgba(8,11,46,.55);z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font-family:'Noto Sans KR',sans-serif}"
    + ".pnta-ovc{background:#eef1f8;border-radius:18px;max-width:900px;width:100%;padding:16px;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.35)}"
    + ".pnta-ovx{position:sticky;top:0;display:flex;justify-content:flex-end;z-index:2}"
    + ".pnta-ovx button{font:inherit;font-weight:800;font-size:13px;padding:8px 14px;border-radius:10px;border:0;background:#1A237E;color:#fff;cursor:pointer}"
    + ".pnta .edit{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:16px;margin-bottom:12px}"
    + ".pnta .edit h4{margin:0 0 4px;font-size:14px;color:#1A237E}"
    + ".pnta .edit .fl{font-size:11.5px;font-weight:800;color:#8b95a1;margin:10px 0 4px}"
    + ".pnta .edit textarea,.pnta .edit input{width:100%;border:1.5px solid #dfe3ec;border-radius:9px;padding:9px 11px;font:inherit;font-size:13px}"
    + ".pnta .edit label.ck{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-top:10px;color:#39465a}"
    + ".pnta .toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#1A237E;color:#fff;font-size:13px;font-weight:700;padding:11px 18px;border-radius:99px;z-index:10001;box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;transition:.2s}"
    + ".pnta .toast.on{opacity:1}"
    + ".pnta .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:pnspin .7s linear infinite;vertical-align:-2px;margin-right:6px}"
    + "@keyframes pnspin{to{transform:rotate(360deg)}}";

  function inject(){ if(!document.getElementById('pnta-css')){var s=document.createElement('style');s.id='pnta-css';s.textContent=CSS;document.head.appendChild(s);} }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}
  function acadId(){ return window._acadId || (window._academy&&window._academy.id) || null; }
  function toast(msg){ var t=document.querySelector('.pnta .toast'); if(!t){t=el('<div class="toast"></div>'); (document.querySelector('.pnta')||document.body).appendChild(t);} t.textContent=msg; t.classList.add('on'); setTimeout(function(){t.classList.remove('on');},2200); }

  // 코스 정의: vision_basic(비전 기초) · vision_adv(비전 심화) · track(펜타 트랙)
  var COURSES={
    vision_basic:{ stage:'vision', level:'starter',      title:'펜타 비전 기초', short:'비전 기초', bands:['초등'],        desc:'초등 · 5대 지성 주파수 발견(쉬운 언어)' },
    vision_adv:  { stage:'vision', level:'architecture', title:'펜타 비전 심화', short:'비전 심화', bands:['초등','중등'], desc:'초등 고학년~중등 · 논리적 사고 확장' },
    track:       { stage:'track',  level:'',             title:'펜타 트랙',     short:'트랙',     bands:['중등'],        desc:'중3 · 교과 융합 + 고교학점제·세특 연계' }
  };
  function courseSpec(c){ return COURSES[c]||{ title:'펜타 시리즈', short:'전체', desc:'비전·트랙 통합', stage:null, level:null }; }
  function courseLabel(c){ return COURSES[c]?COURSES[c].short:'미수강'; }
  function stageTitle(s){ return COURSES[s]?COURSES[s].title:(s==='vision'?'펜타 비전':(s==='track'?'펜타 트랙':'펜타 시리즈')); }
  function stageDesc(s){ return COURSES[s]?COURSES[s].desc:'비전·트랙 통합'; }
  function gradeBand(g){ g=String(g||''); if(/초/.test(g))return '초등'; if(/중/.test(g))return '중등'; if(/고|N수/.test(g))return '고등'; return '기타'; }
  function eligibleCourses(grade){ var b=gradeBand(grade); return Object.keys(COURSES).filter(function(k){return COURSES[k].bands.indexOf(b)>=0;}); }
  function byStage(rows, stage){ return stage ? (rows||[]).filter(function(r){return r.stage===stage;}) : (rows||[]); }
  // 코스 스펙에 맞는 카탈로그/배정 행 필터 (stage + level)
  function bySpec(rows, spec){ if(!spec||!spec.stage)return rows||[]; return (rows||[]).filter(function(r){ return r.stage===spec.stage && ((r.level||'')===(spec.level||'')); }); }
  async function loadStudents(){
    var students=(window._students||[]).slice();
    if(!students.length){ try{ var r=await window.sb.from('students').select('id,name').eq('academy_id',acadId()).order('name'); if(r&&r.data)students=r.data; }catch(e){} }
    if(!students.length && window._activeStudent) students=[window._activeStudent];
    return students;
  }
  // 펜타 대상(초·중등) 학생 로드 — 컨설턴트는 담당 학생만
  async function loadPentaStudents(){
    var q=window.sb.from('students').select('id,name,grade,penta_course,consultant_uid').eq('academy_id',acadId());
    if(window._isOwner===false && window._myUid){ q=q.eq('consultant_uid',window._myUid); }
    var r; try{ r=await q; }catch(e){ return []; }
    var rows=(r&&r.data)||[];
    return rows.filter(function(s){ var b=gradeBand(s.grade); return b==='초등'||b==='중등'; });
  }
  async function setPentaCourse(studentId, course){ var r=await window.sb.from('students').update({penta_course:course}).eq('id',studentId); if(r.error)throw r.error; return true; }

  var STLABEL={ assigned:'배정됨', in_progress:'작성 중', submitted:'제출됨 · 검토 대기', reviewed:'리포트 검토중', sent:'학부모 발행 완료' };
  function badge(status){ var k=STLABEL[status]?status:'none'; return '<span class="badge b-'+k+'">'+(STLABEL[status]||'미배정')+'</span>'; }

  // ── 데이터 계층 ─────────────────────────────────────────────────────────
  async function token(){ try{var s=await window.sb.auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function callPenta(task,payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/penta-ai';
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({task:task,payload:payload})});
    var d=await r.json(); if(!r.ok) throw new Error(d.error||'AI 오류'); return d;
  }
  async function callFn(name, payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/'+name;
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(payload||{})});
    var d=await r.json(); if(!r.ok) throw new Error(d.error||('오류('+r.status+')')); return d;
  }
  async function issueParent(studentId, studentName){
    try{
      var d=await callFn('create-parent',{student_id:studentId});
      if(d.existed){ toast('이미 학부모 계정 있음 · '+d.login_id); alert('학부모 계정(이미 발급됨)\n아이디: '+d.login_id+'\n\n학부모용 앱 로그인에서 이 아이디로 접속하면 자녀 리포트를 볼 수 있어요.'); }
      else { alert('학부모 계정 발급 완료 ('+esc(studentName||'')+')\n아이디: '+d.login_id+'\n초기 비밀번호: '+(d.pw||'0000')+'\n\n학부모용 앱 로그인 화면의 "학생 아이디" 칸에 이 아이디로 접속하면 됩니다.'); }
    }catch(e){
      if(/학생 로그인 계정/.test(e.message||'')) alert('먼저 이 학생의 로그인 계정을 만들어야 학부모 계정을 발급할 수 있어요.\n(학생 관리에서 학생 계정 생성 후 다시 시도)');
      else toast('발급 실패: '+(e.message||e));
    }
  }
  async function listCatalog(){ var r=await window.sb.rpc('list_penta_catalog'); if(r.error)throw r.error; return r.data||[]; }
  async function listAssignments(studentId){ var r=await window.sb.rpc('list_penta_assignments',{p_academy:acadId(),p_student:studentId||null}); if(r.error)throw r.error; return r.data||[]; }
  async function assign(studentId,catalogId,note){ var r=await window.sb.rpc('assign_penta',{p_academy:acadId(),p_student:studentId,p_catalog_id:catalogId,p_note:note||null,p_due:null}); if(r.error)throw r.error; return r.data; }
  async function unassign(id){ var r=await window.sb.rpc('unassign_penta',{p_id:id}); if(r.error)throw r.error; return r.data; }
  async function getSubmission(id){ var r=await window.sb.from('penta_submissions').select('*').eq('id',id).limit(1); if(r.error)throw r.error; return (r.data&&r.data[0])||null; }
  async function getSubmissionBy(studentId,stage,season,week){ var r=await window.sb.from('penta_submissions').select('*').eq('academy_id',acadId()).eq('student_id',studentId).eq('stage',stage).eq('season',season).eq('week',week).limit(1); if(r.error)throw r.error; return (r.data&&r.data[0])||null; }
  async function saveReport(id,report,persona,status,edited){ var r=await window.sb.rpc('save_penta_report',{p_id:id,p_report:report,p_persona:persona||null,p_status:status,p_edited:!!edited}); if(r.error)throw r.error; return r.data; }

  function growthPct(before,after){ try{ var b=(before||[]).reduce(function(a,x){return a+(+x||0);},0); var a=(after||[]).reduce(function(s,x){return s+(+x||0);},0); if(!b)return null; return Math.round((a-b)/b*100);}catch(e){return null;} }

  // 리포트 조립: penta-ai 결과 + 제출 메타(레이더/컴퍼스/학생/회차)
  function assembleReport(ai, sub, cat, studentName){
    var rep = Object.assign({}, ai);
    rep.stage = cat.stage;
    rep.level = cat.level || '';
    rep.student = { name: studentName || sub.student_id, grade: cat.grade_band||'' };
    rep.lesson = { season:cat.season, week:cat.week, theme:cat.theme, title:cat.title, date: (new Date()).toISOString().slice(0,10).replace(/-/g,'.') };
    rep.date = rep.lesson.date;
    rep.consultantConfirmed = true;
    if(cat.stage==='vision'){
      rep.radar = Object.assign({ axes:(cat.content&&cat.content.radarAxes)||['','','','',''], before:sub.radar_before, after:sub.radar_after, growthPct:growthPct(sub.radar_before,sub.radar_after) }, ai.radar||{});
      rep.compass = Object.assign({ value: sub.compass!=null?sub.compass:50 }, ai.compass||{});
    }
    return rep;
  }

  // ── 학생 뷰 ─────────────────────────────────────────────────────────────
  async function renderStudent(root, opts){
    opts=opts||{}; var course=opts.course||null; var spec=courseSpec(course);
    var studentId = (window._activeStudent&&window._activeStudent.id) || null;
    root.innerHTML = '<div class="ph"><div><h2>'+esc(spec.title)+'</h2><div class="sub">선생님이 배정한 회차를 열어 워크북을 작성하고 [제출]하면 돼요.</div></div></div><div id="pn-list"><div class="empty">불러오는 중…</div></div>';
    var list=root.querySelector('#pn-list');
    if(!studentId){ list.innerHTML='<div class="warn">학생 정보를 불러오지 못했어요. 다시 로그인해 주세요.</div>'; return; }
    var rows;
    try{ rows=bySpec(await listAssignments(studentId), spec); }catch(e){ list.innerHTML='<div class="warn">목록을 불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
    if(!rows.length){ list.innerHTML='<div class="empty">아직 배정된 '+esc(spec.title)+' 회차가 없어요.<br>선생님이 회차를 배정하면 여기에 나타나요 😊</div>'; return; }
    var g=document.createElement('div'); g.className='grid';
    rows.forEach(function(a){
      var submitted=(a.status==='submitted'||a.status==='reviewed'||a.status==='sent');
      var c=document.createElement('div'); c.className='c'+(submitted?' done':'');
      var done=(a.status==='sent');
      c.innerHTML=(submitted?'<div class="donetag">✓ 완료</div>':'')
        +'<div class="stg">펜타 '+(a.stage==='track'?'트랙':'비전')+(a.level?(' · '+(a.level==='starter'?'스타터':'아키텍처')):'')+'</div>'
        +'<div class="ti">'+esc(a.title)+'</div><div class="th">'+esc(a.theme||'')+' · 시즌'+esc(a.season)+' '+esc(a.week)+'주차</div>'
        +'<div class="meta">'+esc(a.grade_band||'')+' · 예상 '+esc(a.est_min||40)+'분</div>'+badge(a.status);
      var row=document.createElement('div'); row.className='row';
      var open=el('<button class="act pri">'+(a.status==='assigned'?'워크북 열기':(a.status==='submitted'||a.status==='reviewed'?'제출한 내용 보기':'다시 열기'))+'</button>');
      open.addEventListener('click',function(){ openWorkbook(a, studentId, (a.status!=='assigned')); });
      row.appendChild(open);
      if(done){ var rv=el('<button class="act dn">내 리포트 보기</button>'); rv.addEventListener('click',function(){ viewReport(a.submission_id); }); row.appendChild(rv); }
      c.appendChild(row); g.appendChild(c);
    });
    list.innerHTML=''; list.appendChild(g);
  }

  // 워크북 오버레이
  async function openWorkbook(a, studentId, readOnly){
    if(!window.ArchePentaWorkbook){ toast('워크북 모듈(arche_penta_workbook.js) 미로드'); return; }
    var pre=null;
    if(readOnly || a.status!=='assigned'){
      try{ var sub=await getSubmissionBy(studentId,a.stage,a.season,a.week); if(sub)pre={answers:sub.answers,radar_before:sub.radar_before,radar_after:sub.radar_after,compass:sub.compass}; }catch(e){}
    }
    var ov=el('<div class="pnta-ov"><div class="pnta-ovc"><div class="pnta-ovx"><button>✕ 닫기</button></div><div class="wbmount"></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.pnta-ovx button').addEventListener('click',function(){ ov.remove(); });
    ArchePentaWorkbook.render(ov.querySelector('.wbmount'), {
      lesson: a.content, academyId: acadId(), studentId: studentId,
      mode:'live', readOnly: !!readOnly, prefill: pre,
      onSubmit: function(){ toast('제출 완료! 🎉'); setTimeout(function(){ ov.remove(); var r=document.querySelector('.pnta'); if(r)ArchePentaApp.mount(r.parentNode); },900); }
    });
  }

  // 컨설턴트용 워크북 미리보기(빈 워크북 · 저장 안 함)
  function openWorkbookPreview(c){
    if(!window.ArchePentaWorkbook){ toast('워크북 모듈(arche_penta_workbook.js) 미로드'); return; }
    if(!c || !c.content){ toast('이 회차의 워크북 내용이 없습니다'); return; }
    var ov=el('<div class="pnta-ov"><div class="pnta-ovc"><div class="pnta-ovx"><span style="flex:1;color:#8b95a1;font-size:12px;font-weight:700;align-self:center">📖 미리보기 · 저장되지 않습니다</span><button>✕ 닫기</button></div><div class="wbmount"></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.pnta-ovx button').addEventListener('click',function(){ ov.remove(); });
    ArchePentaWorkbook.render(ov.querySelector('.wbmount'), { lesson: c.content, mode:'preview', readOnly:false });
  }

  async function viewReport(submissionId){
    if(!window.ArchePentaReport){ toast('리포트 모듈(arche_penta_report.js) 미로드'); return; }
    var sub; try{ sub=await getSubmission(submissionId); }catch(e){ toast('리포트를 불러오지 못했어요'); return; }
    if(!sub||!sub.report){ toast('아직 발행된 리포트가 없어요'); return; }
    var ov=el('<div class="pnta-ov"><div class="pnta-ovc"><div class="pnta-ovx"><button>✕ 닫기</button></div><div class="rpmount"></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.pnta-ovx button').addEventListener('click',function(){ ov.remove(); });
    ArchePentaReport.render(ov.querySelector('.rpmount'), sub.report);
  }

  // ── 컨설턴트/원장 뷰 (코스 기반: 학년폴더 · 일괄/개별 전송 · 수강 등록/진급) ──
  async function renderStaff(root, opts){
    opts=opts||{}; var course=opts.course||null; var spec=courseSpec(course);
    root.innerHTML='<div class="ph"><div><h2>'+esc(spec.title)+' · 컨설턴트</h2><div class="sub">'+esc(spec.desc)+'</div></div></div>'
      +'<div class="tabs"><button data-t="assign" class="on">회차 배정·전송</button><button data-t="review">제출·리포트</button></div>'
      +'<div id="pn-body"><div class="empty">불러오는 중…</div></div>';
    var tab='assign';
    root.querySelectorAll('.tabs button').forEach(function(b){ b.addEventListener('click',function(){ root.querySelectorAll('.tabs button').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); tab=b.dataset.t; draw(); }); });
    async function draw(){ var body=root.querySelector('#pn-body'); body.innerHTML='<div class="empty">불러오는 중…</div>';
      if(tab==='assign') return drawAssign(body, course, spec); return drawReviewCourse(body, course, spec); }
    draw();
  }

  // 회차 배정·전송: 회차 선택 → 코스 수강생(학년폴더) → 일괄/개별 전송
  async function drawAssign(body, course, spec){
    var cat, students;
    try{ cat=bySpec(await listCatalog(), spec); students=await loadPentaStudents(); }catch(e){ body.innerHTML='<div class="warn">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    var enrolled = course ? students.filter(function(s){return s.penta_course===course;}) : students;
    body.innerHTML='';
    // 1) 회차 선택
    var top=el('<div class="edit"><h4>① 전송할 회차 선택</h4></div>');
    if(!cat.length){ top.appendChild(el('<div class="sub" style="margin-top:6px">이 코스의 회차가 아직 없습니다.</div>')); }
    else {
      var selrow=el('<div class="row" style="margin-top:8px;align-items:center"></div>');
      var cs=el('<select id="pn-csel" style="flex:1;min-width:200px"></select>'); cs.innerHTML=cat.map(function(c){return '<option value="'+c.id+'">시즌'+esc(c.season)+' '+esc(c.week)+'주차 · '+esc(c.title)+'</option>';}).join('');
      var pv=el('<button class="act gh" style="flex:none">📖 워크북 미리보기</button>');
      pv.addEventListener('click', function(){ var id=+cs.value; var c=cat.filter(function(x){return x.id===id;})[0]; if(c) openWorkbookPreview(c); });
      selrow.appendChild(cs); selrow.appendChild(pv); top.appendChild(selrow);
    }
    body.appendChild(top);
    // 2) 학생 선택 (학년폴더)
    var head=el('<div class="edit" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h4 style="margin:0">② 받을 학생 선택 <span style="font-size:11px;color:#8b95a1;font-weight:600">· '+esc(spec.short)+' 수강생 '+enrolled.length+'명</span></h4></div>');
    var addBtn=el('<button class="act gh">＋ 수강생 등록</button>'); addBtn.addEventListener('click',function(){ openEnroll(course, function(){ drawAssign(body, course, spec); }); }); head.appendChild(addBtn);
    body.appendChild(head);
    if(!enrolled.length){ body.appendChild(el('<div class="empty">이 코스 수강생이 없습니다.<br>[＋ 수강생 등록]으로 초·중등 학생을 이 코스에 등록하세요.</div>')); return; }
    var byGrade={}; enrolled.forEach(function(s){ var g=s.grade||'기타'; (byGrade[g]=byGrade[g]||[]).push(s); });
    var checks=[];
    Object.keys(byGrade).sort().forEach(function(g){
      var folder=el('<div class="edit" style="padding:12px 14px"></div>');
      var fh=el('<label class="ck" style="font-weight:800;color:#1A237E;margin:0 0 4px"><input type="checkbox"> 📁 '+esc(g)+' <span style="font-size:11px;color:#8b95a1;font-weight:600">('+byGrade[g].length+'명)</span></label>');
      var fchk=fh.querySelector('input'); folder.appendChild(fh);
      var kids=[];
      byGrade[g].forEach(function(s){
        var rowl=el('<label class="ck" style="padding:5px 0 5px 18px;display:flex;align-items:center"><input type="checkbox"> <span style="flex:1">'+esc(s.name)+'</span></label>');
        var cb=rowl.querySelector('input'); cb.value=s.id; checks.push(cb); kids.push(cb);
        var cc=el('<select style="font-size:11px;padding:3px 6px;margin-left:6px"></select>');
        var elig=eligibleCourses(s.grade);
        cc.innerHTML='<option value="">코스 변경…</option>'+elig.map(function(k){return '<option value="'+k+'"'+(s.penta_course===k?' selected':'')+'>'+COURSES[k].short+'</option>';}).join('')+'<option value="__none">미수강</option>';
        cc.addEventListener('change', async function(){ var v=cc.value; if(!v)return; try{ await setPentaCourse(s.id, v==='__none'?null:v); toast(s.name+' 코스 변경'); drawAssign(body, course, spec); }catch(e){ toast('변경 실패: '+(e.message||e)); } });
        rowl.appendChild(cc);
        var pbtn=el('<button class="act mut" title="학부모 로그인 계정 발급" style="padding:4px 8px;font-size:11px;margin-left:5px">👪 학부모ID</button>');
        pbtn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); issueParent(s.id, s.name); });
        rowl.appendChild(pbtn);
        folder.appendChild(rowl);
      });
      fchk.addEventListener('change',function(){ kids.forEach(function(k){k.checked=fchk.checked;}); });
      body.appendChild(folder);
    });
    // 3) 전송
    var bar=el('<div class="edit" style="position:sticky;bottom:0"><button class="act pri" style="width:100%">③ 선택한 학생에게 이 회차 전송</button><div class="sub" style="margin-top:6px;text-align:center">전송하면 학생 화면에 회차가 나타납니다.</div></div>');
    var send=bar.querySelector('button');
    send.addEventListener('click', async function(){
      var cs=body.querySelector('#pn-csel'); var cid=cs&&cs.value?+cs.value:null;
      if(!cid){ toast('먼저 회차를 선택하세요'); return; }
      var ids=checks.filter(function(c){return c.checked;}).map(function(c){return c.value;});
      if(!ids.length){ toast('학생을 선택하세요'); return; }
      send.disabled=true; send.textContent='전송 중…'; var okc=0, ec=0;
      for(var i=0;i<ids.length;i++){ try{ await assign(ids[i], cid, null); okc++; }catch(e){ ec++; } }
      send.disabled=false; send.textContent='③ 선택한 학생에게 이 회차 전송';
      toast(okc+'명 전송 완료'+(ec?(' · '+ec+'명 실패'):''));
    });
    body.appendChild(bar);
  }

  // 수강 등록 오버레이 (기존 학생 등록 + 새 학생 추가)
  async function openEnroll(course, cb){
    var spec=courseSpec(course); var bands=(COURSES[course]&&COURSES[course].bands)||['초등','중등'];
    var students; try{ students=await loadPentaStudents(); }catch(e){ students=[]; }
    var cand=students.filter(function(s){ return bands.indexOf(gradeBand(s.grade))>=0 && s.penta_course!==course; });
    var gradeOpts=[]; if(bands.indexOf('초등')>=0)['초3','초4','초5','초6'].forEach(function(x){gradeOpts.push(x);}); if(bands.indexOf('중등')>=0)['중1','중2','중3'].forEach(function(x){gradeOpts.push(x);});
    var ov=el('<div class="pnta-ov"><div class="pnta-ovc" style="max-width:540px"><div class="pnta-ovx"><button>✕ 닫기</button></div></div></div>');
    var box=ov.querySelector('.pnta-ovc');
    box.appendChild(el('<div class="edit"><h4>'+esc(spec.title)+' 수강 등록</h4><div class="sub">기존 초·중등 학생을 이 코스로 등록하거나, 새 학생을 추가하세요.</div></div>'));
    var ex=el('<div class="edit"><div class="fl">기존 학생 등록 (복수 선택)</div></div>');
    var exChecks=[];
    if(!cand.length) ex.appendChild(el('<div class="sub">등록 가능한 초·중등 학생이 없습니다.</div>'));
    cand.forEach(function(s){ var l=el('<label class="ck"><input type="checkbox" value="'+esc(s.id)+'"> '+esc(s.name)+' · '+esc(s.grade||'')+(s.penta_course?(' <span style="font-size:10px;color:#8b95a1">(현재 '+esc(courseLabel(s.penta_course))+')</span>'):'')+'</label>'); exChecks.push(l.querySelector('input')); ex.appendChild(l); });
    if(cand.length){ var eb=el('<button class="act pri" style="margin-top:8px">선택 학생 이 코스로 등록</button>'); eb.addEventListener('click',async function(){ var ids=exChecks.filter(function(c){return c.checked;}).map(function(c){return c.value;}); if(!ids.length){toast('학생을 선택하세요');return;} eb.disabled=true; for(var i=0;i<ids.length;i++){try{await setPentaCourse(ids[i],course);}catch(e){}} toast(ids.length+'명 등록 완료'); ov.remove(); if(cb)cb(); }); ex.appendChild(eb); }
    box.appendChild(ex);
    var nw=el('<div class="edit"><div class="fl">새 학생 추가</div></div>');
    var nin=el('<input id="pe-name" placeholder="이름" style="width:100%">'); nw.appendChild(nin);
    var gsel=el('<select id="pe-grade" style="width:100%;margin-top:8px"><option value="">학년 선택</option>'+gradeOpts.map(function(g){return '<option>'+g+'</option>';}).join('')+'</select>'); nw.appendChild(gsel);
    var nb=el('<button class="act dn" style="margin-top:10px">새 학생 추가 + 이 코스 등록</button>');
    nb.addEventListener('click', async function(){
      var nm=nin.value.trim(), gr=gsel.value;
      if(!nm||!gr){ toast('이름과 학년을 입력하세요'); return; }
      nb.disabled=true;
      try{ var ins={academy_id:acadId(), name:nm, grade:gr, penta_course:course}; if(window._myUid)ins.consultant_uid=window._myUid; var r=await window.sb.from('students').insert(ins).select('id').single(); if(r.error)throw r.error; toast('학생 추가·등록 완료'); ov.remove(); if(cb)cb(); }
      catch(e){ toast('추가 실패: '+(e.message||e)); nb.disabled=false; }
    });
    nw.appendChild(nb); box.appendChild(nw);
    document.body.appendChild(ov);
    ov.querySelector('.pnta-ovx button').addEventListener('click',function(){ ov.remove(); });
  }

  // 제출·리포트 탭 (코스 수강생 선택 → 회차별 리포트)
  async function drawReviewCourse(body, course, spec){
    var students; try{ students=await loadPentaStudents(); }catch(e){ body.innerHTML='<div class="warn">'+esc(e.message||e)+'</div>'; return; }
    var enrolled = course ? students.filter(function(s){return s.penta_course===course;}) : students;
    if(!enrolled.length){ body.innerHTML='<div class="empty">이 코스 수강생이 없습니다. [회차 배정·전송] 탭에서 수강생을 등록하세요.</div>'; return; }
    body.innerHTML='<div class="pick" style="margin-bottom:12px"><span>학생</span><select id="pn-rstu"></select></div><div id="pn-rbody"></div>';
    var sel=body.querySelector('#pn-rstu');
    sel.innerHTML=enrolled.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.grade||'')+'</option>';}).join('');
    function cur(){ var id=sel.value; var s=enrolled.filter(function(x){return x.id===id;})[0]||{}; return {id:id,name:s.name||id}; }
    async function d(){ var b=body.querySelector('#pn-rbody'); b.innerHTML='<div class="empty">불러오는 중…</div>'; drawReview(b, cur(), spec); }
    sel.addEventListener('change', d); d();
  }

  async function drawReview(body, stu, spec){
    var asg;
    try{ asg=bySpec(await listAssignments(stu.id), spec); }catch(e){ body.innerHTML='<div class="warn">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    if(!asg.length){ body.innerHTML='<div class="empty">배정된 회차가 없습니다. [회차 배정·전송] 탭에서 전송하세요.</div>'; return; }
    body.innerHTML='';
    var g=document.createElement('div'); g.className='grid';
    asg.forEach(function(a){
      var c=document.createElement('div'); c.className='c';
      c.innerHTML='<div class="stg">펜타 '+(a.stage==='track'?'트랙':'비전')+'</div><div class="ti">'+esc(a.title)+'</div><div class="th">'+esc(a.theme||'')+' · 시즌'+esc(a.season)+' '+esc(a.week)+'주차</div>'+badge(a.status);
      var row=document.createElement('div'); row.className='row';
      if(a.status==='assigned'){ row.appendChild(el('<button class="act mut" disabled>학생 제출 대기</button>')); }
      else {
        var gen=el('<button class="act gd">'+(a.has_report?'리포트 다시 열기':'리포트 생성')+'</button>');
        gen.addEventListener('click',function(){ openReview(a, stu); });
        row.appendChild(gen);
        var vw=el('<button class="act gh">제출물 보기</button>');
        vw.addEventListener('click',function(){ var fake=Object.assign({},a,{status:'reviewed'}); openWorkbook(fake, stu.id, true); });
        row.appendChild(vw);
      }
      c.appendChild(row); g.appendChild(c);
    });
    body.appendChild(g);
  }

  // 리포트 생성·검토·발행 오버레이
  async function openReview(a, stu){
    if(!window.ArchePentaReport){ toast('리포트 모듈 미로드'); return; }
    var ov=el('<div class="pnta-ov"><div class="pnta-ovc"><div class="pnta-ovx"><button>✕ 닫기</button></div><div id="pn-rv"><div class="empty">제출물 불러오는 중…</div></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.pnta-ovx button').addEventListener('click',function(){ ov.remove(); });
    var wrap=ov.querySelector('#pn-rv');
    var sub;
    try{ sub=await getSubmissionBy(stu.id, a.stage, a.season, a.week); }catch(e){ wrap.innerHTML='<div class="warn">제출물을 불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
    if(!sub){ wrap.innerHTML='<div class="warn">아직 학생 제출물이 없습니다.</div>'; return; }

    var report = sub.report || null;   // 이미 생성된 게 있으면 재사용
    function paint(){
      wrap.innerHTML='';
      // 컨트롤
      var ctl=el('<div class="edit"><h4>리포트 관리 · '+esc(stu.name)+'</h4>'
        +'<div class="sub" style="font-size:12px;color:#6b7688">AI가 제출물을 분석해 초안을 만듭니다. 검토·수정 후 학부모에게 발행하세요. (발행 전까지 학부모에게 보이지 않습니다.)</div>'
        +'<div class="row"><button class="act pri" id="rv-gen">'+(report?'AI로 다시 생성':'AI 리포트 생성')+'</button>'
        +(report?'<button class="act gh" id="rv-edit">간편 수정</button><button class="act dn" id="rv-pub">학부모에게 발행</button>':'')+'</div></div>');
      wrap.appendChild(ctl);
      var mount=el('<div class="rpmount"></div>'); wrap.appendChild(mount);
      if(report){ try{ ArchePentaReport.render(mount, report); }catch(e){ mount.innerHTML='<div class="warn">렌더 오류: '+esc(e.message||e)+'</div>'; } }
      else mount.innerHTML='<div class="empty">아직 리포트가 없습니다. [AI 리포트 생성]을 눌러 초안을 만드세요.</div>';

      var genBtn=ctl.querySelector('#rv-gen');
      genBtn.addEventListener('click', async function(){
        genBtn.disabled=true; genBtn.innerHTML='<span class="spin"></span>생성 중…';
        try{
          var task = a.stage==='track' ? 'penta_track_report' : 'penta_vision_report';
          var payload = {
            theme:sub.theme, title:sub.title, level:sub.level,
            answers:sub.answers, radar_before:sub.radar_before, radar_after:sub.radar_after,
            compass:sub.compass, matrix:(a.content&&a.content.theme)||'', career:(sub.answers&&sub.answers.career_choice)||''
          };
          var res=await callPenta(task, payload);
          var ai; try{ ai=JSON.parse(res.text); }catch(pe){ throw new Error('AI 응답 파싱 실패'); }
          report = assembleReport(ai, sub, a, stu.name);
          await saveReport(sub.id, report, (report.persona&&report.persona.name)||(report.signature&&report.signature.name)||null, 'reviewed', false);
          toast('리포트 초안을 생성했어요'); paint();
        }catch(e){ toast('생성 실패: '+(e.message||e)); genBtn.disabled=false; genBtn.textContent='AI 리포트 생성'; }
      });

      var pub=ctl.querySelector('#rv-pub');
      if(pub) pub.addEventListener('click', async function(){
        pub.disabled=true; pub.innerHTML='<span class="spin"></span>발행 중…';
        try{ await saveReport(sub.id, report, null, 'sent', true); toast('학부모에게 발행했어요 ✅'); pub.textContent='발행 완료'; setTimeout(function(){ ov.remove(); var r=document.querySelector('.pnta'); if(r)ArchePentaApp.mount(r.parentNode); },800);
        }catch(e){ toast('발행 실패: '+(e.message||e)); pub.disabled=false; pub.textContent='학부모에게 발행'; }
      });

      var ed=ctl.querySelector('#rv-edit');
      if(ed) ed.addEventListener('click',function(){ openEdit(); });
    }

    function openEdit(){
      var isTrack=(a.stage==='track');
      var per = isTrack ? (report.signature||{}) : (report.persona||{});
      var g=report.golden||{};
      var bk=report.book||{};
      var form=el('<div class="edit"><h4>간편 수정</h4>'
        +'<div class="fl">'+(isTrack?'시그니처 이름':'페르소나 이름')+'</div><input id="e-pn" value="'+esc(per.name||'')+'">'
        +'<div class="fl">'+(isTrack?'시그니처 설명':'페르소나 한 줄')+'</div><textarea id="e-pt" rows="2">'+esc(per.tagline||per.desc||'')+'</textarea>'
        +'<div class="fl">황금 문장</div><textarea id="e-gs" rows="2">'+esc(g.sentence||'')+'</textarea>'
        +'<div class="fl">선생님 비평</div><textarea id="e-gc" rows="2">'+esc(g.critique||'')+'</textarea>'
        +'<label class="ck"><input type="checkbox" id="e-nobook" '+((!bk||!bk.title)?'checked':'')+'> 추천 도서 숨기기(적절한 실제 책이 없을 때)</label>'
        +'<div class="row"><button class="act pri" id="e-save">수정 적용</button><button class="act mut" id="e-cancel">취소</button></div></div>');
      wrap.insertBefore(form, wrap.children[1]);
      form.querySelector('#e-cancel').addEventListener('click',function(){ form.remove(); });
      form.querySelector('#e-save').addEventListener('click', async function(){
        if(isTrack){ report.signature=report.signature||{}; report.signature.name=form.querySelector('#e-pn').value; report.signature.desc=form.querySelector('#e-pt').value; }
        else { report.persona=report.persona||{}; report.persona.name=form.querySelector('#e-pn').value; report.persona.tagline=form.querySelector('#e-pt').value; }
        report.golden=report.golden||{}; report.golden.sentence=form.querySelector('#e-gs').value; report.golden.critique=form.querySelector('#e-gc').value;
        if(form.querySelector('#e-nobook').checked) report.book=null;
        try{ await saveReport(sub.id, report, (per.name||null), 'reviewed', true); toast('수정을 저장했어요'); paint(); }catch(e){ toast('저장 실패: '+(e.message||e)); }
      });
    }
    paint();
  }

  // ── 학부모 뷰(발행된 리포트 열람) ────────────────────────────────────────
  async function renderParent(root, opts){
    opts=opts||{}; var course=opts.course||null; var spec=courseSpec(course);
    var studentId=(window._activeStudent&&window._activeStudent.id)||null;
    root.innerHTML='<div class="ph"><div><h2>'+esc(spec.title)+' · 성장 리포트</h2><div class="sub">선생님이 발행한 우리 아이의 리포트를 확인하세요.</div></div></div><div id="pn-list"><div class="empty">불러오는 중…</div></div>';
    var list=root.querySelector('#pn-list');
    if(!studentId){ list.innerHTML='<div class="warn">자녀 정보를 불러오지 못했어요.</div>'; return; }
    // 학부모는 학원 소속이 아니므로 RPC 대신 RLS 직접 조회(발행된 리포트만)
    var subs;
    try{ var r=await window.sb.from('penta_submissions').select('id,stage,level,season,week,theme,title,report,status,sent_at').eq('student_id',studentId).eq('status','sent'); if(r.error)throw r.error; subs=r.data||[]; }
    catch(e){ list.innerHTML='<div class="warn">목록을 불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
    var sent=subs.filter(function(s){ if(!s.report)return false; if(spec&&spec.stage){ return s.stage===spec.stage && ((s.level||'')===(spec.level||'')); } return true; });
    if(!sent.length){ list.innerHTML='<div class="empty">아직 발행된 '+esc(spec.title)+' 리포트가 없어요.<br>수업 후 선생님이 리포트를 발행하면 여기에서 볼 수 있어요.</div>'; return; }
    var g=document.createElement('div'); g.className='grid';
    sent.sort(function(a,b){return (b.sent_at||'').localeCompare(a.sent_at||'');});
    sent.forEach(function(s){
      var c=document.createElement('div'); c.className='c';
      c.innerHTML='<div class="stg">펜타 '+(s.stage==='track'?'트랙':'비전')+'</div><div class="ti">'+esc(s.title)+'</div><div class="th">'+esc(s.theme||'')+' · 시즌'+esc(s.season)+' '+esc(s.week)+'주차</div>'+badge('sent');
      var row=document.createElement('div'); row.className='row';
      var rv=el('<button class="act dn">리포트 보기</button>'); rv.addEventListener('click',function(){ openReportData(s.report); });
      row.appendChild(rv); c.appendChild(row); g.appendChild(c);
    });
    list.innerHTML=''; list.appendChild(g);
  }
  // report 객체를 바로 렌더(학부모용 — id 재조회 불필요)
  function openReportData(report){
    if(!window.ArchePentaReport || !report){ toast('리포트를 열 수 없어요'); return; }
    var ov=el('<div class="pnta-ov"><div class="pnta-ovc"><div class="pnta-ovx"><button>✕ 닫기</button></div><div class="rpmount"></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.pnta-ovx button').addEventListener('click',function(){ ov.remove(); });
    ArchePentaReport.render(ov.querySelector('.rpmount'), report);
  }

  // ── 진입점 ──────────────────────────────────────────────────────────────
  function detectRole(){
    if(window._role==='stu') return 'student';
    if(window._isParentApp || window.__PENTA_ROLE==='parent') return 'parent';
    return 'staff';
  }
  function mount(container, opts){
    inject();
    container = container || document.getElementById('penta-mount');
    if(!container) return;
    var root=container.querySelector('.pnta'); if(!root){ root=el('<div class="pnta"></div>'); container.innerHTML=''; container.appendChild(root); }
    if(!window.sb){ root.innerHTML='<div class="warn">로그인 후 이용할 수 있어요. (Supabase 미연결)</div>'; return; }
    mountRole(root, detectRole(), opts||{});
  }
  function mountRole(root, role, opts){
    inject(); opts=opts||{};
    if(root && !root.classList.contains('pnta')){ var inner=root.querySelector('.pnta'); if(!inner){ inner=el('<div class="pnta"></div>'); root.innerHTML=''; root.appendChild(inner);} root=inner; }
    if(role==='student') return renderStudent(root, opts);
    if(role==='parent') return renderParent(root, opts);
    return renderStaff(root, opts);
  }

  window.ArchePentaApp = { mount: mount, mountRole: mountRole, version:'1.1', _callPenta: callPenta };
})();
