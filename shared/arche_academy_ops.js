/* ============================================================================
 * arche_academy_ops.js · 학원 운영 모듈 (신규 앱 → 컨설팅 앱 공용 이식)
 * ----------------------------------------------------------------------------
 * 신규 학원앱(index.html)에서 추출한 자체완결 모듈. 두 앱 공용.
 * 의존 전역: window.sb, window._acadId, window._myUid  (esc/phRaw는 내부 정의)
 * 제공: window.mountStudentMgmt(host)  — 학원생 관리(정보·상담·진로·시험성적·추이)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function phRaw(icon,title,desc){
    return '<div style="border:1.5px dashed var(--line,#e5e8eb);border-radius:14px;padding:30px 24px;text-align:center;background:#fff;margin-top:12px">'
      +'<div style="font-size:30px">'+icon+'</div><div style="font-size:15px;font-weight:800;margin-top:8px">'+title+'</div>'
      +'<div style="font-size:12.5px;color:var(--ink-dim,#4e5968);margin-top:6px;line-height:1.6">'+desc+'</div></div>';
  }
  function sb(){ return window.sb; }

  /* ========================= 학원생 관리 (정보·상담·진로·성적·추이) ========================= */
  async function mountStudentMgmt(host){
    var acid=window._acadId;
    if(!window.sb || !acid){ host.innerHTML=phRaw('🔌','미연결','로그인 후 이용할 수 있어요.'); return; }
    var S={ list:[], sel:null, tab:'info', consults:[], exams:[], editC:null };
    function inp(id,val,ph,w){ return '<input id="'+id+'" value="'+(val==null?'':esc(String(val)))+'" placeholder="'+(ph||'')+'" style="'+(w||'flex:1;min-width:120px')+';padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'; }
    function gv(id){ var e=host.querySelector('#'+id); return e?(e.value||'').trim():''; }
    async function loadList(){
      var r=await sb().from('students').select('id,name,school,grade,student_phone,parent_phone,phone,subjects,career,interest,target_univ,target_major,target_major2,target_major3,target_school,target_school_type,class_id').eq('academy_id',acid).order('name'); S.list=(r&&r.data)||[];
      try{ var rc=await sb().from('academy_classes').select('id,name').eq('academy_id',acid).order('created_at'); S.classes=(rc&&rc.data)||[]; }catch(e){ S.classes=[]; }
      S.acct={}; try{ var ra=await sb().from('student_accounts').select('student_id,login_id').eq('academy_id',acid); (ra&&ra.data||[]).forEach(function(a){ S.acct[a.student_id]=a; }); }catch(e){}
    }
    function clsOpts(sel){ return '<option value="">— 반 미배정 —</option>'+(S.classes||[]).map(function(c){ return '<option value="'+c.id+'"'+(c.id===sel?' selected':'')+'>'+esc(c.name)+'</option>'; }).join(''); }
    async function loadSub(){ if(!S.sel){return;} try{ var rc=await sb().from('consultations').select('*').eq('student_id',S.sel.id).order('created_at',{ascending:false}); S.consults=(rc&&rc.data)||[]; }catch(e){ S.consults=[]; } try{ var re=await sb().from('academy_exams').select('*').eq('student_id',S.sel.id).order('exam_date',{ascending:true}); S.exams=(re&&re.data)||[]; }catch(e){ S.exams=[]; } }
    function shell(){
      var reg='<div class="card"><div style="font-weight:800;font-size:14px;margin-bottom:10px">＋ 신규 학생 등록</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        +'<input id="sm-nname" placeholder="이름 *" style="width:110px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="sm-nschool" placeholder="학교" style="width:120px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="sm-ngrade" placeholder="학년" style="width:85px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="sm-nsphone" placeholder="학생 연락처" style="width:120px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="sm-npphone" placeholder="부모 연락처" style="width:120px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="sm-nsubj" placeholder="수강 과목" style="width:120px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<select id="sm-nclass" style="width:140px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+clsOpts('')+'</select>'
        +'<button class="tab on" id="sm-nadd" style="padding:9px 16px">+ 등록</button></div>'
        +'<div id="sm-nmsg" style="font-size:12px;margin-top:6px"></div></div>';
      var rows=S.list.map(function(s){
        var a=S.acct[s.id];
        var acct=a?('<b>'+esc(a.login_id)+'</b> <span style="color:var(--ink-mute)">/0000</span>'):'<button class="tab on" data-issue="'+s.id+'" style="padding:4px 10px;font-size:11px">🔑 계정 발급</button>';
        return '<tr style="border-top:1px solid var(--line-soft)"><td style="padding:8px;font-weight:700">'+esc(s.name||'-')+'</td>'
          +'<td style="padding:8px;color:var(--ink-dim)">'+esc(s.school||'')+(s.grade?(' · '+esc(s.grade)):'')+'</td>'
          +'<td style="padding:8px"><select data-cmove="'+s.id+'" style="padding:6px 9px;border:1px solid var(--line);border-radius:8px;font-size:12px;min-width:120px">'+clsOpts(s.class_id)+'</select></td>'
          +'<td style="padding:8px;font-size:12px">'+acct+'</td>'
          +'<td style="padding:8px;text-align:right;white-space:nowrap"><button class="tab on" data-open="'+s.id+'" style="padding:4px 10px;font-size:11px">관리 →</button> <button class="tab" data-sdel="'+s.id+'" style="padding:4px 8px;font-size:11px;color:var(--risk)">삭제</button></td></tr>';
      }).join('')||'<tr><td colspan="5" style="padding:14px;color:var(--ink-mute)">등록된 학생이 없습니다. 위에서 등록하세요.</td></tr>';
      var listCard='<div class="card"><div style="font-weight:800;font-size:14px;margin-bottom:10px">👥 학생 '+S.list.length+'명 <span style="font-size:11px;color:var(--ink-mute);font-weight:400">· 반 배정 변경 · [관리]에서 상세</span></div>'
        +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:var(--ink-mute);font-size:11px"><th style="padding:6px 8px">이름</th><th style="padding:6px 8px">학교·학년</th><th style="padding:6px 8px">반</th><th style="padding:6px 8px">로그인</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>';
      host.innerHTML=reg+listCard+'<div id="sm-detail"></div>';
      var badd=host.querySelector('#sm-nadd'); if(badd) badd.onclick=addStudentSM;
      host.querySelectorAll('[data-open]').forEach(function(x){ x.onclick=function(){ selectStu(x.getAttribute('data-open')); var d=host.querySelector('#sm-detail'); if(d) try{ d.scrollIntoView({behavior:'smooth',block:'start'}); }catch(_){}; }; });
      host.querySelectorAll('[data-sdel]').forEach(function(x){ x.onclick=function(){ delStudentSM(x.getAttribute('data-sdel')); }; });
      host.querySelectorAll('[data-cmove]').forEach(function(x){ x.onchange=function(){ moveClassSM(x.getAttribute('data-cmove'), x.value||null); }; });
      host.querySelectorAll('[data-issue]').forEach(function(x){ x.onclick=function(){ issueAccountSM(x.getAttribute('data-issue'), x); }; });
      if(S.sel) renderDetail();
    }
    async function addStudentSM(){
      var m=host.querySelector('#sm-nmsg'); var nm=gv('sm-nname'); if(!nm){ m.style.color='var(--risk)'; m.textContent='이름을 입력하세요.'; return; }
      m.style.color='var(--ink-mute)'; m.textContent='등록 중…';
      var row={ academy_id:acid, name:nm, school:gv('sm-nschool')||null, grade:gv('sm-ngrade')||null, student_phone:gv('sm-nsphone')||null, parent_phone:gv('sm-npphone')||null, subjects:gv('sm-nsubj')||null, class_id:(host.querySelector('#sm-nclass').value||null) };
      if(window._myUid) row.consultant_uid=window._myUid;
      var r=await sb().from('students').insert(row); if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      await loadList(); shell();
    }
    async function moveClassSM(sid,cid){ var r=await sb().from('students').update({class_id:cid}).eq('id',sid); if(r.error){ alert('반 변경 실패: '+r.error.message); } await loadList(); if(S.sel&&S.sel.id===sid) S.sel.class_id=cid; }
    async function delStudentSM(sid){ if(!confirm('이 학생을 삭제할까요?'))return; var r=await sb().from('students').delete().eq('id',sid); if(r.error){ alert('삭제 실패: '+r.error.message); return; } if(S.sel&&S.sel.id===sid) S.sel=null; await loadList(); shell(); }
    async function issueAccountSM(sid,btn){ if(btn){btn.disabled=true;btn.textContent='발급 중…';}
      try{ var sess=(await sb().auth.getSession()).data.session; var base=(window.FN_BASE)||((window.SB_URL||'')+'/functions/v1');
        var r=await fetch(base+'/create-student',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(sess?sess.access_token:''),'apikey':(window.SB_KEY||'')},body:JSON.stringify({student_id:sid})});
        var d=await r.json();
        if(d.error){ if(d.need_code) alert('학원 전용주소(슬러그)를 [학원 설정]에서 먼저 지정하세요.'); else alert('발급 실패: '+d.error); }
        else alert('✓ 계정 발급 완료\n아이디: '+d.login_id+'\n초기 비밀번호: '+(d.pw||'0000'));
        await loadList(); shell();
      }catch(e){ alert('발급 오류: '+((e&&e.message)||e)); if(btn)btn.disabled=false; }
    }
    async function selectStu(id){ if(!id){ S.sel=null; var d=host.querySelector('#sm-detail'); if(d)d.innerHTML=''; return; } S.sel=S.list.filter(function(x){return x.id===id;})[0]||null; await loadSub(); renderDetail(); }
    function tabbar(){ var t=[['info','기본 정보'],['career','진로·진학'],['consult','상담내역'],['score','시험 성적'],['trend','성적 추이']]; return '<div class="tabs" style="margin-top:12px;flex-wrap:wrap">'+t.map(function(x){return '<span class="tab'+(S.tab===x[0]?' on':'')+'" data-smt="'+x[0]+'">'+x[1]+'</span>';}).join('')+'</div>'; }
    function renderDetail(){
      var s=S.sel, d=host.querySelector('#sm-detail'); if(!d||!s) return;
      d.innerHTML='<div class="card"><div style="font-size:16px;font-weight:800">'+esc(s.name||'-')+' <span style="font-size:12px;color:var(--ink-mute);font-weight:500">'+esc(s.school||'')+(s.grade?(' · '+esc(s.grade)):'')+'</span></div>'+tabbar()+'<div id="sm-body" style="margin-top:14px"></div></div>';
      d.querySelectorAll('[data-smt]').forEach(function(b){ b.onclick=function(){ S.tab=b.getAttribute('data-smt'); renderDetail(); }; });
      var body=d.querySelector('#sm-body');
      if(S.tab==='info') body.innerHTML=viewInfo(s);
      else if(S.tab==='career') body.innerHTML=viewCareer(s);
      else if(S.tab==='consult') body.innerHTML=viewConsult(s);
      else if(S.tab==='score') body.innerHTML=viewScore(s);
      else body.innerHTML=viewTrend(s);
      bindBody();
    }
    function row2(label,html){ return '<div style="display:flex;gap:10px;align-items:center;margin-bottom:9px"><div style="width:92px;font-size:12.5px;color:var(--ink-dim);font-weight:700">'+label+'</div><div style="flex:1;display:flex;gap:8px;flex-wrap:wrap">'+html+'</div></div>'; }
    function viewInfo(s){
      return row2('이름', inp('sm-name',s.name,'이름'))
        + row2('학교·학년', inp('sm-school',s.school,'학교','width:150px')+inp('sm-grade',s.grade,'학년(예:중2/고1)','width:120px'))
        + row2('학생 연락처', inp('sm-sphone',s.student_phone||s.phone,'학생 휴대폰','width:170px'))
        + row2('부모 연락처', inp('sm-pphone',s.parent_phone,'학부모 휴대폰','width:170px'))
        + row2('수강 과목', inp('sm-subjects',s.subjects,'예: 국어·수학·영어'))
        + '<div style="margin-top:6px"><button class="tab on" id="sm-save-info" style="padding:9px 18px">저장</button> <span id="sm-info-msg" style="font-size:12px;margin-left:6px"></span></div>';
    }
    function viewCareer(s){
      return row2('희망 진로', inp('sm-career',s.career,'예: 의사/개발자'))
        + row2('관심 분야', inp('sm-interest',s.interest,'관심 분야'))
        + row2('희망 진학교', inp('sm-tschool',s.target_school,'희망 진학 학교(고입/특목 등)'))
        + row2('목표 대학', inp('sm-tuniv',s.target_univ,'목표 대학'))
        + row2('목표 학과', inp('sm-tmajor',s.target_major,'1순위','width:150px')+inp('sm-tmajor2',s.target_major2,'2순위','width:130px'))
        + '<div style="margin-top:6px"><button class="tab on" id="sm-save-career" style="padding:9px 18px">저장</button> <span id="sm-career-msg" style="font-size:12px;margin-left:6px"></span></div>';
    }
    function viewConsult(s){
      var ec=S.editC?(S.consults.filter(function(x){return x.id===S.editC;})[0]||null):null;
      var kOpt=function(v){ return '<option value="student"'+(v!=='parent'?' selected':'')+'>학생 상담</option><option value="parent"'+(v==='parent'?' selected':'')+'>학부모 상담</option>'; };
      var add='<div style="border:1px dashed '+(ec?'var(--brand)':'var(--line)')+';border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">'+(ec?'✎ 상담 기록 수정':'＋ 상담 기록 추가')+'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><select id="sm-ckind" style="width:120px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+kOpt(ec&&ec.kind)+'</select>'
        +inp('sm-ccareer',ec&&ec.career, '희망 진로(선택)','width:150px')+inp('sm-ctarget',ec&&ec.target_univ, '목표 대학/학교(선택)','width:160px')+'</div>'
        +'<textarea id="sm-cact" placeholder="활동/현황(선택)" style="width:100%;min-height:44px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px;margin-bottom:8px">'+(ec?esc(ec.activities||''):'')+'</textarea>'
        +'<textarea id="sm-cmemo" placeholder="상담 내용(메모) *" style="width:100%;min-height:60px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+(ec?esc(ec.memo||''):'')+'</textarea>'
        +'<div style="margin-top:8px"><button class="tab on" id="sm-add-consult" style="padding:9px 18px">'+(ec?'수정 저장':'상담 저장')+'</button>'+(ec?' <button class="tab" id="sm-cancel-consult" style="padding:9px 14px">취소</button>':'')+' <span id="sm-consult-msg" style="font-size:12px;margin-left:6px"></span></div></div>';
      var list=S.consults.map(function(c){
        var badge=(c.kind==='parent')?'<span style="font-size:10.5px;font-weight:800;color:#7b5fef;background:#f0edff;border-radius:20px;padding:2px 8px">학부모</span>':'<span style="font-size:10.5px;font-weight:800;color:#137a44;background:#eafaf0;border-radius:20px;padding:2px 8px">학생</span>';
        var meta=[c.target_univ,c.target_major,c.career].filter(Boolean).join(' · ');
        return '<div style="border:1px solid '+(S.editC===c.id?'var(--brand)':'var(--line)')+';border-radius:10px;padding:11px 13px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'+badge+'<span style="font-size:11px;color:var(--ink-mute)">'+esc((c.created_at||'').slice(0,10))+'</span>'+(meta?'<span style="font-size:11.5px;color:var(--ink-dim)">'+esc(meta)+'</span>':'')+'<span style="margin-left:auto"></span><button class="tab" data-cedit="'+c.id+'" style="padding:3px 9px;font-size:10.5px">수정</button> <button class="tab" data-cdel="'+c.id+'" style="padding:3px 9px;font-size:10.5px;color:var(--risk)">삭제</button></div>'
          +(c.activities?'<div style="font-size:12.5px;color:var(--ink-dim);margin-bottom:3px">활동: '+esc(c.activities)+'</div>':'')
          +'<div style="font-size:13px;white-space:pre-wrap">'+esc(c.memo||'')+'</div></div>';
      }).join('')||'<div style="color:var(--ink-mute);font-size:13px">상담 기록이 없습니다.</div>';
      return add+list;
    }
    function viewScore(s){
      var today=new Date().toISOString().slice(0,10);
      var add='<div style="border:1px dashed var(--line);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-weight:700;font-size:13px;margin-bottom:8px">＋ 시험 성적 입력</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
        +'<input id="sm-edate" type="date" value="'+today+'" style="padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<select id="sm-etype" style="width:110px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px"><option value="학원">학원시험</option><option value="내신">학교내신</option></select>'
        +inp('sm-etitle','', '시험명(예: 3월 모의고사)','width:170px')+inp('sm-esubj','', '과목','width:90px')
        +'<input id="sm-escore" type="number" step="0.1" placeholder="점수" style="width:80px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="sm-emax" type="number" step="0.1" value="100" placeholder="만점" style="width:80px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px"></div>'
        +'<button class="tab on" id="sm-add-exam" style="padding:9px 18px">성적 저장</button> <span id="sm-score-msg" style="font-size:12px;margin-left:6px"></span></div>';
      var rows=S.exams.slice().sort(function(a,b){return String(b.exam_date).localeCompare(String(a.exam_date));}).map(function(e){
        var pct=(e.score!=null)?Math.round((Number(e.score)/(Number(e.max_score)||100))*1000)/10:null;
        var tb=(e.exam_type==='내신')?'#1A237E':'#00b39c';
        return '<tr style="border-top:1px solid var(--line-soft)"><td style="padding:7px 8px">'+esc((e.exam_date||'').slice(0,10))+'</td>'
          +'<td style="padding:7px 8px"><span style="font-size:10.5px;font-weight:800;color:#fff;background:'+tb+';border-radius:20px;padding:2px 8px">'+esc(e.exam_type||'학원')+'</span></td>'
          +'<td style="padding:7px 8px">'+esc(e.title||'-')+(e.subject?' <span style="color:var(--ink-mute)">'+esc(e.subject)+'</span>':'')+'</td>'
          +'<td style="padding:7px 8px;font-weight:700">'+(e.score!=null?esc(e.score)+' / '+esc(e.max_score||100)+(pct!=null?(' ('+pct+'%)'):''):'-')+'</td>'
          +'<td style="padding:7px 8px;text-align:right"><button class="tab" data-edel="'+e.id+'" style="padding:3px 9px;font-size:10.5px;color:var(--risk)">삭제</button></td></tr>';
      }).join('');
      var list=S.exams.length?('<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--ink-mute);font-size:11px;text-align:left"><th style="padding:6px 8px">날짜</th><th style="padding:6px 8px">구분</th><th style="padding:6px 8px">시험·과목</th><th style="padding:6px 8px">점수</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>')
        :'<div style="color:var(--ink-mute);font-size:13px">입력된 성적이 없습니다.</div>';
      return add+list;
    }
    function viewTrend(s){
      return '<div style="display:flex;gap:8px;margin-bottom:10px"><span class="tab'+(S._tf!=='내신'&&S._tf!=='학원'?' on':'')+'" data-tf="all">전체</span><span class="tab'+(S._tf==='학원'?' on':'')+'" data-tf="학원">학원시험</span><span class="tab'+(S._tf==='내신'?' on':'')+'" data-tf="내신">학교내신</span></div>'
        + trendSvg(S.exams.filter(function(e){ return (!S._tf||S._tf==='all')?true:(e.exam_type===S._tf); }));
    }
    function trendSvg(exams){
      var rows=(exams||[]).filter(function(e){return e.score!=null;}).map(function(e){ return {date:e.exam_date,type:e.exam_type||'학원',pct:Math.round((Number(e.score)/(Number(e.max_score)||100))*1000)/10,label:(String(e.exam_date||'').slice(5).replace('-','/'))}; });
      if(rows.length<1) return '<div style="color:var(--ink-mute);font-size:13px;padding:16px 0">표시할 성적이 없습니다. [시험 성적]에서 점수를 입력하세요.</div>';
      rows.sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
      var W=680,H=240,pL=40,pR=14,pT=14,pB=38,n=rows.length;
      function xOf(i){ return pL+(n<=1?(W-pL-pR)/2:(W-pL-pR)*i/(n-1)); }
      function yOf(v){ return pT+(H-pT-pB)*(1-v/100); }
      var grid=''; [0,25,50,75,100].forEach(function(g){ var y=yOf(g); grid+='<line x1="'+pL+'" y1="'+y.toFixed(1)+'" x2="'+(W-pR)+'" y2="'+y.toFixed(1)+'" stroke="#eef0f3"/><text x="'+(pL-6)+'" y="'+(y+3).toFixed(1)+'" font-size="10" fill="#8b95a1" text-anchor="end">'+g+'</text>'; });
      var COL={'내신':'#1A237E','학원':'#00b39c'}, series={};
      rows.forEach(function(r,i){ (series[r.type]=series[r.type]||[]).push({x:xOf(i),y:yOf(r.pct)}); });
      var lines=''; Object.keys(series).forEach(function(t){ var pts=series[t],col=COL[t]||'#c8a24a';
        lines+='<polyline points="'+pts.map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="2.5"/>';
        lines+=pts.map(function(p){return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.5" fill="'+col+'"/>';}).join(''); });
      var xlab=rows.map(function(r,i){ return '<text x="'+xOf(i).toFixed(1)+'" y="'+(H-pB+15)+'" font-size="9.5" fill="#6b7688" text-anchor="middle">'+esc(r.label)+'</text>'; }).join('');
      var legend=Object.keys(series).map(function(t){ var col=COL[t]||'#c8a24a'; return '<span style="font-size:11px;color:#4e5968;margin-right:10px"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:'+col+';margin-right:4px"></span>'+esc(t)+'</span>'; }).join('');
      return '<div style="overflow-x:auto"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:520px;height:auto">'+grid+lines+xlab+'</svg></div><div style="margin-top:4px">'+legend+' <span style="font-size:11px;color:#8b95a1">· 세로축 = 득점률(%)</span></div>';
    }
    function bindBody(){
      var b1=host.querySelector('#sm-save-info'); if(b1) b1.onclick=saveInfo;
      var b2=host.querySelector('#sm-save-career'); if(b2) b2.onclick=saveCareer;
      var b3=host.querySelector('#sm-add-consult'); if(b3) b3.onclick=addConsult;
      var bc=host.querySelector('#sm-cancel-consult'); if(bc) bc.onclick=function(){ S.editC=null; renderDetail(); };
      var b4=host.querySelector('#sm-add-exam'); if(b4) b4.onclick=addExam;
      host.querySelectorAll('[data-cedit]').forEach(function(x){ x.onclick=function(){ S.editC=x.getAttribute('data-cedit'); renderDetail(); var d=host.querySelector('#sm-detail'); if(d)try{d.scrollIntoView({behavior:'smooth',block:'start'});}catch(_){} }; });
      host.querySelectorAll('[data-cdel]').forEach(function(x){ x.onclick=function(){ delConsult(x.getAttribute('data-cdel')); }; });
      host.querySelectorAll('[data-edel]').forEach(function(x){ x.onclick=function(){ delExam(x.getAttribute('data-edel')); }; });
      host.querySelectorAll('[data-tf]').forEach(function(x){ x.onclick=function(){ var v=x.getAttribute('data-tf'); S._tf=(v==='all')?null:v; renderDetail(); }; });
    }
    async function saveInfo(){ var m=host.querySelector('#sm-info-msg'); m.style.color='var(--ink-mute)'; m.textContent='저장 중…';
      var upd={ name:gv('sm-name')||S.sel.name, school:gv('sm-school')||null, grade:gv('sm-grade')||null, student_phone:gv('sm-sphone')||null, parent_phone:gv('sm-pphone')||null, subjects:gv('sm-subjects')||null };
      var r=await sb().from('students').update(upd).eq('id',S.sel.id); if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      m.style.color='var(--safe)'; m.textContent='✓ 저장됨'; await loadList(); S.sel=Object.assign(S.sel,upd); }
    async function saveCareer(){ var m=host.querySelector('#sm-career-msg'); m.style.color='var(--ink-mute)'; m.textContent='저장 중…';
      var upd={ career:gv('sm-career')||null, interest:gv('sm-interest')||null, target_school:gv('sm-tschool')||null, target_univ:gv('sm-tuniv')||null, target_major:gv('sm-tmajor')||null, target_major2:gv('sm-tmajor2')||null };
      var r=await sb().from('students').update(upd).eq('id',S.sel.id); if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      m.style.color='var(--safe)'; m.textContent='✓ 저장됨'; S.sel=Object.assign(S.sel,upd); }
    async function addConsult(){ var m=host.querySelector('#sm-consult-msg'); var memo=gv('sm-cmemo'); if(!memo){ m.style.color='var(--risk)'; m.textContent='상담 내용을 입력하세요.'; return; }
      var row={ kind:(host.querySelector('#sm-ckind').value||'student'), career:gv('sm-ccareer')||null, target_univ:gv('sm-ctarget')||null, activities:gv('sm-cact')||null, memo:memo };
      m.style.color='var(--ink-mute)'; m.textContent='저장 중…';
      var r;
      if(S.editC){ r=await sb().from('consultations').update(row).eq('id',S.editC); }
      else { row.student_id=S.sel.id; r=await sb().from('consultations').insert(row); }
      if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      S.editC=null; await loadSub(); renderDetail(); }
    async function delConsult(id){ if(!confirm('이 상담 기록을 삭제할까요?'))return; var r=await sb().from('consultations').delete().eq('id',id); if(r.error){ alert('삭제 실패: '+r.error.message); return; } if(S.editC===id) S.editC=null; await loadSub(); renderDetail(); }
    async function addExam(){ var m=host.querySelector('#sm-score-msg'); var sc=gv('sm-escore'); if(sc===''){ m.style.color='var(--risk)'; m.textContent='점수를 입력하세요.'; return; }
      var row={ academy_id:acid, student_id:S.sel.id, exam_date:(gv('sm-edate')||new Date().toISOString().slice(0,10)), exam_type:(host.querySelector('#sm-etype').value||'학원'), title:gv('sm-etitle')||null, subject:gv('sm-esubj')||null, score:Number(sc), max_score:Number(gv('sm-emax')||100) };
      m.style.color='var(--ink-mute)'; m.textContent='저장 중…';
      var r=await sb().from('academy_exams').insert(row); if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      await loadSub(); renderDetail(); }
    async function delExam(id){ if(!confirm('이 성적을 삭제할까요?'))return; var r=await sb().from('academy_exams').delete().eq('id',id); if(r.error){ alert('삭제 실패: '+r.error.message); return; } await loadSub(); renderDetail(); }

    host.innerHTML=phRaw('⏳','불러오는 중…','');
    await loadList(); shell();
  }

  window.mountStudentMgmt = mountStudentMgmt;

  /* 통계 카드 (자체 스타일) */
  function statCards(cards){
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:4px">'+cards.map(function(c){
      return '<div style="background:var(--panel,#fff);border:1px solid var(--line,#e5e8eb);border-radius:14px;padding:16px"><div style="font-size:11.5px;font-weight:700;color:var(--ink-mute,#8b95a1)">'+c.k+'</div><div style="font-size:24px;font-weight:900;margin-top:6px;letter-spacing:-.02em">'+c.v+(c.s?'<small style="font-size:13px;font-weight:700;color:var(--ink-mute,#8b95a1)"> '+c.s+'</small>':'')+'</div>'+(c.d?'<div style="font-size:11.5px;color:var(--ink-dim,#4e5968);margin-top:4px">'+c.d+'</div>':'')+'</div>';
    }).join('')+'</div>';
  }
  function cardWrap(inner){ return '<div style="background:var(--panel,#fff);border:1px solid var(--line,#e5e8eb);border-radius:14px;padding:16px;margin-top:12px">'+inner+'</div>'; }

  /* ========================= 정기(월/분기/연간) 리포트 — 원장·강사 (내부 과목분석 포함) ========================= */
  async function mountPeriodMgmt(host){
    var sb=window.sb, acid=window._acadId;
    if(!sb || !acid){ host.innerHTML=phRaw('🔌','미연결','로그인 후 이용하세요.'); return; }
    if(!window.ArchePentaPeriod){ host.innerHTML=phRaw('⚠️','모듈 미로드','arche_penta_period.js 로드를 확인하세요.'); return; }
    var COURSE_OPTS=[['vision','starter','펜타 비전 기초'],['vision','architecture','펜타 비전 심화'],['track','','펜타 트랙']];
    function courseIdx(pc){ if(pc==='architecture')return 1; if(pc==='track')return 2; return 0; }
    host.innerHTML=phRaw('⏳','불러오는 중…','');
    var r=await sb.from('students').select('id,name,grade,penta_course').eq('academy_id',acid).order('name');
    var list=(r&&r.data)||[];
    if(!list.length){ host.innerHTML=phRaw('👥','학생 없음','[학원생 관리]에서 학생을 먼저 등록하세요.'); return; }
    host.innerHTML='<div style="background:var(--panel,#fff);border:1px solid var(--line,#e5e8eb);border-radius:14px;padding:16px"><div style="font-weight:800;font-size:14px;margin-bottom:4px">📈 정기 성장 리포트 <span style="font-size:11px;color:var(--ink-mute);font-weight:400">· 월간·분기·반기·연간</span></div>'
      +'<div style="font-size:12px;color:var(--ink-mute);margin-bottom:10px;line-height:1.6">학생·코스를 고르면 그 기간의 회차 리포트를 모아 정기 리포트를 생성·발행합니다. 성적이 입력돼 있으면 <b>국·수·사·과 성적×워크북 교차분석(학원 내부용)</b>이 함께 표시됩니다. 학부모 발행분에는 교차분석이 포함되지 않습니다.</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      +'<select id="pm-stu" style="min-width:160px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+list.map(function(s){return '<option value="'+s.id+'">'+esc(s.name||'-')+(s.grade?(' · '+esc(s.grade)):'')+'</option>';}).join('')+'</select>'
      +'<select id="pm-course" style="min-width:150px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+COURSE_OPTS.map(function(c,i){return '<option value="'+i+'">'+c[2]+'</option>';}).join('')+'</select>'
      +'</div></div><div id="pm-host"></div>';
    var stuSel=host.querySelector('#pm-stu'), cSel=host.querySelector('#pm-course');
    function draw(){
      var s=list.filter(function(x){return x.id===stuSel.value;})[0]||list[0];
      var c=COURSE_OPTS[+cSel.value]||COURSE_OPTS[0];
      window.ArchePentaPeriod.mountManage(host.querySelector('#pm-host'), { studentId:s.id, name:s.name, grade:s.grade, stage:c[0], level:c[1], internal:true, academyId:acid });
    }
    cSel.value=String(courseIdx(list[0].penta_course));
    stuSel.onchange=function(){ var s=list.filter(function(x){return x.id===stuSel.value;})[0]; if(s) cSel.value=String(courseIdx(s.penta_course)); draw(); };
    cSel.onchange=draw;
    draw();
  }
  window.mountPeriodMgmt=mountPeriodMgmt;

  /* ========================= 강사: 상담 관리 ========================= */
  async function mountStaffConsult(host){
    var sb=window.sb, acid=window._acadId;
    if(!sb||!acid){ host.innerHTML=phRaw('🔌','미연결','로그인 후 이용할 수 있어요.'); return; }
    var T={ list:[], sel:null, items:[], edit:null };
    function g(id){ var e=host.querySelector('#'+id); return e?(e.value||'').trim():''; }
    async function load(){ var r=await sb.from('students').select('id,name,school,grade').eq('academy_id',acid).order('name'); T.list=(r&&r.data)||[]; }
    async function loadC(){ if(!T.sel){T.items=[];return;} try{ var r=await sb.from('consultations').select('*').eq('student_id',T.sel.id).order('created_at',{ascending:false}); T.items=(r&&r.data)||[]; }catch(e){ T.items=[]; } }
    function render(){
      var opts=T.list.map(function(s){ return '<option value="'+s.id+'"'+(T.sel&&T.sel.id===s.id?' selected':'')+'>'+esc(s.name||'-')+(s.grade?(' · '+esc(s.grade)):'')+'</option>'; }).join('');
      var body='';
      if(T.sel){
        var e=T.edit||{};
        body=cardWrap('<div style="font-weight:800;font-size:14px;margin-bottom:10px">'+(T.edit?'상담 수정':'＋ 상담 기록')+' — '+esc(T.sel.name)+'</div>'
          +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><select id="sc-kind" style="width:120px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px"><option value="student"'+(e.kind!=='parent'?' selected':'')+'>학생 상담</option><option value="parent"'+(e.kind==='parent'?' selected':'')+'>학부모 상담</option></select>'
          +'<input id="sc-career" value="'+esc(e.career||'')+'" placeholder="희망 진로(선택)" style="width:150px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
          +'<input id="sc-target" value="'+esc(e.target_univ||'')+'" placeholder="목표 대학/학교(선택)" style="width:170px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px"></div>'
          +'<textarea id="sc-act" placeholder="활동/현황(선택)" style="width:100%;min-height:40px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px;margin-bottom:8px">'+esc(e.activities||'')+'</textarea>'
          +'<textarea id="sc-memo" placeholder="상담 내용 *" style="width:100%;min-height:60px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+esc(e.memo||'')+'</textarea>'
          +'<div style="margin-top:8px"><button class="tab on" id="sc-save" style="padding:9px 18px">'+(T.edit?'수정 저장':'상담 저장')+'</button>'+(T.edit?' <button class="tab" id="sc-cancel" style="padding:9px 14px">취소</button>':'')+' <span id="sc-msg" style="font-size:12px;margin-left:6px"></span></div>');
        var list=T.items.map(function(c){
          var badge=(c.kind==='parent')?'<span style="font-size:10.5px;font-weight:800;color:#7b5fef;background:#f0edff;border-radius:20px;padding:2px 8px">학부모</span>':'<span style="font-size:10.5px;font-weight:800;color:#137a44;background:#eafaf0;border-radius:20px;padding:2px 8px">학생</span>';
          var meta=[c.target_univ,c.career].filter(Boolean).join(' · ');
          return '<div style="border:1px solid var(--line);border-radius:10px;padding:11px 13px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'+badge+'<span style="font-size:11px;color:var(--ink-mute)">'+esc((c.created_at||'').slice(0,10))+'</span>'+(meta?'<span style="font-size:11.5px;color:var(--ink-dim)">'+esc(meta)+'</span>':'')+'<span style="margin-left:auto"></span><button class="tab" data-ce="'+c.id+'" style="padding:3px 9px;font-size:10.5px">수정</button> <button class="tab" data-cd="'+c.id+'" style="padding:3px 9px;font-size:10.5px;color:var(--risk)">삭제</button></div>'+(c.activities?'<div style="font-size:12.5px;color:var(--ink-dim);margin-bottom:3px">활동: '+esc(c.activities)+'</div>':'')+'<div style="font-size:13px;white-space:pre-wrap">'+esc(c.memo||'')+'</div></div>';
        }).join('')||'<div style="color:var(--ink-mute);font-size:13px">상담 기록이 없습니다.</div>';
        body+=cardWrap(list);
      } else { body=cardWrap('<div style="color:var(--ink-mute);font-size:13px">위에서 학생을 선택하세요.</div>'); }
      host.innerHTML=cardWrap('<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:13px;color:var(--ink-dim)">학생 선택</b>'
        +'<select id="sc-pick" style="flex:1;min-width:180px;padding:10px;border:1px solid var(--line);border-radius:9px;font-size:13px"><option value="">— 학생 선택 ('+T.list.length+'명) —</option>'+opts+'</select></div>')+body;
      var p=host.querySelector('#sc-pick'); if(p) p.onchange=function(){ pick(p.value); };
      var sv=host.querySelector('#sc-save'); if(sv) sv.onclick=save;
      var cc=host.querySelector('#sc-cancel'); if(cc) cc.onclick=function(){ T.edit=null; render(); };
      host.querySelectorAll('[data-ce]').forEach(function(x){ x.onclick=function(){ T.edit=T.items.filter(function(i){return String(i.id)===x.getAttribute('data-ce');})[0]||null; render(); }; });
      host.querySelectorAll('[data-cd]').forEach(function(x){ x.onclick=function(){ del(x.getAttribute('data-cd')); }; });
    }
    async function pick(id){ if(!id){T.sel=null;T.edit=null;render();return;} T.sel=T.list.filter(function(x){return x.id===id;})[0]||null; T.edit=null; await loadC(); render(); }
    async function save(){ var m=host.querySelector('#sc-msg'); var memo=g('sc-memo'); if(!memo){ m.style.color='var(--risk)'; m.textContent='상담 내용을 입력하세요.'; return; }
      var row={ student_id:T.sel.id, kind:(host.querySelector('#sc-kind').value||'student'), career:g('sc-career')||null, target_univ:g('sc-target')||null, activities:g('sc-act')||null, memo:memo };
      m.style.color='var(--ink-mute)'; m.textContent='저장 중…';
      var r = T.edit ? await sb.from('consultations').update(row).eq('id',T.edit.id) : await sb.from('consultations').insert(row);
      if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      T.edit=null; await loadC(); render();
    }
    async function del(id){ if(!confirm('이 상담 기록을 삭제할까요?'))return; var r=await sb.from('consultations').delete().eq('id',id); if(r.error){ alert('삭제 실패: '+r.error.message); return; } await loadC(); render(); }
    host.innerHTML=phRaw('⏳','불러오는 중…',''); await load(); render();
  }
  window.mountStaffConsult=mountStaffConsult;

  /* ========================= 강사 → 원장 보고 ========================= */
  async function mountToOwner(host){
    var sb=window.sb, acid=window._acadId, uid=window._myUid;
    if(!sb||!acid){ host.innerHTML=phRaw('🔌','미연결','로그인 후 이용할 수 있어요.'); return; }
    var students=[], mine=[];
    function g(id){ var e=host.querySelector('#'+id); return e?(e.value||'').trim():''; }
    async function load(){ try{ var r=await sb.from('students').select('id,name').eq('academy_id',acid).order('name'); students=(r&&r.data)||[]; }catch(e){ students=[]; }
      try{ var r2=await sb.from('staff_reports').select('*').eq('academy_id',acid).eq('staff_uid',uid).order('created_at',{ascending:false}); mine=(r2&&r2.data)||[]; }catch(e){ mine=[]; } }
    function render(){
      var sopts='<option value="">— 관련 학생(선택) —</option>'+students.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>';}).join('');
      var form=cardWrap('<div style="font-weight:800;font-size:14px;margin-bottom:10px">✍ 원장에게 보고</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><select id="to-kind" style="width:130px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px"><option value="건의사항">건의사항</option><option value="특이사항">특이사항</option></select>'
        +'<select id="to-stu" style="width:170px;padding:9px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+sopts+'</select>'
        +'<input id="to-title" placeholder="제목(선택)" style="flex:1;min-width:150px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px"></div>'
        +'<textarea id="to-body" placeholder="내용 *" style="width:100%;min-height:80px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px"></textarea>'
        +'<div style="margin-top:8px"><button class="tab on" id="to-send" style="padding:9px 18px">보고 보내기</button> <span id="to-msg" style="font-size:12px;margin-left:6px"></span></div>');
      var nameOf=function(id){ var s=students.filter(function(x){return x.id===id;})[0]; return s?s.name:''; };
      var list=mine.map(function(r){
        var kc=(r.kind==='특이사항')?'#c8871a':'#2f7de0';
        return '<div style="border:1px solid var(--line);border-radius:10px;padding:11px 13px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-size:10.5px;font-weight:800;color:#fff;background:'+kc+';border-radius:20px;padding:2px 8px">'+esc(r.kind)+'</span>'+(r.student_id?'<span style="font-size:11.5px;color:var(--ink-dim)">'+esc(nameOf(r.student_id))+'</span>':'')+'<span style="font-size:11px;color:var(--ink-mute)">'+esc((r.created_at||'').slice(0,10))+'</span>'+(r.status==='read'?'<span style="font-size:10.5px;color:#137a44;margin-left:auto">✓ 원장 확인</span>':'<span style="font-size:10.5px;color:var(--ink-mute);margin-left:auto">대기</span>')+'</div>'+(r.title?'<div style="font-weight:700;font-size:13px;margin-bottom:2px">'+esc(r.title)+'</div>':'')+'<div style="font-size:13px;white-space:pre-wrap">'+esc(r.body||'')+'</div></div>';
      }).join('')||'<div style="color:var(--ink-mute);font-size:13px">보낸 보고가 없습니다.</div>';
      host.innerHTML=form+cardWrap('<div style="font-weight:800;font-size:14px;margin-bottom:10px">📮 내가 보낸 보고</div>'+list);
      var b=host.querySelector('#to-send'); if(b) b.onclick=send;
    }
    async function send(){ var m=host.querySelector('#to-msg'); var body=g('to-body'); if(!body){ m.style.color='var(--risk)'; m.textContent='내용을 입력하세요.'; return; }
      var row={ academy_id:acid, staff_uid:uid, student_id:(host.querySelector('#to-stu').value||null), kind:(host.querySelector('#to-kind').value||'건의사항'), title:g('to-title')||null, body:body };
      m.style.color='var(--ink-mute)'; m.textContent='보내는 중…';
      var r=await sb.from('staff_reports').insert(row); if(r.error){ m.style.color='var(--risk)'; m.textContent='실패: '+r.error.message; return; }
      await load(); render();
    }
    host.innerHTML=phRaw('⏳','불러오는 중…',''); await load(); render();
  }
  window.mountToOwner=mountToOwner;

  /* ========================= 원장: 강사 보고함 ========================= */
  async function mountStaffInbox(host){
    var sb=window.sb, acid=window._acadId;
    if(!sb||!acid){ host.innerHTML=phRaw('🔌','미연결','로그인 후 이용할 수 있어요.'); return; }
    var rows=[], names={}, snames={};
    async function load(){
      try{ var r=await sb.from('staff_reports').select('*').eq('academy_id',acid).order('created_at',{ascending:false}); rows=(r&&r.data)||[]; }catch(e){ rows=[]; }
      try{ var ru=await sb.from('academy_users').select('uid,name,login_id').eq('academy_id',acid); (ru&&ru.data||[]).forEach(function(u){ names[u.uid]=u.name||u.login_id||'강사'; }); }catch(e){}
      try{ var rs=await sb.from('students').select('id,name').eq('academy_id',acid); (rs&&rs.data||[]).forEach(function(s){ snames[s.id]=s.name; }); }catch(e){}
    }
    function render(){
      var open=rows.filter(function(r){return r.status!=='read';}).length;
      var list=rows.map(function(r){
        var kc=(r.kind==='특이사항')?'#c8871a':'#2f7de0';
        return '<div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:8px;'+(r.status!=='read'?'background:#fbfdff':'')+'"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap"><span style="font-size:10.5px;font-weight:800;color:#fff;background:'+kc+';border-radius:20px;padding:2px 8px">'+esc(r.kind)+'</span><b style="font-size:12.5px">'+esc(names[r.staff_uid]||'강사')+'</b>'+(r.student_id?'<span style="font-size:11.5px;color:var(--ink-dim)">· '+esc(snames[r.student_id]||'')+'</span>':'')+'<span style="font-size:11px;color:var(--ink-mute)">'+esc((r.created_at||'').slice(0,16).replace('T',' '))+'</span><span style="margin-left:auto"></span>'+(r.status!=='read'?'<button class="tab on" data-rr="'+r.id+'" style="padding:3px 10px;font-size:10.5px">확인 처리</button>':'<span style="font-size:10.5px;color:#137a44">✓ 확인함</span>')+'</div>'+(r.title?'<div style="font-weight:700;font-size:13px;margin-bottom:2px">'+esc(r.title)+'</div>':'')+'<div style="font-size:13px;white-space:pre-wrap">'+esc(r.body||'')+'</div></div>';
      }).join('')||'<div style="color:var(--ink-mute);font-size:13px">받은 보고가 없습니다.</div>';
      host.innerHTML=cardWrap('<div style="font-weight:800;font-size:14px;margin-bottom:10px">📬 강사 보고 <span style="font-size:11px;color:var(--ink-mute);font-weight:400">· 미확인 '+open+'건</span></div>'+list);
      host.querySelectorAll('[data-rr]').forEach(function(x){ x.onclick=function(){ markRead(x.getAttribute('data-rr')); }; });
    }
    async function markRead(id){ var r=await sb.from('staff_reports').update({status:'read'}).eq('id',id); if(r.error){ alert('처리 실패: '+r.error.message); return; } await load(); render(); }
    host.innerHTML=phRaw('⏳','불러오는 중…',''); await load(); render();
  }
  window.mountStaffInbox=mountStaffInbox;

  /* 강사 보고: 역할에 따라 원장=보고함 / 강사=원장에게 보고 */
  function mountStaffMsg(host){ if(window._isOwner===false) return mountToOwner(host); return mountStaffInbox(host); }
  window.mountStaffMsg=mountStaffMsg;

  /* ========================= 강사·반 관리 ========================= */
  async function mountMembers(host){
    var sb=window.sb;
    if(!sb || !window._academy){ host.innerHTML = phRaw('🔌','미연결','로그인(DB 연결) 후 반·강사 관리가 활성화됩니다.'); return; }
    var isOwner=(window._isOwner===true);
    var canManage=(isOwner || window._myRole==='manager');
    if(!canManage){ host.innerHTML = phRaw('🔒','원장·부원장 전용','반·강사 관리는 원장 또는 부원장만 이용할 수 있습니다. 권한이 필요하면 원장에게 요청하세요.'); return; }
    var acid = window._acadId||(window._academy&&window._academy.id);
    host.innerHTML = '<div style="padding:20px;color:var(--ink-mute);font-size:13px">불러오는 중…</div>';
    var classes=[], students=[], teachers=[], stuAcct={}, parAcct={};
    try{
      var rc = await sb.from('academy_classes').select('*').eq('academy_id',acid).order('created_at');
      classes = rc.data||[];
      var rs = await sb.from('students').select('id,name,grade,school,phone,class_id,penta_course').eq('academy_id',acid).order('name');
      students = rs.data||[];
      var rt = await sb.from('academy_users').select('uid,email,role,name,subject,login_id,must_change').eq('academy_id',acid);
      teachers = (rt.data||[]).filter(function(t){ return t.role!=='owner'; });
      try{ var rsa = await sb.from('student_accounts').select('student_id,login_id,must_change').eq('academy_id',acid); (rsa.data||[]).forEach(function(a){ stuAcct[a.student_id]=a; }); }catch(_){}
      try{ var rpa = await sb.from('parent_accounts').select('student_id,login_id').eq('academy_id',acid); (rpa.data||[]).forEach(function(a){ parAcct[a.student_id]=a; }); }catch(_){}
    }catch(e){ host.innerHTML = phRaw('⚠️','불러오기 실패', (e&&e.message)||e); return; }
    render();

    function won(n){ n=Number(n)||0; return n.toLocaleString('ko-KR')+'원'; }
    function countIn(cid){ return students.filter(function(s){return s.class_id===cid;}).length; }
    function classOf(cid){ return classes.filter(function(c){return c.id===cid;})[0]||null; }
    function tName(uid){ var t=teachers.filter(function(x){return x.uid===uid;})[0]; return t?(t.name||t.email||'강사'):''; }
    function classOpts(sel){
      return '<option value="">— 미배정 —</option>'+classes.map(function(c){
        return '<option value="'+c.id+'"'+(c.id===sel?' selected':'')+'>'+esc(c.name)+(c.tuition?(' · 월 '+won(c.tuition)):'')+'</option>';
      }).join('');
    }
    function teacherOpts(sel){
      return '<option value="">담당 강사 (선택)</option>'+teachers.map(function(t){
        var lbl=(t.name||t.email||t.uid.slice(0,8))+(t.subject?(' · '+t.subject):'');
        return '<option value="'+t.uid+'"'+(t.uid===sel?' selected':'')+'>'+esc(lbl)+'</option>';
      }).join('');
    }
    function render(){
      var h='';
      h+='<div style="background:var(--panel,#fff);border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:12px"><div style="font-size:15px;font-weight:800;margin-bottom:12px">🏷️ 반 관리 <span style="font-size:12px;font-weight:500;color:var(--ink-mute)">· 정원 8~10 권장</span></div>';
      if(!classes.length){ h+='<div style="font-size:13px;color:var(--ink-mute);padding:6px 0 12px">아직 반이 없습니다. 아래에서 첫 반을 만들어 보세요.</div>'; }
      else {
        h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'+classes.map(function(c){
          var n=countIn(c.id), full=n>=c.capacity;
          return '<div style="border:1px solid '+(full?'#f0445233':'var(--line)')+';border-radius:12px;padding:12px">'
            +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="font-size:14.5px">'+esc(c.name)+'</b>'
            +(c.tier==='특목'?'<span style="font-size:10px;font-weight:800;color:#b45309;background:#fff2e0;border-radius:20px;padding:2px 7px">🏅 특목</span>':'')
            +(c.tuition?'<span style="font-size:11px;font-weight:800;color:#137a44;background:#eafaf0;border-radius:20px;padding:2px 8px">월 '+won(c.tuition)+'</span>':'')
            +'<span style="margin-left:auto;font-size:12px;font-weight:800;color:'+(full?'var(--risk)':'var(--brand,#3182f6)')+'">'+n+'/'+c.capacity+'</span></div>'
            +'<div style="font-size:11.5px;color:var(--ink-dim);margin-top:4px">'+(c.subject?('📘 '+esc(c.subject)+' · '):'')+(c.teacher_id?('담당 '+esc(tName(c.teacher_id))):'담당 강사 미지정')+(c.schedule?' · '+esc(c.schedule):'')+'</div>'
            +'<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">'
            +'<button class="tab" data-ren="'+c.id+'" data-nm="'+esc(c.name)+'" style="padding:5px 10px;font-size:11.5px">이름</button>'
            +'<button class="tab" data-tuition="'+c.id+'" data-tv="'+(c.tuition||'')+'" style="padding:5px 10px;font-size:11.5px">수강료</button>'
            +'<button class="tab" data-grade="'+c.id+'" data-gv="'+esc(c.tier||'일반')+'" style="padding:5px 10px;font-size:11.5px">등급</button>'
            +'<button class="tab" data-cteach="'+c.id+'" data-tid="'+(c.teacher_id||'')+'" style="padding:5px 10px;font-size:11.5px">담당강사</button>'
            +'<button class="tab" data-del="'+c.id+'" style="padding:5px 10px;font-size:11.5px;color:var(--risk)">삭제</button>'
            +'</div></div>';
        }).join('')+'</div>';
      }
      h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center">'
        +'<input id="m-cname" placeholder="새 반 이름 (예: 월수금 A반)" style="flex:2;min-width:150px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="m-csubj" placeholder="과목(예: 수학)" style="width:100px;padding:10px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<select id="m-cgrade" title="반 등급" style="width:100px;padding:10px;border:1px solid var(--line);border-radius:9px;font-size:13px"><option value="일반">일반반</option><option value="특목">특목반</option></select>'
        +'<input id="m-ctuition" type="number" placeholder="월 수강료" min="0" step="1000" style="width:100px;padding:10px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="m-ccap" type="number" value="10" min="1" max="30" title="정원" style="width:70px;padding:10px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<select id="m-cteacher" style="flex:1;min-width:150px;padding:10px;border:1px solid var(--line);border-radius:9px;font-size:13px">'+teacherOpts('')+'</select>'
        +'<button id="m-cadd" class="tab on" style="padding:10px 18px">+ 반 만들기</button></div>';
      h+='</div>';

      h+='<div style="background:var(--panel,#fff);border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:12px"><div style="font-size:15px;font-weight:800;margin-bottom:12px">🧑‍🏫 강사 <span style="font-size:12px;font-weight:500;color:var(--ink-mute)">· '+teachers.length+'명 · 등록 시 로그인 계정 자동 발급</span></div>';
      if(!teachers.length){ h+='<div style="font-size:13px;color:var(--ink-mute);padding:6px 0 12px">등록된 강사가 없습니다. 아래에서 강사를 등록하면 아이디·비번이 자동 생성됩니다.</div>'; }
      else {
        h+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
          +'<thead><tr style="text-align:left;color:var(--ink-mute);font-size:11.5px"><th style="padding:6px 8px">이름</th><th style="padding:6px 8px">과목</th><th style="padding:6px 8px">담당 반</th><th style="padding:6px 8px">로그인 아이디</th><th></th></tr></thead><tbody>';
        h+=teachers.map(function(t){
          var myClasses=classes.filter(function(c){return c.teacher_id===t.uid;}).map(function(c){return esc(c.name);});
          var isMgr=(t.role==='manager');
          var roleBadge=isMgr?' <span style="font-size:9.5px;font-weight:800;color:#1b64da;background:#e8f1ff;border-radius:20px;padding:2px 7px">부원장</span>':'';
          var promoBtn=isOwner?(isMgr
              ?'<button class="tab" data-trole="'+t.uid+'" data-to="teacher" data-tnm="'+esc(t.name||'')+'" style="padding:4px 9px;font-size:11px">부원장 해제</button> '
              :'<button class="tab" data-trole="'+t.uid+'" data-to="manager" data-tnm="'+esc(t.name||'')+'" style="padding:4px 9px;font-size:11px;color:#1b64da">부원장 지정</button> '):'';
          var delBtn=isOwner?'<button class="tab" data-tdel="'+t.uid+'" data-tnm="'+esc(t.name||'')+'" style="padding:4px 9px;font-size:11px;color:var(--risk)">삭제</button>':'';
          return '<tr style="border-top:1px solid var(--line-soft,#eef1f4)">'
            +'<td style="padding:8px;font-weight:700">'+esc(t.name||'-')+roleBadge+'</td>'
            +'<td style="padding:8px;color:var(--ink-dim)">'+esc(t.subject||'-')+'</td>'
            +'<td style="padding:8px;color:var(--ink-dim)">'+(myClasses.length?myClasses.join(', '):'<span style="color:var(--ink-mute)">미배정</span>')+'</td>'
            +'<td style="padding:8px"><b>'+esc(t.login_id||t.email||'-')+'</b>'+(t.must_change?' <span style="font-size:10px;color:var(--ink-mute)">/0000</span>':'')+'</td>'
            +'<td style="padding:8px;text-align:right;white-space:nowrap">'+promoBtn+'<button class="tab" data-tpw="'+t.uid+'" style="padding:4px 9px;font-size:11px">비번초기화</button> '+delBtn+'</td>'
            +'</tr>';
        }).join('');
        h+='</tbody></table></div>';
      }
      h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:center">'
        +'<input id="m-tname" placeholder="강사 이름" style="flex:1;min-width:120px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<input id="m-tsubj" placeholder="수업 과목 (예: 국어)" style="flex:1;min-width:120px;padding:10px 12px;border:1px solid var(--line);border-radius:9px;font-size:13px">'
        +'<button id="m-tadd" class="tab on" style="padding:10px 18px">+ 강사 등록</button></div>';
      h+='<div style="font-size:11px;color:var(--ink-mute);margin-top:8px">※ 등록하면 로그인 아이디·초기비번(0000)이 자동 발급됩니다. 담당 반은 반 카드의 [담당강사]에서 지정하세요. 학생 등록·관리는 [학원생 관리]에서.</div>';
      h+='</div>';

      host.innerHTML=h;
      bind();
    }
    function bind(){
      var cadd=host.querySelector('#m-cadd'); if(cadd) cadd.onclick=createClass;
      var tadd=host.querySelector('#m-tadd'); if(tadd) tadd.onclick=addTeacher;
      host.querySelectorAll('[data-ren]').forEach(function(b){ b.onclick=function(){ renameClass(b.getAttribute('data-ren'), b.getAttribute('data-nm')); }; });
      host.querySelectorAll('[data-tuition]').forEach(function(b){ b.onclick=function(){ setTuition(b.getAttribute('data-tuition'), b.getAttribute('data-tv')); }; });
      host.querySelectorAll('[data-grade]').forEach(function(b){ b.onclick=function(){ setClassGrade(b.getAttribute('data-grade'), b.getAttribute('data-gv')); }; });
      host.querySelectorAll('[data-cteach]').forEach(function(b){ b.onclick=function(){ setClassTeacher(b.getAttribute('data-cteach'), b.getAttribute('data-tid')); }; });
      host.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ deleteClass(b.getAttribute('data-del')); }; });
      host.querySelectorAll('[data-tpw]').forEach(function(b){ b.onclick=function(){ teacherAction('reset_pw', b.getAttribute('data-tpw'), b); }; });
      host.querySelectorAll('[data-tdel]').forEach(function(b){ b.onclick=function(){ teacherAction('delete', b.getAttribute('data-tdel'), b, b.getAttribute('data-tnm')); }; });
      host.querySelectorAll('[data-trole]').forEach(function(b){ b.onclick=function(){ setTeacherRole(b.getAttribute('data-trole'), b.getAttribute('data-to'), b, b.getAttribute('data-tnm')); }; });
    }
    async function reload(){ await mountMembers(host); }
    async function createClass(){
      function gv(id){ var e=host.querySelector(id); return e?(e.value||''):''; }
      var nm=gv('#m-cname').trim(), subj=gv('#m-csubj').trim(), grade=gv('#m-cgrade')||'일반';
      var tu=parseInt(gv('#m-ctuition'),10); if(!(tu>=0))tu=null;
      var cap=parseInt(gv('#m-ccap'),10)||10, tid=gv('#m-cteacher')||null;
      if(!nm){ alert('반 이름을 입력하세요.'); return; }
      try{ var r=await sb.from('academy_classes').insert({academy_id:acid, name:nm, subject:subj||null, tier:grade, tuition:tu, capacity:cap, teacher_id:tid}); if(r.error)throw r.error; reload(); }
      catch(e){ alert('반 생성 실패: '+((e&&e.message)||e)); }
    }
    async function setClassGrade(id, cur){
      var v=prompt('반 등급을 입력하세요: 일반 / 특목\n(특목반 학생은 트랙 워크북에서 특목 블록이 노출됩니다)', cur||'일반');
      if(v==null) return; v=(v.indexOf('특목')>=0)?'특목':'일반';
      try{ var r=await sb.from('academy_classes').update({tier:v}).eq('id',id); if(r.error)throw r.error; reload(); }
      catch(e){ alert('등급 저장 실패: '+((e&&e.message)||e)); }
    }
    async function setTuition(id, cur){
      var v=prompt('월 수강료(원)를 입력하세요. 비우면 미표시.', cur||''); if(v==null) return;
      v=String(v).replace(/[^0-9]/g,''); var tu=v?parseInt(v,10):null;
      try{ var r=await sb.from('academy_classes').update({tuition:tu}).eq('id',id); if(r.error)throw r.error; reload(); }
      catch(e){ alert('수강료 저장 실패: '+((e&&e.message)||e)); }
    }
    async function setClassTeacher(id, curTid){
      if(!teachers.length){ alert('먼저 강사를 등록하세요.'); return; }
      var list=teachers.map(function(t,i){ return (i+1)+'. '+(t.name||t.email)+(t.subject?(' ('+t.subject+')'):''); }).join('\n');
      var pick=prompt('담당 강사 번호를 고르세요 (0=미지정)\n\n'+list, ''); if(pick==null) return;
      var n=parseInt(pick,10); var tid = (n>=1 && n<=teachers.length) ? teachers[n-1].uid : null;
      try{ var r=await sb.from('academy_classes').update({teacher_id:tid}).eq('id',id); if(r.error)throw r.error; reload(); }
      catch(e){ alert('담당 강사 지정 실패: '+((e&&e.message)||e)); }
    }
    async function setTeacherRole(uid, to, btn, nm){
      if(!isOwner){ alert('부원장 지정·해제는 원장만 가능합니다.'); return; }
      var toMgr=(to==='manager');
      if(!confirm((nm||'이 강사')+(toMgr?' 을(를) 부원장으로 지정할까요?\n부원장은 반·강사 관리 권한을 갖습니다(강사 등록·반 편성·수강료 설정 등). 강사 삭제·부원장 지정은 원장만 가능합니다.':' 의 부원장 권한을 해제할까요?\n일반 강사로 돌아가 반·강사 관리 메뉴가 숨겨집니다.'))) return;
      if(btn) btn.disabled=true;
      try{ var r=await sb.from('academy_users').update({role:(toMgr?'manager':'teacher')}).eq('academy_id',acid).eq('uid',uid); if(r.error)throw r.error; alert('✓ '+(toMgr?'부원장으로 지정':'부원장 해제')+'되었습니다.\n(해당 강사가 재로그인하면 권한이 반영됩니다.)'); reload(); }
      catch(e){ alert('권한 변경 실패: '+((e&&e.message)||e)); if(btn)btn.disabled=false; }
    }
    async function addTeacher(){
      if(!canManage){ alert('강사 등록은 원장·부원장만 가능합니다.'); return; }
      var nm=(host.querySelector('#m-tname').value||'').trim();
      var subj=(host.querySelector('#m-tsubj').value||'').trim();
      if(!nm){ alert('강사 이름을 입력하세요.'); return; }
      var btn=host.querySelector('#m-tadd'); if(btn){ btn.disabled=true; btn.textContent='등록 중…'; }
      try{
        var sess=(await sb.auth.getSession()).data.session;
        var base=(window.FN_BASE)||((window.SB_URL||'')+'/functions/v1');
        var r=await fetch(base+'/create-teacher', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+(sess?sess.access_token:''),'apikey':(window.SB_KEY||'')}, body:JSON.stringify({name:nm, subject:subj}) });
        var d=await r.json();
        if(d.error){ if(d.need_code){ alert('학원 전용주소(슬러그)를 먼저 설정하세요. [설정]에서 지정.'); } else alert('강사 등록 실패: '+d.error); }
        else { alert('✓ 강사 등록 완료 ('+esc(nm)+')\n\n로그인 아이디: '+d.login_id+'\n초기 비밀번호: '+(d.pw||'0000')+'\n\n(강사는 이 아이디로 로그인. 최초 로그인 시 비밀번호 변경)'); }
        reload();
      }catch(e){ alert('등록 오류: '+((e&&e.message)||e)); if(btn){btn.disabled=false; btn.textContent='+ 강사 등록';} }
    }
    async function teacherAction(action, uid, btn, nm){
      if(action==='delete' && !isOwner){ alert('강사 삭제는 원장만 가능합니다.'); return; }
      if(action!=='delete' && !canManage){ alert('강사 관리는 원장·부원장만 가능합니다.'); return; }
      if(action==='delete' && !confirm('강사 '+(nm||'')+' 을(를) 삭제할까요? 담당 반은 미지정으로 바뀌고 로그인 계정이 삭제됩니다.')) return;
      if(action==='reset_pw' && !confirm('이 강사의 비밀번호를 0000으로 초기화할까요?')) return;
      if(btn){ btn.disabled=true; }
      try{
        var sess=(await sb.auth.getSession()).data.session;
        var base=(window.FN_BASE)||((window.SB_URL||'')+'/functions/v1');
        var r=await fetch(base+'/create-teacher', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+(sess?sess.access_token:''),'apikey':(window.SB_KEY||'')}, body:JSON.stringify({action:action, teacher_uid:uid}) });
        var d=await r.json();
        if(d.error){ alert('처리 실패: '+d.error); if(btn)btn.disabled=false; }
        else if(action==='reset_pw'){ alert('✓ 비밀번호 초기화 완료\n아이디: '+d.login_id+'\n새 비밀번호: '+(d.pw||'0000')); reload(); }
        else { reload(); }
      }catch(e){ alert('오류: '+((e&&e.message)||e)); if(btn)btn.disabled=false; }
    }
    async function renameClass(id, cur){
      var nm=prompt('반 이름 수정', cur||''); if(nm==null) return; nm=nm.trim(); if(!nm) return;
      try{ var r=await sb.from('academy_classes').update({name:nm}).eq('id',id); if(r.error)throw r.error; reload(); }
      catch(e){ alert('수정 실패: '+((e&&e.message)||e)); }
    }
    async function deleteClass(id){
      if(!confirm('이 반을 삭제할까요? 소속 학생은 미배정으로 바뀝니다(학생 데이터는 유지).')) return;
      try{ var r=await sb.from('academy_classes').delete().eq('id',id); if(r.error)throw r.error; reload(); }
      catch(e){ alert('삭제 실패: '+((e&&e.message)||e)); }
    }
  }
  window.mountMembers=mountMembers;

  /* ========================= 원장 대시보드 (경영지표·재등록 방어) ========================= */
  async function mountDashboard(host){
    var sb=window.sb;
    var statEl = host.querySelector('#dash-stats'), riskEl = host.querySelector('#dash-risk'), moreEl = host.querySelector('#dash-more');
    if(!sb || !window._academy){
      if(statEl) statEl.innerHTML = statCards([{k:'수강생',v:'—',s:'명'},{k:'반',v:'—',s:'개'},{k:'최근 7일 제출',v:'—',s:'건'},{k:'이탈 위험',v:'—',s:'명'}]);
      if(riskEl) riskEl.innerHTML = phRaw('🔌','미연결','로그인(DB 연결) 후 경영지표가 표시됩니다.');
      return;
    }
    var acid = window._acadId||(window._academy&&window._academy.id);
    if(statEl) statEl.innerHTML = statCards([{k:'수강생',v:'…'},{k:'반',v:'…'},{k:'최근 7일 제출',v:'…'},{k:'이탈 위험',v:'…'}]);
    var students=[], classesN=0, subs=[], acts=[], teachersN=0;
    try{
      var rs = await sb.from('students').select('id,name,created_at,class_id').eq('academy_id',acid); students = rs.data||[];
      var rc = await sb.from('academy_classes').select('id',{count:'exact',head:true}).eq('academy_id',acid); classesN = rc.count||0;
      var rsub = await sb.from('penta_submissions').select('student_id,status,updated_at,created_at').eq('academy_id',acid).order('updated_at',{ascending:false}).limit(1000); subs = rsub.data||[];
      var rt = await sb.from('academy_users').select('uid',{count:'exact',head:true}).eq('academy_id',acid); teachersN = rt.count||0;
      if(students.length){ var ids = students.map(function(s){return s.id;}); var ra = await sb.from('student_activity_status').select('student_id,updated_at').in('student_id',ids); acts = ra.data||[]; }
    }catch(e){ if(riskEl) riskEl.innerHTML = phRaw('⚠️','불러오기 실패',(e&&e.message)||e); return; }
    var now=Date.now(), WK=7*24*3600*1000, D21=21*24*3600*1000;
    var recentSubs = subs.filter(function(s){ var t=s.updated_at||s.created_at; return t && (now-new Date(t).getTime())<WK; }).length;
    var lastByStu={};
    students.forEach(function(s){ lastByStu[s.id]= s.created_at? new Date(s.created_at).getTime():0; });
    subs.forEach(function(s){ var t=s.updated_at||s.created_at; if(t){ var k=String(s.student_id); if(lastByStu[k]!=null) lastByStu[k]=Math.max(lastByStu[k]||0, new Date(t).getTime()); } });
    acts.forEach(function(a){ if(a.updated_at && lastByStu[a.student_id]!=null) lastByStu[a.student_id]=Math.max(lastByStu[a.student_id]||0, new Date(a.updated_at).getTime()); });
    var risky = students.filter(function(s){ var l=lastByStu[s.id]||0; return (now-l) > D21; });
    if(statEl) statEl.innerHTML = statCards([
      {k:'수강생',v:students.length,s:'명',d:'등록 학생'},
      {k:'반',v:classesN,s:'개',d:'강사 '+teachersN+'명'},
      {k:'최근 7일 제출',v:recentSubs,s:'건',d:'워크북 제출'},
      {k:'이탈 위험',v:risky.length,s:'명',d:'3주+ 무활동'}
    ]);
    if(riskEl){
      if(!students.length){ riskEl.innerHTML = phRaw('👥','학생 없음','[학원생 관리]에서 학생을 먼저 등록하세요.'); }
      else if(!risky.length){ riskEl.innerHTML = '<div style="background:var(--panel,#fff);border:1px solid #12b76a33;border-radius:14px;padding:16px;margin-top:12px"><div style="font-size:13.5px;font-weight:700;color:var(--safe,#12b76a)">✓ 이탈 위험 학생 없음</div><div style="font-size:12px;color:var(--ink-dim);margin-top:3px">모든 학생이 최근 3주 내 활동했습니다.</div></div>'; }
      else{
        riskEl.innerHTML = '<div style="background:var(--panel,#fff);border:1px solid #f0445233;border-radius:14px;padding:16px;margin-top:12px">'
          +'<div style="font-size:14px;font-weight:800;color:var(--risk,#f04452);margin-bottom:4px">⚠️ 재등록 방어 · 이탈 위험 '+risky.length+'명</div>'
          +'<div style="font-size:12px;color:var(--ink-dim);margin-bottom:10px">3주 이상 활동·제출이 없는 학생입니다. 상담이나 학부모 브리핑을 권장합니다.</div>'
          + risky.slice(0,12).map(function(s){ var l=lastByStu[s.id]||0; var days = l? Math.floor((now-l)/(24*3600*1000)) : null;
              return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--line-soft,#eef1f4)"><b style="font-size:13px">'+esc(s.name||'-')+'</b><span style="margin-left:auto;font-size:12px;color:var(--risk);font-weight:700">'+(days!=null?(days+'일 무활동'):'활동 기록 없음')+'</span></div>';
            }).join('')
          + (risky.length>12?'<div style="font-size:12px;color:var(--ink-dim);margin-top:8px">외 '+(risky.length-12)+'명</div>':'')+'</div>';
      }
    }
    if(moreEl){
      try{
        var rc2 = await sb.from('academy_classes').select('id,name,capacity').eq('academy_id',acid).order('created_at'); var cls = rc2.data||[];
        if(cls.length){
          var cnt={}; students.forEach(function(s){ if(s.class_id) cnt[s.class_id]=(cnt[s.class_id]||0)+1; });
          moreEl.innerHTML = '<div style="font-size:15px;font-weight:800;margin-top:20px">반별 현황</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:10px">'
            + cls.map(function(c){ var n=cnt[c.id]||0; return '<div style="background:var(--panel,#fff);border:1px solid var(--line);border-radius:14px;padding:16px"><div style="font-weight:800;font-size:14px">'+esc(c.name)+'</div><div style="font-size:22px;font-weight:900">'+n+'<small style="font-size:13px;color:var(--ink-mute)">/'+c.capacity+'명</small></div></div>'; }).join('')+'</div>';
        } else { moreEl.innerHTML=''; }
      }catch(e){ moreEl.innerHTML=''; }
    }
  }
  window.mountDashboard=mountDashboard;

  /* ========================= 코스웨어 · 반별 차시(커리큘럼) 편성 ========================= */
  var _cwClass=null, _cwCatalog=null, _cwMap={};
  async function cwLoadCatalog(){
    var sb=window.sb;
    if(_cwCatalog) return _cwCatalog;
    var r=await sb.rpc('list_penta_catalog'); var rows=(r&&r.data)||[];
    _cwMap={}; rows.forEach(function(c){ _cwMap[c.id]={id:c.id,stage:c.stage,level:c.level||'',season:+c.season,week:+c.week,theme:c.theme||'',title:c.title||''}; });
    _cwCatalog=rows.map(function(c){ return { id:c.id, level:(c.stage==='track'?'track':(c.level||'')), season:+c.season, week:+c.week, theme:c.theme||'', title:c.title||'', grade_band:c.grade_band||'', tier:(c.stage==='track') }; });
    return _cwCatalog;
  }
  async function mountCurriculum(host){
    var sb=window.sb;
    if(!sb || !window._academy){ host.innerHTML=phRaw('🔌','미연결','로그인(DB 연결) 후 차시 편성이 활성화됩니다.'); return; }
    var acid=window._acadId||(window._academy&&window._academy.id), classes=[];
    try{ var rc=await sb.from('academy_classes').select('id,name,grade_band').eq('academy_id',acid).order('created_at'); classes=rc.data||[]; }
    catch(e){ host.innerHTML=phRaw('⚠️','불러오기 실패',(e&&e.message)||e); return; }
    if(!classes.length){ host.innerHTML=phRaw('🏷️','반이 없습니다',(window._isSchool===true)?'[학생 관리]에서 엑셀로 학생을 업로드하면 학년·반이 자동 생성됩니다.':'[반·강사 관리]에서 먼저 반을 만들고 학생을 배정하세요.'); return; }
    if(!_cwClass || !classes.some(function(c){return c.id===_cwClass;})) _cwClass=classes[0].id;
    host.innerHTML='<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px">'
      +'<select id="cw-csel" style="padding:10px 12px;border:1px solid var(--line);border-radius:9px;font-size:13.5px;font-weight:700;min-width:170px">'
      + classes.map(function(c){return '<option value="'+c.id+'"'+(c.id===_cwClass?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')
      +'</select>'
      +'<button id="cw-add" class="tab on" style="padding:10px 16px">+ 차시 추가</button>'
      +'<span style="font-size:12px;color:var(--ink-mute)">'+((window._isSchool===true)?'펜타 비전 심화 40강 중 <b>최대 15강</b>을 골라 담고 [수업 개방] → 이 반 학생 전원에게 전달됩니다':'회차를 순서대로 편성 → [수업 개방] 시 이 반 학생 전원에게 배정됩니다')+'</span></div>'
      +'<div id="cw-list" style="margin-top:14px"></div>';
    host.querySelector('#cw-csel').onchange=function(e){ _cwClass=e.target.value; cwRenderList(host); };
    host.querySelector('#cw-add').onclick=function(){ cwOpenPicker(host); };
    cwRenderList(host);
  }
  async function cwRenderList(host){
    var sb=window.sb;
    var el=host.querySelector('#cw-list'); if(!el) return;
    el.innerHTML='<div style="color:var(--ink-mute);font-size:13px;padding:10px">불러오는 중…</div>';
    var rows=[]; try{ var r=await sb.from('academy_curriculum').select('*').eq('class_id',_cwClass).order('order_no'); rows=r.data||[]; }
    catch(e){ el.innerHTML=phRaw('⚠️','실패',(e&&e.message)||e); return; }
    /* [학교용] 최대 15회 선정 상한 — 추가 버튼 상태 갱신 */
    (function(){ var isSchool=(window._isSchool===true), MAXN=15; window._cwCount=rows.length; var addBtn=host.querySelector('#cw-add'); if(!addBtn||!isSchool)return; if(rows.length>=MAXN){ addBtn.disabled=true; addBtn.style.opacity='.5'; addBtn.textContent='최대 15회 편성됨'; } else { addBtn.disabled=false; addBtn.style.opacity='1'; addBtn.textContent='+ 차시 추가 ('+rows.length+'/15)'; } })();
    if(!rows.length){ el.innerHTML='<div style="border:1px dashed var(--line);border-radius:10px;padding:26px;text-align:center;color:var(--ink-mute);font-size:13px">아직 편성된 차시가 없습니다.<br>[+ 차시 추가]로 학원용 회차를 순서대로 담아보세요.</div>'; return; }
    var SER={starter:['🌱 비전 기초','#c8a24a'],architecture:['🏛 비전 심화','#6366f1'],track:['🎯 트랙','#3fa34d'],master:['🔷 지성 다이빙','#0ea5e9']};
    function skey(r){ if(r.stage==='vision'&&r.level==='architecture')return'architecture'; if(r.stage==='vision')return'starter'; if(r.stage==='track')return'track'; return 'master'; }
    el.innerHTML=rows.map(function(r,i){
      var f=(i===0),la=(i===rows.length-1); var s=SER[skey(r)]||['회차','#8b95a1']; var opened=r.status==='opened';
      return '<div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin-bottom:8px;flex-wrap:wrap">'
        +'<div style="display:flex;flex-direction:column;gap:3px">'
        +'<button data-mv="'+r.id+'" data-d="-1" '+(f?'disabled':'')+' style="padding:1px 7px;border:1px solid var(--line);border-radius:5px;background:#fff;cursor:pointer;opacity:'+(f?'.3':'1')+'">▲</button>'
        +'<button data-mv="'+r.id+'" data-d="1" '+(la?'disabled':'')+' style="padding:1px 7px;border:1px solid var(--line);border-radius:5px;background:#fff;cursor:pointer;opacity:'+(la?'.3':'1')+'">▼</button></div>'
        +'<div style="width:26px;text-align:center;font-weight:900;color:'+s[1]+';font-size:15px">'+(i+1)+'</div>'
        +'<div style="flex:1;min-width:120px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span style="font-size:10.5px;font-weight:800;color:#fff;background:'+s[1]+';border-radius:20px;padding:2px 8px">'+s[0]+'</span>'
        +'<b style="font-size:14px">'+esc(r.title||'')+'</b>'
        +(r.tier==='특목'?'<span style="font-size:10px;font-weight:800;color:#b45309;background:#fff2e0;border-radius:20px;padding:2px 7px">특목</span>':'')+'</div>'
        +'<div style="font-size:11px;color:var(--ink-mute);margin-top:2px">시즌'+esc(r.season)+' · '+esc(r.week)+'주차'+(r.theme?(' · '+esc(r.theme)):'')+'</div></div>'
        +(opened?'<span style="font-size:10.5px;font-weight:800;color:var(--safe,#12b76a);border:1px solid var(--safe,#12b76a);border-radius:6px;padding:3px 8px">✓ 개방됨</span>'
                :'<button data-open="'+r.id+'" class="tab on" style="padding:6px 12px;font-size:11.5px">▶ 수업 개방</button>')
        +'<button data-pv="'+r.id+'" class="tab" style="padding:6px 10px;font-size:11.5px">👩‍🏫 미리보기</button>'
        +'<button data-del="'+r.id+'" class="tab" style="padding:6px 9px;font-size:11.5px;color:var(--risk)">삭제</button>'
        +'</div>';
    }).join('');
    var byId={}; rows.forEach(function(r){byId[r.id]=r;});
    el.querySelectorAll('[data-pv]').forEach(function(b){ b.onclick=function(){ var r=byId[+b.getAttribute('data-pv')]; if(window.ArchePentaApp&&ArchePentaApp.openAcademyPreview) ArchePentaApp.openAcademyPreview({stage:r.stage,level:r.level,season:r.season,week:r.week,tier:r.tier}); else alert('워크북 모듈 미로드'); }; });
    el.querySelectorAll('[data-mv]').forEach(function(b){ b.onclick=function(){ cwMove(host, rows, +b.getAttribute('data-mv'), +b.getAttribute('data-d')); }; });
    el.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=async function(){ if(!confirm('이 차시를 편성에서 삭제할까요?'))return; try{ await sb.from('academy_curriculum').delete().eq('id',+b.getAttribute('data-del')); cwRenderList(host); }catch(e){ alert('삭제 실패: '+((e&&e.message)||e)); } }; });
    el.querySelectorAll('[data-open]').forEach(function(b){ b.onclick=async function(){ var id=+b.getAttribute('data-open'); if(!confirm('이 차시를 수업 개방할까요?\n이 반 학생 전원에게 배정되어 학생 화면에 나타납니다.'))return; b.disabled=true; b.textContent='개방 중…'; try{ var r=await sb.rpc('academy_curriculum_open',{p_id:id}); if(r.error)throw r.error; alert('✓ 수업 개방 완료 — '+(r.data||0)+'명에게 배정되었습니다.'); cwRenderList(host); }catch(e){ alert('개방 실패: '+((e&&e.message)||e)); b.disabled=false; b.textContent='▶ 수업 개방'; } }; });
  }
  async function cwMove(host, rows, id, d){
    var sb=window.sb;
    var i=-1; rows.forEach(function(r,ix){ if(r.id===id)i=ix; }); var j=i+d; if(i<0||j<0||j>=rows.length)return;
    var a=rows[i], b=rows[j];
    try{ await sb.from('academy_curriculum').update({order_no:b.order_no}).eq('id',a.id); await sb.from('academy_curriculum').update({order_no:a.order_no}).eq('id',b.id); cwRenderList(host); }
    catch(e){ alert('순서 변경 실패: '+((e&&e.message)||e)); }
  }
  async function cwOpenPicker(host){
    var sb=window.sb;
    if(window._isSchool===true && (window._cwCount||0)>=15){ alert('학교 코스웨어는 최대 15회까지 편성할 수 있어요.\n먼저 편성 목록에서 회차를 빼고 추가하세요.'); return; }
    try{ await cwLoadCatalog(); }catch(e){ alert('회차 목록 로드 실패: '+((e&&e.message)||e)); return; }
    var ov=document.createElement('div'); ov.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(15,20,30,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:22px 12px';
    var box=document.createElement('div'); box.style.cssText='background:#fff;border-radius:16px;max-width:560px;width:100%;padding:16px;margin-top:16px';
    box.innerHTML='<div style="display:flex;align-items:center;margin-bottom:10px"><b style="font-size:15px">'+(window._isSchool===true?'펜타 비전 심화 40강 중 선택 (최대 15강)':'차시로 담을 회차 선택')+'</b><button id="cwp-x" style="margin-left:auto;border:0;background:#f0f2f6;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer">닫기</button></div><div id="cwp-pick"></div>';
    ov.appendChild(box); document.body.appendChild(ov);
    box.querySelector('#cwp-x').onclick=function(){ ov.remove(); };
    ov.onclick=function(e){ if(e.target===ov) ov.remove(); };
    if(window.ArcheCoursePicker){
      var _cat=_cwCatalog; if(window._isSchool===true){ _cat=_cwCatalog.filter(function(x){ return x.level==='architecture'; }); }
      ArcheCoursePicker.mount(box.querySelector('#cwp-pick'), { catalog:_cat, onPick:async function(id, opt){
        var src=_cwMap[id]; if(!src){ alert('회차 정보를 찾지 못했습니다.'); return; }
        try{
          var rr=await sb.from('academy_curriculum').select('order_no').eq('class_id',_cwClass).order('order_no',{ascending:false}).limit(1);
          var nextNo=((rr.data&&rr.data[0]&&rr.data[0].order_no)||0)+1;
          var ins=await sb.from('academy_curriculum').insert({academy_id:(window._acadId||(window._academy&&window._academy.id)), class_id:_cwClass, order_no:nextNo, catalog_id:src.id, stage:src.stage, level:src.level, season:src.season, week:src.week, tier:(opt&&opt.tier)||null, title:src.title, theme:src.theme});
          if(ins.error)throw ins.error;
          ov.remove(); cwRenderList(host);
        }catch(e){ alert('차시 추가 실패: '+((e&&e.message)||e)); }
      }});
    } else { box.querySelector('#cwp-pick').innerHTML='<div style="color:#8b95a1;padding:20px">회차 선택기(course_picker.js) 미로드 — 파일 업로드 확인</div>'; }
  }
  window.mountCurriculum=mountCurriculum;

  /* 코스웨어 뷰: [차시 편성] + [바로 배정·전송] 탭 래퍼 */
  function mountCourseView(host){
    var curri=host.querySelector('#cw-curri'), asg=host.querySelector('#cw-assign'), tabs=host.querySelector('#cw-tabs');
    var asgMounted=false;
    /* [학교용] 개별 '바로 배정·전송'은 막고, 차시 편성(선정 15회)→수업 개방만 허용 */
    if(window._isSchool===true){ try{ if(tabs){ var _at=tabs.querySelector('[data-cw="assign"]'); if(_at)_at.style.display='none'; var _ct=tabs.querySelector('[data-cw="curri"]'); if(_ct){_ct.classList.add('on');} } if(asg)asg.style.display='none'; if(curri)curri.style.display=''; }catch(e){} }
    function mountAssign(){
      if(asgMounted) return; asgMounted=true;
      if(window.ArchePentaApp && window.sb){ try{ ArchePentaApp.mountRole(asg,'staff'); }catch(e){ asg.innerHTML=phRaw('⚠️','로드 실패',(e&&e.message)||e); } }
      else asg.innerHTML=phRaw('🔌','미연결','로그인 후 배정이 표시됩니다.');
    }
    if(tabs) tabs.querySelectorAll('[data-cw]').forEach(function(t){ t.onclick=function(){
      tabs.querySelectorAll('[data-cw]').forEach(function(x){x.classList.toggle('on',x===t);});
      var mode=t.getAttribute('data-cw');
      if(curri) curri.style.display = mode==='curri'?'':'none';
      if(asg) asg.style.display = mode==='assign'?'':'none';
      if(mode==='assign') mountAssign();
    }; });
    if(window.mountCurriculum && window.sb) mountCurriculum(curri);
    else if(curri) curri.innerHTML = phRaw('🔌','미연결','로그인(DB 연결) 후 차시 편성이 활성화됩니다.');
  }
  window.mountCourseView=mountCourseView;

  /* 학생 제출물 관리 뷰: 제출물·분석리포트 / 학부모 전송 / 정기 리포트 탭 */
  function mountSubmitsView(host){
    var sbR=host.querySelector('#sb-review'), sbS=host.querySelector('#sb-send'), sbP=host.querySelector('#sb-period');
    var _mR=false, _mS=false, _mP=false;
    function _showR(){ if(_mR||!sbR)return; if(window.ArchePentaApp && window.sb){ try{ ArchePentaApp.mountRole(sbR,'staff',{onlyReview:true}); }catch(e){ sbR.innerHTML=phRaw('⚠️','로드 실패',(e&&e.message)||e); } } else sbR.innerHTML=phRaw('🔌','미연결','로그인 후 제출물이 표시됩니다.'); _mR=true; }
    function _showS(){ if(_mS||!sbS)return; if(window.ArcheParentHub && window.sb){ try{ ArcheParentHub.mountSend(sbS); }catch(e){ sbS.innerHTML=phRaw('⚠️','로드 실패',(e&&e.message)||e); } } else sbS.innerHTML=phRaw('🔌','미연결','로그인 후 이용하세요.'); _mS=true; }
    function _showP(){ if(_mP||!sbP)return; try{ mountPeriodMgmt(sbP); }catch(e){ sbP.innerHTML=phRaw('⚠️','로드 실패',(e&&e.message)||e); } _mP=true; }
    host.querySelectorAll('[data-sb]').forEach(function(t){ t.onclick=function(){
      host.querySelectorAll('[data-sb]').forEach(function(x){ x.classList.remove('on'); }); t.classList.add('on');
      var k=t.getAttribute('data-sb');
      if(sbR) sbR.style.display=(k==='review')?'':'none';
      if(sbS) sbS.style.display=(k==='send')?'':'none';
      if(sbP) sbP.style.display=(k==='period')?'':'none';
      if(k==='review') _showR(); else if(k==='send') _showS(); else _showP();
    }; });
    _showR();
  }
  window.mountSubmitsView=mountSubmitsView;

  /* ========================= 실시간 강의실 (관제 + 판서) ========================= */
  var _ctlTimer=null, _ctlClass=null, _ctlClasses=[];
  function stopLiveControl(){ if(_ctlTimer){ clearInterval(_ctlTimer); _ctlTimer=null; } }
  window.stopLiveControl=stopLiveControl;
  async function openClassWorkbook(classId){
    var sb=window.sb;
    if(!sb || !classId){ alert('반을 먼저 선택하세요.'); return; }
    if(!(window.ArchePentaApp && ArchePentaApp.openAcademyPreview)){ alert('워크북 모듈(arche_penta_app.js) 미로드'); return; }
    var tier='일반';
    try{ var rc=await sb.from('academy_classes').select('tier').eq('id',classId).limit(1); if(rc.data&&rc.data[0]&&rc.data[0].tier==='특목')tier='특목'; }catch(e){}
    var cur=null;
    try{ var r=await sb.from('academy_curriculum').select('*').eq('class_id',classId).order('order_no',{ascending:false}); var list=r.data||[]; cur=list.filter(function(x){return x.status==='opened';})[0]||list[0]; }catch(e){}
    if(!cur){ alert('이 반에 편성된 차시가 없습니다.\n[코스웨어 → 차시 편성]에서 회차를 담고 [수업 개방]하세요.'); return; }
    ArchePentaApp.openAcademyPreview({ stage:cur.stage, level:cur.level, season:cur.season, week:cur.week, tier:tier });
  }
  async function mountLiveControl(host){
    var sb=window.sb;
    if(!sb || !window._academy){ host.innerHTML = phRaw('🔌','미연결','로그인(DB 연결) 후 실시간 관제·판서가 활성화됩니다.'); return; }
    var acid = window._acadId||(window._academy&&window._academy.id);
    try{ var r=await sb.from('academy_classes').select('*').eq('academy_id',acid).order('created_at'); _ctlClasses=r.data||[]; }
    catch(e){ host.innerHTML=phRaw('⚠️','불러오기 실패',(e&&e.message)||e); return; }
    if(!_ctlClasses.length){ host.innerHTML = phRaw('🏷️','반이 없습니다','[반·강사 관리]에서 먼저 반을 만들고 학생을 배정하세요.'); return; }
    if(!_ctlClass || !_ctlClasses.some(function(c){return c.id===_ctlClass;})) _ctlClass = _ctlClasses[0].id;
    host.innerHTML =
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px">'
      +'<select id="ctl-class" style="padding:10px 12px;border:1px solid var(--line);border-radius:9px;font-size:13.5px;font-weight:700;min-width:180px">'
      + _ctlClasses.map(function(c){return '<option value="'+c.id+'"'+(c.id===_ctlClass?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')
      +'</select>'
      +'<button id="ctl-wb" class="tab on" style="border-radius:9px;padding:10px 16px">📖 이 회차 워크북(교사용)</button>'
      +'<button id="ctl-board" style="border-radius:9px;padding:10px 16px;background:linear-gradient(135deg,#7B1FA2,#E91E63);color:#fff;border:0;font-weight:800">🖊️ 라이브 판서 시작</button>'
      +'<span id="ctl-updated" style="margin-left:auto;font-size:11.5px;color:var(--ink-mute)">—</span>'
      +'</div>'
      +'<div id="ctl-stats" style="margin-top:14px"></div>'
      +'<div id="ctl-grid" style="margin-top:14px"></div>';
    host.querySelector('#ctl-class').onchange=function(e){ _ctlClass=e.target.value; refreshControl(); };
    host.querySelector('#ctl-board').onclick=function(){ openBoard(_ctlClass); };
    var _wbBtn=host.querySelector('#ctl-wb'); if(_wbBtn) _wbBtn.onclick=function(){ openClassWorkbook(_ctlClass); };
    stopLiveControl();
    refreshControl();
    _ctlTimer = setInterval(refreshControl, 4000);
  }
  async function refreshControl(){
    var sb=window.sb;
    if(!sb || !_ctlClass) return;
    var acid = window._acadId||(window._academy&&window._academy.id);
    var students=[], acts=[];
    try{
      var rs = await sb.from('students').select('id,name,grade').eq('academy_id',acid).eq('class_id',_ctlClass).order('name'); students = rs.data||[];
      if(students.length){ var ids = students.map(function(s){return s.id;}); var ra = await sb.from('student_activity_status').select('*').in('student_id',ids); acts = ra.data||[]; }
    }catch(e){ return; }
    var amap={}; acts.forEach(function(a){ amap[a.student_id]=a; });
    var nOnline=0, nWork=0, nStag=0, nSubmit=0, alerts=[];
    students.forEach(function(s){
      var a=amap[s.id]; if(!a) return;
      var fresh = a.updated_at && (Date.now()-new Date(a.updated_at).getTime() < 30000);
      if(fresh) nOnline++;
      if(a.status==='working') nWork++;
      if((a.stagnation_sec||0)>=120){ nStag++; alerts.push('🔴 '+(s.name||'')+' 정체 '+Math.floor((a.stagnation_sec||0)/60)+'분'); }
      if((a.care_level||0)>=2) alerts.push('⚠️ '+(s.name||'')+' 케어 '+(a.care_level>=3?'긴급':'경고'));
      if(a.status==='submitted') nSubmit++;
    });
    var statHost=host.querySelector? null : null;
    statHost=document.getElementById('ctl-stats'); if(!statHost) return;
    statHost.innerHTML = statCards([
      {k:'접속',v:nOnline,s:'/'+students.length,d:'최근 30초'},
      {k:'작성 중',v:nWork,s:'명'},
      {k:'정체',v:nStag,s:'명',d:'2분+'},
      {k:'제출',v:students.length?Math.round(nSubmit/students.length*100):0,s:'%'}
    ]) + (alerts.length?('<div style="background:var(--panel,#fff);border:1px solid #f0445233;border-radius:14px;padding:14px;margin-top:10px"><div style="font-size:12px;font-weight:800;color:var(--risk);margin-bottom:6px">주의</div>'+alerts.slice(0,6).map(function(a){return '<div style="font-size:12.5px;color:var(--ink-dim);margin:2px 0">'+esc(a)+'</div>';}).join('')+'</div>'):'');
    var grid=document.getElementById('ctl-grid'); if(!grid) return;
    if(!students.length){ grid.innerHTML=phRaw('👥','학생 없음','이 반에 배정된 학생이 없습니다.'); return; }
    var LB={working:['작성 중','#12b76a','#e9f9ef'],waiting:['대기','#f79009','#fff7e6'],stagnation:['정체','#f04452','#fdeaec'],submitted:['제출','#3182f6','#eaf1ff'],idle:['미접속','#9aa6b4','#f0f2f6']};
    grid.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">'+students.map(function(s){
      var a=amap[s.id]||{}; var st=a.status||'idle';
      var fresh = a.updated_at && (Date.now()-new Date(a.updated_at).getTime()<30000);
      if(!fresh) st='idle';
      if((a.stagnation_sec||0)>=120 && st==='working') st='stagnation';
      var L=LB[st]||LB.idle;
      var fill=a.fill_count||0, total=a.total_fill||0, pct=total?Math.round(fill/total*100):0;
      return '<div style="background:var(--panel,#fff);border:1px solid '+L[1]+'33;border-radius:14px;padding:14px">'
        +'<div style="display:flex;align-items:center;gap:8px"><b style="font-size:14px">'+esc(s.name||'-')+'</b>'
        +'<span style="margin-left:auto;font-size:10.5px;font-weight:800;color:'+L[1]+';background:'+L[2]+';padding:3px 9px;border-radius:20px">'+L[0]+'</span></div>'
        +'<div style="height:6px;background:var(--panel-3,#e5e8eb);border-radius:4px;margin-top:10px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+L[1]+'"></div></div>'
        +'<div style="font-size:11.5px;color:var(--ink-dim);margin-top:6px">작성 '+fill+'/'+total+' · '+((a.stagnation_sec||0)>=60?('정체 '+Math.floor((a.stagnation_sec||0)/60)+'분'):(esc(a.current_title||'대기')))+'</div>'
        +((a.care_level||0)>=2?'<div style="font-size:11px;font-weight:800;color:var(--risk);margin-top:6px">⚠️ 케어 '+(a.care_level>=3?'긴급':'경고')+'</div>':'')
        +'</div>';
    }).join('')+'</div>';
    var up=document.getElementById('ctl-updated'); if(up) up.textContent='업데이트 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  window.mountLiveControl=mountLiveControl;

  /* ── 라이브 판서 ── */
  function boardKey(classId){ return 'liveboard:'+(window._myUid||'')+':'+classId; }
  async function boardWrite(classId, obj){
    var sb=window.sb;
    try{ await sb.from('app_settings').upsert({ key:boardKey(classId), value:JSON.stringify(obj), updated_at:new Date().toISOString() }, { onConflict:'key' }); }
    catch(e){ console.warn('[판서 저장 실패]', e&&e.message); }
  }
  async function uploadBoardJpeg(dataUrl, classId, rev){
    var sb=window.sb;
    try{
      var blob = await (await fetch(dataUrl)).blob();
      var path = (window._myUid||'t')+'/'+classId+'.jpg';
      var up = await sb.storage.from('liveboard').upload(path, blob, { upsert:true, contentType:'image/jpeg' });
      if(up.error) throw up.error;
      var pub = sb.storage.from('liveboard').getPublicUrl(path);
      return pub.data.publicUrl;
    }catch(e){ console.warn('[판서 업로드 실패]', e&&e.message); return null; }
  }
  function openBoard(classId){
    if(document.getElementById('tb-modal')) return;
    var T = { pages:[{bg:null,ink:null}], idx:0, color:'#e5484d', width:3, erase:false, dirty:true, rev:0, timer:null, classId:classId, drawing:false, lastX:0,lastY:0, W:1280, H:720 };
    var m=document.createElement('div'); m.id='tb-modal';
    m.style.cssText='position:fixed;inset:0;z-index:11500;background:#1a1a22;display:flex;flex-direction:column';
    m.innerHTML=''
      +'<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#23232e;border-bottom:1px solid #333;flex-wrap:wrap">'
      +'<b style="color:#fff;font-size:14px">🖊️ 라이브 판서</b><span id="tb-cast" style="font-size:11px;color:#4FFFB0;font-weight:700">● 방송 중</span><span style="flex:1"></span>'
      +'<label style="font-size:12px;color:#ccc;cursor:pointer;background:#333;padding:5px 10px;border-radius:6px">🖼️ 배경<input type="file" id="tb-bg" accept="image/*" style="display:none"></label>'
      +'<button id="tb-blank" style="font-size:12px;color:#ccc;background:#333;border:0;padding:5px 10px;border-radius:6px;cursor:pointer">＋ 페이지</button>'
      +'<button data-c="#e5484d" class="tbc" style="width:22px;height:22px;border-radius:50%;background:#e5484d;border:2px solid #fff;cursor:pointer;padding:0"></button>'
      +'<button data-c="#1f6feb" class="tbc" style="width:22px;height:22px;border-radius:50%;background:#1f6feb;border:2px solid #fff;cursor:pointer;padding:0"></button>'
      +'<button data-c="#111" class="tbc" style="width:22px;height:22px;border-radius:50%;background:#111;border:2px solid #fff;cursor:pointer;padding:0"></button>'
      +'<button id="tb-eraser" style="font-size:12px;color:#ccc;background:#333;border:0;padding:5px 10px;border-radius:6px;cursor:pointer">지우개</button>'
      +'<button id="tb-clear" style="font-size:12px;color:#ccc;background:#333;border:0;padding:5px 10px;border-radius:6px;cursor:pointer">지우기</button>'
      +'<span id="tb-page" style="font-size:12px;color:#fff">1/1</span>'
      +'<button id="tb-close" style="font-size:12px;color:#fff;background:#EF5350;border:0;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:700">판서 종료</button>'
      +'</div>'
      +'<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto">'
      +'<div style="position:relative;width:min(96vw,1280px);aspect-ratio:16/9;background:#fff;box-shadow:0 6px 30px rgba(0,0,0,.5);border-radius:6px;overflow:hidden">'
      +'<canvas id="tb-bgc" width="1280" height="720" style="position:absolute;inset:0;width:100%;height:100%"></canvas>'
      +'<canvas id="tb-inkc" width="1280" height="720" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair"></canvas>'
      +'</div></div>';
    document.body.appendChild(m);
    var ink=m.querySelector('#tb-inkc'), ictx=ink.getContext('2d'); ictx.lineCap='round'; ictx.lineJoin='round';
    function pos(e){ var r=ink.getBoundingClientRect(); return {x:(e.clientX-r.left)*(T.W/r.width), y:(e.clientY-r.top)*(T.H/r.height)}; }
    ink.addEventListener('pointerdown',function(e){ e.preventDefault(); T.drawing=true; var p=pos(e); T.lastX=p.x; T.lastY=p.y; try{ink.setPointerCapture(e.pointerId);}catch(_){} });
    ink.addEventListener('pointermove',function(e){ if(!T.drawing)return; e.preventDefault(); var p=pos(e); ictx.globalCompositeOperation=T.erase?'destination-out':'source-over'; ictx.strokeStyle=T.color; ictx.lineWidth=T.erase?T.width*4:T.width; ictx.beginPath(); ictx.moveTo(T.lastX,T.lastY); ictx.lineTo(p.x,p.y); ictx.stroke(); T.lastX=p.x; T.lastY=p.y; T.dirty=true; });
    function end(){ T.drawing=false; } ink.addEventListener('pointerup',end); ink.addEventListener('pointercancel',end); ink.addEventListener('pointerleave',end);
    function renderBg(){ var bgc=m.querySelector('#tb-bgc'), b=bgc.getContext('2d'); b.fillStyle='#fff'; b.fillRect(0,0,T.W,T.H); var bg=T.pages[T.idx].bg; if(bg){ var im=new Image(); im.onload=function(){ var s=Math.min(T.W/im.width,T.H/im.height),w=im.width*s,h=im.height*s; b.drawImage(im,(T.W-w)/2,(T.H-h)/2,w,h); T.dirty=true; }; im.src=bg; } m.querySelector('#tb-page').textContent=(T.idx+1)+'/'+T.pages.length; }
    function saveInk(){ try{ T.pages[T.idx].ink=ink.toDataURL('image/png'); }catch(e){} }
    function loadInk(){ ictx.clearRect(0,0,T.W,T.H); var d=T.pages[T.idx].ink; if(d){ var im=new Image(); im.onload=function(){ ictx.drawImage(im,0,0); }; im.src=d; } }
    m.querySelectorAll('.tbc').forEach(function(btn){ btn.onclick=function(){ T.color=btn.getAttribute('data-c'); T.erase=false; m.querySelector('#tb-eraser').style.background='#333'; }; });
    m.querySelector('#tb-eraser').onclick=function(){ T.erase=!T.erase; this.style.background=T.erase?'#7B1FA2':'#333'; };
    m.querySelector('#tb-clear').onclick=function(){ ictx.clearRect(0,0,T.W,T.H); T.dirty=true; };
    m.querySelector('#tb-blank').onclick=function(){ saveInk(); T.pages.push({bg:null,ink:null}); T.idx=T.pages.length-1; renderBg(); loadInk(); T.dirty=true; };
    m.querySelector('#tb-bg').onchange=function(){ var f=this.files&&this.files[0]; if(!f)return; var rd=new FileReader(); rd.onload=function(){ saveInk(); T.pages[T.idx].bg=rd.result; renderBg(); T.dirty=true; }; rd.readAsDataURL(f); this.value=''; };
    m.querySelector('#tb-close').onclick=async function(){ clearInterval(T.timer); await boardWrite(T.classId,{active:false,ts:Date.now()}); m.remove(); };
    renderBg();
    T.timer=setInterval(broadcast, 1500);
    broadcast();
    async function broadcast(){
      if(!T.dirty) return; T.dirty=false;
      try{
        var ex=document.createElement('canvas'); ex.width=T.W; ex.height=T.H; var c=ex.getContext('2d');
        c.drawImage(m.querySelector('#tb-bgc'),0,0); c.drawImage(ink,0,0);
        var jpeg=ex.toDataURL('image/jpeg',0.6);
        T.rev++;
        var url=await uploadBoardJpeg(jpeg, T.classId, T.rev);
        if(!url){ T.dirty=true; return; }
        await boardWrite(T.classId,{ rev:T.rev, img_url:url, active:true, page:(T.idx+1), total:T.pages.length, ts:Date.now() });
        var cast=m.querySelector('#tb-cast'); if(cast) cast.textContent='● 방송 중 (rev '+T.rev+')';
      }catch(e){ T.dirty=true; }
    }
  }

  window.ArcheAcademyOps = { version:'2.0' };
})();
