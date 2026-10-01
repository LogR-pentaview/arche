/* ============================================================================
 * arche_assignment_grade.js · 과제 문항 채점 (강사 대시보드 > 과제 채점 탭)
 * ----------------------------------------------------------------------------
 * ① 과제 문항 구성 등록(수동 + 시험지/문항분류표 문서·사진 자동추출)
 * ② 학생 과제물 사진 업로드 → 문항별 자동채점(정답률 + 완성율) → 강사 검수·확정
 * 데이터 누적 → 학생 실력 검증·지도방침·특강 근거.
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage
 * 백엔드   : edge assignment-ai (task: extract | grade)
 * 제공     : window.mountAssignmentGrade(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function fnBase(){ return window.FN_BASE || ((window.SB_URL||'')+'/functions/v1'); }
  async function token(){ try{ var s=(await sb().auth.getSession()).data.session; return s?s.access_token:''; }catch(e){ return ''; } }
  function fileB64(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ var s=String(r.result||''); var i=s.indexOf(','); res({mime:(f.type||'image/jpeg'),data:(i>=0?s.slice(i+1):s)}); }; r.onerror=rej; r.readAsDataURL(f); }); }
  function col(v){ return v<=50?'#f04452':(v<=65?'#f79009':(v<=84?'#7bc86c':'#12b76a')); }

  function injectCSS(){
    if(document.getElementById('agx-css')) return;
    var s=document.createElement('style'); s.id='agx-css';
    s.textContent=[
    ".agx{--b:#3182f6;--b2:#1b64da;--line:#e8ebee;--mute:#8b95a1;--dim:#4e5968;--ink:#191f28;--p2:#f4f6f8;--safe:#12b76a;--risk:#f04452;--warn:#f79009;--bs:#eaf1ff}",
    ".agx *{box-sizing:border-box}",
    ".agx .row1{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}",
    ".agx select,.agx input{padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit;color:var(--ink);background:#fff}",
    ".agx .btn{border:none;border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:var(--b);color:#fff}",
    ".agx .btn.sub{background:#fff;color:var(--dim);border:1px solid var(--line)}",
    ".agx .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".agx .h{font-size:14px;font-weight:800;margin-bottom:8px}.agx .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".agx .seg{display:flex;gap:4px;margin-bottom:12px}.agx .seg button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;color:var(--mute);cursor:pointer}.agx .seg button.on{background:var(--b);color:#fff;border-color:var(--b)}",
    ".agx table{width:100%;border-collapse:collapse;font-size:12px}",
    ".agx th{color:var(--mute);font-size:10.5px;font-weight:800;text-align:left;padding:5px 6px;border-bottom:1px solid var(--line);white-space:nowrap}",
    ".agx td{padding:5px 6px;border-bottom:1px solid #eef1f4}.agx td input{width:100%;padding:6px 7px;font-size:11.5px}",
    ".agx .ox{display:flex;gap:4px}.agx .ox button{width:28px;border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 0;font-size:12px;font-weight:800;color:var(--mute);cursor:pointer}",
    ".agx .ox button.o.on{background:var(--safe);color:#fff;border-color:var(--safe)}.agx .ox button.x.on{background:var(--risk);color:#fff;border-color:var(--risk)}",
    ".agx .att{border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 8px;font-size:10.5px;font-weight:800;color:var(--mute);cursor:pointer;white-space:nowrap}.agx .att.on{background:var(--bs);color:var(--b2);border-color:#cfe0ff}.agx .att.off{color:#c9d0d8}",
    ".agx .imgbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--bs);border:1px dashed #cfe0ff;border-radius:10px;padding:9px 11px;margin:4px 0 10px}",
    ".agx .imglbl{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--b);color:var(--b2);border-radius:9px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer}",
    ".agx .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:4px 0 10px}",
    ".agx .kpis .k{background:var(--p2);border-radius:10px;padding:10px 4px;text-align:center}.agx .kpis .k .v{font-size:18px;font-weight:900}.agx .kpis .k .l{font-size:10px;color:var(--mute);font-weight:700;margin-top:1px}",
    ".agx .msg{font-size:11.5px;font-weight:700;margin-top:6px}",
    ".agx .note{font-size:11px;color:var(--mute);margin-top:8px;line-height:1.6}",
    ".agx .ph{border:1.5px dashed var(--line);border-radius:14px;padding:22px;text-align:center;color:var(--mute);font-size:12.5px}",
    ".agx .item{border-top:1px solid #eef1f4;padding:7px 0;font-size:11.5px}.agx .item:first-child{border-top:none}.agx .item b{font-weight:700}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountAssignmentGrade(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="agx"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId, uid=window._myUid;
    var canManage=(window._isOwner===true||window._canManage===true||window._myRole==='owner'||window._myRole==='manager');

    var S={ classes:[], classId:null, assigns:[], aid:null, mode:'items', items:[], itemRes:{}, itemAns:{}, itemConf:{}, itemAtt:{},
            students:[], gradeStu:null, creatingN:5, grading:false, extracting:false, msg:'', extracted:null };

    try{ var rc=await sb().from('academy_classes').select('id,name,subject,teacher_id').eq('academy_id',acid).order('created_at');
      var list=(rc&&rc.data)||[]; if(!canManage&&uid) list=list.filter(function(c){return c.teacher_id===uid;});
      S.classes=list; if(list[0]) S.classId=list[0].id; }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="agx"><div id="agx-root"></div></div>';
    var root=host.querySelector('#agx-root');

    async function loadStudents(){ S.students=[]; if(!S.classId) return;
      var en=await sb().from('student_enrollments').select('student_id').eq('class_id',S.classId);
      var ids=Array.from(new Set(((en&&en.data)||[]).map(function(e){return e.student_id;})));
      if(ids.length){ var st=await sb().from('students').select('id,name,enroll_status').in('id',ids);
        S.students=((st&&st.data)||[]).filter(function(s){return (s.enroll_status||'active')!=='withdrawn';}).sort(function(a,b){return String(a.name).localeCompare(String(b.name),'ko');}); } }
    async function loadAssigns(){ S.assigns=[]; if(!S.classId) return;
      var r=await sb().from('class_assignments').select('id,title,subject,assigned_date').eq('class_id',S.classId).order('assigned_date',{ascending:false});
      S.assigns=(r&&r.data)||[]; if(!S.aid && S.assigns[0]) S.aid=S.assigns[0].id; }
    async function loadItems(){ S.items=[]; S.itemRes={}; S.itemAns={}; S.itemConf={}; S.itemAtt={}; if(!S.aid) return;
      var it=await sb().from('assignment_items').select('item_no,unit_large,unit_mid,unit_small,qtype,points,answer').eq('assignment_id',S.aid).order('item_no');
      S.items=(it&&it.data)||[];
      var rr=await sb().from('assignment_item_results').select('student_id,item_no,correct,attempted,student_answer,confidence').eq('assignment_id',S.aid);
      ((rr&&rr.data)||[]).forEach(function(r){ var k=r.student_id+'|'+r.item_no; S.itemRes[k]=r.correct; S.itemAtt[k]=r.attempted; if(r.student_answer!=null)S.itemAns[k]=r.student_answer; if(r.confidence!=null)S.itemConf[k]=r.confidence; }); }

    function clsOpts(){ return S.classes.length? S.classes.map(function(c){return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>';}).join('') : '<option value="">담당 반 없음</option>'; }
    function aOpts(){ return S.assigns.length? S.assigns.map(function(a){return '<option value="'+a.id+'"'+(a.id===S.aid?' selected':'')+'>'+esc(a.title)+' ('+esc((a.assigned_date||'').slice(0,10))+')</option>';}).join('') : '<option value="">등록된 과제 없음</option>'; }

    function render(){
      var head='<div class="row1"><select id="agx-cls">'+clsOpts()+'</select>'
        +'<select id="agx-a" style="flex:1;min-width:150px">'+aOpts()+'</select></div>'
        +'<div class="seg"><button data-m="items" class="'+(S.mode==='items'?'on':'')+'">📐 문항 구성</button><button data-m="grade" class="'+(S.mode==='grade'?'on':'')+'">✍️ 과제물 채점</button></div>';
      var body;
      if(!S.classId) body='<div class="ph">담당 반이 없습니다.</div>';
      else if(!S.assigns.length) body='<div class="ph">등록된 과제가 없습니다. [강의 관리] 탭에서 과제를 먼저 등록하세요.</div>';
      else if(S.mode==='items') body=viewItems();
      else body=viewGrade();
      root.innerHTML=head+body; bind();
    }

    // ===== 문항 구성 =====
    function viewItems(){
      if(S.items.length && !S._reedit){
        var list=S.items.map(function(it){ var tag=[it.unit_large,it.unit_mid,it.unit_small].filter(Boolean).join(' › ');
          return '<div class="item"><b>'+it.item_no+'.</b> '+esc(tag||'-')+(it.qtype?' · '+esc(it.qtype):'')+' <span style="color:var(--mute)">('+(it.points||0)+'점'+(it.answer?' · 정답 '+esc(it.answer):'')+')</span></div>'; }).join('');
        return '<div class="card"><div class="h">📐 등록된 문항 '+S.items.length+'개 <span class="sub">· 이 구성으로 채점됩니다</span></div>'+list
          +'<div style="margin-top:12px"><button class="btn sub" id="agx-reedit">문항 재등록/수정</button></div></div>';
      }
      var N=S.creatingN||5;
      var ex=S.extracted||{};
      var rows=''; for(var i=1;i<=N;i++){ var e=ex[i]||{};
        rows+='<tr><td style="width:30px;text-align:center;font-weight:700">'+i+'</td>'
         +'<td><input data-c="ul" data-i="'+i+'" value="'+esc(e.unit_large||'')+'" placeholder="대단원"></td>'
         +'<td><input data-c="um" data-i="'+i+'" value="'+esc(e.unit_mid||'')+'" placeholder="중단원"></td>'
         +'<td><input data-c="us" data-i="'+i+'" value="'+esc(e.unit_small||'')+'" placeholder="소단원"></td>'
         +'<td><input data-c="qt" data-i="'+i+'" value="'+esc(e.qtype||'')+'" placeholder="유형"></td>'
         +'<td style="width:56px"><input data-c="pt" data-i="'+i+'" type="number" value="'+(e.points!=null?e.points:Math.round(100/N))+'" placeholder="배점"></td>'
         +'<td style="width:56px"><input data-c="an" data-i="'+i+'" value="'+esc(e.answer||'')+'" placeholder="정답"></td></tr>'; }
      return '<div class="card"><div class="h">📐 문항 구성 등록 <span class="sub">· 단원·유형·배점·정답</span></div>'
        +'<div class="imgbar"><label class="imglbl">📄 시험지·정답·문항분류표 문서/사진<input id="agx-ext" type="file" accept="image/*,application/pdf" multiple style="display:none"></label>'
        +'<span style="font-size:11px;color:var(--b2)">PDF·사진을 올리면 AI가 문항표를 자동으로 채웁니다</span>'
        +(S.msg&&S._msgField==='ext'?'<div class="msg" style="width:100%;color:'+(S.extracting?'#3182f6':(/실패/.test(S.msg)?'#f04452':'#12b76a'))+'">'+esc(S.msg)+'</div>':'')+'</div>'
        +'<div class="row1"><input id="agx-n" type="number" value="'+N+'" style="width:72px" title="문항 수"><button class="btn sub" id="agx-setn">문항수 적용</button></div>'
        +'<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>대단원</th><th>중단원</th><th>소단원</th><th>유형</th><th>배점</th><th>정답</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        +'<div style="margin-top:12px"><button class="btn" id="agx-saveitems">문항 저장</button> '+(S.items.length?'<button class="btn sub" id="agx-cancelitems">취소</button> ':'')+'<span id="agx-imsg" style="font-size:12px;margin-left:6px"></span></div></div>';
    }

    // ===== 과제물 채점 =====
    function viewGrade(){
      if(!S.items.length) return '<div class="ph">먼저 [📐 문항 구성]에서 문항을 등록하세요.</div>';
      if(!S.students.length) return '<div class="ph">반에 학생이 없습니다.</div>';
      var sid=S.gradeStu||S.students[0].id;
      var opts=S.students.map(function(s){return '<option value="'+s.id+'"'+(s.id===sid?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
      var tot=0,max=0,att=0; S.items.forEach(function(it){ max+=Number(it.points||0); var k=sid+'|'+it.item_no; if(S.itemRes[k]===true)tot+=Number(it.points||0); if(S.itemAtt[k]===true)att++; });
      var compRate=S.items.length?Math.round(att/S.items.length*100):0;
      var corrRate=max?Math.round(tot/max*100):0;
      var rows=S.items.map(function(it){ var k=sid+'|'+it.item_no; var c=S.itemRes[k]; var a=S.itemAtt[k]; var ans=S.itemAns[k]; var cf=S.itemConf[k];
        var low=(cf!=null&&cf<0.6);
        var ansCell=(ans!=null)?('<span style="font-size:11px">'+(esc(ans)||'<span style=\"color:#c9d0d8\">(공란)</span>')+'</span>'+(cf!=null?' <span style="font-size:9.5px;font-weight:800;color:'+(low?'#f04452':'#8b95a1')+'">'+Math.round(cf*100)+'%</span>':'')):'<span style="color:#c9d0d8">-</span>';
        var tag=[it.unit_large,it.unit_mid].filter(Boolean).join(' › ')+(it.qtype?' · '+it.qtype:'');
        return '<tr'+(low?' style="background:#fff7f7"':'')+'><td style="width:28px;text-align:center;font-weight:700">'+it.item_no+'</td>'
          +'<td style="font-size:11px;color:var(--dim)">'+esc(tag||'-')+'</td>'
          +'<td style="max-width:120px">'+ansCell+'</td>'
          +'<td style="width:58px"><button class="att '+(a===true?'on':(a===false?'off':''))+'" data-att="'+it.item_no+'">'+(a===true?'완성':(a===false?'미완':'완성?'))+'</button></td>'
          +'<td style="width:64px"><div class="ox"><button class="o'+(c===true?' on':'')+'" data-ox="o" data-no="'+it.item_no+'">O</button><button class="x'+(c===false?' on':'')+'" data-ox="x" data-no="'+it.item_no+'">X</button></div></td></tr>';
      }).join('');
      return '<div class="card"><div class="h">✍️ 과제물 채점 <span class="sub">· 자동채점 + 강사 검수</span></div>'
        +'<div class="row1"><select id="agx-gstu">'+opts+'</select></div>'
        +'<div class="imgbar"><label class="imglbl">📷 학생 과제물 업로드<input id="agx-grade" type="file" accept="image/*,application/pdf" multiple style="display:none"></label>'
        +'<span style="font-size:11px;color:var(--b2)">풀어온 과제물을 촬영하면 문항별 정오·완성을 자동 판정</span>'
        +(S.msg&&S._msgField==='grade'?'<div class="msg" style="width:100%;color:'+(S.grading?'#3182f6':(/실패/.test(S.msg)?'#f04452':'#12b76a'))+'">'+esc(S.msg)+'</div>':'')+'</div>'
        +'<div class="kpis"><div class="k"><div class="v" style="color:'+col(corrRate)+'">'+corrRate+'%</div><div class="l">정답률</div></div>'
        +'<div class="k"><div class="v" style="color:var(--b2)">'+compRate+'%</div><div class="l">완성율</div></div>'
        +'<div class="k"><div class="v">'+tot+'<span style="font-size:11px;color:var(--mute)">/'+max+'</span></div><div class="l">점수</div></div></div>'
        +'<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>단원·유형</th><th>학생답/신뢰도</th><th>완성</th><th>정오</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        +'<div style="margin-top:10px"><button class="btn" id="agx-gsave">검수 완료 · 저장</button> <span id="agx-gmsg" style="font-size:12px;margin-left:6px"></span></div>'
        +'<div class="note">※ 빨간 행(낮은 신뢰도)·서술형은 반드시 확인하세요. <b>완성</b>(풀이 시도 여부)과 <b>정오</b>를 각각 확인·수정 후 저장하면 정답률·완성율이 누적됩니다.</div></div>';
    }

    function bind(){
      var cl=root.querySelector('#agx-cls'); if(cl) cl.onchange=async function(){ S.classId=this.value; S.aid=null; S.gradeStu=null; root.innerHTML='<div class="ph">불러오는 중…</div>'; await loadStudents(); await loadAssigns(); await loadItems(); render(); };
      var a=root.querySelector('#agx-a'); if(a) a.onchange=async function(){ S.aid=this.value||null; S._reedit=false; S.extracted=null; S.msg=''; root.innerHTML='<div class="ph">불러오는 중…</div>'; await loadItems(); render(); };
      root.querySelectorAll('.seg button[data-m]').forEach(function(b){ b.onclick=function(){ S.mode=this.dataset.m; S.msg=''; render(); }; });
      // 문항 등록
      var setn=root.querySelector('#agx-setn'); if(setn) setn.onclick=function(){ var n=parseInt(root.querySelector('#agx-n').value,10); if(n>0&&n<=100){ S.creatingN=n; collectRows(); render(); } };
      var ext=root.querySelector('#agx-ext'); if(ext) ext.onchange=function(){ doExtract(this.files); this.value=''; };
      var si=root.querySelector('#agx-saveitems'); if(si) si.onclick=saveItems;
      var ci=root.querySelector('#agx-cancelitems'); if(ci) ci.onclick=function(){ S._reedit=false; S.extracted=null; render(); };
      var re=root.querySelector('#agx-reedit'); if(re) re.onclick=function(){ S._reedit=true; S.creatingN=S.items.length||5; S.extracted={}; S.items.forEach(function(it){ S.extracted[it.item_no]={unit_large:it.unit_large,unit_mid:it.unit_mid,unit_small:it.unit_small,qtype:it.qtype,points:it.points,answer:it.answer}; }); render(); };
      // 채점
      var gstu=root.querySelector('#agx-gstu'); if(gstu) gstu.onchange=function(){ S.gradeStu=this.value; render(); };
      var g=root.querySelector('#agx-grade'); if(g) g.onchange=function(){ doGrade(this.files); this.value=''; };
      root.querySelectorAll('.ox button').forEach(function(b){ b.onclick=function(){ var no=+this.dataset.no, sid=S.gradeStu||S.students[0].id, k=sid+'|'+no; var cur=S.itemRes[k]; var val=(this.dataset.ox==='o'); S.itemRes[k]=(cur===val?undefined:val); if(S.itemRes[k]!==undefined && S.itemAtt[k]===undefined) S.itemAtt[k]=true; render(); }; });
      root.querySelectorAll('.att[data-att]').forEach(function(b){ b.onclick=function(){ var no=+this.dataset.att, sid=S.gradeStu||S.students[0].id, k=sid+'|'+no; var cur=S.itemAtt[k]; S.itemAtt[k]=(cur===true?false:(cur===false?undefined:true)); render(); }; });
      var gs=root.querySelector('#agx-gsave'); if(gs) gs.onclick=saveGrade;
    }

    function collectRows(){ var N=S.creatingN||5; S.extracted=S.extracted||{}; for(var i=1;i<=N;i++){ var g=function(c){ var e=root.querySelector('[data-c="'+c+'"][data-i="'+i+'"]'); return e?e.value:undefined; };
      var o={unit_large:g('ul'),unit_mid:g('um'),unit_small:g('us'),qtype:g('qt'),points:g('pt'),answer:g('an')};
      if(o.unit_large!==undefined) S.extracted[i]=o; } }

    async function doExtract(files){
      if(!files||!files.length) return; collectRows();
      S.extracting=true; S._msgField='ext'; S.msg='문서 분석 중… (최대 1분)'; render();
      try{
        var imgs=[]; for(var i=0;i<files.length&&i<6;i++){ imgs.push(await fileB64(files[i])); }
        var cls=S.classes.filter(function(c){return c.id===S.classId;})[0]||{};
        var tok=await token();
        var r=await fetch(fnBase()+'/assignment-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({task:'extract', context:{subject:cls.subject}, images:imgs})});
        var jj=await r.json().catch(function(){return{error:'응답 오류'};});
        if(!r.ok||jj.error) throw new Error(jj.error||('HTTP '+r.status));
        var its=jj.items||[]; if(!its.length){ S.extracting=false; S.msg='문항을 인식하지 못했습니다. 더 선명한 파일로 시도하세요.'; render(); return; }
        S.creatingN=its.length; S.extracted={}; its.forEach(function(it,idx){ S.extracted[it.item_no||(idx+1)]=it; });
        S.extracting=false; S.msg='✓ '+its.length+'문항 인식 · 표에 채웠습니다. 확인·수정 후 [문항 저장]';
        render();
      }catch(e){ S.extracting=false; S.msg='자동 추출 실패: '+(e.message||e); render(); }
    }

    async function saveItems(){
      collectRows(); var m=root.querySelector('#agx-imsg'); if(m) m.textContent='저장 중…';
      var N=S.creatingN||5; var items=[]; var maxP=0;
      for(var i=1;i<=N;i++){ var e=S.extracted[i]||{}; var pt=Number(e.points||0); maxP+=pt;
        items.push({ assignment_id:S.aid, academy_id:acid, item_no:i, unit_large:(e.unit_large||'').trim()||null, unit_mid:(e.unit_mid||'').trim()||null, unit_small:(e.unit_small||'').trim()||null, qtype:(e.qtype||'').trim()||null, points:pt, answer:(e.answer||'').trim()||null }); }
      try{
        await sb().from('assignment_items').delete().eq('assignment_id',S.aid);
        var ins=await sb().from('assignment_items').insert(items); if(ins.error)throw ins.error;
        try{ await sb().from('class_assignments').update({total_items:N}).eq('id',S.aid); }catch(_e){}
        S._reedit=false; S.extracted=null; S.msg=''; await loadItems(); render();
      }catch(e){ if(m)m.textContent='저장 실패: '+(e.message||e); }
    }

    async function doGrade(files){
      var sid=S.gradeStu||(S.students[0]&&S.students[0].id); if(!sid||!files||!files.length) return;
      S.grading=true; S._msgField='grade'; S.msg='과제물 분석 중… (최대 1분)'; render();
      try{
        var imgs=[]; for(var i=0;i<files.length&&i<6;i++){ imgs.push(await fileB64(files[i])); }
        var tok=await token();
        var r=await fetch(fnBase()+'/assignment-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({task:'grade', assignment_id:S.aid, student_id:sid, images:imgs})});
        var jj=await r.json().catch(function(){return{error:'응답 오류'};});
        if(!r.ok||jj.error) throw new Error(jj.error||('HTTP '+r.status));
        var n=0,low=0; (jj.results||[]).forEach(function(res){ var k=sid+'|'+res.item_no;
          if(res.correct===true||res.correct===false){ S.itemRes[k]=res.correct; n++; }
          if(res.attempted===true||res.attempted===false) S.itemAtt[k]=res.attempted;
          S.itemAns[k]=(res.student_answer!=null?res.student_answer:''); if(res.confidence!=null){ S.itemConf[k]=res.confidence; if(res.confidence<0.6)low++; } });
        S.grading=false; S.msg='✓ 자동채점 완료 ('+n+'문항'+(low?' · 확인필요 '+low+'개':'')+') · 검수 후 저장';
        render();
      }catch(e){ S.grading=false; S.msg='자동채점 실패: '+(e.message||e); render(); }
    }

    async function saveGrade(){
      var sid=S.gradeStu||S.students[0].id; var m=root.querySelector('#agx-gmsg'); if(m)m.textContent='저장 중…';
      var rows=[]; var tot=0,att=0,usedAI=false;
      S.items.forEach(function(it){ var k=sid+'|'+it.item_no; var c=S.itemRes[k]; var a=S.itemAtt[k]; var ans=S.itemAns[k]; var cf=S.itemConf[k];
        if(c===undefined && a===undefined && ans==null) return;
        rows.push({ assignment_id:S.aid, academy_id:acid, student_id:sid, item_no:it.item_no, correct:(c===undefined?null:c), attempted:(a===undefined?null:a), student_answer:(ans!=null?String(ans):null), confidence:(cf!=null?cf:null) });
        if(cf!=null)usedAI=true; if(c===true)tot+=Number(it.points||0); if(a===true)att++; });
      if(rows.length){ var r=await sb().from('assignment_item_results').upsert(rows,{onConflict:'assignment_id,student_id,item_no'}); if(r.error){ if(m)m.textContent='실패: '+r.error.message; return; } }
      var comp=S.items.length?Math.round(att/S.items.length*100):0;
      var sr=await sb().from('assignment_scores').upsert([{ assignment_id:S.aid, academy_id:acid, student_id:sid, submitted:true, score:tot, completion_rate:comp, graded_by_type:(usedAI?'ai_reviewed':'manual'), graded_at:new Date().toISOString() }],{onConflict:'assignment_id,student_id'});
      if(sr&&sr.error){ if(m)m.textContent='총괄 저장 실패: '+sr.error.message; return; }
      if(m) m.textContent='✓ 저장됨 (정답률·완성율 '+comp+'% 누적)';
    }

    await loadStudents(); await loadAssigns(); await loadItems(); render();
  }

  window.mountAssignmentGrade = mountAssignmentGrade;
})();
