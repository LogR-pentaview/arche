/* ============================================================================
 * arche_career_bridge.js · 진로 징검다리 (학생 주도 루프)
 *   루프: 학생 인터뷰(프로필) → 컨설턴트가 AI 초안으로 맞춤 워크북 구성·검토·전달
 *         → 학생이 워크북 작성·제출 → 컨설턴트 코칭·발행(학생·학부모) → (반복)
 *   법 준수: 학생부 미취득·미연동. 인터뷰·답변은 학생 자기서술. 컨설턴트/AI는
 *            질문·구조만(대필 금지). penta-ai career_worksheet = 질문 초안만.
 * 저장: career_profile / career_report(questions=배정 워크북 + answers=학생 작성)
 * API : ArcheCareerBridge.mount(container[, role])
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL='https://dvxepjctjazobrkjrkdw.supabase.co';
  function acadId(){ return window._acadId || (window._academy&&window._academy.id) || null; }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function el(h){var t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild;}

  // 1회성 진로 프로필 인터뷰
  var PROFILE_LESSON = {
    stage:'career', season:null, week:null, eyebrow:'진로 징검다리 · 진로 프로필(1회 작성)',
    title:'나를 알아가는 인터뷰', subtitle:'처음 한 번만 — 선생님이 이 인터뷰를 보고 맞춤 탐구 워크북을 보내줘요', radarAxes:[],
    intro:'"나"를 정리하는 1회성 인터뷰예요. 정답은 없어요. (⚠️ 생기부 내용을 붙여넣지 말고 내 생각을 내 말로!)',
    stages:[
      { key:'explore', name:'STEP 1 · 나를 탐색하기', icon:'🔎', desc:'요즘의 나를 솔직하게.',
        blocks:[
          {t:'text', id:'q_interest', n:'1', q:'요즘 가장 관심 있는 것과, 그 관심이 생긴 계기는?', rows:3},
          {t:'text', id:'q_flow', n:'2', q:'시간 가는 줄 모르고 몰입했던 경험은?', rows:3},
          {t:'text', id:'q_strength', n:'3', q:'남보다 잘한다고 느끼거나 칭찬받은 것은?', rows:3},
          {t:'text', id:'q_problem', n:'4', q:'세상에서 궁금하거나 바꾸고 싶은 문제가 있다면?', rows:3}
        ]},
      { key:'field', name:'STEP 2 · 관심 분야·주제', icon:'🧭', desc:'스스로 정해봐요(바뀌어도 괜찮아요).',
        blocks:[
          {t:'text', id:'field', n:'5', q:'가장 끌리는 "분야"를 스스로 정한다면? (예: 환경·데이터·심리·공학·예술)', rows:1},
          {t:'text', id:'topic_want', n:'6', q:'지금 떠오르는, 더 파고들고 싶은 주제/질문이 있다면? (없으면 비워도 돼요)', rows:2, optional:true}
        ]}
    ],
    submit:{ label:'인터뷰 제출', note:'제출하면 선생님이 나만의 맞춤 탐구 워크북을 만들어 보내줘요.' }
  };

  // ── 데이터 ────────────────────────────────────────────────────────────
  async function token(){ try{var s=await window.sb.auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function callPenta(task,payload){ var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/penta-ai'; var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(await token())},body:JSON.stringify({task:task,payload:payload})}); var d=await r.json(); if(!r.ok)throw new Error(d.error||'AI 오류'); return d; }
  async function getProfile(sid){ var r=await window.sb.from('career_profile').select('*').eq('student_id',sid).limit(1); return (r.data&&r.data[0])||null; }
  async function listProfiles(){ var r=await window.sb.from('career_profile').select('*').eq('academy_id',acadId()).order('updated_at',{ascending:false}); return (r&&r.data)||[]; }
  async function listReports(sid){ var r=await window.sb.from('career_report').select('*').eq('student_id',sid).order('created_at',{ascending:false}); return (r&&r.data)||[]; }
  async function listAllReports(){ var r=await window.sb.from('career_report').select('*').eq('academy_id',acadId()).order('updated_at',{ascending:false}); return (r&&r.data)||[]; }
  async function saveProfile(sid, field, answers){ return window.sb.rpc('save_career_profile',{p_academy:acadId(),p_student:sid,p_field:field||null,p_answers:answers}); }
  async function assignWorksheet(sid, title, questions, topic, field){ return window.sb.rpc('assign_career_worksheet',{p_academy:acadId(),p_student:sid,p_title:title||null,p_questions:questions,p_topic:topic||null,p_field:field||null}); }
  async function submitAnswers(sid, reportId, topic, field, answers){ return window.sb.rpc('save_career_report',{p_academy:acadId(),p_student:sid,p_report_id:reportId,p_topic:topic||null,p_field:field||null,p_answers:answers}); }
  async function saveCoaching(id, feedback, status){ return window.sb.rpc('save_career_coaching',{p_id:id,p_feedback:feedback,p_status:status||null}); }

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
    +".acb textarea,.acb input{width:100%;border:1.5px solid #dfe3ec;border-radius:9px;padding:9px 11px;font:inherit;font-size:13px}"
    +".acb .qedit{border:1px solid #e6e9f0;border-radius:10px;padding:10px;margin-bottom:8px;background:#fbfcfe}"
    +".acb-ov{position:fixed;inset:0;background:rgba(8,11,46,.55);z-index:2147483000;overflow:auto;padding:22px 12px;font-family:'Noto Sans KR',sans-serif}"
    +".acb-ovc{max-width:820px;margin:0 auto;background:#eef1f8;border-radius:16px;padding:14px}"
    +".acb-ovx{display:flex;justify-content:flex-end;position:sticky;top:0;z-index:1}.acb-ovx button{border:0;background:#1A237E;color:#fff;border-radius:9px;padding:7px 13px;font-weight:800;cursor:pointer}"
    +".acb .note{font-size:11.5px;color:#8b95a1;margin-top:6px}"
    +".acb .coach{background:#eef4ff;border:1px solid #cfe0ff;border-radius:12px;padding:12px 14px;margin-bottom:12px}.acb .coach .h{font-weight:900;color:#1A237E;font-size:13px;margin-bottom:5px}"
    +".acb .spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:acbsp .7s linear infinite;vertical-align:-2px;margin-right:6px}@keyframes acbsp{to{transform:rotate(360deg)}}";
  function injectCss(){ if(!document.getElementById('acb-css')){var s=document.createElement('style');s.id='acb-css';s.textContent=CSS;document.head.appendChild(s);} }
  var QP={q_interest:'관심사·계기',q_flow:'몰입 경험',q_strength:'강점',q_problem:'관심 문제',field:'관심 분야',topic_want:'하고 싶은 주제'};

  function mount(container, role){
    injectCss();
    container = container || document.getElementById('career-mount');
    if(!container) return;
    if(!window.sb){ container.innerHTML='<div class="acb"><div class="empty">로그인 후 이용할 수 있어요.</div></div>'; return; }
    role = role || ((window._role==='stu')?'student':'staff');
    if(role==='student') return renderStudent(container);
    return renderStaff(container);
  }
  function coachBanner(fb){ var qs=(fb&&fb.questions)||[]; var note=(fb&&fb.note)||''; var h='<div class="coach"><div class="h">🧑‍🏫 선생님 코칭 (답을 정해주는 게 아니라, 더 깊이 탐구하도록 돕는 질문이에요)</div>'; if(note)h+='<div style="font-size:13px;color:#39465a;line-height:1.7;margin-bottom:6px">'+esc(note)+'</div>'; if(qs.length)h+='<ol style="margin:0;padding-left:20px">'+qs.map(function(q){return '<li style="font-size:13px;line-height:1.7;margin-bottom:3px">'+esc(q)+'</li>';}).join('')+'</ol>'; return h+'</div>'; }

  // 배정된 워크북(questions) → 학생 작성용 LESSON
  function worksheetLesson(rep){
    var qs=(rep.questions||[]);
    return { stage:'career', season:null, week:null, eyebrow:'진로 징검다리 · 맞춤 탐구 워크북',
      title: rep.title||'맞춤 탐구 워크북', subtitle: rep.topic||'', radarAxes:[],
      intro:'선생님이 너의 인터뷰를 보고 만든 맞춤 질문이야. 각 질문에 네 생각을 직접 써보자. (⚠️ 생기부 붙여넣기 금지 · 내 말로!)',
      stages:[{ key:'ws', name:'탐구 질문', icon:'🧭', desc:'', blocks: qs.map(function(q,i){ return {t:'text', id:'a'+i, n:(i+1), q:q.q||('질문 '+(i+1)), hint:q.hint||'', rows:3}; }) }],
      submit:{ label:'탐구보고서 제출', note:'제출하면 선생님이 코칭을 드려요. (탐구는 여러분이 직접!)' } };
  }
  function wsQaHtml(rep){ var qs=rep.questions||[]; var a=rep.answers||{}; var h=''; qs.forEach(function(q,i){ var v=a['a'+i]; h+='<div class="qa"><div class="q">'+(i+1)+'. '+esc(q.q||'')+'</div><div class="a">'+(v&&String(v).length?esc(v):'<span style="color:#c0313d">미작성</span>')+'</div></div>'; }); return h||'<div class="note">질문이 없습니다.</div>'; }

  // ── 학생 ──────────────────────────────────────────────────────────────
  async function renderStudent(container){
    var sid=(window._activeStudent&&window._activeStudent.id)||null;
    if(!window.ArchePentaWorkbook){ container.innerHTML='<div class="acb"><div class="empty">워크북 모듈이 필요합니다.</div></div>'; return; }
    if(!sid){ container.innerHTML='<div class="acb"><div class="empty">학생 정보를 불러오지 못했어요.</div></div>'; return; }
    var root=el('<div class="acb"><h2>진로 징검다리</h2><div class="sub">인터뷰를 하면 선생님이 나만의 탐구 워크북을 보내줘요. 받은 워크북을 작성해 제출하세요.</div><div id="cb-body"><div class="empty">불러오는 중…</div></div></div>');
    container.innerHTML=''; container.appendChild(root);
    var body=root.querySelector('#cb-body'); var profile, reports;
    try{ profile=await getProfile(sid); reports=await listReports(sid); }catch(e){ body.innerHTML='<div class="empty">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    body.innerHTML='';
    // 프로필
    if(profile){
      var pc=el('<div class="card pf"><div class="t">MY 진로 프로필</div><div class="f">관심 분야 · '+esc(profile.field||'—')+'</div><div class="row"><button class="act gh" style="background:rgba(255,255,255,.15);color:#fff">프로필(인터뷰) 수정</button></div></div>');
      pc.querySelector('button').addEventListener('click',function(){ openProfile(sid, profile); }); body.appendChild(pc);
    } else {
      var pc0=el('<div class="card"><div class="nm">먼저 진로 인터뷰를 해요 (1회)</div><div class="tp">인터뷰를 제출하면 선생님이 맞춤 탐구 워크북을 보내줍니다.</div><div class="row"><button class="act pri">진로 인터뷰 시작</button></div></div>');
      pc0.querySelector('button').addEventListener('click',function(){ openProfile(sid, null); }); body.appendChild(pc0);
      body.appendChild(el('<div class="empty">인터뷰를 먼저 완료해 주세요.</div>')); return;
    }
    // 받은 워크북
    body.appendChild(el('<div class="sect">받은 탐구 워크북</div>'));
    if(!reports.length){ body.appendChild(el('<div class="empty">아직 선생님이 보낸 워크북이 없어요.<br>인터뷰를 제출했다면 곧 도착합니다 😊</div>')); return; }
    reports.forEach(function(r){
      var c=el('<div class="card"></div>');
      var st=r.status;
      c.innerHTML='<div class="nm">'+esc(r.title||r.topic||'맞춤 탐구 워크북')+'<span class="badge b-'+esc(st)+'">'+(st==='assigned'?'작성 대기':st==='sent'?'발행완료':st==='coached'?'코칭 도착':'제출됨')+'</span></div>'+(r.topic?'<div class="tp">'+esc(r.topic)+'</div>':'');
      var row=el('<div class="row"></div>');
      var btn=el('<button class="act '+(st==='assigned'?'pri':'gh')+'">'+(st==='assigned'?'✍️ 작성하기':'열기')+'</button>');
      btn.addEventListener('click',function(){ openWorksheet(sid, r); }); row.appendChild(btn); c.appendChild(row); body.appendChild(c);
    });
  }
  function openProfile(sid, prev){
    var ov=el('<div class="acb-ov"><div class="acb-ovc"><div class="acb-ovx"><button>✕ 닫기</button></div><div class="m"></div></div></div>');
    document.body.appendChild(ov); ov.querySelector('.acb-ovx button').addEventListener('click',function(){ov.remove();});
    ArchePentaWorkbook.render(ov.querySelector('.m'), { lesson:PROFILE_LESSON, mode:'live', prefill: prev?{answers:prev.answers||{}}:null,
      submitOkText:'인터뷰 제출 완료! 선생님이 맞춤 워크북을 보내줄 거예요.',
      submitFn:function(d){ return saveProfile(sid, (d.answers&&d.answers.field)||null, d.answers||{}); },
      onSubmit:function(res){ if(res&&!res.preview){ setTimeout(function(){ ov.remove(); var m=document.getElementById('career-mount'); if(m)mount(m,'student'); },900); } } });
  }
  function openWorksheet(sid, rep){
    var ro = (rep.status!=='assigned');  // 이미 제출한 것은 열람(수정 가능하게 하려면 false)
    var ov=el('<div class="acb-ov"><div class="acb-ovc"><div class="acb-ovx"><button>✕ 닫기</button></div><div class="ctx"></div><div class="m"></div></div></div>');
    document.body.appendChild(ov); ov.querySelector('.acb-ovx button').addEventListener('click',function(){ov.remove();});
    if(rep.coach_feedback){ ov.querySelector('.ctx').innerHTML='<div class="acb">'+coachBanner(rep.coach_feedback)+'</div>'; }
    ArchePentaWorkbook.render(ov.querySelector('.m'), { lesson:worksheetLesson(rep), mode:'live', prefill: rep.answers?{answers:rep.answers}:null,
      submitOkText:'제출 완료! 🎉 선생님 코칭을 기다려요.',
      submitFn:function(d){ return submitAnswers(sid, rep.id, rep.topic||rep.title, rep.field, d.answers||{}); },
      onSubmit:function(res){ if(res&&!res.preview){ setTimeout(function(){ ov.remove(); var m=document.getElementById('career-mount'); if(m)mount(m,'student'); },900); } } });
  }

  // ── 컨설턴트 ──────────────────────────────────────────────────────────
  async function renderStaff(container){
    var root=el('<div class="acb"><h2>진로 징검다리 · 학생 주도</h2><div class="sub">학생 인터뷰를 보고 <b>AI 초안 → 검토·수정 → 맞춤 워크북 전달</b>. 제출물엔 <b>질문·보완 코칭</b>만(대필 아님).</div><div id="cb-staff"><div class="empty">불러오는 중…</div></div></div>');
    container.innerHTML=''; container.appendChild(root);
    var host=root.querySelector('#cb-staff');
    var profiles, reports;
    try{ profiles=await listProfiles(); reports=await listAllReports(); }catch(e){ host.innerHTML='<div class="empty">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    var names={}; (window._students||[]).forEach(function(s){names[s.id||s.student_id]=s.name||s.student_name;});
    host.innerHTML='';
    // A) 인터뷰 완료 학생 → 워크북 보내기
    host.appendChild(el('<div class="sect">① 인터뷰 완료 학생 — 맞춤 워크북 보내기</div>'));
    if(!profiles.length){ host.appendChild(el('<div class="empty">아직 인터뷰를 완료한 학생이 없습니다.</div>')); }
    else profiles.forEach(function(p){
      var c=el('<div class="card"><div class="nm">'+esc(names[p.student_id]||'학생')+'</div><div class="tp">관심 분야: '+esc(p.field||'-')+(p.answers&&p.answers.topic_want?(' · 원하는 주제: '+esc(p.answers.topic_want)):'')+'</div></div>');
      var row=el('<div class="row"></div>');
      var vb=el('<button class="act gh">인터뷰 보기</button>'); vb.addEventListener('click',function(){ openInterview(p, names[p.student_id]); });
      var bb=el('<button class="act gd">🤖 AI 워크북 초안·전달</button>'); bb.addEventListener('click',function(){ openBuilder(p, names[p.student_id]); });
      row.appendChild(vb); row.appendChild(bb); c.appendChild(row); host.appendChild(c);
    });
    // B) 제출된 탐구보고서 → 코칭
    host.appendChild(el('<div class="sect">② 제출된 탐구보고서 — 코칭·발행</div>'));
    var submitted=reports.filter(function(r){return r.status!=='assigned';});
    if(!submitted.length){ host.appendChild(el('<div class="empty">아직 제출된 탐구보고서가 없습니다.</div>')); }
    else submitted.forEach(function(r){
      var c=el('<div class="card"><div class="nm">'+esc(names[r.student_id]||'학생')+'<span class="badge b-'+esc(r.status)+'">'+(r.status==='sent'?'발행완료':r.status==='coached'?'코칭완료':'제출됨')+'</span></div><div class="tp">'+esc(r.title||r.topic||'-')+'</div></div>');
      var row=el('<div class="row"></div>'); var cb=el('<button class="act pri">답변 보기 · 코칭·발행</button>'); cb.addEventListener('click',function(){ openCoach(r, names[r.student_id]); });
      row.appendChild(cb); c.appendChild(row); host.appendChild(c);
    });
  }
  function openInterview(p, name){
    var ov=el('<div class="acb-ov"><div class="acb-ovc"><div class="acb-ovx"><button>✕ 닫기</button></div><div class="bd"></div></div></div>'); document.body.appendChild(ov); ov.querySelector('.acb-ovx button').addEventListener('click',function(){ov.remove();});
    var a=p.answers||{}; var h='<div class="acb"><div class="card"><h2 style="margin:0 0 8px">'+esc(name||'학생')+' · 진로 인터뷰</h2>';
    Object.keys(QP).forEach(function(k){ if(a[k]!=null&&String(a[k]).length){ h+='<div class="qa"><div class="q">'+esc(QP[k])+'</div><div class="a">'+esc(a[k])+'</div></div>'; } });
    ov.querySelector('.bd').innerHTML=h+'</div></div>';
  }
  function openBuilder(p, name){
    var ov=el('<div class="acb-ov"><div class="acb-ovc"><div class="acb-ovx"><button>✕ 닫기</button></div><div class="bd"></div></div></div>'); document.body.appendChild(ov); ov.querySelector('.acb-ovx button').addEventListener('click',function(){ov.remove();});
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · 맞춤 탐구 워크북 만들기</h2>'
      +'<div class="note" style="margin-bottom:8px">AI가 학생 인터뷰 기반으로 <b>탐구 질문 초안</b>을 제안합니다. 검토·수정 후 학생에게 전달하세요. (AI는 질문만, 대필 아님)</div>'
      +'<div class="row"><button class="act gd" id="ai">🤖 AI 워크북 초안 생성</button></div>'
      +'<div style="margin-top:12px"><div class="q" style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">워크북 제목</div><input id="wtitle" placeholder="예: 우리 동네 분리배출 개선 탐구"></div>'
      +'<div style="margin-top:6px"><div class="q" style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">탐구 주제(한 줄)</div><input id="wtopic" placeholder="학생 관심 기반 주제"></div>'
      +'<div class="sect" style="margin:12px 0 6px">탐구 질문 (학생이 직접 답할 열린 질문)</div><div id="qlist"></div>'
      +'<div class="row"><button class="act mut" id="addq">＋ 질문 추가</button></div>'
      +'<div class="row" style="margin-top:12px"><button class="act dn" id="send">학생에게 전달</button></div><div class="note" id="msg" style="margin-top:6px"></div>';
    var qlist=card.querySelector('#qlist');
    function addQ(q,hint){ var r=el('<div class="qedit"><textarea rows="2" placeholder="탐구 질문">'+esc(q||'')+'</textarea><input style="margin-top:6px" placeholder="접근 힌트(선택)" value="'+esc(hint||'')+'"><div class="row"><button class="act mut del">삭제</button></div></div>'); r.querySelector('.del').addEventListener('click',function(){r.remove();}); qlist.appendChild(r); }
    function collect(){ var qs=[]; qlist.querySelectorAll('.qedit').forEach(function(r){ var q=r.querySelector('textarea').value.trim(); var h=r.querySelector('input').value.trim(); if(q)qs.push({q:q,hint:h}); }); return qs; }
    addQ('','');
    card.querySelector('#addq').addEventListener('click',function(){ addQ('',''); });
    card.querySelector('#ai').addEventListener('click', async function(){
      var btn=this; btn.disabled=true; var _t=btn.textContent; btn.innerHTML='<span class="spin"></span>생성 중…';
      try{ var res=await callPenta('career_worksheet',{interview:p.answers||{}, field:p.field||'', topic:(p.answers&&p.answers.topic_want)||''}); var d=JSON.parse(res.text);
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
        m.style.color='#137a44'; m.textContent='학생에게 전달했어요 ✅ 학생 화면에 "작성 대기"로 나타납니다.';
        setTimeout(function(){ ov.remove(); var mnt=document.getElementById('career-mount'); if(mnt)mount(mnt,'staff'); },900);
      }catch(e){ this.disabled=false; m.style.color='#c0313d'; m.textContent='전달 실패: '+(e.message||e); }
    });
  }
  async function openCoach(r, name){
    var ov=el('<div class="acb-ov"><div class="acb-ovc"><div class="acb-ovx"><button>✕ 닫기</button></div><div class="bd"></div></div></div>'); document.body.appendChild(ov); ov.querySelector('.acb-ovx button').addEventListener('click',function(){ov.remove();});
    var profile=null; try{ profile=await getProfile(r.student_id); }catch(e){}
    var fb=r.coach_feedback||{};
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · '+esc(r.title||'탐구보고서')+'</h2><div class="note" style="margin-bottom:8px">완성 문장을 대신 써주지 마세요. <b>질문·방향</b>만 남깁니다.</div>'
      +(profile?('<div style="background:#f4f7fc;border:1px solid #e0e7f3;border-radius:10px;padding:8px 11px;margin-bottom:8px;font-size:12.5px;color:#39465a">관심 분야: '+esc(profile.field||'-')+'</div>'):'')
      +wsQaHtml(r)
      +'<div style="margin-top:14px"><div class="q" style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">코칭 코멘트(격려·방향)</div><textarea id="cbn" rows="2">'+esc(fb.note||'')+'</textarea></div>'
      +'<div style="margin-top:10px"><div class="q" style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">더 생각해볼 질문(한 줄에 하나)</div><textarea id="cbq" rows="4">'+esc((fb.questions||[]).join('\n'))+'</textarea></div>'
      +'<div class="row"><button class="act gh" id="cbsave">코칭 저장(학생에게만)</button><button class="act dn" id="cbsend">학생·학부모에게 발행</button></div><div class="note" id="cbmsg" style="margin-top:6px"></div>';
    function collect(){ return {note:card.querySelector('#cbn').value.trim(), questions:card.querySelector('#cbq').value.split('\n').map(function(x){return x.trim();}).filter(Boolean)}; }
    card.querySelector('#cbsave').addEventListener('click',async function(){ var m=card.querySelector('#cbmsg'); try{ var res=await saveCoaching(r.id,collect(),'coached'); if(res&&res.error)throw res.error; m.style.color='#137a44'; m.textContent='코칭 저장 완료. 학생 화면에 표시됩니다.'; }catch(e){ m.style.color='#c0313d'; m.textContent='저장 실패: '+(e.message||e); } });
    card.querySelector('#cbsend').addEventListener('click',async function(){ var m=card.querySelector('#cbmsg'); var fbk=collect();
      try{ var res=await saveCoaching(r.id,fbk,'sent'); if(res&&res.error)throw res.error;
        var body='탐구 워크북: '+(r.title||'-')+' / 주제: '+(r.topic||'-')+'\n\n[선생님 코칭]\n'+(fbk.note||'')+(fbk.questions.length?('\n\n더 생각해볼 질문:\n- '+fbk.questions.join('\n- ')):'')+'\n\n※ 학생이 스스로 진행한 진로 탐색의 성장·성찰 기록이며, 생기부 기재용이 아닙니다.';
        try{ await window.sb.rpc('push_parent_item',{p_academy:acadId(),p_student:r.student_id,p_type:'design',p_title:(name||'학생')+' 진로 징검다리 결과',p_body:body,p_data:null,p_link:null}); }catch(e){}
        m.style.color='#137a44'; m.textContent='학생·학부모에게 발행했어요 ✅';
        setTimeout(function(){ ov.remove(); var mnt=document.getElementById('career-mount'); if(mnt)mount(mnt,'staff'); },800);
      }catch(e){ m.style.color='#c0313d'; m.textContent='발행 실패: '+(e.message||e); }
    });
  }

  window.ArcheCareerBridge={ mount:mount, PROFILE_LESSON:PROFILE_LESSON, version:'3.1' };
})();
