/* ============================================================================
 * arche_newsletter.js · 월간 가정통신문 (원장)
 * ----------------------------------------------------------------------------
 * 강의관리(과제)·자체시험(문항분석)·출석부 자동집계 → AI 초안(칭찬·성장추이·
 * 학습진단·다음단계 예측리포트·맞춤특강) → 검토요청·발송 + 오프라인(인쇄/Word).
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage
 * 백엔드   : edge `newsletter-ai` (AI 문안), 테이블 newsletters / special_classes
 * 제공     : window.mountNewsletter(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function fnBase(){ return window.FN_BASE || ((window.SB_URL||'')+'/functions/v1'); }
  async function token(){ try{ var s=(await sb().auth.getSession()).data.session; return s?s.access_token:''; }catch(e){ return ''; } }
  function col(v){ return v<=50?'#f04452':(v<=65?'#f79009':(v<=84?'#7bc86c':'#12b76a')); }
  function ymNow(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function ymLabel(ym){ var p=ym.split('-'); return p[0]+'년 '+Number(p[1])+'월'; }
  function monthRange(ym){ var p=ym.split('-'); var y=+p[0],m=+p[1]; var start=ym+'-01'; var ny=(m===12?y+1:y), nm=(m===12?1:m+1); var end=ny+'-'+String(nm).padStart(2,'0')+'-01'; return {start:start,end:end}; }
  function mode(arr){ var c={},best=null,bn=0; (arr||[]).forEach(function(v){ if(v==null)return; c[v]=(c[v]||0)+1; if(c[v]>bn){bn=c[v];best=v;} }); return best; }

  function injectCSS(){
    if(document.getElementById('nlx-css')) return;
    var s=document.createElement('style'); s.id='nlx-css';
    s.textContent=[
    ".nlx{--b:#3182f6;--b2:#1b64da;--navy:#1A237E;--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--faint:#c9d0d8;--line:#e8ebee;--ls:#eef1f4;--p2:#f4f6f8;--risk:#f04452;--warn:#f79009;--safe:#12b76a;--bs:#eaf1ff;--ss:#e8f7ee;--ws:#fff6e8;--rs:#fdecec}",
    ".nlx *{box-sizing:border-box}",
    ".nlx .row1{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}",
    ".nlx select{flex:1;min-width:120px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:12.5px;font-weight:700;color:var(--ink);background:#fff;font-family:inherit}",
    ".nlx .stoggle{display:flex;gap:6px;overflow-x:auto;background:var(--p2);border:1px solid var(--line);border-radius:11px;padding:4px;margin-bottom:14px}",
    ".nlx .stoggle button{flex:none;border:none;background:transparent;border-radius:8px;padding:9px 13px;font-size:12px;font-weight:800;color:var(--mute);font-family:inherit;cursor:pointer;white-space:nowrap}",
    ".nlx .stoggle button.on{background:#fff;color:var(--b);box-shadow:0 1px 3px rgba(25,31,40,.1)}",
    ".nlx .eyb{font-size:12px;font-weight:800;color:var(--b);margin:16px 0 9px}.nlx .eyb .g{font-weight:600;color:var(--mute)}",
    ".nlx .agg{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}",
    ".nlx .agg .a{background:#fff;border:1px solid var(--line);border-radius:11px;padding:10px 3px;text-align:center}",
    ".nlx .agg .a .v{font-size:17px;font-weight:900}.nlx .agg .a .k{font-size:9.5px;font-weight:700;color:var(--mute);margin-top:2px}",
    ".nlx .agg .a.good .v{color:var(--safe)}.nlx .agg .a.warn .v{color:var(--warn)}.nlx .agg .a.risk .v{color:var(--risk)}",
    ".nlx .src{font-size:10.5px;color:var(--mute);margin-top:6px;line-height:1.5}",
    ".nlx .genbtn{width:100%;border:none;border-radius:11px;padding:13px;background:var(--navy);color:#fff;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:10px}",
    ".nlx .genbtn[disabled]{opacity:.6}",
    ".nlx .letter{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(25,31,40,.05)}",
    ".nlx .lhead{background:linear-gradient(135deg,var(--navy),#283593);color:#fff;padding:17px 18px}",
    ".nlx .lhead .bd{font-size:10.5px;font-weight:700;opacity:.85}.nlx .lhead .ti{font-size:17px;font-weight:900;margin-top:3px}.nlx .lhead .to{font-size:11.5px;opacity:.9;margin-top:4px}",
    ".nlx .lbody{padding:16px 17px}.nlx .sect{margin-bottom:17px}.nlx .sect:last-child{margin-bottom:0}",
    ".nlx .sh{font-size:13.5px;font-weight:800;margin-bottom:7px}.nlx .sh .mut{font-size:10.5px;color:var(--mute);font-weight:600}",
    ".nlx .p{font-size:12.5px;color:var(--dim);line-height:1.72}.nlx .p b{color:var(--ink);font-weight:700}",
    ".nlx .trend{display:flex;align-items:flex-end;gap:10px;background:var(--ss);border-radius:12px;padding:12px 14px;margin:9px 0 3px}",
    ".nlx .tbar{flex:1;text-align:center}.nlx .tbar .bar{height:54px;display:flex;align-items:flex-end;justify-content:center}.nlx .tbar .bar i{width:60%;border-radius:5px 5px 0 0;background:var(--safe);display:block}.nlx .tbar .bar i.cur{background:var(--b)}",
    ".nlx .tbar .vv{font-size:11px;font-weight:800;margin-top:4px}.nlx .tbar .mm{font-size:9.5px;color:var(--mute);margin-top:1px}",
    ".nlx .diag{border:1px solid var(--line);border-radius:11px;overflow:hidden;margin-top:4px}",
    ".nlx .drow{display:flex;align-items:center;gap:9px;padding:9px 12px;border-top:1px solid var(--ls);font-size:11.5px}.nlx .drow:first-child{border-top:none}",
    ".nlx .drow .nm{flex:1;font-weight:700;color:var(--ink)}.nlx .drow .nm em{font-style:normal;font-weight:600;color:var(--mute);font-size:10.5px}",
    ".nlx .drow .pc{font-weight:800}",
    ".nlx .fore{background:var(--ws);border:1px solid #f3d9a8;border-radius:12px;padding:13px 14px;margin-top:4px}",
    ".nlx .fore .ft{font-size:12.5px;font-weight:800;color:#b45309;margin-bottom:6px}.nlx .fore .p{color:#7a4a10}.nlx .fore .p b{color:#663d0a}",
    ".nlx .evd{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.nlx .evd .c{background:#fff;border:1px solid #f0cd94;border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;color:#b45309}.nlx .evd .c b{color:#8a3d00}",
    ".nlx .special{background:linear-gradient(135deg,#eef3ff,#fff);border:1px solid #cfe0ff;border-radius:14px;padding:15px;margin-top:4px}",
    ".nlx .special .lbl{font-size:10px;font-weight:800;color:var(--b);letter-spacing:.3px}.nlx .special .nm{font-size:15px;font-weight:900;margin-top:4px}.nlx .special .ds{font-size:11.5px;color:var(--dim);margin-top:5px;line-height:1.6}",
    ".nlx .special .meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.nlx .special .meta span{background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px 9px;font-size:10.5px;font-weight:700;color:var(--dim)}",
    ".nlx .basis{font-size:10.5px;color:var(--b2);background:var(--bs);border-radius:8px;padding:8px 10px;margin-top:9px;line-height:1.55;font-weight:600}",
    ".nlx .spbtn{width:100%;border:1px solid var(--b);border-radius:10px;padding:10px;background:#fff;color:var(--b2);font-size:12px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:10px}",
    ".nlx .spbtn.done{background:var(--ss);border-color:var(--safe);color:var(--safe)}",
    ".nlx .offbar{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 15px;margin-top:11px}",
    ".nlx .offbar .ot{font-size:12.5px;font-weight:800;margin-bottom:3px}.nlx .offbar .od{font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:11px}",
    ".nlx .offrow{display:flex;gap:8px}.nlx .offrow button{flex:1;border-radius:10px;padding:11px;font-size:12px;font-weight:800;font-family:inherit;cursor:pointer}",
    ".nlx .offrow .pr{background:#fff;border:1px solid var(--line);color:var(--dim)}.nlx .offrow .dl{background:var(--safe);border:1px solid var(--safe);color:#fff}",
    ".nlx .actbar{display:flex;gap:8px;margin-top:12px}.nlx .actbar button{flex:1;border-radius:11px;padding:13px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;border:1px solid var(--line)}",
    ".nlx .actbar .rev{background:#fff;color:var(--dim)}.nlx .actbar .send{background:var(--b);color:#fff;border-color:var(--b)}",
    ".nlx .statl{font-size:11px;font-weight:700;color:var(--mute);text-align:center;margin-top:9px}",
    ".nlx .statl b.d{color:var(--b2)}.nlx .statl b.r{color:var(--warn)}.nlx .statl b.s{color:var(--safe)}",
    ".nlx .disc{font-size:10px;color:var(--mute);line-height:1.6;background:var(--p2);border-radius:10px;padding:11px 13px;margin-top:13px}",
    ".nlx .ph{border:1.5px dashed var(--line);border-radius:14px;padding:24px;text-align:center;color:var(--mute);font-size:12.5px}",
    ".nlx .msg{font-size:11.5px;margin-top:8px;font-weight:700}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountNewsletter(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="nlx"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId, uid=window._myUid;

    var S={ classes:[], classId:null, month:ymNow(), students:[], sid:null,
            agg:null, content:null, nl:null, loading:false, gening:false, msg:'', spMaking:false };

    try{
      var rc=await sb().from('academy_classes').select('id,name,subject').eq('academy_id',acid).order('created_at');
      S.classes=(rc&&rc.data)||[]; if(S.classes[0]) S.classId=S.classes[0].id;
    }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="nlx"><div id="nlx-root"></div></div>';
    var root=host.querySelector('#nlx-root');

    function monthOpts(){ var out=[],d=new Date(); for(var i=0;i<12;i++){ var y=d.getFullYear(),m=d.getMonth()+1-i; while(m<=0){m+=12;y--;} var ym=y+'-'+String(m).padStart(2,'0'); out.push('<option value="'+ym+'"'+(ym===S.month?' selected':'')+'>'+ymLabel(ym)+'</option>'); } return out.join(''); }
    function clsOpts(){ return S.classes.length? S.classes.map(function(c){ return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>'; }).join('') : '<option value="">반 없음</option>'; }

    async function loadStudents(){
      S.students=[]; S.sid=null; if(!S.classId) return;
      var en=await sb().from('student_enrollments').select('student_id').eq('class_id',S.classId);
      var ids=Array.from(new Set(((en&&en.data)||[]).map(function(e){return e.student_id;})));
      if(ids.length){ var st=await sb().from('students').select('id,name,grade,school,region,enroll_status,track').in('id',ids);
        S.students=((st&&st.data)||[]).filter(function(s){return (s.enroll_status||'active')!=='withdrawn';}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko');}); }
      if(S.students[0]) S.sid=S.students[0].id;
    }

    function stu(){ return S.students.filter(function(s){return s.id===S.sid;})[0]||null; }

    // ===== 자동 집계 =====
    async function aggregate(){
      S.agg=null; var s=stu(); if(!s) return;
      var mr=monthRange(S.month), subj=(S.classes.filter(function(c){return c.id===S.classId;})[0]||{}).subject||null;
      var agg={ attendance_rate:null, late_cnt:0, absent_cnt:0, assignment_rate:null, diligence:null, exam_avg:null,
                trend:[], weak:[], strong:[], weak_cnt:0, subject:subj };
      try{
        // 출석 (이번달·이 반)
        var ses=await sb().from('attendance_sessions').select('id,session_date').eq('class_id',S.classId).gte('session_date',mr.start).lt('session_date',mr.end);
        var sesIds=((ses&&ses.data)||[]).map(function(x){return x.id;});
        if(sesIds.length){
          var ar=await sb().from('attendance_records').select('status').eq('student_id',S.sid).in('session_id',sesIds);
          var recs=(ar&&ar.data)||[]; var tot=recs.length,pre=0;
          recs.forEach(function(r){ if(r.status==='present')pre++; else if(r.status==='late')agg.late_cnt++; else if(r.status==='absent')agg.absent_cnt++; });
          if(tot) agg.attendance_rate=Math.round(pre/tot*100);
        }
      }catch(e){}
      try{
        // 과제 (이번달·이 반)
        var ca=await sb().from('class_assignments').select('id').eq('class_id',S.classId).gte('assigned_date',mr.start).lt('assigned_date',mr.end);
        var caIds=((ca&&ca.data)||[]).map(function(x){return x.id;});
        if(caIds.length){
          var as=await sb().from('assignment_scores').select('submitted,score,diligence').eq('student_id',S.sid).in('assignment_id',caIds);
          var rows=(as&&as.data)||[]; if(rows.length){ var sub=rows.filter(function(r){return r.submitted;}).length; agg.assignment_rate=Math.round(sub/rows.length*100); agg.diligence=mode(rows.map(function(r){return r.diligence;})); }
        }
      }catch(e){}
      try{
        // 자체시험: 추이(최근 3개, 이 반) + 취약/강점 단원
        var pp=await sb().from('exam_papers').select('id,title,exam_date').eq('class_id',S.classId).order('exam_date',{ascending:false}).limit(8);
        var papers=(pp&&pp.data)||[];
        var pIds=papers.map(function(p){return p.id;});
        if(pIds.length){
          var sr=await sb().from('exam_student_results').select('paper_id,total_score').eq('student_id',S.sid).in('paper_id',pIds);
          var smap={}; ((sr&&sr.data)||[]).forEach(function(r){ smap[r.paper_id]=r.total_score; });
          var done=papers.filter(function(p){return smap[p.id]!=null;}).slice(0,3).reverse();
          agg.trend=done.map(function(p){ return { m:(p.exam_date||'').slice(5,7).replace(/^0/,'')+'월', v:Math.round(Number(smap[p.id])||0) }; });
          if(agg.trend.length) agg.exam_avg=Math.round(agg.trend.reduce(function(a,b){return a+b.v;},0)/agg.trend.length);
          // 단원별 정답률
          var items=await sb().from('exam_items').select('paper_id,item_no,unit_small,unit_mid,qtype').in('paper_id',pIds);
          var ir=await sb().from('exam_item_results').select('paper_id,item_no,correct').eq('student_id',S.sid).in('paper_id',pIds);
          var rmap={}; ((ir&&ir.data)||[]).forEach(function(r){ rmap[r.paper_id+'|'+r.item_no]=r.correct; });
          var leaf={}; ((items&&items.data)||[]).forEach(function(it){ var c=rmap[it.paper_id+'|'+it.item_no]; if(c===undefined||c===null)return;
            var nm=(it.unit_small||it.unit_mid||'문항'); var key=nm+'||'+(it.qtype||''); leaf[key]=leaf[key]||{nm:nm,qt:it.qtype||'',o:0,t:0}; leaf[key].t++; if(c===true)leaf[key].o++; });
          var arr=Object.keys(leaf).map(function(k){ var l=leaf[k]; return {nm:l.nm,qtype:l.qt,pct:Math.round(l.o/(l.t||1)*100),t:l.t}; }).filter(function(x){return x.t>0;});
          arr.sort(function(a,b){return a.pct-b.pct;});
          agg.weak=arr.filter(function(x){return x.pct<=65;}).slice(0,4);
          agg.weak_cnt=agg.weak.length;
          agg.strong=arr.slice().sort(function(a,b){return b.pct-a.pct;}).filter(function(x){return x.pct>=75;}).slice(0,2);
        }
      }catch(e){}
      S.agg=agg;
    }

    async function loadSaved(){
      S.nl=null; S.content=null; if(!S.sid) return;
      try{
        var r=await sb().from('newsletters').select('*').eq('academy_id',acid).eq('student_id',S.sid).eq('period_key',S.month).limit(1);
        if(r&&r.data&&r.data[0]){ S.nl=r.data[0]; if(S.nl.content) S.content=S.nl.content; }
      }catch(e){}
    }

    async function refresh(){ S.loading=true; render(); await aggregate(); await loadSaved(); S.loading=false; render(); }

    // ===== AI 초안 생성 =====
    async function genDraft(){
      var s=stu(); if(!s||!S.agg){ return; }
      S.gening=true; S.msg='AI가 가정통신문 초안을 작성 중입니다… (최대 1분)'; render();
      try{
        // 주변 고교/학교 기출 근거(있으면)
        var refs=[];
        try{ var rb=await sb().from('ref_exam_bank').select('school,year,round,unit_large,unit_mid,qtype,difficulty').eq('academy_id',acid).limit(6);
          refs=((rb&&rb.data)||[]); }catch(e){}
        var payload={ student:{ name:s.name, grade:s.grade, school:s.school, track:s.track, subject:S.agg.subject },
          period_label:ymLabel(S.month), aggregate:{ attendance_rate:S.agg.attendance_rate, late_cnt:S.agg.late_cnt, absent_cnt:S.agg.absent_cnt,
            assignment_rate:S.agg.assignment_rate, diligence:S.agg.diligence, exam_avg:S.agg.exam_avg, trend:S.agg.trend,
            weak:S.agg.weak.map(function(w){return {nm:w.nm,qtype:w.qtype,pct:w.pct};}), strong:S.agg.strong.map(function(w){return {nm:w.nm,pct:w.pct};}) },
          ref_hits:refs };
        var tok=await token();
        var r=await fetch(fnBase()+'/newsletter-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({payload:payload})});
        var j=await r.json().catch(function(){return{error:'응답 오류'};});
        if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status));
        S.content=j.content; S.msg='✓ 초안 생성 완료 · 검토 후 저장·발송하세요';
        await saveNL('draft');
      }catch(e){ S.msg='초안 생성 실패: '+(e.message||e); }
      S.gening=false; render();
    }

    async function saveNL(status){
      var s=stu(); if(!s) return;
      var row={ academy_id:acid, student_id:S.sid, period_key:S.month, status:status, aggregate:S.agg, content:S.content, created_by:uid, updated_at:new Date().toISOString() };
      if(status==='sent') row.sent_at=new Date().toISOString();
      try{
        if(S.nl&&S.nl.id){ await sb().from('newsletters').update(row).eq('id',S.nl.id); S.nl.status=status; }
        else{ var ins=await sb().from('newsletters').insert(row).select('*').single(); if(ins&&ins.data) S.nl=ins.data; }
      }catch(e){ S.msg='저장 실패: '+(e.message||e); }
    }

    async function makeSpecial(){
      if(!S.content||!S.content.special){ return; }
      var sp=S.content.special, s=stu();
      S.spMaking=true; render();
      try{
        var ins=await sb().from('special_classes').insert({ academy_id:acid, title:sp.nm, description:sp.ds, subject:(S.agg&&S.agg.subject)||null,
          target_grade:(s&&s.grade)||null, basis:sp.basis||null, status:'open', created_by:uid }).select('id').single();
        if(ins&&ins.data){ if(S.nl&&S.nl.id){ await sb().from('newsletters').update({special_id:ins.data.id}).eq('id',S.nl.id); S.nl.special_id=ins.data.id; } S.msg='✓ 특강이 개설되었습니다 · 학부모 수강신청 노출 대상'; }
      }catch(e){ S.msg='특강 개설 실패: '+(e.message||e); }
      S.spMaking=false; render();
    }

    // ===== 렌더 =====
    function aggHTML(){
      var a=S.agg; if(!a) return '<div class="ph">집계할 데이터를 불러오는 중…</div>';
      function cell(k,v,cl){ return '<div class="a '+cl+'"><div class="v">'+v+'</div><div class="k">'+k+'</div></div>'; }
      var at=a.attendance_rate==null?'—':a.attendance_rate+'%', ar=a.attendance_rate==null?'':(a.attendance_rate>=95?'good':a.attendance_rate>=85?'warn':'risk');
      var asg=a.assignment_rate==null?'—':a.assignment_rate+'%', asc=a.assignment_rate==null?'':(a.assignment_rate>=80?'good':a.assignment_rate>=55?'warn':'risk');
      var ex=a.exam_avg==null?'—':a.exam_avg+'점', exc=a.exam_avg==null?'':(a.exam_avg>=80?'good':a.exam_avg>=65?'warn':'risk');
      var wk=a.weak_cnt, wc=wk===0?'good':wk<=2?'warn':'risk';
      return '<div class="agg">'+cell('출석률',at,ar)+cell('과제수행',asg,asc)+cell('자체시험',ex,exc)+cell('취약단원',wk+'개',wc)+'</div>'
        +'<div class="src">출처: 강의관리(수업별 과제 제출·채점), '+ymLabel(S.month)+' 자체시험, 출석부 · 데이터가 없으면 "—"로 표시됩니다.</div>';
    }
    function letterHTML(){
      var c=S.content, s=stu(), a=S.agg||{};
      if(!c){ return '<div class="ph">아직 생성된 가정통신문이 없습니다. [✨ AI 초안 생성]을 눌러 시작하세요.</div>'; }
      var trend='';
      if(a.trend&&a.trend.length){ var mx=Math.max.apply(null,a.trend.map(function(t){return t.v;}))||1;
        trend='<div class="trend">'+a.trend.map(function(t,i){ var h=Math.round(t.v/mx*54); return '<div class="tbar"><div class="bar"><i class="'+(i===a.trend.length-1?'cur':'')+'" style="height:'+h+'px"></i></div><div class="vv">'+t.v+'</div><div class="mm">'+esc(t.m)+'</div></div>'; }).join('')+'</div>'; }
      var diagArr=[].concat((a.strong||[]).map(function(x){return {nm:x.nm,qtype:'',pct:x.pct};})).concat(a.weak||[]);
      var diag=diagArr.length?'<div class="diag">'+diagArr.map(function(x){ var cl=x.pct>=66?'g':x.pct>=51?'w':'r'; var ic=x.pct>=66?'✅':x.pct>=51?'⚠️':'🔴'; var pcol=x.pct>=66?'var(--safe)':x.pct>=51?'var(--warn)':'var(--risk)';
        return '<div class="drow"><span>'+ic+'</span><span class="nm">'+esc(x.nm)+(x.qtype?' <em>'+esc(x.qtype)+'</em>':'')+'</span><span class="pc" style="color:'+pcol+'">'+x.pct+'%</span></div>'; }).join('')+'</div>':'';
      var evd=(c.evidence&&c.evidence.length)?'<div class="evd">'+c.evidence.map(function(e){return '<span class="c"><b>'+esc(e.t||'근거')+'</b> '+esc(e.v||'')+'</span>';}).join('')+'</div>':'';
      var sp=c.special||{};
      var spMade=!!(S.nl&&S.nl.special_id);
      var special='<div class="special"><div class="lbl">'+esc(sp.lbl||'추천 특강')+'</div><div class="nm">'+esc(sp.nm||'')+'</div>'
        +'<div class="ds">'+esc(sp.ds||'')+'</div><div class="meta">'+((sp.meta||[]).map(function(m){return '<span>'+esc(m)+'</span>';}).join(''))+'</div>'
        +(sp.basis?'<div class="basis">'+esc(sp.basis)+'</div>':'')
        +'<button class="spbtn'+(spMade?' done':'')+'" id="nlx-sp"'+(spMade?' disabled':'')+'>'+(spMade?'✓ 특강 개설됨':'🎯 이 특강 개설하기')+'</button></div>';
      return '<div class="letter"><div class="lhead"><div class="bd">가정통신문 · '+ymLabel(S.month)+'</div>'
        +'<div class="ti">'+esc(s?s.name:'')+' 학생 월간 학습 리포트</div>'
        +'<div class="to">'+esc((s&&s.grade)||'')+(s&&s.school?' · '+esc(s.school):'')+' · 학부모님께</div></div>'
        +'<div class="lbody">'
        +'<div class="sect"><div class="sh">👍 이번 달 잘하고 있는 점</div><div class="p">'+esc(c.praise||'')+'</div>'+trend+(c.trend_txt?'<div class="p" style="margin-top:7px">'+esc(c.trend_txt)+'</div>':'')+'</div>'
        +(diag?'<div class="sect"><div class="sh">🔍 학습 진단 <span class="mut">· 자체시험 단원별</span></div>'+diag+'</div>':'')
        +'<div class="sect"><div class="sh">🧭 다음 단계 대비 <span class="mut">· 학교 출제경향·난이도 기반</span></div>'
          +'<div class="fore"><div class="ft">'+esc(c.forecast_title||'예측 리포트')+'</div><div class="p">'+esc(c.forecast||'')+'</div>'+evd+'</div></div>'
        +'<div class="sect"><div class="sh">🎯 맞춤 특강 제안</div>'+special+'</div>'
        +'</div></div>';
    }

    function render(){
      var head='<div class="row1"><select id="nlx-month">'+monthOpts()+'</select><select id="nlx-cls">'+clsOpts()+'</select></div>';
      var stog=S.students.length?'<div class="stoggle">'+S.students.map(function(s){ return '<button data-sid="'+s.id+'" class="'+(s.id===S.sid?'on':'')+'">'+esc(s.name)+'</button>'; }).join('')+'</div>':'';
      var body;
      if(!S.classId) body='<div class="ph">반이 없습니다. 먼저 반·학생을 등록하세요.</div>';
      else if(S.loading) body='<div class="ph">불러오는 중…</div>';
      else if(!S.students.length) body='<div class="ph">이 반에 학생이 없습니다.</div>';
      else{
        var st=S.nl?S.nl.status:null;
        var statusLine=st?('<div class="statl">상태 · '+(st==='sent'?'<b class="s">학부모 발송됨</b>':st==='review'?'<b class="r">강사 검토요청됨</b>':'<b class="d">초안 저장됨</b>')+'</div>'):'';
        body='<div class="eyb">📊 자동 집계 <span class="g">· 강사 입력 데이터에서 자동 수집</span></div>'+aggHTML()
          +'<button class="genbtn" id="nlx-gen"'+(S.gening?' disabled':'')+'>'+(S.gening?'생성 중…':(S.content?'🔄 AI 초안 다시 생성':'✨ AI 초안 생성'))+'</button>'
          +(S.msg?'<div class="msg" style="color:'+(/실패/.test(S.msg)?'var(--risk)':(S.gening?'var(--b)':'var(--safe)'))+'">'+esc(S.msg)+'</div>':'')
          +'<div class="eyb">✉️ 생성된 가정통신문 <span class="g">· 초안 · 발송 전 검토</span></div>'+letterHTML()+statusLine
          +(S.content?('<div class="offbar"><div class="ot">🖨 오프라인 발송</div><div class="od">앱 알림 외에 인쇄물로도 전달할 수 있습니다. <b>Word로 저장</b>하면 한글·워드에서 자유롭게 <b>수정 후 인쇄·발송</b>할 수 있어요.</div>'
            +'<div class="offrow"><button class="pr" id="nlx-print">🖨 인쇄</button><button class="dl" id="nlx-doc">⬇ Word로 저장 (수정 가능)</button></div></div>'
            +'<div class="actbar"><button class="rev" id="nlx-review">👩‍🏫 강사 검토요청</button><button class="send" id="nlx-send">📨 학부모 발송</button></div>'):'')
          +'<div class="disc">※ 본 안내문은 <b>학원 자체 학습데이터</b>(과제·자체시험·출결) 기반 자동 생성 초안입니다. 학교 생활기록부와 무관하며, 예측·대비 내용은 소속 학교 공개 출제범위 및 학원 보유 기출자료에 근거한 <b>참고 정보</b>입니다. 발송 전 담당 강사·원장 검토를 거칩니다.</div>';
      }
      root.innerHTML=head+stog+body;
      bind();
    }

    function bind(){
      var m=root.querySelector('#nlx-month'); if(m) m.onchange=function(){ S.month=this.value; S.msg=''; refresh(); };
      var cl=root.querySelector('#nlx-cls'); if(cl) cl.onchange=async function(){ S.classId=this.value; S.msg=''; S.loading=true; render(); await loadStudents(); await aggregate(); await loadSaved(); S.loading=false; render(); };
      root.querySelectorAll('.stoggle button[data-sid]').forEach(function(b){ b.onclick=function(){ S.sid=this.dataset.sid; S.msg=''; refresh(); }; });
      var g=root.querySelector('#nlx-gen'); if(g) g.onclick=genDraft;
      var sp=root.querySelector('#nlx-sp'); if(sp) sp.onclick=makeSpecial;
      var pr=root.querySelector('#nlx-print'); if(pr) pr.onclick=printLetter;
      var dc=root.querySelector('#nlx-doc'); if(dc) dc.onclick=downloadDoc;
      var rv=root.querySelector('#nlx-review'); if(rv) rv.onclick=async function(){ await saveNL('review'); S.msg='✓ 담당 강사에게 검토를 요청했습니다.'; render(); };
      var sd=root.querySelector('#nlx-send'); if(sd) sd.onclick=async function(){ if(!confirm('학부모에게 이 가정통신문을 발송할까요?\n(앱 알림 + 문자 링크)')) return; await saveNL('sent'); S.msg='✓ 학부모에게 발송되었습니다.'; render(); };
    }

    function printLetter(){
      var html=buildDocHTML(true); var w=window.open('','_blank'); if(!w){ alert('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.'); return; }
      w.document.write(html); w.document.close(); setTimeout(function(){ try{w.print();}catch(e){} },300);
    }
    function downloadDoc(){
      var s=stu(); var html=buildDocHTML(false);
      var blob=new Blob(['﻿'+html],{type:'application/msword'});
      var url=URL.createObjectURL(blob); var a=document.createElement('a');
      a.href=url; a.download=(s?s.name:'학생')+'_가정통신문_'+S.month+'.doc';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url);},1000);
    }
    function buildDocHTML(forPrint){
      var inner=root.querySelector('.letter'); inner=inner?inner.innerHTML:'';
      var css="body{font-family:'맑은 고딕',Malgun Gothic,sans-serif;color:#191f28;font-size:11pt;line-height:1.7;margin:0}"
        +".lhead{background:#283593;color:#fff;padding:18px 20px}.lhead .bd{font-size:9pt;opacity:.85}.lhead .ti{font-size:15pt;font-weight:bold;margin-top:4px}.lhead .to{font-size:10pt;margin-top:5px}"
        +".lbody{padding:18px 20px}.sect{margin-bottom:16px}.sh{font-size:12pt;font-weight:bold;margin-bottom:6px}.sh .mut{font-size:9pt;font-weight:normal;color:#888}"
        +".p{font-size:10.5pt;color:#333;line-height:1.75}"
        +".trend{border:1px solid #cde;padding:10px;margin:8px 0}.tbar{display:inline-block;width:22%;text-align:center}.tbar .bar{display:none}.tbar .vv{font-weight:bold}"
        +".diag{border:1px solid #ddd;margin-top:4px}.drow{padding:7px 10px;border-top:1px solid #eee;font-size:10pt}.drow .nm{font-weight:bold}.drow .pc{float:right;font-weight:bold}.drow .nm em{font-style:normal;font-weight:normal;color:#888}"
        +".fore{border:1px solid #f0cd94;background:#fff8ec;padding:12px;margin-top:4px}.fore .ft{font-weight:bold;color:#b45309;margin-bottom:6px}.fore .p{color:#7a4a10}"
        +".evd .c{display:inline-block;border:1px solid #e0c48a;border-radius:12px;padding:3px 9px;font-size:8.5pt;color:#b45309;margin:4px 4px 0 0}"
        +".special{border:1px solid #cfe0ff;background:#f4f8ff;padding:14px;margin-top:4px}.special .lbl{font-size:8.5pt;color:#1b64da;font-weight:bold}.special .nm{font-size:12pt;font-weight:bold;margin:4px 0}.special .meta span{display:inline-block;border:1px solid #ddd;padding:4px 8px;font-size:8.5pt;margin:4px 4px 0 0}"
        +".basis{background:#eef4ff;padding:8px 10px;font-size:9pt;color:#1b64da;margin-top:8px}.spbtn{display:none}";
      return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
        +'<head><meta charset="utf-8"><title>가정통신문</title><style>'+css+'</style></head><body>'+inner
        +'<p style="font-size:8.5pt;color:#888;margin:16px 20px;line-height:1.6">※ 본 안내문은 학원 자체 학습데이터(과제·자체시험·출결) 기반 자동 생성 초안입니다. 학교 생활기록부와 무관하며, 예측·대비 내용은 학교 공개 출제범위 및 학원 보유 기출자료에 근거한 참고 정보입니다.</p>'
        +'</body></html>';
    }

    await loadStudents(); await refresh();
  }

  window.mountNewsletter = mountNewsletter;
})();
