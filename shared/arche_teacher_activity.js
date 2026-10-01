/* ============================================================================
 * arche_teacher_activity.js · 원장 · 강사 활동 확인 (읽기전용 드릴다운)
 * ----------------------------------------------------------------------------
 * 강사 → 반 → 학생 순으로 파고들어 강사와 동일 화면(과제·시험·출결·통화)을
 * 원장이 읽기전용으로 확인. 기존 원장 메뉴는 유지, [강사 활동 확인] 추가.
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner
 * 제공     : window.mountTeacherActivity(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function col(v){ return v<=50?'#f04452':(v<=65?'#f79009':(v<=84?'#7bc86c':'#12b76a')); }
  function tcol(v){ return v<=50?'#f04452':(v<=65?'#b45309':(v<=84?'#5a9e4e':'#12b76a')); }
  function mode(arr){ var c={},best=null,bn=0; (arr||[]).forEach(function(v){ if(v==null)return; c[v]=(c[v]||0)+1; if(c[v]>bn){bn=c[v];best=v;} }); return best; }
  function daysAgo(iso){ if(!iso) return 9999; return Math.floor((Date.now()-new Date(iso).getTime())/86400000); }
  function agoLabel(iso){ if(!iso) return '기록 없음'; var d=daysAgo(iso); return d<=0?'오늘':(d===1?'어제':d+'일 전'); }

  function injectCSS(){
    if(document.getElementById('tact-css')) return;
    var s=document.createElement('style'); s.id='tact-css';
    s.textContent=[
    ".tact{--b:#3182f6;--b2:#1b64da;--navy:#1A237E;--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--faint:#c9d0d8;--line:#e8ebee;--ls:#eef1f4;--p2:#f4f6f8;--risk:#f04452;--warn:#f79009;--safe:#12b76a;--bs:#eaf1ff;--ss:#e8f7ee;--ws:#fff6e8;--rs:#fdecec;--vs:#f3eefe}",
    ".tact *{box-sizing:border-box}",
    ".tact .bc{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;font-weight:700;margin-bottom:13px;background:#fff;border:1px solid var(--line);border-radius:11px;padding:10px 13px}",
    ".tact .bc a{color:var(--b2);cursor:pointer}.tact .bc .sep{color:var(--faint)}.tact .bc .cur{color:var(--ink)}",
    ".tact .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}",
    ".tact .kpi .c{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px 8px;text-align:center}",
    ".tact .kpi .c .v{font-size:21px;font-weight:900}.tact .kpi .c .k{font-size:10px;color:var(--mute);font-weight:700;margin-top:2px}",
    ".tact .kpi .c.a .v{color:var(--b)}.tact .kpi .c.s .v{color:var(--safe)}.tact .kpi .c.r .v{color:var(--risk)}",
    ".tact .eyb{font-size:12px;font-weight:800;color:var(--b);margin:18px 0 10px}.tact .eyb .g{font-weight:600;color:var(--mute)}",
    ".tact .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:10px}",
    ".tact .card .h{font-size:14px;font-weight:800;margin-bottom:3px}.tact .card .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".tact .sub{font-size:11.5px;color:var(--mute);font-weight:600}",
    ".tact .pill{font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;white-space:nowrap}",
    ".tact .pill.g{background:var(--ss);color:var(--safe)}.tact .pill.w{background:var(--ws);color:#b45309}.tact .pill.r{background:var(--rs);color:var(--risk)}.tact .pill.b{background:var(--bs);color:var(--b2)}",
    ".tact .tcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer}",
    ".tact .thead{display:flex;align-items:center;gap:11px}",
    ".tact .tav{width:38px;height:38px;border-radius:11px;background:var(--bs);color:var(--b2);font-weight:800;display:grid;place-items:center;font-size:14px;flex:none}",
    ".tact .tname{font-size:15px;font-weight:800}.tact .tname span{font-size:11.5px;color:var(--mute);font-weight:600;margin-left:6px}",
    ".tact .tmeta{font-size:11px;color:var(--dim);margin-top:1px}",
    ".tact .mets{display:grid;gap:4px;margin-top:12px}.tact .mets6{grid-template-columns:repeat(6,1fr)}.tact .mets4{grid-template-columns:repeat(4,1fr)}.tact .mets3{grid-template-columns:repeat(3,1fr)}",
    ".tact .mets .m{background:var(--p2);border-radius:9px;padding:8px 2px;text-align:center}.tact .mets .m .mv{font-size:15px;font-weight:900}.tact .mets .m .mk{font-size:9px;color:var(--mute);font-weight:700;margin-top:1px}",
    ".tact .mets .m.hot .mv{color:var(--risk)}",
    ".tact .trow{display:flex;align-items:center;gap:8px;margin-top:12px}.tact .trow .last{font-size:11px;color:var(--mute);font-weight:600}.tact .trow .go{margin-left:auto;color:var(--b2);font-size:11.5px;font-weight:800}",
    ".tact .lrow{display:flex;align-items:center;gap:11px;padding:12px 2px;border-top:1px solid var(--ls);cursor:pointer}.tact .lrow:first-child{border-top:none}",
    ".tact .ci{width:36px;height:36px;border-radius:10px;background:var(--bs);color:var(--b2);font-weight:800;display:grid;place-items:center;font-size:13px;flex:none}",
    ".tact .li{flex:1;min-width:0}.tact .li b{font-size:13.5px}.tact .li .s{font-size:11px;color:var(--dim);margin-top:1px}.tact .lgo{color:var(--faint);font-weight:800;font-size:15px}",
    ".tact .wk{display:flex;align-items:flex-end;gap:9px;height:90px;margin-top:10px;padding-top:6px}",
    ".tact .wk .col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}",
    ".tact .wk .col .bar2{width:60%;background:linear-gradient(180deg,var(--b),var(--b2));border-radius:5px 5px 0 0;min-height:3px}",
    ".tact .wk .col .n{font-size:10px;font-weight:800;color:var(--dim);margin-bottom:3px}.tact .wk .col .l{font-size:10px;color:var(--mute);margin-top:5px}",
    ".tact .tl .i{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--ls)}.tact .tl .i:first-child{border-top:none}",
    ".tact .tl .i .dt{font-size:10.5px;color:var(--mute);font-weight:700;width:74px;flex:none}.tact .tl .i .tx{font-size:12px}",
    ".tact .cmp .r{display:flex;align-items:center;gap:9px;padding:7px 0}.tact .cmp .r .nm{width:56px;font-size:12px;font-weight:800}",
    ".tact .cmp .r .track{flex:1;height:9px;border-radius:5px;background:var(--p2);overflow:hidden}.tact .cmp .r .track i{display:block;height:100%;border-radius:5px}",
    ".tact .cmp .r .vv{width:52px;text-align:right;font-size:11px;font-weight:800;color:var(--dim)}",
    ".tact .clab{font-size:11px;font-weight:800;color:var(--dim);margin:12px 0 2px}",
    ".tact .alert{background:linear-gradient(135deg,#fff5f5,#fff);border:1px solid #f7d4d4;border-radius:13px;padding:14px}",
    ".tact .alert .a{display:flex;gap:9px;padding:8px 0;border-top:1px dashed #f2c9c9;font-size:12px}.tact .alert .a:first-of-type{border-top:none}.tact .alert .a b{color:var(--risk)}",
    ".tact .mirror{background:var(--ws);border:1px solid #f3d9a8;color:#b45309;font-size:11px;font-weight:800;border-radius:10px;padding:9px 12px;margin-bottom:11px;display:flex;align-items:center;gap:7px}",
    ".tact .attsum{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:6px}",
    ".tact .attsum .a{background:var(--p2);border-radius:10px;padding:11px 4px;text-align:center}.tact .attsum .a .v{font-size:18px;font-weight:900}.tact .attsum .a .k{font-size:10px;color:var(--mute);font-weight:700;margin-top:1px}",
    ".tact .attsum .a.w .v{color:var(--warn)}.tact .attsum .a.r .v{color:var(--risk)}.tact .attsum .a.s .v{color:var(--safe)}",
    ".tact .attcal{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.tact .attcal .dc{width:23px;height:23px;border-radius:6px;display:grid;place-items:center;font-size:9.5px;font-weight:800;color:#fff}",
    ".tact .crow{padding:10px 0;border-top:1px solid var(--ls)}.tact .crow:first-of-type{border-top:none;padding-top:3px}",
    ".tact .ct{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.tact .ct b{font-size:12.5px}.tact .cw{font-size:10.5px;color:var(--mute);font-weight:700}",
    ".tact .cm{font-size:11.5px;color:var(--dim);margin-top:5px;line-height:1.55;background:var(--p2);border-radius:8px;padding:8px 10px}",
    ".tact .htree .h1r{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800;margin:14px 0 5px;color:var(--navy)}.tact .htree .h1r:first-child{margin-top:2px}.tact .htree .h1r .avg{margin-left:auto;font-size:11px;font-weight:800;color:var(--dim)}",
    ".tact .htree .h2r{font-size:11px;font-weight:800;color:var(--mute);margin:9px 0 2px 6px}",
    ".tact .htree .leaf{display:flex;align-items:center;gap:9px;padding:7px 0 7px 16px;border-top:1px solid var(--ls)}.tact .htree .leaf .nm{flex:1;min-width:0;font-size:11.5px}.tact .htree .leaf .nm em{font-style:normal;font-size:9.5px;font-weight:800;color:var(--mute);background:var(--p2);border:1px solid var(--line);border-radius:5px;padding:1px 6px;margin-left:6px}",
    ".tact .htree .leaf .b2{width:60px;height:7px;border-radius:4px;background:var(--p2);overflow:hidden;flex:none}.tact .htree .leaf .b2 i{display:block;height:100%}.tact .htree .leaf .pc{width:30px;text-align:right;font-size:12px;font-weight:800;flex:none}",
    ".tact .legend{display:flex;gap:10px;align-items:center;font-size:10.5px;color:var(--mute);margin-top:8px;flex-wrap:wrap}.tact .legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:3px;vertical-align:-1px}",
    ".tact .ph{border:1.5px dashed var(--line);border-radius:14px;padding:24px;text-align:center;color:var(--mute);font-size:12.5px}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountTeacherActivity(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="tact"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId;

    var ST={ t:null, c:null, s:null };
    var D={ loaded:false, ownerUid:null, teachers:[], classes:[], enroll:[], students:{},
            reviewByT:{}, reviewWkByT:{}, paperByT:{}, nlByT:{}, consultByT:{}, lastByT:{}, logByT:{} };

    host.innerHTML='<div class="tact"><div class="bc" id="tact-bc"></div><div id="tact-content"></div>'
      +'<div class="ph" style="margin-top:16px;border:none;color:var(--mute)">※ 원장 읽기전용 · 강사→반→학생 순으로 확인합니다.</div></div>';
    var bcEl=host.querySelector('#tact-bc'), cEl=host.querySelector('#tact-content');

    function wkBucket(iso){ var d=daysAgo(iso); if(d<0)d=0; if(d>27)return -1; return 3-Math.floor(d/7); } // 0..3 (3=최근주)

    async function loadAll(){
      if(D.loaded) return;
      try{ var ow=await sb().from('academies').select('owner_uid').eq('id',acid).limit(1); D.ownerUid=(ow&&ow.data&&ow.data[0])?ow.data[0].owner_uid:null; }catch(e){}
      try{ var tu=await sb().from('academy_users').select('uid,name,subject,role,status').eq('academy_id',acid);
        // 원장(owner) 제외한 모든 소속 직원을 강사/스태프로 집계 (role 값이 teacher/staff/instructor 등 제각각일 수 있음)
        D.teachers=((tu&&tu.data)||[]).filter(function(t){ return (t.status||'active')!=='inactive' && t.role!=='owner' && t.uid!==D.ownerUid; }); }catch(e){ D.teachers=[]; }
      try{ var cl=await sb().from('academy_classes').select('id,name,subject,teacher_id').eq('academy_id',acid).order('created_at'); D.classes=(cl&&cl.data)||[]; }catch(e){ D.classes=[]; }
      // 원장 직강 반이 있으면 가상 강사 추가
      if(D.ownerUid && D.classes.some(function(c){return c.teacher_id===D.ownerUid;})){
        D.teachers.unshift({ uid:D.ownerUid, name:'원장(직강)', subject:'', role:'owner', _jik:true });
      }
      try{ var en=await sb().from('student_enrollments').select('student_id,class_id'); D.enroll=(en&&en.data)||[]; }catch(e){ D.enroll=[]; }
      // 학생 기본정보
      var sidset={}; D.enroll.forEach(function(e){ sidset[e.student_id]=1; });
      var sids=Object.keys(sidset);
      if(sids.length){ try{ var st=await sb().from('students').select('id,name,grade,school,enroll_status,student_phone,parent_phone').in('id',sids);
        ((st&&st.data)||[]).forEach(function(s){ D.students[s.id]=s; }); }catch(e){} }
      // 검토(assignment_scores) / 주간 / 시험(exam_papers) / 리포트(newsletters) / 상담(consultations)
      try{ var as=await sb().from('assignment_scores').select('graded_by,graded_at').eq('academy_id',acid);
        ((as&&as.data)||[]).forEach(function(r){ if(!r.graded_by)return; D.reviewByT[r.graded_by]=(D.reviewByT[r.graded_by]||0)+1;
          var b=wkBucket(r.graded_at); if(b>=0){ D.reviewWkByT[r.graded_by]=D.reviewWkByT[r.graded_by]||[0,0,0,0]; D.reviewWkByT[r.graded_by][b]++; }
          if(!D.lastByT[r.graded_by]||new Date(r.graded_at)>new Date(D.lastByT[r.graded_by])) D.lastByT[r.graded_by]=r.graded_at; }); }catch(e){}
      try{ var ep=await sb().from('exam_papers').select('teacher_id,title,created_at,exam_date').eq('academy_id',acid);
        ((ep&&ep.data)||[]).forEach(function(r){ if(!r.teacher_id)return; D.paperByT[r.teacher_id]=(D.paperByT[r.teacher_id]||0)+1;
          (D.logByT[r.teacher_id]=D.logByT[r.teacher_id]||[]).push({d:r.created_at||r.exam_date,tx:'시험 등록 · '+esc(r.title||'자체시험')});
          if(!D.lastByT[r.teacher_id]||new Date(r.created_at||r.exam_date)>new Date(D.lastByT[r.teacher_id])) D.lastByT[r.teacher_id]=r.created_at||r.exam_date; }); }catch(e){}
      try{ var nl=await sb().from('newsletters').select('created_by,created_at').eq('academy_id',acid);
        ((nl&&nl.data)||[]).forEach(function(r){ if(!r.created_by)return; D.nlByT[r.created_by]=(D.nlByT[r.created_by]||0)+1;
          (D.logByT[r.created_by]=D.logByT[r.created_by]||[]).push({d:r.created_at,tx:'가정통신문 발행'});
          if(!D.lastByT[r.created_by]||new Date(r.created_at)>new Date(D.lastByT[r.created_by])) D.lastByT[r.created_by]=r.created_at; }); }catch(e){}
      try{ var cs=await sb().from('consultations').select('created_by,created_at').eq('academy_id',acid);
        ((cs&&cs.data)||[]).forEach(function(r){ if(!r.created_by)return; D.consultByT[r.created_by]=(D.consultByT[r.created_by]||0)+1; }); }catch(e){ /* 컬럼 없으면 무시 */ }
      D.loaded=true;
    }

    function teacherClasses(uid){ return D.classes.filter(function(c){ return c.teacher_id===uid; }); }
    function classStudents(cid){ var ids=D.enroll.filter(function(e){return e.class_id===cid;}).map(function(e){return e.student_id;});
      return ids.map(function(id){return D.students[id];}).filter(function(s){ return s && (s.enroll_status||'active')!=='withdrawn'; })
        .sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko');}); }
    function teacherStudentCount(uid){ var set={}; teacherClasses(uid).forEach(function(c){ D.enroll.filter(function(e){return e.class_id===c.id;}).forEach(function(e){ set[e.student_id]=1; }); }); return Object.keys(set).length; }
    function tState(uid){ var d=daysAgo(D.lastByT[uid]); return d<=2?{p:'g',t:'활발'}:(d<=7?{p:'w',t:'보통'}:(d>=9?{p:'r',t:'저조'}:{p:'w',t:'보통'})); }

    function crumb(){
      var h='<a id="bc-home">전체</a>';
      var t=D.teachers.filter(function(x){return x.uid===ST.t;})[0];
      if(ST.t&&t){ h+='<span class="sep">›</span>'+(ST.c?'<a data-bt="'+esc(ST.t)+'">'+esc(t.name)+'</a>':'<span class="cur">'+esc(t.name)+'</span>'); }
      var c=D.classes.filter(function(x){return x.id===ST.c;})[0];
      if(ST.c&&c){ h+='<span class="sep">›</span>'+(ST.s?'<a data-bc2="'+esc(ST.c)+'">'+esc(c.name)+'</a>':'<span class="cur">'+esc(c.name)+'</span>'); }
      if(ST.s){ var s=D.students[ST.s]; h+='<span class="sep">›</span><span class="cur">'+esc(s?s.name:'')+'</span>'; }
      bcEl.innerHTML=h;
      var hb=bcEl.querySelector('#bc-home'); if(hb) hb.onclick=function(){ ST={t:null,c:null,s:null}; render(); };
      var bt=bcEl.querySelector('[data-bt]'); if(bt) bt.onclick=function(){ ST.c=null; ST.s=null; render(); };
      var b2=bcEl.querySelector('[data-bc2]'); if(b2) b2.onclick=function(){ ST.s=null; render(); };
    }

    // ===== 집계 유틸 =====
    async function attForStudents(sids){ // {rate,late,absent, per:{sid:{o,l,x,cal}}}
      var out={rate:0,late:0,absent:0,per:{}}; if(!sids.length) return out;
      var cls=teacherClasses(ST.t).map(function(c){return c.id;});
      var cidFilter = ST.c?[ST.c]:cls;
      try{
        var ses=await sb().from('attendance_sessions').select('id,session_date').in('class_id',cidFilter).order('session_date',{ascending:false}).limit(60);
        var sesIds=((ses&&ses.data)||[]).map(function(x){return x.id;});
        if(!sesIds.length) return out;
        var ar=await sb().from('attendance_records').select('student_id,status,session_id').in('session_id',sesIds).in('student_id',sids);
        var tot=0,pre=0;
        ((ar&&ar.data)||[]).forEach(function(r){ var p=out.per[r.student_id]=out.per[r.student_id]||{o:0,l:0,x:0,cal:''};
          if(r.status==='present'){p.o++;pre++;tot++;p.cal+='o';} else if(r.status==='late'){p.l++;out.late++;tot++;p.cal+='l';} else if(r.status==='absent'){p.x++;out.absent++;tot++;p.cal+='x';} else if(r.status==='early'){tot++;p.cal+='e';} });
        out.rate=tot?Math.round(pre/tot*100):0;
      }catch(e){}
      return out;
    }
    async function heatForStudents(sids){ // exam heatmap tree over given students (반 평균 or 학생)
      var cids=ST.c?[ST.c]:teacherClasses(ST.t).map(function(c){return c.id;});
      var tree=null;
      try{
        var pp=await sb().from('exam_papers').select('id').in('class_id',cids).order('exam_date',{ascending:false}).limit(8);
        var pIds=((pp&&pp.data)||[]).map(function(p){return p.id;}); if(!pIds.length) return null;
        var it=await sb().from('exam_items').select('paper_id,item_no,unit_large,unit_mid,unit_small,qtype').in('paper_id',pIds);
        var ir=await sb().from('exam_item_results').select('paper_id,item_no,student_id,correct').in('paper_id',pIds).in('student_id',sids);
        var rmap={}; ((ir&&ir.data)||[]).forEach(function(r){ rmap[r.paper_id+'|'+r.item_no+'|'+r.student_id]=r.correct; });
        tree={};
        ((it&&it.data)||[]).forEach(function(x){ var ul=x.unit_large||'기타',um=x.unit_mid||'-',nm=x.unit_small||('문항'+x.item_no),qt=x.qtype||'';
          tree[ul]=tree[ul]||{}; tree[ul][um]=tree[ul][um]||{}; var lk=nm+'||'+qt; var lf=tree[ul][um][lk]=tree[ul][um][lk]||{nm:nm,qt:qt,o:0,t:0};
          sids.forEach(function(sid){ var c=rmap[x.paper_id+'|'+x.item_no+'|'+sid]; if(c===true){lf.o++;lf.t++;} else if(c===false){lf.t++;} }); });
      }catch(e){ return null; }
      return tree;
    }
    function treeHTML(tree){
      if(!tree||!Object.keys(tree).length) return '<div class="sub">채점된 시험 데이터가 없습니다.</div>';
      var h='<div class="htree">';
      Object.keys(tree).forEach(function(ul){ var ums=tree[ul],ac=0,at=0;
        Object.keys(ums).forEach(function(um){ Object.keys(ums[um]).forEach(function(lk){ ac+=ums[um][lk].o; at+=ums[um][lk].t; }); });
        var avg=at?Math.round(ac/at*100):0;
        h+='<div class="h1r">'+esc(ul)+' <span class="avg">평균 '+(at?avg+'%':'-')+'</span></div>';
        Object.keys(ums).forEach(function(um){ h+='<div class="h2r">중단원 · '+esc(um)+'</div>';
          Object.keys(ums[um]).forEach(function(lk){ var lf=ums[um][lk]; var v=lf.t?Math.round(lf.o/lf.t*100):0;
            h+='<div class="leaf"><div class="nm">'+esc(lf.nm)+(lf.qt?' <em>'+esc(lf.qt)+'</em>':'')+'</div><div class="b2"><i style="width:'+v+'%;background:'+col(v)+'"></i></div><div class="pc" style="color:'+tcol(v)+'">'+(lf.t?v:'-')+'</div></div>'; }); });
      });
      return h+'</div>';
    }
    function legendHTML(){ return '<div class="legend"><span><i style="background:#f04452"></i>취약 ~50</span><span><i style="background:#f79009"></i>보통 51~65</span><span><i style="background:#7bc86c"></i>양호 66~84</span><span><i style="background:#12b76a"></i>우수 85~</span></div>'; }

    async function classSubmitRate(cid){ // {rate, pending}
      try{ var ca=await sb().from('class_assignments').select('id').eq('class_id',cid); var ids=((ca&&ca.data)||[]).map(function(x){return x.id;}); if(!ids.length) return {rate:0,pending:0};
        var as=await sb().from('assignment_scores').select('submitted').in('assignment_id',ids); var rows=(as&&as.data)||[]; if(!rows.length) return {rate:0,pending:0};
        var sub=rows.filter(function(r){return r.submitted;}).length; return {rate:Math.round(sub/rows.length*100), pending:rows.length-sub}; }catch(e){ return {rate:0,pending:0}; }
    }

    // ===== 뷰 =====
    function viewHome(){
      var active=D.teachers.filter(function(t){ return daysAgo(D.lastByT[t.uid])<=7; }).length;
      var totalReview=Object.keys(D.reviewByT).reduce(function(a,k){return a+D.reviewByT[k];},0);
      var risky=D.teachers.filter(function(t){ return daysAgo(D.lastByT[t.uid])>=9; }).length;
      var h='<div class="kpi"><div class="c a"><div class="v">'+D.teachers.length+'</div><div class="k">강사</div></div>'
        +'<div class="c s"><div class="v">'+active+'</div><div class="k">최근 활동</div></div>'
        +'<div class="c"><div class="v">'+totalReview+'</div><div class="k">검토 누적</div></div>'
        +'<div class="c r"><div class="v">'+risky+'</div><div class="k">주의 필요</div></div></div>';
      if(!D.teachers.length){ return h+'<div class="ph" style="margin-top:14px">등록된 강사가 없습니다. 강사 관리에서 강사를 추가하세요.</div>'; }
      h+='<div class="eyb">강사 선택 <span class="g">· 카드를 누르면 반·학생까지 확인</span></div>';
      D.teachers.forEach(function(t){ var stt=tState(t.uid); var m={담당:teacherStudentCount(t.uid),상담:(D.consultByT[t.uid]||0),검토:(D.reviewByT[t.uid]||0),리포트:(D.nlByT[t.uid]||0),시험:(D.paperByT[t.uid]||0),반:teacherClasses(t.uid).length};
        h+='<div class="tcard" data-t="'+esc(t.uid)+'"><div class="thead"><div class="tav">'+esc((t.name||'?').slice(0,2))+'</div>'
          +'<div style="flex:1"><div class="tname">'+esc(t.name)+(t.subject?' <span>'+esc(t.subject)+'</span>':'')+'</div><div class="tmeta">담당 '+m.담당+'명 · '+m.반+'개 반</div></div>'
          +'<span class="pill '+stt.p+'">'+stt.t+'</span></div>'
          +'<div class="mets mets6">'+[['담당',m.담당],['상담',m.상담],['검토',m.검토],['리포트',m.리포트],['시험분석',m.시험],['AI','-']].map(function(kv){ return '<div class="m"><div class="mv">'+kv[1]+'</div><div class="mk">'+kv[0]+'</div></div>'; }).join('')+'</div>'
          +'<div class="trow"><span class="last">🕒 최근 · '+agoLabel(D.lastByT[t.uid])+'</span><span class="go">반·학생 보기 →</span></div></div>';
      });
      // 업무량 비교
      var maxStu=Math.max.apply(null,D.teachers.map(function(t){return teacherStudentCount(t.uid);}).concat([1]));
      var maxRev=Math.max.apply(null,D.teachers.map(function(t){return D.reviewByT[t.uid]||0;}).concat([1]));
      h+='<div class="eyb">강사 업무량 비교</div><div class="card"><div class="clab">담당 학생 수</div><div class="cmp">'
        +D.teachers.map(function(t){ var n=teacherStudentCount(t.uid); return '<div class="r"><div class="nm">'+esc(t.name)+'</div><div class="track"><i style="width:'+Math.round(n/maxStu*100)+'%;background:var(--b)"></i></div><div class="vv">'+n+'명</div></div>'; }).join('')+'</div>'
        +'<div class="clab" style="margin-top:14px">제출물 검토 건수</div><div class="cmp">'
        +D.teachers.map(function(t){ var n=D.reviewByT[t.uid]||0; var c=n>=maxRev*0.6?'var(--safe)':n>=maxRev*0.3?'var(--warn)':'var(--risk)'; return '<div class="r"><div class="nm">'+esc(t.name)+'</div><div class="track"><i style="width:'+Math.round(n/maxRev*100)+'%;background:'+c+'"></i></div><div class="vv">'+n+'건</div></div>'; }).join('')+'</div></div>';
      // 주의 알림
      var alerts=[]; D.teachers.forEach(function(t){ var d=daysAgo(D.lastByT[t.uid]); if(d>=9) alerts.push('<b>'+esc(t.name)+'</b> — '+(D.lastByT[t.uid]?d+'일간 활동 없음':'활동 기록 없음')+' · 담당 '+teacherStudentCount(t.uid)+'명'); });
      if(alerts.length) h+='<div class="eyb" style="color:var(--risk)">⚠️ 주의 알림</div><div class="alert">'+alerts.map(function(a){return '<div class="a">'+a+'</div>';}).join('')+'</div>';
      return h;
    }

    function viewTeacher(){
      var t=D.teachers.filter(function(x){return x.uid===ST.t;})[0]; if(!t) return '<div class="ph">강사를 찾을 수 없습니다.</div>';
      var stt=tState(t.uid);
      var h='<div class="card"><div class="thead"><div class="tav">'+esc((t.name||'?').slice(0,2))+'</div><div style="flex:1"><div class="tname">'+esc(t.name)+(t.subject?' <span>'+esc(t.subject)+'</span>':'')+'</div><div class="tmeta">담당 '+teacherStudentCount(t.uid)+'명 · 최근 '+agoLabel(D.lastByT[t.uid])+'</div></div><span class="pill '+stt.p+'">'+stt.t+'</span></div></div>';
      var wk=D.reviewWkByT[t.uid]||[0,0,0,0]; var mx=Math.max.apply(null,wk.concat([1]));
      h+='<div class="card"><div class="h">📈 주간 활동 추이 <span class="sub">· 검토 건수(최근 4주)</span></div><div class="wk">'
        +wk.map(function(v,i){ var hh=Math.round(v/mx*66)+3; return '<div class="col"><div class="n">'+v+'</div><div class="bar2" style="height:'+hh+'px'+(v===0?';background:var(--faint)':'')+'"></div><div class="l">'+(i+1)+'주</div></div>'; }).join('')+'</div></div>';
      var logs=(D.logByT[t.uid]||[]).slice().sort(function(a,b){return new Date(b.d)-new Date(a.d);}).slice(0,6);
      h+='<div class="card"><div class="h">🧾 최근 활동 로그</div>'+(logs.length?'<div class="tl">'+logs.map(function(l){return '<div class="i"><div class="dt">'+esc(agoLabel(l.d))+'</div><div class="tx">'+l.tx+'</div></div>';}).join('')+'</div>':'<div class="sub">활동 기록이 없습니다.</div>')+'</div>';
      var cls=teacherClasses(t.uid);
      h+='<div class="eyb">담당 반 선택 <span class="g">· 반을 누르면 학생까지</span></div><div class="card">';
      if(!cls.length) h+='<div class="sub">담당 반이 없습니다.</div>';
      cls.forEach(function(c){ var n=classStudents(c.id).length;
        h+='<div class="lrow" data-c="'+esc(c.id)+'"><div class="ci">'+esc((c.name||'').replace(/반$/,'').slice(-2))+'</div><div class="li"><b>'+esc(c.name)+'</b><div class="s">학생 '+n+'명'+(c.subject?' · '+esc(c.subject):'')+'</div></div><div class="lgo">›</div></div>'; });
      return h+'</div>';
    }

    async function viewClass(){
      var t=D.teachers.filter(function(x){return x.uid===ST.t;})[0], c=D.classes.filter(function(x){return x.id===ST.c;})[0];
      if(!c) return '<div class="ph">반을 찾을 수 없습니다.</div>';
      var studs=classStudents(c.id); var sids=studs.map(function(s){return s.id;});
      var sr=await classSubmitRate(c.id); var att=await attForStudents(sids); var tree=await heatForStudents(sids);
      var h='<div class="card"><div class="h">🏷️ '+esc(c.name)+' <span class="sub">· '+esc(t?t.name:'')+(c.subject?' · '+esc(c.subject):'')+'</span></div>'
        +'<div class="mets mets3" style="margin-top:10px"><div class="m"><div class="mv">'+studs.length+'</div><div class="mk">학생</div></div>'
        +'<div class="m"><div class="mv">'+sr.rate+'%</div><div class="mk">과제 제출율</div></div>'
        +'<div class="m'+(sr.pending>4?' hot':'')+'"><div class="mv">'+sr.pending+'</div><div class="mk">미제출</div></div></div></div>';
      h+='<div class="card"><div class="h">🕘 반 출결 요약 <span class="sub">· 최근 수업</span></div><div class="attsum">'
        +'<div class="a s"><div class="v">'+att.rate+'%</div><div class="k">출석률</div></div><div class="a w"><div class="v">'+att.late+'</div><div class="k">지각(누적)</div></div><div class="a r"><div class="v">'+att.absent+'</div><div class="k">결석(누적)</div></div></div>'
        +'<div class="sub" style="margin-top:9px">학생 카드를 누르면 개인별 출결·통화 상세를 확인합니다.</div></div>';
      h+='<div class="card"><div class="h">🔥 반 평균 세부 단원 정답률 <span class="sub">· 대·중·소·유형</span></div>'+treeHTML(tree)+legendHTML()+'</div>';
      h+='<div class="eyb">학생 선택 <span class="g">· 강사와 동일 상세 화면</span></div><div class="card">';
      if(!studs.length) h+='<div class="sub">학생이 없습니다.</div>';
      studs.forEach(function(s){ var a=att.per[s.id]||{o:0,l:0,x:0};
        h+='<div class="lrow" data-s="'+esc(s.id)+'"><div class="ci">'+esc((s.name||'?').slice(0,2))+'</div><div class="li"><b>'+esc(s.name)+'</b> <span style="font-size:11px;color:var(--mute)">'+esc(s.grade||'')+'</span><div class="s">출석 '+a.o+' · 지각 '+a.l+' · 결석 '+a.x+'</div></div><div class="lgo">›</div></div>'; });
      return h+'</div>';
    }

    async function viewStudent(){
      var s=D.students[ST.s]; if(!s) return '<div class="ph">학생을 찾을 수 없습니다.</div>';
      var att=await attForStudents([ST.s]); var per=att.per[ST.s]||{o:0,l:0,x:0,cal:''};
      var tree=await heatForStudents([ST.s]);
      // 과제/성실도
      var subRate=null,dil=null,unsub=0;
      try{ var cids=teacherClasses(ST.t).map(function(c){return c.id;}); if(ST.c)cids=[ST.c];
        var ca=await sb().from('class_assignments').select('id').in('class_id',cids); var aids=((ca&&ca.data)||[]).map(function(x){return x.id;});
        if(aids.length){ var as=await sb().from('assignment_scores').select('submitted,diligence').eq('student_id',ST.s).in('assignment_id',aids); var rows=(as&&as.data)||[];
          if(rows.length){ var sub=rows.filter(function(r){return r.submitted;}).length; subRate=Math.round(sub/rows.length*100); unsub=rows.length-sub; dil=mode(rows.map(function(r){return r.diligence;})); } } }catch(e){}
      // 실장 통화 기록
      var calls=[];
      try{ var sesAll=await sb().from('attendance_sessions').select('id').in('class_id',(ST.c?[ST.c]:teacherClasses(ST.t).map(function(c){return c.id;})));
        var sesIds=((sesAll&&sesAll.data)||[]).map(function(x){return x.id;});
        if(sesIds.length){ var rec=await sb().from('attendance_records').select('id,status').eq('student_id',ST.s).in('session_id',sesIds).neq('status','present');
          var recs=(rec&&rec.data)||[]; var ridMap={}; recs.forEach(function(r){ ridMap[r.id]=r.status; }); var rids=recs.map(function(r){return r.id;});
          if(rids.length){ var cc=await sb().from('attendance_calls').select('record_id,result,target,memo,called_at').in('record_id',rids).order('called_at',{ascending:false});
            calls=((cc&&cc.data)||[]).map(function(c){ return {st:ridMap[c.record_id],res:c.result,who:c.target,memo:c.memo,d:(c.called_at||'').slice(0,10)}; }); } } }catch(e){}
      var h='<div class="mirror">👀 강사와 동일 화면 · 원장 읽기전용 보기</div>';
      h+='<div class="card"><div class="h">'+esc(s.name)+' <span class="sub">· '+esc(s.grade||'')+(s.school?' · '+esc(s.school):'')+'</span></div>'
        +'<div class="clab" style="margin-top:6px">📝 과제 · 출결 · 성실도</div>'
        +'<div class="mets mets4"><div class="m"><div class="mv">'+(subRate==null?'—':subRate+'%')+'</div><div class="mk">제출율</div></div>'
        +'<div class="m'+(unsub>0?' hot':'')+'"><div class="mv">'+unsub+'</div><div class="mk">미제출</div></div>'
        +'<div class="m"><div class="mv" style="font-size:12px;padding-top:3px">'+(dil||'—')+'</div><div class="mk">성실도</div></div>'
        +'<div class="m'+(per.l>=3?' hot':'')+'"><div class="mv">'+per.l+'</div><div class="mk">지각</div></div></div></div>';
      // 출결 캘린더
      var map={o:'#12b76a',l:'#f79009',x:'#f04452',e:'#7c3aed'},lab={o:'출',l:'지',x:'결',e:'조'};
      var calHTML=per.cal?('<div class="attcal">'+per.cal.split('').reverse().map(function(ch){return '<div class="dc" style="background:'+(map[ch]||'#ccc')+'">'+(lab[ch]||'')+'</div>';}).join('')+'</div>'):'<div class="sub">출결 기록이 없습니다.</div>';
      h+='<div class="card"><div class="h">🕘 출결 상세 <span class="sub">· 최근 수업</span></div>'
        +'<div class="attsum"><div class="a s"><div class="v">'+per.o+'</div><div class="k">출석</div></div><div class="a w"><div class="v">'+per.l+'</div><div class="k">지각</div></div><div class="a r"><div class="v">'+per.x+'</div><div class="k">결석</div></div></div>'+calHTML+'</div>';
      // 통화기록
      if(calls.length){ var rc={done:['통화완료','g'],sms:['문자발송','b'],miss:['부재중','w']}; var sl={late:['지각','w'],absent:['결석','r'],early:['조퇴','b']};
        h+='<div class="card"><div class="h">📞 실장님 조치 기록 <span class="sub">· 통화·문자 · 읽기전용</span></div>'
          +calls.map(function(c){ var r=rc[c.res]||['미조치','r']; var st=sl[c.st]||[c.st||'',''];
            return '<div class="crow"><div class="ct"><b>'+esc(c.d||'')+'</b> <span class="pill '+st[1]+'">'+esc(st[0])+'</span> <span class="pill '+r[1]+'">'+esc(r[0])+'</span>'+(c.who?' <span class="cw">'+esc(c.who)+'</span>':'')+'</div>'+(c.memo?'<div class="cm">'+esc(c.memo)+'</div>':'')+'</div>'; }).join('')+'</div>'; }
      h+='<div class="card"><div class="h">🔥 세부 단원 정답률 <span class="sub">· '+esc(s.name)+' · 대·중·소·유형</span></div>'+treeHTML(tree)+legendHTML()+'</div>';
      return h;
    }

    async function render(){
      crumb();
      cEl.innerHTML='<div class="ph">불러오는 중…</div>';
      try{
        if(ST.s) cEl.innerHTML=await viewStudent();
        else if(ST.c) cEl.innerHTML=await viewClass();
        else if(ST.t) cEl.innerHTML=viewTeacher();
        else cEl.innerHTML=viewHome();
      }catch(e){ cEl.innerHTML='<div class="ph">불러오기 오류: '+esc(String(e.message||e))+'</div>'; }
      bindRows();
      try{ host.scrollTop=0; }catch(e){}
    }
    function bindRows(){
      cEl.querySelectorAll('[data-t]').forEach(function(el){ el.onclick=function(){ ST.t=this.getAttribute('data-t'); ST.c=null; ST.s=null; render(); }; });
      cEl.querySelectorAll('[data-c]').forEach(function(el){ el.onclick=function(){ ST.c=this.getAttribute('data-c'); ST.s=null; render(); }; });
      cEl.querySelectorAll('[data-s]').forEach(function(el){ el.onclick=function(){ ST.s=this.getAttribute('data-s'); render(); }; });
    }

    cEl.innerHTML='<div class="ph">불러오는 중…</div>';
    await loadAll();
    render();
  }

  window.mountTeacherActivity = mountTeacherActivity;
})();
