/* ============================================================================
 * arche_attendance.js · 출석부 모듈 (강사 체크 → 실장님 전달·통화기록 → 강사·원장 열람)
 * ----------------------------------------------------------------------------
 * 의존 전역: window.sb, window._acadId, window._myUid,
 *            window._isOwner/_canManage(원장·실장 여부), window.SB_URL/FN_BASE
 * 백엔드   : Supabase edge function `attendance-api`
 *            actions: roster / save / send / save_call / calls / prenotice
 * 제공     : window.mountAttendance(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function fnBase(){ return window.FN_BASE || ((window.SB_URL||'')+'/functions/v1'); }
  async function token(){ try{ var s=(await sb().auth.getSession()).data.session; return s?s.access_token:''; }catch(e){ return ''; } }
  async function myUid(){ if(window._myUid) return window._myUid; try{ var s=(await sb().auth.getSession()).data.session; return s&&s.user?s.user.id:null; }catch(e){ return null; } }
  async function api(action, payload){
    var tok=await token();
    var r=await fetch(fnBase()+'/attendance-api',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    var j=await r.json().catch(function(){return {error:'응답 오류'};});
    if(!r.ok || j.error) throw new Error(j.error||('HTTP '+r.status));
    return j;
  }

  var LAB={present:'출석',late:'지각',absent:'결석',early:'조퇴'};
  var SEG=['present','late','absent','early'];
  var CK ={present:'o',late:'l',absent:'x',early:'e'};
  var RL ={done:'통화완료',miss:'부재중',sms:'문자발송'};

  function injectCSS(){
    if(document.getElementById('attx-css')) return;
    var s=document.createElement('style'); s.id='attx-css';
    s.textContent=[
    ".attx{--b:#3182f6;--b2:#1b64da;--safe:#12b76a;--warn:#f79009;--risk:#f04452;--violet:#7c3aed;",
    "  --bs:#eaf1ff;--ss:#e8f7ee;--ws:#fff6e8;--rs:#fdecec;--vs:#f3eefe;--line:#e8ebee;--mute:#8b95a1;--dim:#4e5968;--ink:#191f28}",
    ".attx *{box-sizing:border-box}",
    ".attx [hidden]{display:none!important}",
    ".attx .row1{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}",
    ".attx select,.attx input[type=date]{padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:13px;font-weight:600;color:var(--ink);background:#fff}",
    ".attx .rtoggle{display:flex;gap:6px;background:#f4f6f8;border:1px solid var(--line);border-radius:11px;padding:4px;margin-bottom:14px}",
    ".attx .rtoggle button{flex:1;border:none;background:transparent;border-radius:8px;padding:10px;font-size:12.5px;font-weight:800;color:var(--mute);cursor:pointer}",
    ".attx .rtoggle button.on{background:#fff;color:var(--b);box-shadow:0 1px 3px rgba(25,31,40,.1)}",
    ".attx .clshead{background:linear-gradient(135deg,#eef3ff,#fff);border:1px solid #dbe4fb;border-radius:14px;padding:14px 15px;margin-bottom:11px}",
    ".attx .clshead .dt{font-size:12px;color:var(--b2);font-weight:800}",
    ".attx .clshead .nm{font-size:17px;font-weight:900;margin-top:2px}",
    ".attx .clshead .mt{font-size:11.5px;color:var(--dim);margin-top:2px}",
    ".attx .asum{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:12px}",
    ".attx .asum .a{border-radius:11px;padding:10px 2px;text-align:center;border:1px solid var(--line)}",
    ".attx .asum .a .v{font-size:19px;font-weight:900}.attx .asum .a .k{font-size:10px;font-weight:700;margin-top:1px;color:var(--mute)}",
    ".attx .asum .a.o{background:var(--ss)}.attx .asum .a.o .v{color:var(--safe)}",
    ".attx .asum .a.l{background:var(--ws)}.attx .asum .a.l .v{color:#b45309}",
    ".attx .asum .a.x{background:var(--rs)}.attx .asum .a.x .v{color:var(--risk)}",
    ".attx .asum .a.e{background:var(--vs)}.attx .asum .a.e .v{color:var(--violet)}",
    ".attx .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".attx .card .h{font-size:14px;font-weight:800;margin-bottom:3px}.attx .card .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".attx .d{font-size:11.5px;color:var(--dim);line-height:1.65}",
    ".attx .arow{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:11px 0;border-top:1px solid #eef1f4}.attx .arow:first-of-type{border-top:none}",
    ".attx .arow.out{opacity:.62}",
    ".attx .amain{display:flex;align-items:center;gap:10px}",
    ".attx .av{width:34px;height:34px;border-radius:10px;background:var(--bs);color:var(--b2);font-weight:800;display:grid;place-items:center;font-size:12.5px;flex:none}",
    ".attx .ainfo{flex:1;min-width:0}.attx .ainfo b{font-size:13px}.attx .ainfo .s{font-size:10.5px;color:var(--mute)}",
    ".attx .badge{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:20px;margin-left:6px}",
    ".attx .badge.new{background:var(--bs);color:var(--b2)}.attx .badge.wd{background:#f4f6f8;color:var(--mute)}",
    ".attx .seg{display:flex;gap:3px;flex:none}",
    ".attx .seg button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:6px 0;font-size:10.5px;font-weight:800;color:var(--mute);width:36px;cursor:pointer}",
    ".attx .seg button.on.o{background:var(--safe);color:#fff;border-color:var(--safe)}",
    ".attx .seg button.on.l{background:var(--warn);color:#fff;border-color:var(--warn)}",
    ".attx .seg button.on.x{background:var(--risk);color:#fff;border-color:var(--risk)}",
    ".attx .seg button.on.e{background:var(--violet);color:#fff;border-color:var(--violet)}",
    ".attx .pren{display:flex;align-items:center;gap:7px;padding:8px 10px;background:#f8fafc;border:1px dashed #d7dde4;border-radius:10px}",
    ".attx .pchk{border:1px solid var(--line);background:#fff;border-radius:20px;padding:6px 11px;font-size:11px;font-weight:800;color:var(--mute);cursor:pointer;white-space:nowrap;flex:none}",
    ".attx .pchk.on{background:var(--b);color:#fff;border-color:var(--b)}",
    ".attx .pnote{flex:1;min-width:0;padding:7px 9px;border:1px solid var(--line);border-radius:8px;font-size:11.5px;font-family:inherit;color:var(--ink);background:#fff}",
    ".attx .sendbtn{width:100%;border:none;border-radius:11px;padding:13px;background:var(--b);color:#fff;font-size:13.5px;font-weight:800;cursor:pointer;margin-top:10px}",
    ".attx .sendbtn.done{background:var(--safe)}",
    ".attx .note{font-size:10.5px;color:var(--mute);margin-top:9px;line-height:1.6}",
    ".attx .pill{font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;white-space:nowrap}",
    ".attx .pill.o{background:var(--ss);color:var(--safe)}.attx .pill.l{background:var(--ws);color:#b45309}.attx .pill.x{background:var(--rs);color:var(--risk)}.attx .pill.e{background:var(--vs);color:var(--violet)}",
    ".attx .pill.pn{background:var(--bs);color:var(--b2)}",
    ".attx .crow{padding:10px 0;border-top:1px solid #eef1f4}.attx .crow:first-child{border-top:none;padding-top:2px}",
    ".attx .ct{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.attx .ct b{font-size:13px}",
    ".attx .cm{font-size:11.5px;color:var(--dim);margin-top:5px;line-height:1.55;background:#f4f6f8;border-radius:8px;padding:8px 10px}",
    ".attx .call{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px}",
    ".attx .call.l{border-color:#f3d9a8;background:#fffdf8}.attx .call.x{border-color:#f7d4d4;background:#fffafa}.attx .call.e{border-color:#e6dcfb;background:#fdfcff}",
    ".attx .call .top{display:flex;align-items:center;gap:8px}.attx .call .top b{font-size:14px}.attx .call .top .m{font-size:10.5px;color:var(--mute);margin-left:2px}",
    ".attx .tels{display:flex;gap:7px;margin-top:10px}",
    ".attx .tel{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--b);background:var(--bs);color:var(--b2);border-radius:9px;padding:9px;font-size:11.5px;font-weight:800;text-decoration:none}",
    ".attx .tel small{font-weight:600;color:var(--dim)}",
    ".attx .memo{width:100%;min-height:52px;margin-top:9px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:12px;font-family:inherit;resize:vertical}",
    ".attx .stchips{display:flex;gap:6px;margin-top:8px}",
    ".attx .stchips button{border:1px solid var(--line);background:#fff;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:700;color:var(--dim);cursor:pointer}",
    ".attx .stchips button.on{background:var(--safe);color:#fff;border-color:var(--safe)}",
    ".attx .stchips button.on.miss{background:var(--warn);border-color:var(--warn)}",
    ".attx .stchips button.on.sms{background:var(--b);border-color:var(--b)}",
    ".attx .ph{border:1.5px dashed var(--line);border-radius:14px;padding:26px;text-align:center;color:var(--mute);font-size:12.5px}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountAttendance(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="attx"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }

    var uid=await myUid();
    var canManage=(window._isOwner===true || window._canManage===true || window._myRole==='owner' || window._myRole==='manager');

    var S={ classes:[], classId:null, date:new Date().toISOString().slice(0,10),
            role: (canManage?'teacher':'teacher'), sess:null, cls:null, students:[], loading:false };

    // 반 목록 로드 (원장=전체, 강사=담당반)
    try{
      var rc=await sb().from('academy_classes').select('id,name,subject,teacher_id').eq('academy_id',window._acadId).order('created_at');
      var list=(rc&&rc.data)||[];
      if(!canManage && uid) list=list.filter(function(c){ return c.teacher_id===uid; });
      S.classes=list;
      if(list[0]) S.classId=list[0].id;
    }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="attx"><div id="attx-root"></div></div>';
    var root=host.querySelector('#attx-root');

    function clsOpts(){ return S.classes.map(function(c){ return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>'; }).join(''); }

    async function loadRoster(){
      if(!S.classId){ renderShell(); return; }
      S.loading=true; renderShell();
      try{
        var j=await api('roster',{ class_id:S.classId, date:S.date });
        S.sess=j.session; S.cls=j.class; S.students=j.students||[];
      }catch(e){ S.err=String(e.message||e); }
      S.loading=false; renderShell();
    }

    function sumCounts(){ var c={present:0,late:0,absent:0,early:0}; S.students.forEach(function(s){ if(c.hasOwnProperty(s.status)) c[s.status]++; }); return c; }

    function renderShell(){
      var head='<div class="row1">'
        +'<select id="attx-cls">'+(S.classes.length?clsOpts():'<option value="">담당 반 없음</option>')+'</select>'
        +'<input type="date" id="attx-date" value="'+S.date+'">'
        +(canManage?'<div class="rtoggle" style="margin:0;flex:1;min-width:200px"><button data-r="teacher" class="'+(S.role==='teacher'?'on':'')+'">👩‍🏫 강사 출석부</button><button data-r="manager" class="'+(S.role==='manager'?'on':'')+'">🏢 실장님</button></div>':'')
        +'</div>';
      var bodyHtml;
      if(S.loading) bodyHtml='<div class="ph">불러오는 중…</div>';
      else if(S.err) bodyHtml='<div class="ph">오류: '+esc(S.err)+'</div>';
      else if(!S.classId) bodyHtml='<div class="ph">담당 반이 없습니다. 원장이 강사에게 반을 지정하면 표시됩니다.</div>';
      else bodyHtml=(S.role==='manager'?viewManager():viewTeacher());
      root.innerHTML=head+bodyHtml;
      bind();
    }

    function prenTeacher(s,i){
      return '<div class="pren">'
        +'<button class="pchk'+(s.pre_noticed?' on':'')+'" data-pn="'+i+'">📋 사전 인지</button>'
        +'<input class="pnote" data-pn="'+i+'" placeholder="사유(선택): 병결·가정사정·사전연락 등" value="'+esc(s.pre_notice_note||'')+'">'
        +'</div>';
    }

    function viewTeacher(){
      var c=sumCounts();
      var sum='<div class="asum">'+SEG.map(function(k){ return '<div class="a '+CK[k]+'"><div class="v">'+c[k]+'</div><div class="k">'+LAB[k]+'</div></div>'; }).join('')+'</div>';
      var list=S.students.map(function(s,i){
        var bd=(s.enroll_status==='withdrawn')?'<span class="badge wd">퇴원</span>':(s.status==null?'<span class="badge new">미체크</span>':'');
        var pn=(s.status&&s.status!=='present')?prenTeacher(s,i):'';
        return '<div class="arow'+(s.enroll_status==='withdrawn'?' out':'')+'">'
          +'<div class="amain"><div class="av">'+esc((s.name||'?').slice(0,2))+'</div>'
          +'<div class="ainfo"><b>'+esc(s.name||'')+'</b>'+bd+'<div class="s">'+esc(s.grade||'')+(s.school?' · '+esc(s.school):'')+'</div></div>'
          +'<div class="seg">'+SEG.map(function(k){ return '<button data-i="'+i+'" data-k="'+k+'" class="'+CK[k]+(s.status===k?' on':'')+'">'+LAB[k]+'</button>'; }).join('')+'</div></div>'
          +pn+'</div>';
      }).join('')||'<div class="d" style="color:var(--mute)">학생이 없습니다.</div>';
      var sent=(S.sess&&S.sess.status==='sent');
      var clsh='<div class="clshead"><div class="dt">📅 '+esc(S.date)+(S.sess&&S.sess.period?' · '+esc(S.sess.period)+'교시':'')+'</div>'
        +'<div class="nm">'+esc(S.cls?S.cls.name:'')+(S.cls&&S.cls.subject?' <span style="font-size:12px;color:var(--mute);font-weight:600">· '+esc(S.cls.subject)+'</span>':'')+'</div>'
        +'<div class="mt">'+(S.cls&&S.cls.teacher?'담당 '+esc(S.cls.teacher)+' · ':'')+'재원 '+S.students.filter(function(s){return s.enroll_status!=='withdrawn';}).length+'명</div></div>';
      var calls=renderTeacherCalls(sent);
      return clsh+sum
        +'<div class="card"><div class="h">✅ 출석 체크 <span class="sub">· 상태를 눌러 선택 · 언제든 변경(자동 저장)</span></div>'+list
        +'<div class="note">※ 지각·결석·조퇴는 [📋 사전 인지]를 눌러 미리 알고 있던 경우로 표시할 수 있어요. 실장님도 함께 확인·수정합니다.</div></div>'
        +'<button class="sendbtn'+(sent?' done':'')+'" id="attx-send">'+(sent?'✓ 실장님에게 전달됨 · 변경사항 자동 반영':'📤 실장님에게 전달')+'</button>'
        +'<div class="note">※ 전달 후에도 상태를 바꾸면 실장님 화면에 자동 반영됩니다.</div>'
        +'<div class="card"><div class="h">📞 실장님 조치 현황 <span class="sub">· 읽기전용</span></div>'
        +'<div class="d" style="margin:2px 0 10px">실장님이 통화·문자한 내용이 표시됩니다. 수업 중 따로 전달받지 않아도 확인할 수 있어요.</div>'+calls+'</div>';
    }
    function renderTeacherCalls(sent){
      var need=S.students.filter(function(s){ return s.status && s.status!=='present'; });
      if(!sent) return '<div class="d" style="color:var(--mute)">전달하면 실장님이 통화·조치한 내용이 여기 표시됩니다.</div>';
      if(!need.length) return '<div class="d" style="color:var(--mute)">조치 필요 학생 없음</div>';
      return need.map(function(s){
        var c=s.call||{};
        var badge=c.result?'<span class="pill '+(c.result==='done'?'o':(c.result==='sms'?'e':'l'))+'">'+RL[c.result]+'</span>':'<span class="pill x">미조치</span>';
        var pnb=s.pre_noticed?' <span class="pill pn">📋 사전인지</span>':'';
        var pnm=s.pre_noticed&&s.pre_notice_note?'<div class="cm" style="background:#eef3ff">사전 사유 · '+esc(s.pre_notice_note)+'</div>':'';
        return '<div class="crow"><div class="ct"><b>'+esc(s.name||'')+'</b> <span class="pill '+CK[s.status]+'">'+LAB[s.status]+'</span> '+badge+pnb+'</div>'
          +'<div class="cm">'+(c.memo?esc(c.memo):'<span style="color:#c9d0d8">통화 내용 미입력</span>')+'</div>'+pnm+'</div>';
      }).join('');
    }

    function viewManager(){
      var c=sumCounts();
      var sent=(S.sess&&S.sess.status==='sent');
      var sum='<div class="asum" style="margin:0 0 12px">'+SEG.map(function(k){ return '<div class="a '+CK[k]+'"><div class="v">'+c[k]+'</div><div class="k">'+LAB[k]+'</div></div>'; }).join('')+'</div>';
      var top='<div class="card"><div class="h">'+esc(S.cls?S.cls.name:'')+(S.cls&&S.cls.teacher?' · '+esc(S.cls.teacher):'')+' <span class="sub">· '+esc(S.date)+(sent?' 전달됨':' (미전달)')+'</span></div>'+sum+'</div>';
      var need=S.students.filter(function(s){ return s.status && s.status!=='present' && s.record_id; });
      var calls=need.length? need.map(function(s,i){
        var c2=s.call||{};
        var tel=function(p,lb){ return p?'<a class="tel" href="tel:'+String(p).replace(/-/g,'')+'">📞 '+lb+' <small>'+esc(p)+'</small></a>':''; };
        return '<div class="call '+CK[s.status]+'"><div class="top"><b>'+esc(s.name||'')+'</b> <span class="pill '+CK[s.status]+'">'+LAB[s.status]+'</span>'+(s.pre_noticed?' <span class="pill pn">📋 사전인지</span>':'')+'<span class="m">'+esc(s.grade||'')+(s.school?' · '+esc(s.school):'')+'</span></div>'
          +'<div class="pren" style="margin-top:10px"><button class="pchk'+(s.pre_noticed?' on':'')+'" data-mpn="'+i+'">📋 사전 인지</button>'
          +'<input class="pnote" data-mpn="'+i+'" placeholder="사전 인지 사유(선택)" value="'+esc(s.pre_notice_note||'')+'"></div>'
          +'<div class="tels">'+tel(s.student_phone,'학생')+tel(s.parent_phone,'학부모')+'</div>'
          +'<textarea class="memo" data-rid="'+s.record_id+'" placeholder="통화 내용 입력">'+(c2.memo?esc(c2.memo):'')+'</textarea>'
          +'<div class="stchips" data-rid="'+s.record_id+'">'
          +'<button data-res="done" class="'+(c2.result==='done'?'on':'')+'">✓ 통화완료</button>'
          +'<button data-res="miss" class="miss '+(c2.result==='miss'?'on miss':'')+'">부재중</button>'
          +'<button data-res="sms" class="sms '+(c2.result==='sms'?'on sms':'')+'">문자발송</button>'
          +'</div></div>';
      }).join('') : '<div class="card" style="color:var(--mute);font-size:12.5px">'+(sent?'전원 출석 · 조치 필요 학생 없음':'강사가 아직 전달하지 않았습니다.')+'</div>';
      return top+'<div style="font-size:12px;font-weight:800;color:var(--b);margin:14px 0 9px">📞 조치 필요 (지각·결석·조퇴)</div>'+calls;
    }

    // 상태 저장(단건)
    async function saveOne(student_id,status){
      try{ await api('save',{ session_id:S.sess.id, records:[{student_id:student_id,status:status}] }); }
      catch(e){ alert('저장 실패: '+(e.message||e)); }
    }
    // 사전 인지 저장(세션+학생) — 상태 저장 이후 호출(기록 존재 보장)
    async function savePrenotice(s){
      try{ await api('prenotice',{ session_id:S.sess.id, student_id:s.student_id, pre_noticed:!!s.pre_noticed, pre_notice_note:(s.pre_notice_note||null) }); }
      catch(e){ /* 조용히 무시 — 다음 로드에서 일관화 */ }
    }

    function bind(){
      var selCls=root.querySelector('#attx-cls'); if(selCls) selCls.onchange=function(){ S.classId=this.value; loadRoster(); };
      var inpD=root.querySelector('#attx-date'); if(inpD) inpD.onchange=function(){ S.date=this.value; loadRoster(); };
      root.querySelectorAll('.rtoggle button').forEach(function(b){ b.onclick=function(){ S.role=this.dataset.r; renderShell(); }; });
      // 강사 seg
      root.querySelectorAll('.seg button').forEach(function(b){ b.onclick=function(){
        var i=+this.dataset.i, k=this.dataset.k, s=S.students[i]; if(!s) return;
        if(k==='present'){ s.pre_noticed=false; s.pre_notice_note=null; }
        s.status=k;
        renderShell();
        saveOne(s.student_id,k);
      }; });
      // 강사 사전인지 토글
      root.querySelectorAll('.pchk[data-pn]').forEach(function(b){ b.onclick=async function(){
        var i=+this.dataset.pn, s=S.students[i]; if(!s) return;
        s.pre_noticed=!s.pre_noticed; renderShell();
        await saveOne(s.student_id,s.status); await savePrenotice(s);
      }; });
      // 강사 사전인지 사유
      root.querySelectorAll('.pnote[data-pn]').forEach(function(t){ var tmr=null; t.oninput=function(){ var i=+this.dataset.pn, v=this.value, s=S.students[i]; if(!s)return; s.pre_notice_note=v; clearTimeout(tmr); tmr=setTimeout(function(){ savePrenotice(s); },700); }; });
      // 전달
      var sendBtn=root.querySelector('#attx-send'); if(sendBtn) sendBtn.onclick=async function(){
        if(!S.sess) return; try{ await api('send',{session_id:S.sess.id}); alert('실장님에게 출석부를 전달했습니다.'); await loadRoster(); }catch(e){ alert('전달 실패: '+(e.message||e)); }
      };
      // 실장 사전인지 토글/사유
      root.querySelectorAll('.pchk[data-mpn]').forEach(function(b){ b.onclick=async function(){
        var need=S.students.filter(function(s){ return s.status && s.status!=='present' && s.record_id; });
        var s=need[+this.dataset.mpn]; if(!s) return; s.pre_noticed=!s.pre_noticed; renderShell(); await savePrenotice(s);
      }; });
      root.querySelectorAll('.pnote[data-mpn]').forEach(function(t){ var tmr=null; t.oninput=function(){
        var need=S.students.filter(function(s){ return s.status && s.status!=='present' && s.record_id; });
        var s=need[+this.dataset.mpn]; if(!s)return; s.pre_notice_note=this.value; clearTimeout(tmr); tmr=setTimeout(function(){ savePrenotice(s); },700); }; });
      // 실장 메모
      root.querySelectorAll('.memo[data-rid]').forEach(function(t){
        var tmr=null; t.oninput=function(){ var rid=+this.dataset.rid, v=this.value; clearTimeout(tmr); tmr=setTimeout(function(){ api('save_call',{record_id:rid,memo:v}).catch(function(){}); },700); };
      });
      // 실장 상태칩
      root.querySelectorAll('.stchips[data-rid] button').forEach(function(b){
        b.onclick=async function(){ var rid=+this.parentNode.dataset.rid, res=this.dataset.res;
          try{ await api('save_call',{record_id:rid,result:res}); await loadRoster(); }catch(e){ alert('저장 실패: '+(e.message||e)); } };
      });
    }

    if(S.classId) loadRoster(); else renderShell();
  }

  window.mountAttendance = mountAttendance;
})();
