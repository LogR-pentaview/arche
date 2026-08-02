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
  // ── 코스웨어(옛 엔진) : arche-ai course_lesson + design_items 저장 ────────
  async function callArche(task,payload){ var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/arche-ai'; var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(await token())},body:JSON.stringify({task:task,payload:payload})}); var d=await r.json(); if(!r.ok)throw new Error(d.error||'AI 오류'); return d; }
  // 학기 자동판별 (대표님 정의: 1~7월=1학기, 8~12월=2학기)
  function curSemester(){ try{ var m=(new Date()).getMonth()+1; return (m>=1&&m<=7)?1:2; }catch(e){ return 1; } }
  function termLabel(grade){ var g=String(grade||''); return (g?g+' ':'')+curSemester()+'학기'; }
  // 학년별 과목(교과형) — 선택 + 직접입력. 2015/2022 개정 공통 위주.
  function subjectsFor(grade){ var g=String(grade||'');
    if(g.indexOf('고')>=0) return ['국어','수학','영어','통합사회','통합과학','한국사','과학탐구실험','물리학','화학','생명과학','지구과학','세계사','사회·문화','생활과 윤리','경제','정치와 법','확률과 통계','미적분','기하','정보','제2외국어','예술(음악·미술)','체육'];
    if(g.indexOf('중')>=0) return ['국어','수학','영어','과학','사회','역사','도덕','기술·가정','정보','음악','미술','체육','한문','제2외국어','자유학기 주제선택'];
    return ['국어','수학','영어','과학','사회','통합교과']; }
  var CHANGCHE=['자율활동','동아리활동','진로활동','봉사활동','독서활동'];
  // 같은 학원·학교·학년·비슷한 진로 학생과 주제 중복 회피
  async function otherDesignTitles(stu){ try{
      var acad=acadId(); if(!acad||!window.sb)return '';
      var myCareer=(stu.target_major||stu.career||''); var myGrade=String(stu.grade||''); var mySchool=(stu.school||stu.target_school||stu.target_univ||'');
      if(!myCareer&&!mySchool)return '';
      var rr=await window.sb.from('students').select('id,grade,career,target_major,school,target_school,target_univ').eq('academy_id',acad).neq('id',stu.id).limit(400);
      var peers=(rr.data||[]).filter(function(x){ var xc=(x.target_major||x.career||''); var xs=(x.school||x.target_school||x.target_univ||''); return String(x.grade||'')===myGrade && ((myCareer&&xc===myCareer)||(mySchool&&xs===mySchool)); });
      if(!peers.length)return '';
      var ids=peers.map(function(x){return x.id;});
      var di=await window.sb.from('design_items').select('title').in('student_id',ids).limit(80);
      var titles=Array.from(new Set((di.data||[]).map(function(d){return (d.title||'').trim();}).filter(Boolean))).slice(0,30);
      if(!titles.length)return '';
      return '\n\n★★[중복 회피·필수] 같은 학원에서 같은 학년·유사 진로/학교인 다른 학생들이 이미 아래 주제로 설계를 받았다. 주제·소재·접근·탐구방법·목차가 겹치지 않는 완전히 다른 설계를 제시하라:\n'+titles.map(function(t){return '- '+t;}).join('\n'); }catch(e){ return ''; } }
  async function myDesignItems(sid){ try{ var r=await window.sb.from('design_items').select('*').eq('student_id',sid).order('seq',{ascending:true}); return (r&&r.data)||[]; }catch(e){ return []; } }
  async function getProfile(sid){ var r=await window.sb.from('career_profile').select('*').eq('student_id',sid).limit(1); return (r.data&&r.data[0])||null; }
  async function listProfiles(){ var r=await window.sb.from('career_profile').select('*').eq('academy_id',acadId()).order('updated_at',{ascending:false}); return (r&&r.data)||[]; }
  async function listReports(sid){ var r=await window.sb.from('career_report').select('*').eq('student_id',sid).order('created_at',{ascending:false}); return (r&&r.data)||[]; }
  async function listAllReports(){ var r=await window.sb.from('career_report').select('*').eq('academy_id',acadId()).order('updated_at',{ascending:false}); return (r&&r.data)||[]; }
  async function saveProfile(sid, field, answers){ return window.sb.rpc('save_career_profile',{p_academy:acadId(),p_student:sid,p_field:field||null,p_answers:answers}); }
  async function assignWorksheet(sid, title, questions, topic, field){ return window.sb.rpc('assign_career_worksheet',{p_academy:acadId(),p_student:sid,p_title:title||null,p_questions:questions,p_topic:topic||null,p_field:field||null}); }
  async function submitAnswers(sid, reportId, topic, field, answers){ return window.sb.rpc('save_career_report',{p_academy:acadId(),p_student:sid,p_report_id:reportId,p_topic:topic||null,p_field:field||null,p_answers:answers}); }
  async function saveCoaching(id, feedback, status){ return window.sb.rpc('save_career_coaching',{p_id:id,p_feedback:feedback,p_status:status||null}); }
  async function getIntegrity(sid, rid){ try{ var r=await window.sb.from('writing_integrity').select('*').eq('student_id',String(sid)).eq('source_type','design').eq('source_id',String(rid)).order('created_at',{ascending:false}).limit(1); return (r.data&&r.data[0])||null; }catch(e){ return null; } }
  async function getReflection(sid, rid){ try{ var r=await window.sb.from('reflection_snapshots').select('s_before,s_after,self_eval,sri,resilience,c2,ai_predicted,meta_gap').eq('student_id',String(sid)).eq('source_type','design').eq('source_id',String(rid)).limit(1); return (r.data&&r.data[0])||null; }catch(e){ return null; } }
  function reflectionHtml(rf){ if(!rf)return ''; var sbf=rf.s_before||{}, saf=rf.s_after||{}; if(typeof sbf==='string'){try{sbf=JSON.parse(sbf);}catch(_){sbf={};}} if(typeof saf==='string'){try{saf=JSON.parse(saf);}catch(_){saf={};}}
    var pre=(sbf.why||sbf.expect||sbf.curious), post=(saf.changed||saf.learned||saf.reresponse); if(!pre&&!post)return '';
    var h='<div class="rep" style="background:#fff8ee;border-color:#f0dca6"><h4>🪞 자녀의 사전·사후 회고</h4>';
    if(pre){ h+='<div class="lb">시작 전 생각</div><ul>'+(sbf.why?'<li>왜 하려는지: '+esc(sbf.why)+'</li>':'')+(sbf.expect?'<li>예상: '+esc(sbf.expect)+'</li>':'')+(sbf.curious?'<li>궁금한 점: '+esc(sbf.curious)+'</li>':'')+'</ul>'; }
    if(post){ h+='<div class="lb">마친 뒤 회고</div><ul>'+(saf.changed?'<li>달라진 점: '+esc(saf.changed)+'</li>':'')+(saf.learned?'<li>새로 알게 됨: '+esc(saf.learned)+'</li>':'')+(saf.reresponse?'<li>다시 생각하니: '+esc(saf.reresponse)+'</li>':'')+'</ul>'; }
    if(rf.sri!=null||rf.resilience!=null||rf.c2!=null){ h+='<div class="lb">성장 지표(참고)</div><p style="font-size:12px">사전→사후 관점확장 '+(rf.sri!=null?rf.sri:'-')+' · 회복탄력 '+(rf.resilience!=null?rf.resilience:'-')+' · 연결지성 '+(rf.c2!=null?rf.c2:'-')+'</p>'; }
    return h+'</div>'; }

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

  var _track=null;   // 'dae'(대입/고등) | 'goip'(고입/중등) | null(전체)
  function mount(container, role, track){
    injectCss();
    container = container || document.getElementById('career-mount');
    if(!container) return;
    if(!window.sb){ container.innerHTML='<div class="acb"><div class="empty">로그인 후 이용할 수 있어요.</div></div>'; return; }
    role = role || ((window._role==='stu')?'student':'staff');
    if(track!==undefined) _track = track||null;
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
    if(r.expression&&(r.expression.note||r.expression.score!=null)){ var ex=r.expression;
      var lc={'우수':'#2f9e44','양호':'#1971c2','성장중':'#e8590c','첫걸음':'#868e96'}[ex.level]||'#1971c2';
      var sc=(ex.score!=null&&!isNaN(+ex.score))?(+ex.score).toFixed(0):'-';
      h+='<div class="lb">✍️ 문장력 <span style="font-weight:900;color:'+lc+'">'+sc+'<span style="font-size:10px;color:#8b95a1">/10</span></span>'+(ex.level?' <span style="font-size:10px;font-weight:800;color:'+lc+'">· '+esc(ex.level)+'</span>':'')+'</div>';
      if(ex.note)h+='<p>'+esc(ex.note)+'</p>';
      if(ex.tips&&ex.tips.length)h+='<ul>'+ex.tips.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
      h+='<div style="font-size:10px;color:#adb5bd;margin-top:2px">※ 우수한 사고·표현 사례 기준 · 학년 수준 감안 · 표현 성장 안내</div>';
    }
    return h+'</div>'; }
  function wsQaHtml(rep){ var qs=rep.questions||[]; var ans=(rep.answers&&(rep.answers.text!=null||rep.answers.html!=null))?null:(rep.answers||{}); var text=(rep.answers&&rep.answers.text)||''; var h='';
    if(text){ h+='<div class="qa"><div class="q">✍️ 학생 탐구보고서</div><div class="a">'+esc(text)+'</div></div>'; }
    else { qs.forEach(function(q,i){ var v=ans?ans['a'+i]:''; h+='<div class="qa"><div class="q">'+(i+1)+'. '+esc(q.q||'')+'</div><div class="a">'+(v&&String(v).length?esc(v):'<span style="color:#c0313d">미작성</span>')+'</div></div>'; }); }
    return h||'<div class="note">내용이 없습니다.</div>'; }

  // ── 내보내기(PDF/DOCX/HWPX) ────────────────────────────────────────────
  function exportBodyHtml(rep){ var h='';
    if(rep.coach_feedback) h+=reportHtml(rep.coach_feedback);
    var a=rep.answers||{}; var rich=a.html||''; var text=a.text||'';
    if(rich){ h+='<h3 style="font-size:15px;color:#1A237E;margin:12px 0 4px">✍️ 탐구보고서</h3><div>'+rich+'</div>'; }
    else if(text){ h+='<h3 style="font-size:15px;color:#1A237E;margin:12px 0 4px">✍️ 탐구보고서</h3><div style="white-space:pre-wrap">'+esc(text)+'</div>'; }
    else h+=wsQaHtml(rep);
    return h; }
  function exportBar(rep, who){
    if(!window.ArcheExport) return null;
    var title=(rep.title||rep.topic||'진로 탐구보고서');
    var sub=(who?who+' · ':'')+(rep.topic||rep.field||'진로 징검다리');
    var body=exportBodyHtml(rep);
    var bar=el('<div class="row" style="margin-top:8px;border-top:1px dashed #e6e9f0;padding-top:10px"></div>');
    bar.appendChild(el('<div style="width:100%;font-size:11.5px;color:#8b95a1;margin-bottom:4px">📤 내보내기</div>'));
    function mk(lbl,cls,fn){ var b=el('<button class="act '+cls+'">'+lbl+'</button>'); b.addEventListener('click',fn); return b; }
    bar.appendChild(mk('📄 PDF','gh',function(){ ArcheExport.pdf({title:title,subtitle:sub,html:body}); }));
    bar.appendChild(mk('📝 DOCX','mut',function(){ ArcheExport.docx({title:title,subtitle:sub,html:body}); }));
    bar.appendChild(mk('📗 HWPX','mut',function(){ ArcheExport.hwpx({title:title,subtitle:sub,html:body}); }));
    return bar; }

  // ── 학생 ──────────────────────────────────────────────────────────────
  async function renderStudent(container){
    var stu=window._activeStudent||{}; var sid=stu.id||null;
    if(!sid){ container.innerHTML='<div class="acb"><div class="empty">학생 정보를 불러오지 못했어요.</div></div>'; return; }
    var root=el('<div class="acb"><h2>진로 징검다리</h2><div class="sub">인터뷰를 하면 맞춤 탐구 설계도가 도착해요. 사전 생각 → 직접 작성 → 사후 회고 순으로 진행합니다.</div><div id="cb-body"><div class="empty">불러오는 중…</div></div></div>');
    container.innerHTML=''; container.appendChild(root);
    var body=root.querySelector('#cb-body'); var profile, reports, ditems=[];
    try{ profile=await getProfile(sid); reports=await listReports(sid); ditems=(await myDesignItems(sid)).filter(function(d){return d.sent;}); }catch(e){ body.innerHTML='<div class="empty">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    body.innerHTML='';
    if(profile){
      var pc=el('<div class="card pf"><div class="t">MY 진로 프로필</div><div class="f">관심 분야 · '+esc(profile.field||'—')+'</div><div class="row"><button class="act gh" style="background:rgba(255,255,255,.15);color:#fff">프로필(인터뷰) 수정</button></div></div>');
      pc.querySelector('button').addEventListener('click',function(){ openProfile(container, sid, profile); }); body.appendChild(pc);
    } else if(!reports.length && !ditems.length){
      var pc0=el('<div class="card"><div class="nm">먼저 진로 인터뷰를 해요 (1회)</div><div class="tp">인터뷰를 제출하면 학부모(선생님)가 맞춤 탐구 설계도를 보내줍니다.</div><div class="row"><button class="act pri">진로 인터뷰 시작</button></div></div>');
      pc0.querySelector('button').addEventListener('click',function(){ openProfile(container, sid, null); }); body.appendChild(pc0);
      body.appendChild(el('<div class="empty">인터뷰를 먼저 완료해 주세요.</div>')); return;
    } else {
      // 인터뷰 생략(컨설턴트가 설계 전달) — 인터뷰 안내 대신 바로 워크북 표시
      body.appendChild(el('<div class="card"><div class="nm">컨설턴트가 설계한 탐구 워크북이 도착했어요</div><div class="tp">인터뷰 없이 선생님이 설계한 탐구입니다. 아래 워크북을 열어 직접 작성해 주세요.</div></div>'));
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
    if(ditems.length){ body.appendChild(el('<div class="sect">받은 코스웨어 (교과·창체 탐구)</div>'));
      ditems.forEach(function(d){ var c=el('<div class="card"></div>');
        c.innerHTML='<div class="nm">'+esc(d.title||d.subject||'탐구 코스웨어')+'</div><div class="tp">'+esc([d.subject,d.area,d.sem].filter(Boolean).join(' · '))+'</div>';
        var det=el('<div style="margin-top:8px"></div>');
        if(d.goal)det.appendChild(el('<div class="qa"><div class="q">탐구 목적</div><div class="a">'+esc(d.goal)+'</div></div>'));
        if(d.outline)det.appendChild(el('<div class="qa"><div class="q">탐구 목차 (서론·본론·결론)</div><div class="a" style="white-space:pre-line">'+esc(d.outline)+'</div></div>'));
        if(d.detail)det.appendChild(el('<div class="qa"><div class="q">수행 가이드</div><div class="a" style="white-space:pre-wrap">'+esc(d.detail)+'</div></div>'));
        c.appendChild(det); body.appendChild(c);
      });
    }
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
    card.insertAdjacentHTML('beforeend', '<div style="font-size:12px;font-weight:800;color:var(--gold,#1A237E);margin:6px 0 4px">✍️ 탐구보고서 작성</div>'
      +'<div style="border-top:1px dashed var(--line,#dfe3ec);padding-top:8px;font-size:11px;color:var(--ink-mute,#8b95a1);margin-bottom:7px">작성 과정(입력 패턴)이 함께 기록돼 <b>본인 작성 검증</b>에 활용돼요. 이미지·수식도 넣을 수 있어요.</div>'
      +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">'
        +'<label style="cursor:pointer;font-size:12px;color:var(--gold,#3182f6);border:1px solid var(--gold,#3182f6);padding:4px 10px;border-radius:6px;white-space:nowrap">🖼️ 이미지<input type="file" accept="image/*" multiple style="display:none" onchange="if(window.pfInsertImg)pfInsertImg(this)"></label>'
        +'<button type="button" onclick="if(window.pfOpenMath)pfOpenMath()" style="font-size:12px;color:var(--reach,#3182f6);border:1px solid var(--reach,#3182f6);padding:4px 10px;border-radius:6px;background:transparent;cursor:pointer;white-space:nowrap">∑ 수식</button>'
        +'<span id="pf-cc" style="font-size:11px;color:var(--ink-mute,#8b95a1)">0자</span></div>');
    var ed=el('<div class="ed" id="pf-ed" contenteditable="true" data-ph="설계도 질문에 답하며, 내가 조사·생각한 내용을 자유롭게 써보세요" style="width:100%;min-height:240px;background:var(--panel-2,#fbfcfe);border:1px solid var(--line,#dfe3ec);border-radius:11px;padding:13px 14px;color:var(--ink,#191f28);font-size:13.5px;line-height:1.9;outline:none;box-sizing:border-box;word-break:keep-all"></div>'); card.appendChild(ed);
    function cbEdCount(){ var c=card.querySelector('#pf-cc'); if(!c)return; if(window.pfEdLen){try{c.textContent=pfEdLen()+'자';return;}catch(_e){}} c.textContent=((ed.innerText||ed.textContent||'').length)+'자'; }
    ed.addEventListener('input', cbEdCount); ed.addEventListener('paste', function(){ setTimeout(cbEdCount,30); }); cbEdCount();
    var msg=el('<div class="note" id="wmsg"></div>'); card.appendChild(msg);
    var row=el('<div class="row"><button class="act pri" id="wsub">📤 저장 후 제출</button></div>'); card.appendChild(row);
    // [정합성] 이미지 업로드가 perf의 stale 세션 경로를 쓰지 않도록 진로 전용 네임스페이스 지정
    try{ window._pfCurSub='career'+(rep&&rep.id||''); }catch(e){}
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
        msg.style.color='#137a44'; msg.textContent='제출 완료! 🎉 잠시 후 사후 회고가 열려요.';
        try{ if(window.sb) window.sb.from('app_notifications').insert({academy_id:acadId(), student_id:sid, recipient:'con', kind:'design', title:((stu&&stu.name)?('['+stu.name+'] '):'')+'진로 탐구보고서 제출', body:'자녀가 탐구보고서를 제출했어요. 평가·코칭을 진행해 주세요.', view:(window._designTrack==='goip'?'gdesign':'sr')}); }catch(_e){}
        // 워크북 오버레이(최상위 z-index)를 먼저 닫고 → 사후 회고 인터뷰를 깨끗한 화면에 표시
        setTimeout(function(){
          ov.remove(); remount(container,'student');
          try{ if(window.archeReflectOverlay){ archeReflectOverlay({ academyId:acadId(), studentId:sid, sourceType:'design', sourceId:rep.id, kind:'design', title:rep.title||'', reportText:t, banner:{title:'탐구보고서 제출 완료', sub:t.length+'자 · 직접 작성 확인됨'} }); }
            else if(window.ArcheReflection && window.ArcheReflection.renderPost){ var mo=document.createElement('div'); mo.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(15,21,40,.55);overflow:auto;padding:22px 12px'; var bx=document.createElement('div'); bx.style.cssText='max-width:748px;margin:0 auto;background:#f2f4f6;border-radius:18px;padding:16px 14px 30px'; var cx=document.createElement('button'); cx.textContent='나중에 하기 ✕'; cx.style.cssText='display:block;margin:0 0 8px auto;border:0;background:#191f28;color:#fff;font-weight:700;border-radius:99px;padding:7px 14px;cursor:pointer;font:inherit;font-size:12px'; cx.onclick=function(){mo.remove();}; var mt=document.createElement('div'); bx.appendChild(cx); bx.appendChild(mt); mo.appendChild(bx); document.body.appendChild(mo); window.ArcheReflection.renderPost(mt,{ academyId:acadId(), studentId:sid, sourceType:'design', sourceId:rep.id, kind:'design', title:rep.title||'', reportText:t, banner:{title:'탐구보고서 제출 완료', sub:t.length+'자 · 직접 작성 확인됨'} }); }
          }catch(_e){}
        }, 700);
      }catch(e){ this.disabled=false; msg.style.color='#c0313d'; msg.textContent='제출 실패: '+(e.message||e); }
    });
  }
  function openStudentReport(sid, rep){
    var ov=ovOpen(); var box=el('<div class="acb"><div class="card"><h2 style="margin:0 0 6px">'+esc(rep.title||'탐구 결과')+'</h2></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    if(rep.coach_feedback) card.insertAdjacentHTML('beforeend', reportHtml(rep.coach_feedback));
    card.insertAdjacentHTML('beforeend', wsQaHtml(rep));
    var _xb=exportBar(rep, (window._activeStudent&&window._activeStudent.name)||''); if(_xb)card.appendChild(_xb);
    (async function(){ try{ var rf=await getReflection(sid, rep.id); var h=rf?reflectionHtml(rf):''; if(h){ var tmp=el('<div>'+h+'</div>'); if(_xb&&_xb.parentNode===card)card.insertBefore(tmp,_xb); else card.appendChild(tmp); } }catch(_e){} })();
  }

  // ── 학부모(컨설턴트) ──────────────────────────────────────────────────
  async function renderStaff(container){
    var root=el('<div class="acb"><h2>진로 징검다리 · 자녀 관리</h2><div class="sub">자녀 인터뷰를 보고 <b>AI 설계도 → 검토·수정 → 전달</b>. 제출물엔 <b>AI 평가 리포트 + 타이핑DNA 진정성</b>으로 확인해요. (대필 아님)</div><div id="cb-staff"><div class="empty">불러오는 중…</div></div></div>');
    container.innerHTML=''; container.appendChild(root);
    var host=root.querySelector('#cb-staff'); var profiles, reports;
    try{ profiles=await listProfiles(); reports=await listAllReports(); }catch(e){ host.innerHTML='<div class="empty">불러오기 실패: '+esc(e.message||e)+'</div>'; return; }
    var names={}, grades={}; (window._students||[]).forEach(function(s){var k=s.id||s.student_id; names[k]=s.name||s.student_name; grades[k]=s.grade||s.student_grade||'';});
    if(window._activeStudent){ names[window._activeStudent.id]=window._activeStudent.name; grades[window._activeStudent.id]=window._activeStudent.grade||''; }
    // [정합성] 대입(dae)/고입(goip) 메뉴별로 해당 track 학생만 표시 (학생 학년 기준)
    if(_track){ profiles=profiles.filter(function(p){ return gradeLevel(grades[p.student_id])===_track; }); reports=reports.filter(function(r){ return gradeLevel(grades[r.student_id])===_track; }); }
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
    // ③ 코스웨어 설계 (교과·창체 · 목적·주제·목차 서론·본론·결론) — 학원·페어런츠 공용
    var _profMap={}; profiles.forEach(function(p){ _profMap[p.student_id]=p; });
    host.appendChild(el('<div class="sect">③ 코스웨어 설계 (교과·창체 탐구)</div>'));
    var _cwList=(window._students||[]).filter(function(s){ var id=s.id||s.student_id; if(!id)return false; if(_track && gradeLevel(grades[id])!==_track) return false; return true; });
    if(!_cwList.length){ host.appendChild(el('<div class="empty">등록된 학생이 없습니다.</div>')); }
    else _cwList.forEach(function(s){ var id=s.id||s.student_id; var nm=s.name||s.student_name; var gr=s.grade||s.student_grade||'';
      var c=el('<div class="card"><div class="nm">'+esc(nm||'학생')+(gr?' <span class="tp" style="display:inline">· '+esc(gr)+'</span>':'')+(_profMap[id]?' <span class="badge b-sent">인터뷰</span>':'')+'</div><div class="tp">교과/창체 탐구 코스웨어를 설계해 전달합니다. (탐구목적·주제·목차 서론·본론·결론 + 성장 서사 + 학생 간 중복 회피)</div></div>');
      var row=el('<div class="row"></div>'); var bb=el('<button class="act gd">🧭 코스웨어 설계·전송</button>');
      bb.addEventListener('click',function(){ openCourseware(container, s, nm, gr, _profMap[id]||null); });
      row.appendChild(bb); c.appendChild(row); host.appendChild(c);
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
        var res=await callPenta('career_worksheet',{interview:p.answers||{}, field:fieldWithLv, topic:(p.answers&&p.answers.topic_want)||'', grade:(grade||''), level:lvl}); var d=JSON.parse(res.text);
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
  // 인터뷰 생략 · 컨설턴트 설계 입력 → AI 탐구주제 생성 → 전달 (학원용 전용)
  function openBuilderManual(container, p, name, grade){
    var ov=ovOpen(); var lvl=gradeLevel(grade);
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · 컨설턴트 설계 → AI 탐구주제</h2>'
      +'<div class="note" style="margin-bottom:8px">인터뷰 없이, 컨설턴트가 설계한 <b>탐구 방향·소재·핵심 개념</b>을 입력하면 AI가 <b>탐구주제·질문 설계도</b> 초안을 만듭니다. 검토·수정 후 학생에게 전달하세요. (AI는 질문만 · 대필 아님) · 수준: '+(lvl==='dae'?'고등(대입)':'중등(고입)')+'</div>'
      +'<div><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">희망 진로·관심 분야</div><input id="mfield" placeholder="예: 데이터·통계 / 생명공학" value="'+esc(p.field||'')+'"></div>'
      +'<div style="margin-top:8px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">컨설턴트 탐구 설계 (방향·소재·핵심 개념·참고자료)</div><textarea id="mdesign" rows="6" placeholder="예) 통계적 방법으로 지역 미세먼지 데이터를 분석. 회귀·상관 개념 활용, 공공데이터포털 자료 사용, 정책 제언까지 연결."></textarea></div>'
      +'<div class="row" style="margin-top:10px"><button class="act gd" id="mai">🤖 AI 탐구주제·설계도 생성</button></div>'
      +'<div style="margin-top:12px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">설계도 제목</div><input id="wtitle" placeholder="예: 지역 미세먼지 데이터 분석 탐구"></div>'
      +'<div style="margin-top:6px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">탐구 주제(한 줄)</div><input id="wtopic" placeholder="컨설턴트 설계 기반 주제"></div>'
      +'<div class="sect" style="margin:12px 0 6px">탐구 질문 (학생이 직접 답할 열린 질문)</div><div id="qlist"></div>'
      +'<div class="row"><button class="act mut" id="addq">＋ 질문 추가</button></div>'
      +'<div class="row" style="margin-top:12px"><button class="act dn" id="send">학생에게 전달</button></div><div class="note" id="msg" style="margin-top:6px"></div>';
    var qlist=card.querySelector('#qlist');
    function addQ(q,hint){ var r=el('<div class="qedit"><textarea rows="2" placeholder="탐구 질문">'+esc(q||'')+'</textarea><input style="margin-top:6px" placeholder="접근 힌트(선택)" value="'+esc(hint||'')+'"><div class="row"><button class="act mut del">삭제</button></div></div>'); r.querySelector('.del').addEventListener('click',function(){r.remove();}); qlist.appendChild(r); }
    function collect(){ var qs=[]; qlist.querySelectorAll('.qedit').forEach(function(r){ var q=r.querySelector('textarea').value.trim(); var h=r.querySelector('input').value.trim(); if(q)qs.push({q:q,hint:h}); }); return qs; }
    addQ('','');
    card.querySelector('#addq').addEventListener('click',function(){ addQ('',''); });
    card.querySelector('#mai').addEventListener('click', async function(){
      var btn=this, m=card.querySelector('#msg'); var design=card.querySelector('#mdesign').value.trim(); var fld=card.querySelector('#mfield').value.trim();
      if(!design){ m.style.color='#c0313d'; m.textContent='컨설턴트 탐구 설계 내용을 입력하세요.'; return; }
      btn.disabled=true; var _t=btn.textContent; btn.innerHTML='<span class="spin"></span>생성 중…';
      try{ var fieldWithLv=(fld||'')+(grade?(' · [학생: '+grade+' — 이 수준에 맞춰 질문 난이도 조절]'):'');
        var interview={ '컨설턴트가 설계한 탐구 방향':design, _source:'consultant' };
        var res=await callPenta('career_worksheet',{interview:interview, field:fieldWithLv, topic:'', grade:(grade||''), level:lvl}); var d=JSON.parse(res.text);
        if(d.title)card.querySelector('#wtitle').value=d.title; if(d.topic)card.querySelector('#wtopic').value=d.topic;
        qlist.innerHTML=''; (d.questions||[]).forEach(function(q){ addQ(q.q, q.hint); }); if(!(d.questions&&d.questions.length))addQ('','');
        m.style.color='#137a44'; m.textContent='AI 초안을 불러왔어요. 검토·수정 후 전달하세요.';
      }catch(e){ m.style.color='#c0313d'; m.textContent='AI 초안 실패: '+(e.message||e); }
      btn.disabled=false; btn.textContent=_t;
    });
    card.querySelector('#send').addEventListener('click', async function(){
      var m=card.querySelector('#msg'); var qs=collect(); var title=card.querySelector('#wtitle').value.trim(); var topic=card.querySelector('#wtopic').value.trim(); var fld=card.querySelector('#mfield').value.trim();
      if(!title){ m.style.color='#c0313d'; m.textContent='제목을 입력하세요.'; return; }
      if(!qs.length){ m.style.color='#c0313d'; m.textContent='질문을 1개 이상 추가하세요.'; return; }
      this.disabled=true;
      try{ var res=await assignWorksheet(p.student_id, title, qs, topic, fld||p.field); if(res&&res.error)throw res.error;
        m.style.color='#137a44'; m.textContent='학생에게 전달했어요 ✅ 학생 화면에 "작성 대기"로 나타납니다.';
        setTimeout(function(){ ov.remove(); remount(container,'staff'); },900);
      }catch(e){ this.disabled=false; m.style.color='#c0313d'; m.textContent='전달 실패: '+(e.message||e); }
    });
  }
  // 코스웨어 설계 (옛 엔진) : 교과/창체 · 인터뷰/직접설계 → arche-ai course_lesson → design_items
  function openCourseware(container, stu, name, grade, profile){
    var ov=ovOpen(); var lvl=gradeLevel(grade); var sid=stu.id||stu.student_id; var _last=null;
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    var subOpts=subjectsFor(grade).map(function(x){return '<option>'+esc(x)+'</option>';}).join('');
    var chOpts=CHANGCHE.map(function(x){return '<option>'+esc(x)+'</option>';}).join('');
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · 코스웨어 설계</h2>'
      +'<div class="note" style="margin-bottom:8px">출력: <b>탐구목적 · 탐구주제 · 목차(서론·본론·결론)</b> + 성장 서사. '+esc(termLabel(grade))+' 기준 · 같은 학원·학년·진로 학생과 <b>주제 중복 자동 회피</b>'+(profile?' · 학생 인터뷰 자동 반영':'')+'</div>'
      +'<div class="row" style="gap:6px"><button class="act pri" id="tab-subj">📚 교과형</button><button class="act gh" id="tab-ch">🎨 창체활동</button></div>'
      +'<div id="pick-subj" style="margin-top:10px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">과목 (선택 또는 직접입력)</div><select id="cw-subj">'+subOpts+'<option value="__custom">+ 직접입력</option></select><input id="cw-subjc" placeholder="과목 직접입력" style="margin-top:6px;display:none"></div>'
      +'<div id="pick-ch" style="margin-top:10px;display:none"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">창체 영역 (선택 또는 직접입력)</div><select id="cw-ch">'+chOpts+'<option value="__custom">+ 직접입력</option></select><input id="cw-chc" placeholder="동아리/활동명 직접입력" style="margin-top:6px;display:none"></div>'
      +'<div style="margin-top:10px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">희망 진로·계열</div><input id="cw-field" value="'+esc(stu.career||stu.target_major||(profile&&profile.field)||'')+'" placeholder="예: 데이터·통계 / 생명공학"></div>'
      +'<div style="margin-top:8px"><div style="font-size:12.5px;font-weight:800;color:#1A237E;margin-bottom:4px">컨설턴트/학부모 설계 방향 <span style="font-weight:600;color:#8b95a1">(선택 — 비우면 인터뷰·자료 기반 자동)</span></div><textarea id="cw-design" rows="4" placeholder="예) 회귀·상관 개념으로 지역 미세먼지 공공데이터를 분석 → 정책 제언까지. (비워도 됨)"></textarea></div>'
      +'<div class="row" style="margin-top:10px"><button class="act gd" id="cw-gen">🤖 코스웨어 설계 생성</button></div><div class="note" id="cw-msg" style="margin-top:4px"></div>'
      +'<div id="cw-out" style="margin-top:10px"></div>';
    function setTab(k){ card._kind=k; card.querySelector('#pick-subj').style.display=(k==='subject')?'':'none'; card.querySelector('#pick-ch').style.display=(k==='changche')?'':'none'; card.querySelector('#tab-subj').className='act '+(k==='subject'?'pri':'gh'); card.querySelector('#tab-ch').className='act '+(k==='changche'?'pri':'gh'); }
    card.querySelector('#tab-subj').addEventListener('click',function(){setTab('subject');});
    card.querySelector('#tab-ch').addEventListener('click',function(){setTab('changche');});
    setTab('subject');
    card.querySelector('#cw-subj').addEventListener('change',function(){ card.querySelector('#cw-subjc').style.display=(this.value==='__custom')?'':'none'; });
    card.querySelector('#cw-ch').addEventListener('change',function(){ card.querySelector('#cw-chc').style.display=(this.value==='__custom')?'':'none'; });
    function cwPreview(d){ var outline=Array.isArray(d.outline)?d.outline.join('\n'):(d.outline||'');
      var h='<div class="rep"><h4>🧭 코스웨어 설계도</h4>';
      h+='<div class="lb">탐구 주제</div><p>'+esc(d.title||'')+'</p>';
      h+='<div class="lb">탐구 목적</div><p>'+esc(d.goal||'')+'</p>';
      if(d.detail)h+='<div class="lb">수행 가이드</div><p style="white-space:pre-wrap">'+esc(d.detail)+'</p>';
      if(outline)h+='<div class="lb">탐구 목차 (서론·본론·결론)</div><p style="white-space:pre-line">'+esc(outline)+'</p>';
      if(d.method)h+='<div class="lb">탐구 방법</div><p>'+esc(d.method)+'</p>';
      if(d.standard)h+='<div class="lb">연계 성취기준·학습요소</div><p>'+esc(d.standard)+'</p>';
      if(d.output)h+='<div class="lb">산출물</div><p>'+esc(d.output)+'</p>';
      return h+'</div><div class="row"><button class="act dn" id="cw-send">학생에게 전송</button></div>'; }
    async function cwSend(){ if(!_last)return; var m=card.querySelector('#cw-msg'); var d=_last.d;
      var outline=Array.isArray(d.outline)?d.outline.join('\n'):(d.outline||'');
      var detail=(d.detail||'')+(d.method?'\n[탐구방법] '+d.method:'')+(d.standard?'\n[연계 학습요소] '+d.standard:'')+(d.output?'\n[산출물] '+d.output:'')+(d.link?'\n[연결] '+d.link:'');
      var row={ student_id:sid, grade:String(grade||''), sem:curSemester()+'학기', subject:(_last.kind==='subject'?_last.name:''), area:_last.area, title:(d.title||_last.name), goal:(d.goal||''), detail:detail, outline:outline, seq:_last.seq, status:'예정', sent:true };
      m.style.color='#6b7688'; m.textContent='전송 중…';
      try{ var r=await window.sb.from('design_items').insert(row); if(r&&r.error)throw r.error;
        try{ if(window.sb) window.sb.from('app_notifications').insert({academy_id:acadId(), student_id:sid, recipient:'stu', kind:'design', title:'코스웨어 설계 도착', body:'새 탐구 코스웨어가 도착했어요.', view:(lvl==='goip'?'gdesign':'sr')}); }catch(_e){}
        m.style.color='#137a44'; m.textContent='학생에게 전송했어요 ✅';
        setTimeout(function(){ ov.remove(); remount(container,'staff'); },900);
      }catch(e){ m.style.color='#c0313d'; m.textContent='전송 실패: '+(e.message||e); } }
    card.querySelector('#cw-gen').addEventListener('click', async function(){
      var kind=card._kind||'subject'; var m=card.querySelector('#cw-msg'); var name2, area;
      if(kind==='subject'){ var sv=card.querySelector('#cw-subj').value; name2=(sv==='__custom')?card.querySelector('#cw-subjc').value.trim():sv; area='과세특'; }
      else { var cv=card.querySelector('#cw-ch').value; name2=(cv==='__custom')?card.querySelector('#cw-chc').value.trim():cv; area=(name2.indexOf('동아리')>=0?'동아리':(name2.indexOf('진로')>=0?'진로':(name2.indexOf('봉사')>=0?'봉사':(name2.indexOf('독서')>=0?'독서':'자율')))); }
      if(!name2){ m.style.color='#c0313d'; m.textContent=(kind==='subject'?'과목을':'창체 영역을')+' 선택/입력하세요.'; return; }
      var fld=card.querySelector('#cw-field').value.trim(); var design=card.querySelector('#cw-design').value.trim();
      var btn=this; btn.disabled=true; var _t=btn.textContent; btn.innerHTML='<span class="spin"></span>생성 중…'; m.textContent='';
      try{ var ctxParts=[];
        if(profile&&profile.answers){ ctxParts.push('[학생 인터뷰]\n'+Object.keys(profile.answers).map(function(k){return k+': '+profile.answers[k];}).join('\n')); }
        if(design){ ctxParts.push('[컨설턴트/학부모 설계 방향]\n'+design); }
        var prev=await myDesignItems(sid); var prevTxt=prev.map(function(x){return '· '+(x.subject||x.area||'')+' | '+(x.title||'');}).join('\n');
        var avoid=await otherDesignTitles(stu);
        var payload={ kind:(kind==='subject'?'subject':'changche'), name:name2, course:(kind==='subject'?'교과 탐구':'창의적 체험활동'), career:(stu.career||stu.target_major||fld||''), field:fld, target:(lvl==='goip'?(stu.target_school||''):(stu.target_univ||'')), term:termLabel(grade), level:lvl, prev:(prevTxt||'(없음)'), existing:'', context:(ctxParts.join('\n\n')||'(자료 없음 — 진로·과목 기반 설계)'), avoid:avoid };
        var res=await callArche('course_lesson',payload); var d=JSON.parse(res.text);
        _last={ d:d, kind:kind, name:name2, area:area, seq:(prev.reduce(function(mx,x){return Math.max(mx,(typeof x.seq==='number'?x.seq:0));},0)+1) };
        card.querySelector('#cw-out').innerHTML=cwPreview(d);
        var sb2=card.querySelector('#cw-send'); if(sb2)sb2.addEventListener('click',function(){ cwSend(); });
        m.style.color='#137a44'; m.textContent='설계 초안이 생성됐어요. 검토 후 전송하세요.';
      }catch(e){ m.style.color='#c0313d'; m.textContent='생성 실패: '+(e.message||e); }
      btn.disabled=false; btn.textContent=_t;
    });
  }
  async function openReview(container, r, name, grade){
    var ov=ovOpen(); var lvl=gradeLevel(grade);
    var box=el('<div class="acb"><div class="card"></div></div>'); var card=box.querySelector('.card'); ov.querySelector('.bd').appendChild(box);
    var fb=r.coach_feedback||{};
    card.innerHTML='<h2 style="margin:0 0 4px">'+esc(name||'학생')+' · '+esc(r.title||'탐구보고서')+'</h2><div class="note" style="margin-bottom:8px">완성 문장을 대신 써주지 마세요. <b>강점·깊이·다음 방향</b> 중심으로 평가합니다. · 수준: '+(lvl==='dae'?'고등(대입)':'중등(고입)')+'</div>';
    card.insertAdjacentHTML('beforeend', wsQaHtml(r));
    try{ var _rf=await getReflection(r.student_id, r.id); var _rh=_rf?reflectionHtml(_rf):''; if(_rh)card.insertAdjacentHTML('beforeend', _rh); }catch(_e){}
    card.insertAdjacentHTML('beforeend', '<div class="row"><button class="act gd" id="cbai">🤖 AI 평가 리포트 생성</button><button class="act gh" id="cbdna">🧬 타이핑DNA 진정성</button></div><div class="note" id="cbaimsg" style="margin-top:4px"></div><div id="cbrep" style="margin-top:8px"></div><div id="cbdnabox" style="margin-top:8px"></div>');
    // 기존 평가 있으면 표시
    if(fb&&(fb.report||fb.note)) card.querySelector('#cbrep').innerHTML=reportHtml(fb);
    var repData=(fb&&fb.report)||null;
    card.querySelector('#cbai').addEventListener('click', async function(){
      var btn=this, m=card.querySelector('#cbaimsg'); btn.disabled=true; var _t=btn.textContent; btn.innerHTML='<span class="spin"></span>AI 평가 중…'; m.textContent='';
      try{ var qs=r.questions||[]; var ansText=(r.answers&&r.answers.text)||JSON.stringify(r.answers||{});
        var d=await callCoach({ questions:qs, answers:ansText, field:(r.field||''), topic:(r.topic||r.title||''), name:(name||''), grade:(grade||''), level:lvl });
        repData={note:d.note,strengths:d.strengths,depth:d.depth,questions:d.questions,next:d.next,expression:d.expression};
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
        try{ if(window.sb) window.sb.from('app_notifications').insert({academy_id:acadId(), student_id:r.student_id, recipient:'stu', kind:'design', title:'진로 탐구 평가 도착', body:'학부모(선생님)가 진로 탐구 평가를 보냈어요.', view:(window._designTrack==='goip'?'gdesign':'sr')}); }catch(_e){}
        m.style.color='#137a44'; m.textContent='자녀에게 회신했어요 ✅';
        setTimeout(function(){ ov.remove(); remount(container,'staff'); },800);
      }catch(e){ this.disabled=false; m.style.color='#c0313d'; m.textContent='회신 실패: '+(e.message||e); }
    });
    if(window.ArcheExport){
      var xbar=el('<div class="row" style="margin-top:10px;border-top:1px dashed #e6e9f0;padding-top:10px"></div>');
      xbar.appendChild(el('<div style="width:100%;font-size:11.5px;color:#8b95a1;margin-bottom:4px">📤 내보내기 (평가 리포트 + 탐구보고서)</div>'));
      var tt=(r.title||r.topic||'진로 탐구보고서'), ss=((name||'')+' · '+(r.topic||r.field||'진로 징검다리'));
      function curBody(){ var rr={}; for(var k in r)rr[k]=r[k]; if(repData)rr.coach_feedback={report:repData,note:repData.note,questions:repData.questions}; return exportBodyHtml(rr); }
      function mkx(lbl,cls,fn){ var b=el('<button class="act '+cls+'">'+lbl+'</button>'); b.addEventListener('click',fn); return b; }
      xbar.appendChild(mkx('📄 PDF','gh',function(){ ArcheExport.pdf({title:tt,subtitle:ss,html:curBody()}); }));
      xbar.appendChild(mkx('📝 DOCX','mut',function(){ ArcheExport.docx({title:tt,subtitle:ss,html:curBody()}); }));
      xbar.appendChild(mkx('📗 HWPX','mut',function(){ ArcheExport.hwpx({title:tt,subtitle:ss,html:curBody()}); }));
      card.appendChild(xbar);
    }
  }

  window.ArcheCareerBridge={ mount:mount, version:'4.0' };
})();
