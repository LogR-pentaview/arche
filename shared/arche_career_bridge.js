/* ============================================================================
 * arche_career_bridge.js · 진로 징검다리 (리치 스택 · perf 엔진 이식) v4
 *   루프: 자녀 인터뷰 → 학부모(컨설턴트) AI 설계도 검토·수정·전달
 *         → 자녀 사전인터뷰 → 타이핑 입력전용창 작성 → 사후인터뷰 → 제출
 *         → 학부모 AI 평가 리포트 + 타이핑DNA 진정성 → 회신 → 자녀 수신
 *   법 준수: 학생부 미취득. 인터뷰·답변은 학생 자기서술. AI는 설계(질문)·평가만(대필 금지).
 *   저장(스키마 무변경): career_profile / career_report
 *     questions = AI 설계도 · answers = {text,html,typing_meta,pre} · coach_feedback = AI평가+DNA요약
 *     진정성 = writing_integrity(sourceType 'design')
 *   난이도: 학생 학년으로 고등(대입)/중등(고입) 프롬프트 차등.
 *   호환: 학원용(B2B) 컨설턴트 경로 유지(role 'staff'). ArchePentaWorkbook 의존 제거.
 * API : ArcheCareerBridge.mount(container[, role])
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL='https://dvxepjctjazobrkjrkdw.supabase.co';
  function acadId(){ return window._acadId || (window._academy&&window._academy.id) || null; }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function el(h){var t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild;}
  function gradeLevel(g){ g=String(g||''); if(g.indexOf('고')>=0)return 'dae'; if(g.indexOf('중')>=0)return 'goip'; return 'goip'; }

  // 진로 프로필 인터뷰(자기서술 · 단순 폼)
  var PROFILE_QS=[
    {id:'q_interest', q:'요즘 가장 관심 있는 것과, 그 관심이 생긴 계기는?'},
    {id:'q_flow', q:'시간 가는 줄 모르고 몰입했던 경험은?'},
    {id:'q_strength', q:'남보다 잘한다고 느끼거나 칭찬받은 것은?'},
    {id:'q_problem', q:'세상에서 궁금하거나 바꾸고 싶은 문제가 있다면?'},
    {id:'field', q:'가장 끌리는 "분야"를 스스로 정한다면? (예: 환경·데이터·심리·공학·예술)'},
    {id:'topic_want', q:'더 파고들고 싶은 주제/질문이 있다면? (없으면 비워도 돼요)'}
  ];
  var QP={q_interest:'관심사·계기',q_flow:'몰입 경험',q_strength:'강점',q_problem:'관심 문제',field:'관심 분야',topic_want:'하고 싶은 주제'};

  // ── 데이터 ────────────────────────────────────────────────────────────
  async function token(){ try{var s=await window.sb.auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function callPenta(task,payload){ var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/penta-ai'; var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(await token())},body:JSON.stringify({task:task,payload:payload})}); var d=await r.json(); if(!r.ok)throw new Error(d.error||'AI 오류'); return d; }
  async function callCoach(payload){ var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/career-coach'; var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(await token())},body:JSON.stringify(payload||{})}); var d=await r.json(); if(!r.ok)throw new Error(d.error||'AI 평가 오류'); return d; }
  async function getProfile(sid){ var r=await window.sb.from('career_profile').select('*').eq('student_id',sid).limit(1); return (r.data&&r.data[0])||null; }
  async function listProfiles(){ var r=await window.sb.from('career_profile').select('*').eq('academy_id',acadId()).order('updated_at',{ascending:false}); return (r&&r.data)||[]; }
  async function listReports(sid){ var r=await window.sb.from('career_report').select('*').eq('student_id',sid).order('created_at',{ascending:false}); return (r&&r.data)||[]; }
  async function listAllReports(){ var r=await window.sb.from('career_report').select('*').eq('academy_id',acadId()).order('updated_at',{ascending:false}); return (r&&r.data)||[]; }
  async function saveProfile(sid, field, answers){ return window.sb.rpc('save_career_profile',{p_academy:acadId(),p_student:sid,p_field:field||null,p_answers:answers}); }
  async function assignWorksheet(sid, title, questions, topic, field){ return window.sb.rpc('assign_career_worksheet',{p_academy:acadId(),p_student:sid,p_title:title||null,p_questions:questions,p_topic:topic||null,p_field:field||null}); }
  async function submitAnswers(sid, reportId, topic, field, answers){ return window.sb.rpc('save_career_report',{p_academy:acadId(),p_student:sid,p_report_id:reportId,p_topic:topic||null,p_field:field||null,p_answers:answers}); }
  async function saveCoaching(id, feedback, status){ return window.sb.rpc('save_career_coaching',{p_id:id,p_feedback:feedback,p_status:status||null}); }
  async function getIntegrity(sid, rid){ try{ var r=await window.sb.from('writing_integrity').select('*').eq('student_id',String(sid)).eq('source_type','design').eq('source_id',String(rid)).order('created_at',{ascending:false}).limit(1); return (r.data&&r.data[0])||null; }catch(e){ return null; } }

  var CSS=""
    +".acb{max-width:920px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#243244}"
    +".acb h2{font-size:19px;font-weight:900;color:#1A237E;margin:0 0 4px}.acb .sub{font-size:12.5px;color:#6b7688;margin-bottom:14px}"
    +".acb .card{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:15px 16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,23,51,.04)}"
    +".acb .pf{background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff}.acb .pf .t{font-size:11px;font-weight:800;letter-spacing:1px;color:#E8D9A0}.acb .pf .f{font-size:16px;font-weight:900;margin:4px 0}"
    +".acb .nm{font-size:15px;font-weight:900;color:#1A237E}.acb .tp{font-size:12.5px;color:#6b7688;margin-top:2px}"
    +".acb .sect{font-size:13px;font-weight:900;color:#1A237E;margin:14px 0 8px}"
    +".acb .badge{font-size:10.5px;font-weight:800;border-radius:99px;padding:3px 9px;margin-left:6px}"
    +".acb .b-assigned{background:#eef1ff;color:#1A237E}.acb .b-submitted{background:#fff4e0;color:#b8860b}.acb .b-sent{background:#e9f9ef;color:#137a44}.acb .b-coached{background:#e7f0ff;color:#2b64c4}"
    +".acb .row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}"
    +".acb button.act{font:inherit;font-weight:800;font-size:12.5px;padding:9px 14px;border-radius:10px;border:0;cursor:pointer}"
    +".acb .pri{background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff}.acb .gh{background:#eef1ff;color:#1A237E}.acb .dn{background:linear-gradient(135deg,#0f9d8f,#12b76a);color:#fff}.acb .gd{background:#D4AF37;color:#1A237E}.acb .mut{background:#f0f2f6;color:#6b7688}"
    +".acb .empty{text-align:center;color:#8b95a1;font-size:13.5px;padding:26px;background:#f7f9fd;border-radius:14px}"
    +".acb .qa{border-top:1px solid #eef1f4;padding:8px 0}.acb .qa .q{font-size:12.5px;font-weight:800;color:#1A237E}.acb .qa .a{font-size:13px;color:#39465a;line-height:1.7;white-space:pre-wrap;margin-top:2px}"
    +".acb textarea,.acb input{width:100%;border:1.5px solid #dfe3ec;border-radius:9px;padding:9px 11px;font:inherit;font-size:13px;box-sizing:border-box}"
    +".acb .qedit{border:1px solid #e6e9f0;border-radius:10px;padding:10px;margin-bottom:8px;background:#fbfcfe}"
    +".acb .ed{min-height:220px;background:#fbfcfe;border:1.5px solid #dfe3ec;border-radius:10px;padding:12px 13px;font-size:13.5px;line-height:1.85;outline:none;white-space:pre-wrap;word-break:keep-all}"
    +".acb .ed:empty:before{content:attr(data-ph);color:#aeb8c4}"
    +".acb .guide{border:1px solid #c9d6f5;background:#f3f6ff;border-radius:11px;padding:12px 14px;margin-bottom:10px}.acb .guide .gq{font-size:12.5px;color:#243244;line-height:1.6;padding:5px 0;border-top:1px dashed #d6e0f7}.acb .guide .gq:first-of-type{border-top:0}.acb .guide .gq b{color:#1A237E}.acb .guide .gh{font-size:11px;color:#6b7688;margin-top:2px}"
    +".acb .rep{border:1px solid #cfe0ff;background:#f5f9ff;border-radius:12px;padding:13px 15px;margin-bottom:10px}.acb .rep h4{margin:0 0 6px;font-size:13px;color:#1A237E}.acb .rep .lb{font-size:11px;font-weight:800;color:#2b64c4;margin:8px 0 3px}.acb .rep p{font-size:12.5px;color:#39465a;line-height:1.7;margin:0}.acb .rep ul{margin:3px 0 0 17px;padding:0;font-size:12.5px;color:#39465a;line-height:1.7}"
    +".acb-ov{position:fixed;inset:0;background:rgba(8,11,46,.55);z-index:2147483000;overflow:auto;padding:22px 12px;font-family:'Noto Sans KR',sans-serif}"
    +".acb-ovc{max-width:820px;margin:0 auto;background:#eef1f8;border-radius:16px;padding:14px}"
    +".acb-ovx{display:flex;justify-content:flex-end;position:sticky;top:0;z-index:1}.acb-ovx button{border:0;background:#1A237E;color:#fff;border-radius:9px;padding:7px 13px;font-weight:800;cursor:pointer}"
    +".acb .note{font-size:11.5px;color:#8b95a1;margin-top:6px}"
    +".acb .coach{background:#eef4ff;border:1px solid #cfe0ff;border-radius:12px;padding:12px 14px;margin-bottom:12px}.acb .coach .h{font-weight:900;color:#1A237E;font-size:13px;margin-bottom:5px}"
    +".acb .spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:acbsp .7s linear infinite;vertical-align:-2px;margin-right:6px}@keyframes acbsp{to{transform:rotate(360deg)}}";
  function injectCss(){ if(!document.getElementById('acb-css')){var s=document.createElement('style');s.id='acb-css';s.textContent=CSS;document.head.appendChild(s);} }

  function mount(container, role){
    injectCss();
    container = container || document.getElementById('career-mount');
    if(!container) return;
    if(!window.sb){ container.innerHTML='<div class="acb"><div class="empty">로그인 후 이용할 수 있어요.</div></div>'; return; }
    role = role || ((window._role==='stu')?'student':'staff');
    if(role==='student') return renderStudent(container);
    return renderStaff(container);
  }
  function ovOpen(){ var ov=el('<div class="acb-ov"><div class="acb-ovc"><div class="acb-ovx"><button>✕ 닫기</button></div><div class="bd"></div></div></div>'); document.body.appendChild(ov); ov.querySelector('.acb-ovx button').addEventListener('click',function(){ov.remove();}); return ov; }
  function remount(container, role){ var m=container||document.getElementById('career-mount'); if(m)mount(m,role); }

  // AI 설계도(questions) 렌더 — 학생 작성 가이드
  function guideHtml(rep){ var qs=rep.questions||[]; var h='<div class="guide"><div style="font-size:12px;font-weight:800;color:#1A237E;margin-bottom:4px">🧭 나의 탐구 설계도'+(rep.topic?' · '+esc(rep.topic):'')+'</div>'; qs.forEach(function(q,i){ h+='<div class="gq"><b>'+(i+1)+'. '+esc(q.q||'')+'</b>'+(q.hint?'<div class="gh">💡 '+esc(q.hint)+'</div>':'')+'</div>'; }); return h+'</div>'; }
  function reportHtml(fb){ var r=(fb&&fb.report)||fb||{}; var h='<div class="rep"><h4>📊 진로 탐구 평가 리포트</h4>';
    if(r.note)h+='<p>'+esc(r.note)+'</p>';
    if(r.strengths&&r.strengths.length){ h+='<div class="lb">강점</div><ul>'+r.strengths.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>'; }
    if(r.depth){ h+='<div class="lb">탐구의 깊이</div><p>'+esc(r.depth)+'</p>'; }
    if(r.questions&&r.questions.length){ h+='<div class="lb">더 생각해볼 질문</div><ul>'+r.questions.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>'; }
    if(r.next&&r.next.length){ h+='<div class="lb">다음 탐구 방향</div><ul>'+r.next.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>'; }
    return h+'</div>'; }
  function wsQaHtml(rep){ var qs=rep.questions||[]; var ans=(rep.answers&&(rep.answers.text!=null||rep.answers.html!=null))?null:(rep.answers||{}); var text=(rep.answers&&rep.answers.text)||''; var h='';
    if(text){ h+='<div class="qa"><div class="q">✍️ 학생 탐구보고서</div><div class="a">'+esc(text)+'</div></div>'; }
    else { qs.forEach(function(q,i){ var v=ans?ans['a'+i]:''; h+='<div class="qa"><div class="q">'+(i+1)+'. '+esc(q.q||'')+'</div><div class="a">'+(v&&String(v).length?esc(v):'<span style="color:#c0313d">미작성</span>')+'</div></div>'; }); }
    return h||'<div class="note">내용이 없습니다.</div>'; }

  // ── 학생 ──────────────────────────────────────────────────────────────
  async function renderStudent(container){
    var stu=window._activeStudent||{}; var sid=stu.id||null;
    if(!sid){ container.innerHTML='<div class="acb"><div class="empty">학생 정보를 불러오지 못했어요.</div></div>'; return; }
    var root=el('<div class="acb"><h2>진로 징검다리</h2><div class="sub">인터뷰를 하면 맞춤 탐구 설계도가 도착해요. 사전 생각 → 직접 작성 → 사후 회고 순으로 진행합니다.</div><div id="cb-body"><div class="empty">불러오는 중…</div></div></div>');
    container.innerHTML=''; container.appendChild(root);
    var body=root.querySelector('#cb-body'); var profile, reports;
    try{ profile=await getProfile(sid); reports=await listReports(sid); }catch(e){ body.innerHTML='<div class="empty">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    body.innerHTML='';
    if(profile){
      var pc=el('<div class="card pf"><div class="t">MY 진로 프로필</div><div class="f">관심 분야 · '+esc(profile.field||'—')+'</div><div class="row"><button class="act gh" style="background:rgba(255,255,255,.15);color:#fff">프로필(인터뷰) 수정</button></div></div>');
      pc.querySelector('button').addEventListener('click',function(){ openProfile(container, sid, profile); }); body.appendChild(pc);
    } else {
      var pc0=el('<div class="card"><div class="nm">먼저 진로 인터뷰를 해요 (1회)</div><div class="tp">인터뷰를 제출하면 학부모(선생님)가 맞춤 탐구 설계도를 보내줍니다.</div><div class="row"><button class="act pri">진로 인터뷰 시작</button></div></div>');
      pc0.querySelector('button').addEventListener('click',function(){ openProfile(container, sid, null); }); body.appendChild(pc0);
      body.appendChild(el('<div class="empty">인터뷰를 먼저 완료해 주세요.</div>')); return;
    }
    body.appendChild(el('<div class="sect">받은 탐구 워크북</div>'));
    if(!reports.length){ body.appendChild(el('<div class="empty">아직 도착한 워크북이 없어요.<br>인터뷰를 제출했다면 곧 설계도가 도착합니다 😊</div>')); return; }
    reports.forEach(function(r){
      var st=r.status; var c=el('<div class="card"></div>');
      c.innerHTML='<div class="nm">'+esc(r.title||r.topic||'맞춤 탐구 워크북')+'<span class="badge b-'+esc(st)+'">'+(st==='assigned'?'작성 대기':st==='sent'?'평가 도착':st==='coached'?'코칭 도착':'제출됨')+'</span></div>'+(r.topic?'<div class="tp">'+esc(r.topic)+'</div>':'');
      var row=el('<div class="row"></div>');
      var btn=el('<button class="act '+(st==='assigned'?'pri':'gh')+'">'+(st==='assigned'?'✍️ 작성하기':(st==='sent'||st==='coached'?'📊 평가·코칭 보기':'열람'))+'</button>');
      btn.addEventListener('click',function(){ if(st==='assigned')openWorksheet(container, sid, r); else openStudentReport(sid, r); }); row.appendChild(btn); c.appendChild(row); body.appendChild(c);
    });
  }
  function openProfile(container, sid, prev){
    var ov=ovOpen(); var a=(prev&&prev.answers)||{};
    var box=el('<div class="acb"><div class="card"><h2 style="margin:0 0 3px">나를 알아가는 인터뷰</h2><div class="note" style="margin-bottom:8px">처음 한 번만 — 이 인터뷰를 보고 맞춤 탐구 설계도를 보내줘요. (⚠️ 생기부 붙여넣기 말고 내 생각을 내 말로!)</div></div></div>');
    var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    PROFILE_QS.forEach(function(q){ card.appendChild(el('<div style="margin-top:10px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">'+esc(q.q)+'</div><textarea data-id="'+q.id+'" rows="'+(q.id==='field'?1:3)+'">'+esc(a[q.id]||'')+'</textarea></div>')); });
    var msg=el('<div class="note" id="pmsg"></div>'); card.appendChild(msg);
    var btn=el('<div class="row"><button class="act pri">인터뷰 제출</button></div>'); card.appendChild(btn);
    btn.querySelector('button').addEventListener('click', async function(){
      var ans={}; card.querySelectorAll('textarea[data-id]').forEach(function(t){ ans[t.getAttribute('data-id')]=t.value.trim(); });
      if(!ans.q_interest&&!ans.field){ msg.style.color='#c0313d'; msg.textContent='관심사나 관심 분야는 적어 주세요.'; return; }
      this.disabled=true; msg.style.color='#6b7688'; msg.textContent='제출 중…';
      try{ var res=await saveProfile(sid, ans.field||null, ans); if(res&&res.error)throw res.error;
        msg.style.color='#137a44'; msg.textContent='제출 완료! 맞춤 설계도를 기다려 주세요.';
        setTimeout(function(){ ov.remove(); remount(container,'student'); },800);
      }catch(e){ this.disabled=false; msg.style.color='#c0313d'; msg.textContent='제출 실패: '+(e.message||e); }
    });
  }
  // 리치 워크북: 설계도 + 사전인터뷰 + 타이핑 입력창 + 사후인터뷰 + 제출
  function openWorksheet(container, sid, rep){
    var ov=ovOpen(); var stu=window._activeStudent||{};
    var box=el('<div class="acb"><div class="card"><h2 style="margin:0 0 3px">'+esc(rep.title||'맞춤 탐구 워크북')+'</h2><div class="note" style="margin-bottom:6px">설계도의 질문을 참고해, 아래 칸에 <b>내 생각을 직접</b> 써보자. 작성 과정(입력 패턴)이 함께 기록돼 <b>본인 작성 검증</b>에 쓰여요.</div></div></div>');
    var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    card.insertAdjacentHTML('beforeend', guideHtml(rep));
    card.insertAdjacentHTML('beforeend', '<div id="cb-pre" style="margin:10px 0"></div>');
    card.insertAdjacentHTML('beforeend', '<div style="font-size:12px;font-weight:800;color:#1A237E;margin:6px 0 4px">✍️ 탐구보고서 작성</div>');
    var ed=el('<div class="ed" contenteditable="true" data-ph="설계도 질문에 답하며, 내가 조사·생각한 내용을 자유롭게 써보세요"></div>'); card.appendChild(ed);
    var msg=el('<div class="note" id="wmsg"></div>'); card.appendChild(msg);
    var row=el('<div class="row"><button class="act pri" id="wsub">📤 저장 후 제출</button></div>'); card.appendChild(row);
    // 타이핑 캡처
    try{ if(window.ArcheIntegrity) ArcheIntegrity.attach(ed); }catch(e){}
    // 사전 인터뷰
    try{ if(window.ArcheReflection && window.ArcheReflection.renderPre){ window.ArcheReflection.renderPre(card.querySelector('#cb-pre'), {academyId:acadId(), studentId:sid, sourceType:'design', sourceId:rep.id, prefill:null}); } }catch(e){}
    setTimeout(function(){ try{ed.focus();}catch(_){} }, 80);
    row.querySelector('#wsub').addEventListener('click', async function(){
      var t=(ed.innerText||ed.textContent||'').trim(); var html=ed.innerHTML;
      if(t.length<10){ msg.style.color='#c0313d'; msg.textContent='조금 더 작성한 뒤 제출해 주세요.'; return; }
      if(!confirm('제출할까요? 제출하면 학부모(선생님)가 평가·코칭을 드려요.'))return;
      this.disabled=true; msg.style.color='#6b7688'; msg.textContent='제출 중…';
      var tm=null, vSummary=null;
      try{ if(window.ArcheIntegrity){ var wi=await ArcheIntegrity.assessAndSave({ el:ed, studentId:sid, academyId:acadId(), sourceType:'design', sourceId:rep.id, finalText:t, save:true });
        tm=wi&&wi.tm||null; if(wi&&wi.verdict&&wi.verdict.tier){ var tr=wi.verdict.tier; vSummary={tier:tr, composite:(wi.verdict.composite!=null?Math.round(wi.verdict.composite):null)}; } } }catch(e){}
      try{ var answers={ text:t, html:html, typing_meta:tm, submitted_at:new Date().toISOString() };
        var res=await submitAnswers(sid, rep.id, rep.topic||rep.title, rep.field, answers); if(res&&res.error)throw res.error;
        msg.style.color='#137a44'; msg.textContent='제출 완료! 🎉';
        // 사후 회고
        try{ if(window.archeReflectOverlay){ archeReflectOverlay({ academyId:acadId(), studentId:sid, sourceType:'design', sourceId:rep.id, kind:'design', title:rep.title||'', reportText:t, banner:{title:'탐구보고서 제출 완료', sub:t.length+'자 · 직접 작성 확인됨'} }); } }catch(_e){}
        setTimeout(function(){ ov.remove(); remount(container,'student'); }, 900);
      }catch(e){ this.disabled=false; msg.style.color='#c0313d'; msg.textContent='제출 실패: '+(e.message||e); }
    });
  }
  function openStudentReport(sid, rep){
    var ov=ovOpen(); var box=el('<div class="acb"><div class="card"><h2 style="margin:0 0 6px">'+esc(rep.title||'탐구 결과')+'</h2></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    if(rep.coach_feedback) card.insertAdjacentHTML('beforeend', reportHtml(rep.coach_feedback));
    card.insertAdjacentHTML('beforeend', wsQaHtml(rep));
  }

  // ── 학부모(컨설턴트) ──────────────────────────────────────────────────
  async function renderStaff(container){
    var root=el('<div class="acb"><h2>진로 징검다리 · 자녀 관리</h2><div class="sub">자녀 인터뷰를 보고 <b>AI 설계도 → 검토·수정 → 전달</b>. 제출물엔 <b>AI 평가 리포트 + 타이핑DNA 진정성</b>으로 확인해요. (대필 아님)</div><div id="cb-staff"><div class="empty">불러오는 중…</div></div></div>');
    container.innerHTML=''; container.appendChild(root);
    var host=root.querySelector('#cb-staff'); var profiles, reports;
    try{ profiles=await listProfiles(); reports=await listAllReports(); }catch(e){ host.innerHTML='<div class="empty">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    var names={}, grades={}; (window._students||[]).forEach(function(s){var k=s.id||s.student_id; names[k]=s.name||s.student_name; grades[k]=s.grade||s.student_grade||'';});
    if(window._activeStudent){ names[window._activeStudent.id]=window._activeStudent.name; grades[window._activeStudent.id]=window._activeStudent.grade||''; }
    host.innerHTML='';
    host.appendChild(el('<div class="sect">① 인터뷰 완료 — 맞춤 설계도 보내기</div>'));
    if(!profiles.length){ host.appendChild(el('<div class="empty">아직 인터뷰를 완료한 자녀/학생이 없습니다.</div>')); }
    else profiles.forEach(function(p){
      var c=el('<div class="card"><div class="nm">'+esc(names[p.student_id]||'학생')+(grades[p.student_id]?' <span class="tp" style="display:inline">· '+esc(grades[p.student_id])+'</span>':'')+'</div><div class="tp">관심 분야: '+esc(p.field||'-')+(p.answers&&p.answers.topic_want?(' · 원하는 주제: '+esc(p.answers.topic_want)):'')+'</div></div>');
      var row=el('<div class="row"></div>');
      var vb=el('<button class="act gh">인터뷰 보기</button>'); vb.addEventListener('click',function(){ openInterview(p, names[p.student_id]); });
      var bb=el('<button class="act gd">🤖 AI 설계도·전달</button>'); bb.addEventListener('click',function(){ openBuilder(container, p, names[p.student_id], grades[p.student_id]); });
      row.appendChild(vb); row.appendChild(bb); c.appendChild(row); host.appendChild(c);
    });
    host.appendChild(el('<div class="sect">② 제출된 탐구보고서 — 평가·회신</div>'));
    var submitted=reports.filter(function(r){return r.status!=='assigned';});
    if(!submitted.length){ host.appendChild(el('<div class="empty">아직 제출된 탐구보고서가 없습니다.</div>')); }
    else submitted.forEach(function(r){
      var c=el('<div class="card"><div class="nm">'+esc(names[r.student_id]||'학생')+'<span class="badge b-'+esc(r.status)+'">'+(r.status==='sent'?'평가완료':r.status==='coached'?'코칭완료':'제출됨')+'</span></div><div class="tp">'+esc(r.title||r.topic||'-')+'</div></div>');
      var row=el('<div class="row"></div>'); var cb=el('<button class="act pri">보고서 · AI 평가 · 회신</button>'); cb.addEventListener('click',function(){ openReview(container, r, names[r.student_id], grades[r.student_id]); });
      row.appendChild(cb); c.appendChild(row); host.appendChild(c);
    });
  }
  function openInterview(p, name){
    var ov=ovOpen(); var a=p.answers||{}; var h='<div class="acb"><div class="card"><h2 style="margin:0 0 8px">'+esc(name||'학생')+' · 진로 인터뷰</h2>';
    Object.keys(QP).forEach(function(k){ if(a[k]!=null&&String(a[k]).length){ h+='<div class="qa"><div class="q">'+esc(QP[k])+'</div><div class="a">'+esc(a[k])+'</div></div>'; } });
    ov.querySelector('.bd').innerHTML=h+'</div></div>';
  }
  function openBuilder(container, p, name, grade){
    var ov=ovOpen(); var lvl=gradeLevel(grade);
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · 맞춤 탐구 설계도 만들기</h2>'
      +'<div class="note" style="margin-bottom:8px">AI가 인터뷰 기반으로 <b>탐구 질문 설계도 초안</b>을 제안합니다. 검토·수정 후 전달하세요. (AI는 질문만, 대필 아님) · 수준: '+(lvl==='dae'?'고등(대입)':'중등(고입)')+'</div>'
      +'<div class="row"><button class="act gd" id="ai">🤖 AI 설계도 초안 생성</button></div>'
      +'<div style="margin-top:12px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">설계도 제목</div><input id="wtitle" placeholder="예: 우리 동네 분리배출 개선 탐구"></div>'
      +'<div style="margin-top:6px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">탐구 주제(한 줄)</div><input id="wtopic" placeholder="학생 관심 기반 주제"></div>'
      +'<div class="sect" style="margin:12px 0 6px">탐구 질문 (학생이 직접 답할 열린 질문)</div><div id="qlist"></div>'
      +'<div class="row"><button class="act mut" id="addq">＋ 질문 추가</button></div>'
      +'<div class="row" style="margin-top:12px"><button class="act dn" id="send">자녀에게 전달</button></div><div class="note" id="msg" style="margin-top:6px"></div>';
    var qlist=card.querySelector('#qlist');
    function addQ(q,hint){ var r=el('<div class="qedit"><textarea rows="2" placeholder="탐구 질문">'+esc(q||'')+'</textarea><input style="margin-top:6px" placeholder="접근 힌트(선택)" value="'+esc(hint||'')+'"><div class="row"><button class="act mut del">삭제</button></div></div>'); r.querySelector('.del').addEventListener('click',function(){r.remove();}); qlist.appendChild(r); }
    function collect(){ var qs=[]; qlist.querySelectorAll('.qedit').forEach(function(r){ var q=r.querySelector('textarea').value.trim(); var h=r.querySelector('input').value.trim(); if(q)qs.push({q:q,hint:h}); }); return qs; }
    addQ('','');
    card.querySelector('#addq').addEventListener('click',function(){ addQ('',''); });
    card.querySelector('#ai').addEventListener('click', async function(){
      var btn=this; btn.disabled=true; var _t=btn.textContent; btn.innerHTML='<span class="spin"></span>생성 중…';
      try{ var fieldWithLv=(p.field||'')+(grade?(' · [학생: '+grade+' — 이 수준에 맞춰 질문 난이도 조절]'):'');
        var res=await callPenta('career_worksheet',{interview:p.answers||{}, field:fieldWithLv, topic:(p.answers&&p.answers.topic_want)||''}); var d=JSON.parse(res.text);
        if(d.title)card.querySelector('#wtitle').value=d.title; if(d.topic)card.querySelector('#wtopic').value=d.topic;
        qlist.innerHTML=''; (d.questions||[]).forEach(function(q){ addQ(q.q, q.hint); }); if(!(d.questions&&d.questions.length))addQ('','');
        var m=card.querySelector('#msg'); m.style.color='#137a44'; m.textContent='AI 초안을 불러왔어요. 검토·수정 후 전달하세요.';
      }catch(e){ var m2=card.querySelector('#msg'); m2.style.color='#c0313d'; m2.textContent='AI 초안 실패: '+(e.message||e); }
      btn.disabled=false; btn.textContent=_t;
    });
    card.querySelector('#send').addEventListener('click', async function(){
      var m=card.querySelector('#msg'); var qs=collect(); var title=card.querySelector('#wtitle').value.trim(); var topic=card.querySelector('#wtopic').value.trim();
      if(!title){ m.style.color='#c0313d'; m.textContent='제목을 입력하세요.'; return; }
      if(!qs.length){ m.style.color='#c0313d'; m.textContent='질문을 1개 이상 추가하세요.'; return; }
      this.disabled=true;
      try{ var res=await assignWorksheet(p.student_id, title, qs, topic, p.field); if(res&&res.error)throw res.error;
        m.style.color='#137a44'; m.textContent='자녀에게 전달했어요 ✅ 자녀 화면에 "작성 대기"로 나타납니다.';
        setTimeout(function(){ ov.remove(); remount(container,'staff'); },900);
      }catch(e){ this.disabled=false; m.style.color='#c0313d'; m.textContent='전달 실패: '+(e.message||e); }
    });
  }
  async function openReview(container, r, name, grade){
    var ov=ovOpen(); var lvl=gradeLevel(grade);
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    var fb=r.coach_feedback||{};
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · '+esc(r.title||'탐구보고서')+'</h2><div class="note" style="margin-bottom:8px">완성 문장을 대신 써주지 마세요. <b>강점·깊이·다음 방향</b> 중심으로 평가합니다. · 수준: '+(lvl==='dae'?'고등(대입)':'중등(고입)')+'</div>';
    card.insertAdjacentHTML('beforeend', wsQaHtml(r));
    card.insertAdjacentHTML('beforeend', '<div class="row"><button class="act gd" id="cbai">🤖 AI 평가 리포트 생성</button><button class="act gh" id="cbdna">🧬 타이핑DNA 진정성</button></div><div class="note" id="cbaimsg" style="margin-top:4px"></div><div id="cbrep" style="margin-top:8px"></div><div id="cbdnabox" style="margin-top:8px"></div>');
    // 기존 평가 있으면 표시
    if(fb&&(fb.report||fb.note)) card.querySelector('#cbrep').innerHTML=reportHtml(fb);
    var repData=(fb&&fb.report)||null;
    card.querySelector('#cbai').addEventListener('click', async function(){
      var btn=this, m=card.querySelector('#cbaimsg'); btn.disabled=true; var _t=btn.textContent; btn.innerHTML='<span class="spin"></span>AI 평가 중…'; m.textContent='';
      try{ var qs=r.questions||[]; var ansText=(r.answers&&r.answers.text)||JSON.stringify(r.answers||{});
        var d=await callCoach({ questions:qs, answers:ansText, field:(r.field||''), topic:(r.topic||r.title||''), name:(name||''), grade:(grade||''), level:lvl });
        repData={note:d.note,strengths:d.strengths,depth:d.depth,questions:d.questions,next:d.next};
        card.querySelector('#cbrep').innerHTML=reportHtml(repData);
        m.style.color='#137a44'; m.textContent='AI 평가 리포트를 생성했어요. 확인 후 자녀에게 회신하세요.';
      }catch(e){ m.style.color='#c0313d'; m.textContent='AI 평가 실패: '+(e.message||e); }
      btn.disabled=false; btn.textContent=_t;
    });
    card.querySelector('#cbdna').addEventListener('click', async function(){
      var mount=card.querySelector('#cbdnabox'); if(mount.getAttribute('data-open')==='1'){ mount.innerHTML=''; mount.removeAttribute('data-open'); return; }
      mount.setAttribute('data-open','1'); mount.innerHTML='<div class="note">불러오는 중…</div>';
      if(!window.ArcheReportTyping){ mount.innerHTML='<div class="note" style="color:#c0313d">리포트 모듈 미로드</div>'; return; }
      var wi=await getIntegrity(r.student_id, r.id);
      if(!wi){ mount.innerHTML='<div class="note" style="padding:10px 12px;border:1px dashed #dfe3ec;border-radius:8px">이 회차의 상세 진정성 데이터가 없습니다. (활성화 이후 제출분부터 표시)</div>'; return; }
      var tm=(r.answers&&r.answers.typing_meta)||{}; var lay=wi.layers||{}; var rea=wi.reasons||{};
      if(typeof lay==='string'){try{lay=JSON.parse(lay);}catch(_){lay={};}} if(typeof rea==='string'){try{rea=JSON.parse(rea);}catch(_){rea={};}}
      mount.innerHTML='';
      try{ ArcheReportTyping.render(mount, { student:{name:name||'학생', grade:grade||''}, source:{title:r.title||'탐구보고서', chars:(tm.charCount||0), minutes:Math.round((tm.totalMs||0)/60000)}, composite:wi.composite, tier:wi.tier||'yellow', layers:lay, reasons:rea, tm:{intervals:(tm.intervals||null),editPos:(tm.editPos||null)} }); }
      catch(e){ mount.innerHTML='<div class="note" style="color:#c0313d">렌더 실패: '+esc(e.message||e)+'</div>'; }
    });
    card.insertAdjacentHTML('beforeend', '<div class="row" style="margin-top:12px"><button class="act dn" id="cbsend">자녀에게 회신(평가 전달)</button></div><div class="note" id="cbmsg" style="margin-top:6px"></div>');
    card.querySelector('#cbsend').addEventListener('click', async function(){
      var m=card.querySelector('#cbmsg'); if(!repData){ m.style.color='#c0313d'; m.textContent='먼저 AI 평가 리포트를 생성하세요.'; return; }
      this.disabled=true; m.style.color='#6b7688'; m.textContent='회신 중…';
      var feedback={ report:repData, note:repData.note, questions:repData.questions };
      try{ var res=await saveCoaching(r.id, feedback, 'sent'); if(res&&res.error)throw res.error;
        try{ await window.sb.rpc('push_parent_item',{p_academy:acadId(),p_student:r.student_id,p_type:'design',p_title:(name||'학생')+' 진로 탐구 평가',p_body:(repData.note||'')+'\n\n※ 학생이 스스로 진행한 진로 탐색 성장 기록이며 생기부 기재용이 아닙니다.',p_data:null,p_link:null}); }catch(_e){}
        m.style.color='#137a44'; m.textContent='자녀에게 회신했어요 ✅';
        setTimeout(function(){ ov.remove(); remount(container,'staff'); },800);
      }catch(e){ this.disabled=false; m.style.color='#c0313d'; m.textContent='회신 실패: '+(e.message||e); }
    });
  }

  window.ArcheCareerBridge={ mount:mount, version:'4.0' };
})();
