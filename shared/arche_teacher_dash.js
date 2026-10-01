/* ============================================================================
 * arche_teacher_dash.js · 강사 대시보드 (A: 담당학생 · 강의관리)
 * ----------------------------------------------------------------------------
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage
 * 데이터  : academy_classes / student_enrollments / students /
 *           class_assignments / assignment_scores / attendance_sessions / attendance_records
 *           (전부 staff RLS 직접 접근)
 * 제공     : window.mountTeacherDash(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  var LAB={present:'출석',late:'지각',absent:'결석',early:'조퇴'};

  function injectCSS(){
    if(document.getElementById('tdash-css'))return;
    var s=document.createElement('style'); s.id='tdash-css';
    s.textContent=[
    ".tdash{--b:#3182f6;--b2:#1b64da;--safe:#12b76a;--warn:#f79009;--risk:#f04452;--line:#e8ebee;--mute:#8b95a1;--dim:#4e5968;--ink:#191f28;--bs:#eaf1ff;--ss:#e8f7ee;--ws:#fff6e8;--rs:#fdecec;--p2:#f4f6f8}",
    ".tdash *{box-sizing:border-box}.tdash [hidden]{display:none!important}",
    ".tdash .row1{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}",
    ".tdash select{padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px;font-weight:600;color:var(--ink);background:#fff}",
    ".tdash .atoggle{display:flex;gap:6px;background:var(--p2);border:1px solid var(--line);border-radius:11px;padding:4px;margin-bottom:14px}",
    ".tdash .atoggle button{flex:1;border:none;background:transparent;border-radius:8px;padding:10px;font-size:12.5px;font-weight:800;color:var(--mute);cursor:pointer}",
    ".tdash .atoggle button.on{background:#fff;color:var(--b);box-shadow:0 1px 3px rgba(25,31,40,.1)}",
    ".tdash .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".tdash .h{font-size:14px;font-weight:800;margin-bottom:8px}.tdash .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".tdash .d{font-size:12px;color:var(--dim);line-height:1.6}",
    ".tdash .btn{border:none;border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:var(--b);color:#fff}",
    ".tdash .btn.sub{background:#fff;color:var(--dim);border:1px solid var(--line)}",
    ".tdash input,.tdash .inp{padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit}",
    ".tdash .arow{display:flex;align-items:center;gap:9px;padding:9px 0;border-top:1px solid #eef1f4}.tdash .arow:first-child{border-top:none}",
    ".tdash .bar{flex:1;height:8px;background:var(--p2);border-radius:5px;overflow:hidden}.tdash .bar i{display:block;height:100%;background:var(--b)}",
    ".tdash .pc{font-size:12px;font-weight:800;width:52px;text-align:right}",
    ".tdash table{width:100%;border-collapse:collapse;font-size:12.5px}",
    ".tdash th{color:var(--mute);font-size:11px;font-weight:800;text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}",
    ".tdash td{padding:7px 8px;border-bottom:1px solid #eef1f4}",
    ".tdash .chk{width:17px;height:17px}",
    ".tdash .sc{width:62px}",
    ".tdash .pill{font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;white-space:nowrap}",
    ".tdash .pill.o{background:var(--ss);color:var(--safe)}.tdash .pill.l{background:var(--ws);color:#b45309}.tdash .pill.x{background:var(--rs);color:var(--risk)}",
    ".tdash .mets{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}",
    ".tdash .met{background:var(--p2);border-radius:10px;padding:9px 3px;text-align:center}.tdash .met .v{font-size:17px;font-weight:900}.tdash .met .k{font-size:10px;color:var(--mute);font-weight:700;margin-top:1px}",
    ".tdash .met.hot .v{color:var(--risk)}",
    ".tdash .ph{border:1.5px dashed var(--line);border-radius:14px;padding:24px;text-align:center;color:var(--mute);font-size:12.5px}",
    ".tdash .seg{display:flex;gap:4px}.tdash .seg button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:var(--mute);cursor:pointer}.tdash .seg button.on{background:var(--b);color:#fff;border-color:var(--b)}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountTeacherDash(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="tdash"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId, uid=window._myUid;
    var canManage=(window._isOwner===true||window._canManage===true||window._myRole==='owner'||window._myRole==='manager');

    var S={ classes:[], classId:null, tab:'lesson', attMode:'class', attStu:null,
            students:[], assigns:[], scores:{}, att:{} };

    try{
      var rc=await sb().from('academy_classes').select('id,name,subject,teacher_id').eq('academy_id',acid).order('created_at');
      var list=(rc&&rc.data)||[];
      if(!canManage&&uid) list=list.filter(function(c){return c.teacher_id===uid;});
      S.classes=list; if(list[0]) S.classId=list[0].id;
    }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="tdash"><div id="td-root"></div></div>';
    var root=host.querySelector('#td-root');

    async function loadLesson(){
      S.students=[]; S.assigns=[]; S.scores={}; S.att={};
      if(!S.classId) return;
      // 학생(enrollment)
      var en=await sb().from('student_enrollments').select('student_id').eq('class_id',S.classId);
      var ids=Array.from(new Set(((en&&en.data)||[]).map(function(e){return e.student_id;})));
      if(ids.length){ var st=await sb().from('students').select('id,name,grade,school,enroll_status').in('id',ids);
        S.students=((st&&st.data)||[]).filter(function(s){return (s.enroll_status||'active')!=='withdrawn';}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko');}); }
      // 과제
      var ca=await sb().from('class_assignments').select('id,title,subject,assigned_date,due_date').eq('class_id',S.classId).order('assigned_date',{ascending:false});
      S.assigns=(ca&&ca.data)||[];
      var aids=S.assigns.map(function(a){return a.id;});
      if(aids.length){ var sc=await sb().from('assignment_scores').select('assignment_id,student_id,submitted,score,diligence').in('assignment_id',aids);
        ((sc&&sc.data)||[]).forEach(function(r){ S.scores[r.assignment_id+'|'+r.student_id]=r; }); }
      // 출결 집계
      var ss=await sb().from('attendance_sessions').select('id').eq('class_id',S.classId);
      var sids=((ss&&ss.data)||[]).map(function(x){return x.id;});
      if(sids.length){ var rr=await sb().from('attendance_records').select('student_id,status').in('session_id',sids);
        ((rr&&rr.data)||[]).forEach(function(r){ var a=S.att[r.student_id]=S.att[r.student_id]||{present:0,late:0,absent:0,early:0}; if(a[r.status]!=null)a[r.status]++; }); }
    }

    function clsOpts(){ return S.classes.map(function(c){ return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>'; }).join(''); }

    function render(){
      var selRow=(S.tab==='exam')?'':'<div class="row1"><select id="td-cls">'+(S.classes.length?clsOpts():'<option>담당 반 없음</option>')+'</select></div>';
      var head=selRow
        +'<div class="atoggle"><button data-t="penta" class="'+(S.tab==='penta'?'on':'')+'">📘 펜타 시리즈</button><button data-t="lesson" class="'+(S.tab==='lesson'?'on':'')+'">📚 강의 관리</button><button data-t="exam" class="'+(S.tab==='exam'?'on':'')+'">🧪 시험 분석</button></div>';
      var body;
      if(S.tab==='exam') body='<div id="td-exam-mount"><div class="ph">불러오는 중…</div></div>';
      else if(!S.classId) body='<div class="ph">담당 반이 없습니다. 원장이 반을 지정하면 표시됩니다.</div>';
      else if(S.tab==='penta') body=viewPenta();
      else body=viewLesson();
      root.innerHTML=head+body; bind();
      if(S.tab==='exam'){ var em=root.querySelector('#td-exam-mount'); if(window.mountExamAnalysis) mountExamAnalysis(em); else if(em) em.innerHTML='<div class="ph">시험 분석 모듈 로드 실패 (arche_exam_analysis.js)</div>'; }
    }

    function viewPenta(){
      var cls=S.classes.filter(function(c){return c.id===S.classId;})[0]||{};
      return '<div class="card"><div class="h">📘 펜타 시리즈 <span class="sub">· 학년 맞춤 로딩</span></div>'
        +'<div class="d">담당 반 학생의 학년에 맞춰 펜타 워크북이 로딩됩니다. (고1→아르케 / 중3→트랙 / 중1~2·초등→비전)</div>'
        +'<div style="margin-top:10px"><button class="btn" id="td-penta-go">펜타 시리즈 열기 →</button></div>'
        +'<div class="d" style="margin-top:8px;color:var(--mute)">※ 워크북 배정·수업은 좌측 [펜타 시리즈] 메뉴에서 진행합니다.</div></div>';
    }

    function viewLesson(){
      var n=S.students.length;
      // 과제 추가 + 목록
      var cls=S.classes.filter(function(c){return c.id===S.classId;})[0]||{};
      var addForm='<div class="card"><div class="h">➕ 과제 등록</div>'
        +'<div class="row1" style="margin:0"><input id="td-atitle" placeholder="과제명 (예: 3/18 함수 워크시트)" style="flex:1;min-width:160px">'
        +'<input id="td-adate" type="date" value="'+(new Date().toISOString().slice(0,10))+'">'
        +'<input id="td-asubj" placeholder="과목" value="'+esc(cls.subject||'')+'" style="width:90px">'
        +'<button class="btn" id="td-aadd">등록</button></div></div>';
      // 과제별 제출율
      var subRows=S.assigns.map(function(a){
        var sub=0; S.students.forEach(function(s){ var r=S.scores[a.id+'|'+s.id]; if(r&&r.submitted)sub++; });
        var pct=n?Math.round(sub/n*100):0;
        return '<div class="arow"><div style="width:150px;font-weight:700;font-size:12.5px">'+esc(a.title)+'<div style="font-size:10.5px;color:var(--mute);font-weight:500">'+esc((a.assigned_date||'').slice(5))+(a.subject?' · '+esc(a.subject):'')+'</div></div>'
          +'<div class="bar"><i style="width:'+pct+'%"></i></div><div class="pc">'+pct+'%</div>'
          +'<button class="btn sub" data-grade="'+a.id+'" style="padding:5px 10px">채점</button>'
          +'<button class="btn sub" data-adel="'+a.id+'" style="padding:5px 8px;color:var(--risk)">삭제</button></div>';
      }).join('')||'<div class="d" style="color:var(--mute)">등록된 과제가 없습니다.</div>';
      var subCard='<div class="card"><div class="h">📝 수업일별 과제 제출율 <span class="sub">· 학생 '+n+'명</span></div>'+subRows+'</div>';
      // 채점 패널(선택 과제)
      var gradeCard='';
      if(S._grading){
        var a=S.assigns.filter(function(x){return x.id===S._grading;})[0];
        if(a){
          var rows=S.students.map(function(s){ var r=S.scores[a.id+'|'+s.id]||{};
            return '<tr><td>'+esc(s.name)+' <span style="color:var(--mute);font-size:10.5px">'+esc(s.grade||'')+'</span></td>'
              +'<td style="text-align:center"><input type="checkbox" class="chk" data-sub="'+s.id+'" '+(r.submitted?'checked':'')+'></td>'
              +'<td><input class="inp sc" type="number" step="1" data-score="'+s.id+'" value="'+(r.score!=null?esc(r.score):'')+'" placeholder="점수"></td>'
              +'<td><select class="inp" data-dil="'+s.id+'"><option value="">성실도</option>'
                +['우수','보통','미흡'].map(function(d){return '<option'+(r.diligence===d?' selected':'')+'>'+d+'</option>';}).join('')+'</select></td></tr>';
          }).join('');
          gradeCard='<div class="card"><div class="h">✍️ 채점 · '+esc(a.title)+' <span class="sub">· 입력 후 [저장]</span></div>'
            +'<table><thead><tr><th>학생</th><th style="text-align:center">제출</th><th>점수</th><th>성실도</th></tr></thead><tbody>'+rows+'</tbody></table>'
            +'<div style="margin-top:10px"><button class="btn" id="td-gsave">저장</button> <button class="btn sub" id="td-gclose">닫기</button> <span id="td-gmsg" style="font-size:12px;margin-left:6px"></span></div></div>';
        }
      }
      // 출결·성실도
      var attCard=viewAtt();
      return addForm+subCard+gradeCard+attCard;
    }

    function viewAtt(){
      var head='<div class="card"><div class="h">🕘 출결 · 성실도 <span class="sub">· 출석부 연동</span>'
        +'<span class="seg" style="float:right"><button data-am="class" class="'+(S.attMode==='class'?'on':'')+'">반 전체</button><button data-am="student" class="'+(S.attMode==='student'?'on':'')+'">학생별</button></span></div>';
      var bodyh;
      if(S.attMode==='class'){
        var rows=S.students.map(function(s){ var a=S.att[s.id]||{present:0,late:0,absent:0,early:0};
          return '<tr><td>'+esc(s.name)+'</td>'
            +'<td style="text-align:center">'+a.present+'</td>'
            +'<td style="text-align:center"><span class="pill l">'+a.late+'</span></td>'
            +'<td style="text-align:center"><span class="pill x">'+a.absent+'</span></td>'
            +'<td style="text-align:center">'+a.early+'</td></tr>';
        }).join('')||'<tr><td colspan="5" class="d">학생이 없습니다.</td></tr>';
        bodyh='<table><thead><tr><th>학생</th><th style="text-align:center">출석</th><th style="text-align:center">지각</th><th style="text-align:center">결석</th><th style="text-align:center">조퇴</th></tr></thead><tbody>'+rows+'</tbody></table>';
      } else {
        var opts=S.students.map(function(s){return '<option value="'+s.id+'"'+(S.attStu===s.id?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
        var sid=S.attStu||(S.students[0]&&S.students[0].id);
        var a=S.att[sid]||{present:0,late:0,absent:0,early:0};
        bodyh='<select id="td-attstu" style="margin-bottom:10px">'+opts+'</select>'
          +'<div class="mets"><div class="met"><div class="v">'+a.present+'</div><div class="k">출석</div></div>'
          +'<div class="met'+(a.late>=3?' hot':'')+'"><div class="v">'+a.late+'</div><div class="k">지각</div></div>'
          +'<div class="met'+(a.absent>0?' hot':'')+'"><div class="v">'+a.absent+'</div><div class="k">결석</div></div>'
          +'<div class="met"><div class="v">'+a.early+'</div><div class="k">조퇴</div></div></div>';
      }
      return head+bodyh+'</div>';
    }

    function bind(){
      var cl=root.querySelector('#td-cls'); if(cl) cl.onchange=function(){ S.classId=this.value; S._grading=null; reloadLesson(); };
      root.querySelectorAll('.atoggle button').forEach(function(b){ b.onclick=function(){ S.tab=this.dataset.t; render(); }; });
      var pg=root.querySelector('#td-penta-go'); if(pg) pg.onclick=function(){ var n=document.querySelector('.nav[data-v="penta"]'); if(n&&window.go)go(n); };
      // 과제 등록
      var aa=root.querySelector('#td-aadd'); if(aa) aa.onclick=addAssign;
      root.querySelectorAll('[data-grade]').forEach(function(x){ x.onclick=function(){ S._grading=+this.dataset.grade; render(); }; });
      root.querySelectorAll('[data-adel]').forEach(function(x){ x.onclick=function(){ delAssign(+this.dataset.adel); }; });
      var gs=root.querySelector('#td-gsave'); if(gs) gs.onclick=saveGrades;
      var gc=root.querySelector('#td-gclose'); if(gc) gc.onclick=function(){ S._grading=null; render(); };
      root.querySelectorAll('.seg button[data-am]').forEach(function(b){ b.onclick=function(){ S.attMode=this.dataset.am; render(); }; });
      var as=root.querySelector('#td-attstu'); if(as) as.onchange=function(){ S.attStu=this.value; render(); };
    }

    async function reloadLesson(){ root.innerHTML='<div class="ph">불러오는 중…</div>'; await loadLesson(); render(); }

    async function addAssign(){
      var t=(root.querySelector('#td-atitle').value||'').trim(); if(!t){ alert('과제명을 입력하세요.'); return; }
      var row={ academy_id:acid, class_id:S.classId, teacher_id:uid||null, title:t,
        subject:(root.querySelector('#td-asubj').value||'').trim()||null,
        assigned_date:(root.querySelector('#td-adate').value||new Date().toISOString().slice(0,10)) };
      var r=await sb().from('class_assignments').insert(row); if(r.error){ alert('등록 실패: '+r.error.message); return; }
      await reloadLesson();
    }
    async function delAssign(id){ if(!confirm('이 과제를 삭제할까요? (채점 내역도 삭제)'))return;
      var r=await sb().from('class_assignments').delete().eq('id',id); if(r.error){ alert('삭제 실패: '+r.error.message); return; }
      if(S._grading===id)S._grading=null; await reloadLesson(); }
    async function saveGrades(){
      var a=S.assigns.filter(function(x){return x.id===S._grading;})[0]; if(!a)return;
      var m=root.querySelector('#td-gmsg'); m.textContent='저장 중…';
      var rows=S.students.map(function(s){
        var sub=root.querySelector('[data-sub="'+s.id+'"]'); var scv=root.querySelector('[data-score="'+s.id+'"]'); var dv=root.querySelector('[data-dil="'+s.id+'"]');
        return { assignment_id:a.id, academy_id:acid, student_id:s.id,
          submitted:!!(sub&&sub.checked), score:(scv&&scv.value!=='')?Number(scv.value):null,
          diligence:(dv&&dv.value)||null, graded_by:uid||null, graded_at:new Date().toISOString() };
      });
      var r=await sb().from('assignment_scores').upsert(rows,{onConflict:'assignment_id,student_id'});
      if(r.error){ m.textContent='실패: '+r.error.message; return; }
      m.textContent='✓ 저장됨'; await loadLesson(); // 제출율 갱신
      rows.forEach(function(x){ S.scores[x.assignment_id+'|'+x.student_id]=x; });
    }

    root.innerHTML='<div class="ph">불러오는 중…</div>';
    await loadLesson(); render();
  }

  window.mountTeacherDash = mountTeacherDash;
})();
