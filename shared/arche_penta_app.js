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
    + ".pnta .ov{position:fixed;inset:0;background:rgba(8,11,46,.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}"
    + ".pnta .ovc{background:#eef1f8;border-radius:18px;max-width:900px;width:100%;padding:16px;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.35)}"
    + ".pnta .ovx{position:sticky;top:0;display:flex;justify-content:flex-end;z-index:2}"
    + ".pnta .ovx button{font:inherit;font-weight:800;font-size:13px;padding:8px 14px;border-radius:10px;border:0;background:#1A237E;color:#fff;cursor:pointer}"
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
  async function renderStudent(root){
    var studentId = (window._activeStudent&&window._activeStudent.id) || null;
    var name = (window._activeStudent&&(window._activeStudent.name||window._activeStudent.student_name)) || '';
    root.innerHTML = '<div class="ph"><div><h2>펜타 시리즈</h2><div class="sub">선생님이 배정한 회차를 열어 워크북을 작성하고 [제출]하면 돼요.</div></div></div><div id="pn-list"><div class="empty">불러오는 중…</div></div>';
    var list=root.querySelector('#pn-list');
    if(!studentId){ list.innerHTML='<div class="warn">학생 정보를 불러오지 못했어요. 다시 로그인해 주세요.</div>'; return; }
    var rows;
    try{ rows=await listAssignments(studentId); }catch(e){ list.innerHTML='<div class="warn">목록을 불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
    if(!rows.length){ list.innerHTML='<div class="empty">아직 배정된 회차가 없어요.<br>선생님이 회차를 배정하면 여기에 나타나요 😊</div>'; return; }
    var g=document.createElement('div'); g.className='grid';
    rows.forEach(function(a){
      var c=document.createElement('div'); c.className='c';
      var done=(a.status==='sent');
      c.innerHTML='<div class="stg">펜타 '+(a.stage==='track'?'트랙':'비전')+(a.level?(' · '+(a.level==='starter'?'스타터':'아키텍처')):'')+'</div>'
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
    var ov=el('<div class="ov"><div class="ovc"><div class="ovx"><button>✕ 닫기</button></div><div class="wbmount"></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.ovx button').addEventListener('click',function(){ ov.remove(); });
    ArchePentaWorkbook.render(ov.querySelector('.wbmount'), {
      lesson: a.content, academyId: acadId(), studentId: studentId,
      mode:'live', readOnly: !!readOnly, prefill: pre,
      onSubmit: function(){ toast('제출 완료! 🎉'); setTimeout(function(){ ov.remove(); var r=document.querySelector('.pnta'); if(r)ArchePentaApp.mount(r.parentNode); },900); }
    });
  }

  async function viewReport(submissionId){
    if(!window.ArchePentaReport){ toast('리포트 모듈(arche_penta_report.js) 미로드'); return; }
    var sub; try{ sub=await getSubmission(submissionId); }catch(e){ toast('리포트를 불러오지 못했어요'); return; }
    if(!sub||!sub.report){ toast('아직 발행된 리포트가 없어요'); return; }
    var ov=el('<div class="ov"><div class="ovc"><div class="ovx"><button>✕ 닫기</button></div><div class="rpmount"></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.ovx button').addEventListener('click',function(){ ov.remove(); });
    ArchePentaReport.render(ov.querySelector('.rpmount'), sub.report);
  }

  // ── 컨설턴트/원장 뷰 ─────────────────────────────────────────────────────
  async function renderStaff(root){
    root.innerHTML='<div class="ph"><div><h2>펜타 시리즈 · 컨설턴트</h2><div class="sub">학생을 선택해 회차를 배정하고, 제출물로 리포트를 생성·검토·발행하세요.</div></div>'
      +'<div class="pick"><span>학생</span><select id="pn-stu"></select></div></div>'
      +'<div class="tabs"><button data-t="assign" class="on">회차 배정</button><button data-t="review">제출·리포트</button></div>'
      +'<div id="pn-body"><div class="empty">학생을 선택하세요.</div></div>';
    // 학생 셀렉트
    var sel=root.querySelector('#pn-stu');
    var students=(window._students||[]).slice();
    var active=window._activeStudent;
    if(!students.length && active) students=[active];
    if(!students.length){ sel.innerHTML='<option value="">학생 없음</option>'; }
    else {
      sel.innerHTML=students.map(function(s){ var id=s.id||s.student_id; var nm=s.name||s.student_name||id; return '<option value="'+esc(id)+'"'+((active&&(active.id||active.student_id)===id)?' selected':'')+'>'+esc(nm)+'</option>'; }).join('');
    }
    function curStu(){ var id=sel.value; var s=students.filter(function(x){return (x.id||x.student_id)===id;})[0]||active||{}; return {id:id, name:(s.name||s.student_name||id)}; }
    var tab='assign';
    root.querySelectorAll('.tabs button').forEach(function(b){ b.addEventListener('click',function(){ root.querySelectorAll('.tabs button').forEach(function(x){x.classList.remove('on');}); b.classList.add('on'); tab=b.dataset.t; draw(); }); });
    sel.addEventListener('change', draw);
    async function draw(){
      var body=root.querySelector('#pn-body'); var stu=curStu();
      if(!stu.id){ body.innerHTML='<div class="empty">학생을 선택하세요.</div>'; return; }
      body.innerHTML='<div class="empty">불러오는 중…</div>';
      if(tab==='assign') return drawAssign(body, stu);
      return drawReview(body, stu);
    }
    draw();
  }

  async function drawAssign(body, stu){
    var cat, asg;
    try{ cat=await listCatalog(); asg=await listAssignments(stu.id); }catch(e){ body.innerHTML='<div class="warn">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    var asgIds={}; asg.forEach(function(a){ asgIds[a.catalog_id]=a; });
    body.innerHTML='<div class="sub" style="margin-bottom:10px;color:#6b7688;font-size:12.5px">미리 제작된 회차입니다. <b>'+esc(stu.name)+'</b> 학생에게 배정할 회차를 선택하세요.</div>';
    cat.forEach(function(c){
      var on=!!asgIds[c.id];
      var box=el('<div class="cat"><div class="cc"><div class="ti">'+esc(c.title)+' <span class="chip">'+(c.stage==='track'?'트랙':'비전')+(c.level?('·'+(c.level==='starter'?'스타터':'아키텍처')):'')+'</span></div><div class="th">'+esc(c.theme||'')+' · '+esc(c.grade_band||'')+' · 시즌'+esc(c.season)+' '+esc(c.week)+'주차</div></div></div>');
      var btn=el('<button class="act '+(on?'mut':'pri')+'">'+(on?'배정 취소':'배정하기')+'</button>');
      btn.addEventListener('click', async function(){
        btn.disabled=true;
        try{
          if(on){ await unassign(asgIds[c.id].assignment_id); toast('배정을 취소했어요'); }
          else { await assign(stu.id, c.id, null); toast('배정했어요 · 학생 화면에 나타납니다'); }
          drawAssign(body, stu);
        }catch(e){ toast('실패: '+(e.message||e)); btn.disabled=false; }
      });
      box.appendChild(btn); body.appendChild(box);
    });
  }

  async function drawReview(body, stu){
    var asg;
    try{ asg=await listAssignments(stu.id); }catch(e){ body.innerHTML='<div class="warn">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    if(!asg.length){ body.innerHTML='<div class="empty">배정된 회차가 없습니다. 먼저 [회차 배정] 탭에서 배정하세요.</div>'; return; }
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
    var ov=el('<div class="ov"><div class="ovc"><div class="ovx"><button>✕ 닫기</button></div><div id="pn-rv"><div class="empty">제출물 불러오는 중…</div></div></div></div>');
    document.body.appendChild(ov);
    ov.querySelector('.ovx button').addEventListener('click',function(){ ov.remove(); });
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
  async function renderParent(root){
    var studentId=(window._activeStudent&&window._activeStudent.id)||null;
    root.innerHTML='<div class="ph"><div><h2>펜타 시리즈 · 성장 리포트</h2><div class="sub">선생님이 발행한 우리 아이의 리포트를 확인하세요.</div></div></div><div id="pn-list"><div class="empty">불러오는 중…</div></div>';
    var list=root.querySelector('#pn-list');
    var rows;
    try{ rows=await listAssignments(studentId); }catch(e){ list.innerHTML='<div class="warn">목록을 불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
    var sent=rows.filter(function(a){return a.status==='sent'&&a.has_report;});
    if(!sent.length){ list.innerHTML='<div class="empty">아직 발행된 리포트가 없어요.<br>수업 후 선생님이 리포트를 발행하면 여기에서 볼 수 있어요.</div>'; return; }
    var g=document.createElement('div'); g.className='grid';
    sent.forEach(function(a){
      var c=document.createElement('div'); c.className='c';
      c.innerHTML='<div class="stg">펜타 '+(a.stage==='track'?'트랙':'비전')+'</div><div class="ti">'+esc(a.title)+'</div><div class="th">'+esc(a.theme||'')+' · 시즌'+esc(a.season)+' '+esc(a.week)+'주차</div>'+badge('sent');
      var row=document.createElement('div'); row.className='row';
      var rv=el('<button class="act dn">리포트 보기</button>'); rv.addEventListener('click',function(){ viewReport(a.submission_id); });
      row.appendChild(rv); c.appendChild(row); g.appendChild(c);
    });
    list.innerHTML=''; list.appendChild(g);
  }

  // ── 진입점 ──────────────────────────────────────────────────────────────
  function detectRole(){
    if(window._role==='stu') return 'student';
    if(window._isParentApp || window.__PENTA_ROLE==='parent') return 'parent';
    return 'staff';
  }
  function mount(container){
    inject();
    container = container || document.getElementById('penta-mount');
    if(!container) return;
    var root=container.querySelector('.pnta'); if(!root){ root=el('<div class="pnta"></div>'); container.innerHTML=''; container.appendChild(root); }
    if(!window.sb){ root.innerHTML='<div class="warn">로그인 후 이용할 수 있어요. (Supabase 미연결)</div>'; return; }
    mountRole(root, detectRole());
  }
  function mountRole(root, role){
    inject();
    if(root && !root.classList.contains('pnta')){ var inner=root.querySelector('.pnta'); if(!inner){ inner=el('<div class="pnta"></div>'); root.innerHTML=''; root.appendChild(inner);} root=inner; }
    if(role==='student') return renderStudent(root);
    if(role==='parent') return renderParent(root);
    return renderStaff(root);
  }

  window.ArchePentaApp = { mount: mount, mountRole: mountRole, version:'1.0', _callPenta: callPenta };
})();
