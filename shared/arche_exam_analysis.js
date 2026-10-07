/* ============================================================================
 * arche_exam_analysis.js · 자체시험 문항분석 (B)
 * ----------------------------------------------------------------------------
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage
 * 데이터  : academy_classes / student_enrollments / students /
 *           exam_papers / exam_items / exam_student_results / exam_item_results
 * 제공     : window.mountExamAnalysis(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function fnBase(){ return window.FN_BASE || ((window.SB_URL||'')+'/functions/v1'); }
  async function token(){ try{ var s=(await sb().auth.getSession()).data.session; return s?s.access_token:''; }catch(e){ return ''; } }
  function col(v){ return v<=50?'#f04452':(v<=65?'#f79009':(v<=84?'#7bc86c':'#12b76a')); }
  // 이미지 파일 → base64(순수, data: 접두어 제거)
  function fileB64(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ var s=String(r.result||''); var i=s.indexOf(','); res({mime:(f.type||'image/jpeg'),data:(i>=0?s.slice(i+1):s)}); }; r.onerror=rej; r.readAsDataURL(f); }); }

  function injectCSS(){
    if(document.getElementById('exa-css'))return;
    var s=document.createElement('style'); s.id='exa-css';
    s.textContent=[
    ".exa{--b:#3182f6;--line:#e8ebee;--mute:#8b95a1;--dim:#4e5968;--ink:#191f28;--p2:#f4f6f8;--safe:#12b76a;--risk:#f04452}",
    ".exa *{box-sizing:border-box}",
    ".exa .row1{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}",
    ".exa select,.exa input{padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit;color:var(--ink);background:#fff}",
    ".exa .btn{border:none;border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:var(--b);color:#fff}",
    ".exa .btn.sub{background:#fff;color:var(--dim);border:1px solid var(--line)}",
    ".exa .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".exa .h{font-size:14px;font-weight:800;margin-bottom:8px}.exa .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".exa .d{font-size:12px;color:var(--dim);line-height:1.6}",
    ".exa table{width:100%;border-collapse:collapse;font-size:12px}",
    ".exa th{color:var(--mute);font-size:10.5px;font-weight:800;text-align:left;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}",
    ".exa td{padding:5px 6px;border-bottom:1px solid #eef1f4}",
    ".exa td input,.exa td select{width:100%;padding:6px 7px;font-size:11.5px}",
    ".exa .seg{display:flex;gap:4px}.exa .seg button{border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:700;color:var(--mute);cursor:pointer}.exa .seg button.on{background:var(--b);color:#fff;border-color:var(--b)}",
    ".exa .ox{display:flex;gap:4px}.exa .ox button{width:30px;border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 0;font-size:12px;font-weight:800;color:var(--mute);cursor:pointer}",
    ".exa .ox button.o.on{background:var(--safe);color:#fff;border-color:var(--safe)}.exa .ox button.x.on{background:var(--risk);color:#fff;border-color:var(--risk)}",
    ".exa .h1r{font-size:12.5px;font-weight:800;margin:12px 0 4px;display:flex;justify-content:space-between}.exa .h1r .avg{font-size:11px;color:var(--mute);font-weight:700}",
    ".exa .h2r{font-size:11px;font-weight:700;color:var(--dim);margin:7px 0 3px}",
    ".exa .leaf{display:flex;align-items:center;gap:8px;padding:4px 0}",
    ".exa .leaf .nm{flex:1;font-size:11.5px}.exa .leaf .nm em{font-style:normal;color:var(--mute);font-size:10px;background:var(--p2);border-radius:5px;padding:1px 6px;margin-left:4px}",
    ".exa .b2{width:120px;height:7px;background:var(--p2);border-radius:5px;overflow:hidden}.exa .b2 i{display:block;height:100%}",
    ".exa .pc{width:34px;text-align:right;font-size:11.5px;font-weight:800}",
    ".exa .ph{border:1.5px dashed var(--line);border-radius:14px;padding:22px;text-align:center;color:var(--mute);font-size:12.5px}",
    ".exa .note{font-size:11px;color:var(--mute);margin-top:8px;line-height:1.6}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountExamAnalysis(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="exa"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId, uid=window._myUid;
    var canManage=(window._isOwner===true||window._canManage===true||window._myRole==='owner'||window._myRole==='manager');

    var S={ classes:[], classId:null, papers:[], paperId:null, mode:'grade', // grade | heat
            students:[], items:[], itemRes:{}, itemAns:{}, itemConf:{}, gradeStu:null, heatScope:'class', heatStu:null, creating:false,
            grading:false, autoStu:null, autoMsg:'' };

    try{
      var rc=await sb().from('academy_classes').select('id,name,subject,grade_band,teacher_id').eq('academy_id',acid).order('created_at');
      var list=(rc&&rc.data)||[]; if(!canManage&&uid) list=list.filter(function(c){return c.teacher_id===uid;});
      S.classes=list; if(list[0]) S.classId=list[0].id;
    }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="exa"><div id="exa-root"></div></div>';
    var root=host.querySelector('#exa-root');

    async function loadStudents(){
      S.students=[]; if(!S.classId) return;
      var en=await sb().from('student_enrollments').select('student_id').eq('class_id',S.classId);
      var ids=Array.from(new Set(((en&&en.data)||[]).map(function(e){return e.student_id;})));
      if(ids.length){ var st=await sb().from('students').select('id,name,grade,enroll_status').in('id',ids);
        S.students=((st&&st.data)||[]).filter(function(s){return (s.enroll_status||'active')!=='withdrawn';}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko');}); }
    }
    async function loadPapers(){
      S.papers=[]; if(!S.classId) return;
      var r=await sb().from('exam_papers').select('id,title,subject,exam_date,total_items,max_score').eq('class_id',S.classId).order('exam_date',{ascending:false});
      S.papers=(r&&r.data)||[]; if(!S.paperId && S.papers[0]) S.paperId=S.papers[0].id;
    }
    async function loadPaper(){
      S.items=[]; S.itemRes={}; S.itemAns={}; S.itemConf={};
      if(!S.paperId) return;
      var it=await sb().from('exam_items').select('item_no,unit_large,unit_mid,unit_small,qtype,points,answer').eq('paper_id',S.paperId).order('item_no');
      S.items=(it&&it.data)||[];
      var rr=await sb().from('exam_item_results').select('student_id,item_no,correct,student_answer,confidence').eq('paper_id',S.paperId);
      ((rr&&rr.data)||[]).forEach(function(r){ var k=r.student_id+'|'+r.item_no; S.itemRes[k]=r.correct; if(r.student_answer!=null)S.itemAns[k]=r.student_answer; if(r.confidence!=null)S.itemConf[k]=r.confidence; });
    }

    function clsOpts(){ return S.classes.map(function(c){ return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>'; }).join(''); }
    function paperOpts(){ return S.papers.length? S.papers.map(function(p){ return '<option value="'+p.id+'"'+(p.id===S.paperId?' selected':'')+'>'+esc(p.title)+' ('+esc((p.exam_date||'').slice(0,10))+')</option>'; }).join('') : '<option value="">등록된 시험 없음</option>'; }

    function render(){
      var head='<div class="row1"><select id="exa-cls">'+(S.classes.length?clsOpts():'<option>담당 반 없음</option>')+'</select>'
        +'<select id="exa-paper" style="flex:1;min-width:160px">'+paperOpts()+'</select>'
        +'<button class="btn" id="exa-new">+ 시험 등록</button></div>';
      var body;
      if(S.creating) body=viewCreate();
      else if(!S.classId) body='<div class="ph">담당 반이 없습니다.</div>';
      else if(!S.paperId) body='<div class="ph">등록된 시험이 없습니다. [+ 시험 등록]으로 시작하세요.</div>';
      else {
        var tabs='<div class="seg" style="margin-bottom:12px"><button data-m="grade" class="'+(S.mode==='grade'?'on':'')+'">✍️ 채점</button><button data-m="heat" class="'+(S.mode==='heat'?'on':'')+'">🔥 히트맵</button></div>';
        body=tabs+(S.mode==='grade'?viewGrade():viewHeat());
      }
      root.innerHTML=head+body; bind();
    }

    // ===== 시험 등록 =====
    function viewCreate(){
      var today=new Date().toISOString().slice(0,10);
      var cls=S.classes.filter(function(c){return c.id===S.classId;})[0]||{};
      var N=S._newN||5;
      var EX=S._exExtract||{};
      var rows=''; for(var i=1;i<=N;i++){ var e=EX[i]||{};
        rows+='<tr><td style="width:34px;text-align:center;font-weight:700">'+i+'</td>'
        +'<td><input data-c="ul" data-i="'+i+'" value="'+esc(e.unit_large||'')+'" placeholder="대단원"></td>'
        +'<td><input data-c="um" data-i="'+i+'" value="'+esc(e.unit_mid||'')+'" placeholder="중단원"></td>'
        +'<td><input data-c="us" data-i="'+i+'" value="'+esc(e.unit_small||'')+'" placeholder="소단원"></td>'
        +'<td><input data-c="qt" data-i="'+i+'" value="'+esc(e.qtype||'')+'" placeholder="유형"></td>'
        +'<td style="width:64px"><input data-c="pt" data-i="'+i+'" type="number" value="'+(e.points!=null?e.points:Math.round(100/N))+'" placeholder="배점"></td>'
        +'<td style="width:56px"><input data-c="an" data-i="'+i+'" value="'+esc(e.answer||'')+'" placeholder="정답"></td></tr>'; }
      return '<div class="card"><div class="h">📋 시험 등록 <span class="sub">· 문항별 단원·유형 태그</span></div>'
        +'<div class="row1"><input id="exa-title" placeholder="시험명 (예: 3월 1차 자체평가)" style="flex:1;min-width:160px">'
        +'<input id="exa-date" type="date" value="'+today+'">'
        +'<input id="exa-subj" placeholder="과목" value="'+esc(cls.subject||'')+'" style="width:90px">'
        +'<input id="exa-n" type="number" value="'+N+'" style="width:72px" title="문항 수"><button class="btn sub" id="exa-setn">문항수 적용</button></div>'
        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#eaf1ff;border:1px dashed #cfe0ff;border-radius:10px;padding:9px 11px;margin:2px 0 6px">'
        +'<label style="display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--b);color:#1b64da;border-radius:9px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer">📄 시험지·정답·문항분류표 문서/사진<input id="exa-ext" type="file" accept="image/*,application/pdf" multiple style="display:none"></label>'
        +'<span style="font-size:11px;color:#1b64da">PDF·사진을 올리면 AI가 문항표를 자동으로 채웁니다</span>'
        +(S._exMsg?'<div style="width:100%;font-size:11.5px;font-weight:700;color:'+(S._exBusy?'#3182f6':(/실패/.test(S._exMsg)?'#f04452':'#12b76a'))+'">'+esc(S._exMsg)+'</div>':'')+'</div>'
        +'<div style="overflow-x:auto;margin-top:6px"><table><thead><tr><th>#</th><th>대단원</th><th>중단원</th><th>소단원</th><th>유형</th><th>배점</th><th>정답</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        +'<div style="margin-top:12px"><button class="btn" id="exa-create">시험 생성</button> <button class="btn sub" id="exa-cancel">취소</button> <span id="exa-cmsg" style="font-size:12px;margin-left:6px"></span></div></div>';
    }

    // ===== 채점 =====
    function viewGrade(){
      if(!S.items.length) return '<div class="ph">이 시험에 등록된 문항이 없습니다.</div>';
      if(!S.students.length) return '<div class="ph">반에 학생이 없습니다.</div>';
      var sid=S.gradeStu||S.students[0].id;
      var opts=S.students.map(function(s){return '<option value="'+s.id+'"'+(s.id===sid?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
      var rows=S.items.map(function(it){ var k=sid+'|'+it.item_no; var c=S.itemRes[k]; var ans=S.itemAns[k]; var cf=S.itemConf[k];
        var tag=[it.unit_large,it.unit_mid].filter(Boolean).join(' › ')+(it.qtype?' · '+it.qtype:'');
        var low=(cf!=null && cf<0.6);
        var ansCell=(ans!=null)
          ? '<span style="font-size:11px">'+(esc(ans)||'<span style=\"color:#c9d0d8\">(공란)</span>')+'</span>'+(cf!=null?' <span style="font-size:9.5px;font-weight:800;color:'+(low?'#f04452':'#8b95a1')+'">'+Math.round(cf*100)+'%</span>':'')
          : '<span style="color:#c9d0d8">-</span>';
        return '<tr'+(low?' style="background:#fff7f7"':'')+'><td style="width:34px;text-align:center;font-weight:700">'+it.item_no+'</td>'
          +'<td style="font-size:11px;color:var(--dim)">'+esc(tag||'-')+'</td>'
          +'<td style="font-size:11px;color:var(--ink);max-width:130px">'+ansCell+'</td>'
          +'<td style="width:72px"><div class="ox"><button class="o'+(c===true?' on':'')+'" data-ox="o" data-no="'+it.item_no+'">O</button><button class="x'+(c===false?' on':'')+'" data-ox="x" data-no="'+it.item_no+'">X</button></div></td></tr>';
      }).join('');
      // 총점 계산(현재 입력 기준)
      var tot=0,max=0; S.items.forEach(function(it){ max+=Number(it.points||0); if(S.itemRes[sid+'|'+it.item_no]===true) tot+=Number(it.points||0); });
      var bar='<div class="row1" style="margin-top:2px"><label class="btn sub" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">📷 답안지 자동채점<input id="exa-ans" type="file" accept="image/*" multiple style="display:none"></label>'
        +'<span style="font-size:11px;color:var(--mute)">선택 학생의 답안지 이미지 → AI 자동 O/X</span></div>';
      var amsg=S.autoMsg?'<div class="note" style="color:'+(S.grading?'#3182f6':(/실패/.test(S.autoMsg)?'#f04452':'#12b76a'))+'">'+esc(S.autoMsg)+'</div>':'';
      return '<div class="card"><div class="h">✍️ 채점 <span class="sub">· 답안지 자동채점 + 강사 검수</span></div>'
        +'<div class="row1"><select id="exa-gstu">'+opts+'</select><div style="font-weight:800;font-size:13px">총점 '+tot+' / '+max+'</div></div>'
        +bar+amsg
        +'<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>단원·유형</th><th>학생답/신뢰도</th><th>정오</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        +'<div style="margin-top:10px"><button class="btn" id="exa-gsave">검수 완료 · 저장</button> <span id="exa-gmsg" style="font-size:12px;margin-left:6px"></span></div>'
        +'<div class="note">※ 답안지를 올리면 AI가 문항별 학생답을 읽어 O/X를 자동 입력합니다. <b>빨간 행(낮은 신뢰도)과 서술형</b>은 반드시 확인·수정 후 [검수 완료·저장]하세요 → 성적·히트맵에 반영됩니다.</div></div>';
    }

    // ===== 히트맵 =====
    function aggregate(scopeStu){
      // leaf: unit_large>unit_mid>unit_small(+qtype) 별 정답/응답 수
      var tree={}; // ul -> um -> {items:[{it, correct, total}]}
      function add(map,key){ return map[key]=map[key]||{}; }
      S.items.forEach(function(it){
        var ul=it.unit_large||'기타', um=it.unit_mid||'-';
        var um0=add(add(tree,ul),um);
        var leafKey=(it.unit_small||('문항'+it.item_no))+'||'+(it.qtype||'');
        var leaf=um0[leafKey]=um0[leafKey]||{nm:(it.unit_small||('문항'+it.item_no)),qt:it.qtype||'',correct:0,total:0};
        S.students.forEach(function(s){ if(scopeStu&&s.id!==scopeStu)return; var c=S.itemRes[s.id+'|'+it.item_no]; if(c===true){leaf.correct++;leaf.total++;} else if(c===false){leaf.total++;} });
      });
      return tree;
    }
    function viewHeat(){
      if(!S.items.length) return '<div class="ph">문항이 없습니다.</div>';
      var opts=S.students.map(function(s){return '<option value="'+s.id+'"'+(s.id===S.heatStu?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
      var scopeStu=(S.heatScope==='student')?(S.heatStu||(S.students[0]&&S.students[0].id)):null;
      var tree=aggregate(scopeStu);
      var html='';
      Object.keys(tree).forEach(function(ul){
        var ums=tree[ul]; var allC=0,allT=0;
        Object.keys(ums).forEach(function(um){ Object.keys(ums[um]).forEach(function(lk){ allC+=ums[um][lk].correct; allT+=ums[um][lk].total; }); });
        var avg=allT?Math.round(allC/allT*100):0;
        html+='<div class="h1r">'+esc(ul)+' <span class="avg">정답률 '+avg+'% ('+allT+'응답)</span></div>';
        Object.keys(ums).forEach(function(um){
          html+='<div class="h2r">중단원 · '+esc(um)+'</div>';
          Object.keys(ums[um]).forEach(function(lk){ var lf=ums[um][lk]; var v=lf.total?Math.round(lf.correct/lf.total*100):0;
            html+='<div class="leaf"><div class="nm">'+esc(lf.nm)+(lf.qt?' <em>'+esc(lf.qt)+'</em>':'')+'</div>'
              +'<div class="b2"><i style="width:'+v+'%;background:'+col(v)+'"></i></div><div class="pc" style="color:'+col(v)+'">'+(lf.total?v:'-')+'</div></div>';
          });
        });
      });
      var scope='<div class="row1"><div class="seg"><button data-hs="class" class="'+(S.heatScope==='class'?'on':'')+'">반 전체</button><button data-hs="student" class="'+(S.heatScope==='student'?'on':'')+'">학생별</button></div>'
        +(S.heatScope==='student'?'<select id="exa-hstu">'+opts+'</select>':'')+'</div>';
      return '<div class="card"><div class="h">🔥 세부 단원 정답률 <span class="sub">· 대·중·소단원 / 문제유형</span></div>'+scope+(html||'<div class="d" style="color:var(--mute)">채점된 데이터가 없습니다.</div>')
        +'<div class="note">색: 취약 ~50 · 보통 51~65 · 양호 66~84 · 우수 85~</div></div>';
    }

    function bind(){
      var cl=root.querySelector('#exa-cls'); if(cl) cl.onchange=async function(){ S.classId=this.value; S.paperId=null; S.gradeStu=null; S.heatStu=null; root.innerHTML='<div class="ph">불러오는 중…</div>'; await loadStudents(); await loadPapers(); await loadPaper(); render(); };
      var pp=root.querySelector('#exa-paper'); if(pp) pp.onchange=async function(){ S.paperId=this.value||null; root.innerHTML='<div class="ph">불러오는 중…</div>'; await loadPaper(); render(); };
      var nw=root.querySelector('#exa-new'); if(nw) nw.onclick=function(){ S.creating=true; S._newN=5; S._exExtract=null; S._exMsg=''; render(); };
      // create form
      var setn=root.querySelector('#exa-setn'); if(setn) setn.onclick=function(){ collectExamRows(); var n=parseInt(root.querySelector('#exa-n').value,10); if(n>0&&n<=100){ S._newN=n; render(); } };
      var ext=root.querySelector('#exa-ext'); if(ext) ext.onchange=function(){ extractExam(this.files); this.value=''; };
      var cc=root.querySelector('#exa-create'); if(cc) cc.onclick=createExam;
      var cx=root.querySelector('#exa-cancel'); if(cx) cx.onclick=function(){ S.creating=false; render(); };
      // grade
      root.querySelectorAll('.seg button[data-m]').forEach(function(b){ b.onclick=function(){ S.mode=this.dataset.m; render(); }; });
      var gstu=root.querySelector('#exa-gstu'); if(gstu) gstu.onchange=function(){ S.gradeStu=this.value; render(); };
      root.querySelectorAll('.ox button').forEach(function(b){ b.onclick=function(){ var no=+this.dataset.no, sid=S.gradeStu||S.students[0].id; var cur=S.itemRes[sid+'|'+no]; var val=(this.dataset.ox==='o'); S.itemRes[sid+'|'+no]=(cur===val?undefined:val); render(); }; });
      var gs=root.querySelector('#exa-gsave'); if(gs) gs.onclick=saveGrade;
      var af=root.querySelector('#exa-ans'); if(af) af.onchange=function(){ autoGrade(this.files); this.value=''; };
      // heat
      root.querySelectorAll('.seg button[data-hs]').forEach(function(b){ b.onclick=function(){ S.heatScope=this.dataset.hs; render(); }; });
      var hstu=root.querySelector('#exa-hstu'); if(hstu) hstu.onchange=function(){ S.heatStu=this.value; render(); };
    }

    function collectExamRows(){ var N=S._newN||5; S._exExtract=S._exExtract||{}; for(var i=1;i<=N;i++){ var g=function(c){ var e=root.querySelector('[data-c="'+c+'"][data-i="'+i+'"]'); return e?e.value:undefined; };
      var o={unit_large:g('ul'),unit_mid:g('um'),unit_small:g('us'),qtype:g('qt'),points:g('pt'),answer:g('an')}; if(o.unit_large!==undefined) S._exExtract[i]=o; } }
    async function extractExam(files){
      if(!files||!files.length) return; collectExamRows();
      S._exBusy=true; S._exMsg='문서 분석 중… (최대 1분)'; render();
      try{
        var imgs=[]; for(var i=0;i<files.length&&i<6;i++){ imgs.push(await fileB64(files[i])); }
        var cls=S.classes.filter(function(c){return c.id===S.classId;})[0]||{};
        var tok=await token();
        var r=await fetch(fnBase()+'/assignment-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({task:'extract', context:{subject:cls.subject, grade:cls.grade_band||''}, images:imgs})});
        var jj=await r.json().catch(function(){return{error:'응답 오류'};});
        if(!r.ok||jj.error) throw new Error(jj.error||('HTTP '+r.status));
        var its=jj.items||[]; if(!its.length){ S._exBusy=false; S._exMsg='문항을 인식하지 못했습니다. 더 선명한 파일로 시도하세요.'; render(); return; }
        S._newN=its.length; S._exExtract={}; its.forEach(function(it,idx){ S._exExtract[it.item_no||(idx+1)]=it; });
        S._exBusy=false; S._exMsg='✓ '+its.length+'문항 인식 · 표에 채웠습니다. 확인·수정 후 [시험 생성]';
        render();
      }catch(e){ S._exBusy=false; S._exMsg='자동 추출 실패: '+(e.message||e); render(); }
    }
    async function createExam(){
      var title=(root.querySelector('#exa-title').value||'').trim(); if(!title){ alert('시험명을 입력하세요.'); return; }
      var m=root.querySelector('#exa-cmsg'); m.textContent='생성 중…';
      var N=S._newN||5;
      var items=[]; var maxScore=0;
      for(var i=1;i<=N;i++){ var g=function(c){ var e=root.querySelector('[data-c="'+c+'"][data-i="'+i+'"]'); return e?(e.value||'').trim():''; };
        var pt=Number(g('pt')||0); maxScore+=pt;
        items.push({ item_no:i, unit_large:g('ul')||null, unit_mid:g('um')||null, unit_small:g('us')||null, qtype:g('qt')||null, points:pt, answer:g('an')||null }); }
      var pr=await sb().from('exam_papers').insert({ academy_id:acid, class_id:S.classId, teacher_id:uid||null,
        subject:(root.querySelector('#exa-subj').value||'').trim()||null, title:title,
        exam_date:(root.querySelector('#exa-date').value||new Date().toISOString().slice(0,10)),
        total_items:N, max_score:maxScore||100 }).select('id').single();
      if(pr.error||!pr.data){ m.textContent='실패: '+(pr.error&&pr.error.message); return; }
      var pid=pr.data.id;
      var irows=items.map(function(it){ return Object.assign({paper_id:pid},it); });
      var ir=await sb().from('exam_items').insert(irows);
      if(ir.error){ m.textContent='문항 저장 실패: '+ir.error.message; return; }
      S.creating=false; S.paperId=pid; await loadPapers(); await loadPaper(); render();
    }

    async function autoGrade(files){
      var sid=S.gradeStu||(S.students[0]&&S.students[0].id);
      if(!sid||!files||!files.length) return;
      S.grading=true; S.autoMsg='답안지 분석 중… (최대 1분 소요)'; render();
      try{
        var imgs=[]; for(var i=0;i<files.length && i<6;i++){ imgs.push(await fileB64(files[i])); }
        var tok=await token();
        var r=await fetch(fnBase()+'/exam-grade-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({paper_id:S.paperId, student_id:sid, images:imgs})});
        var j=await r.json().catch(function(){return{error:'응답 오류'};});
        if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status));
        var n=0,low=0; (j.results||[]).forEach(function(res){ var k=sid+'|'+res.item_no;
          if(res.correct===true||res.correct===false){ S.itemRes[k]=res.correct; n++; }
          S.itemAns[k]=(res.student_answer!=null?res.student_answer:'');
          if(res.confidence!=null){ S.itemConf[k]=res.confidence; if(res.confidence<0.6) low++; } });
        S.grading=false; S.autoMsg='✓ 자동채점 완료 ('+n+'문항'+(low?' · 확인필요 '+low+'개':'')+') · 검수 후 [검수 완료·저장]';
      }catch(e){ S.grading=false; S.autoMsg='자동채점 실패: '+(e.message||e); }
      render();
    }

    async function saveGrade(){
      var sid=S.gradeStu||S.students[0].id; var m=root.querySelector('#exa-gmsg'); if(m) m.textContent='저장 중…';
      var rows=[]; var tot=0; var usedAI=false;
      S.items.forEach(function(it){ var k=sid+'|'+it.item_no; var c=S.itemRes[k]; var ans=S.itemAns[k]; var cf=S.itemConf[k];
        if(c===undefined && ans==null) return;
        rows.push({ paper_id:S.paperId, academy_id:acid, student_id:sid, item_no:it.item_no,
          correct:(c===undefined?null:c), student_answer:(ans!=null?String(ans):null), confidence:(cf!=null?cf:null) });
        if(cf!=null) usedAI=true;
        if(c===true) tot+=Number(it.points||0); });
      if(rows.length){ var r=await sb().from('exam_item_results').upsert(rows,{onConflict:'paper_id,student_id,item_no'}); if(r.error){ if(m)m.textContent='실패: '+r.error.message; return; } }
      // 총점 요약 upsert
      var sr=await sb().from('exam_student_results').upsert([{ paper_id:S.paperId, academy_id:acid, student_id:sid, total_score:tot, graded_by:(usedAI?'ai_reviewed':'manual'), graded_at:new Date().toISOString() }],{onConflict:'paper_id,student_id'});
      if(sr.error){ if(m)m.textContent='총점 저장 실패: '+sr.error.message; return; }
      // 성적 데이터 통합: 학원 성적(academy_exams)에 총점 연동 → 학원생 관리 성적추이에 자동 반영
      try{
        var paper=S.papers.filter(function(x){return x.id===S.paperId;})[0]||{};
        var ax={ academy_id:acid, student_id:sid, exam_type:'학원', exam_paper_id:S.paperId,
          exam_date:(paper.exam_date||new Date().toISOString().slice(0,10)),
          title:(paper.title||null), subject:(paper.subject||null), score:tot, max_score:(paper.max_score||100) };
        var ex=await sb().from('academy_exams').select('id').eq('exam_paper_id',S.paperId).eq('student_id',sid).limit(1);
        if(ex&&ex.data&&ex.data[0]) await sb().from('academy_exams').update(ax).eq('id',ex.data[0].id);
        else await sb().from('academy_exams').insert(ax);
      }catch(e){}
      if(m) m.textContent='✓ 저장됨 (총점 '+tot+' · 성적추이 연동)';
    }

    root.innerHTML='<div class="ph">불러오는 중…</div>';
    await loadStudents(); await loadPapers(); await loadPaper(); render();
  }

  window.mountExamAnalysis = mountExamAnalysis;
})();
