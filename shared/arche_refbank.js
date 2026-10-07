/* ============================================================================
 * arche_refbank.js · 기출은행 관리 (주변 고교/모의/수능 기출 근거 데이터)
 * ----------------------------------------------------------------------------
 * 가정통신문 중3 "고교 연계 예측"의 근거로 쓰이는 ref_exam_bank를 원장이 직접
 * 입력·관리. 수동 입력 + 사진으로 자동 추출(edge refbank-extract) 지원.
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage
 * 제공     : window.mountRefBank(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function fnBase(){ return window.FN_BASE || ((window.SB_URL||'')+'/functions/v1'); }
  async function token(){ try{ var s=(await sb().auth.getSession()).data.session; return s?s.access_token:''; }catch(e){ return ''; } }
  function fileB64(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){ var s=String(r.result||''); var i=s.indexOf(','); res({mime:(f.type||'image/jpeg'),data:(i>=0?s.slice(i+1):s)}); }; r.onerror=rej; r.readAsDataURL(f); }); }

  var STYPE=[['기출','학교 기출'],['모의고사','모의고사'],['학평','학력평가'],['수능','수능']];
  var DIFF=[['','-'],['하','하'],['중','중'],['상','상'],['최상','최상(킬러)']];

  function injectCSS(){
    if(document.getElementById('rfb-css')) return;
    var s=document.createElement('style'); s.id='rfb-css';
    s.textContent=[
    ".rfb{--b:#3182f6;--b2:#1b64da;--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--line:#e8ebee;--ls:#eef1f4;--p2:#f4f6f8;--risk:#f04452;--safe:#12b76a;--warn:#f79009;--bs:#eaf1ff}",
    ".rfb{color:var(--ink)}.rfb *{box-sizing:border-box}",
    ".rfb .row1{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}",
    ".rfb input,.rfb select,.rfb textarea{padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit;color:var(--ink);background:#fff}",
    ".rfb textarea{width:100%;min-height:54px;resize:vertical}",
    ".rfb .btn{border:none;border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:var(--b);color:#fff}",
    ".rfb .btn.sub{background:#fff;color:var(--dim);border:1px solid var(--line)}",
    ".rfb .btn.danger{background:#fff;color:var(--risk);border:1px solid #f3c4c4}",
    ".rfb .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".rfb .h{font-size:14px;font-weight:800;margin-bottom:8px}.rfb .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".rfb .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".rfb .grid .full{grid-column:1 / -1}",
    ".rfb label.f{display:block;font-size:10.5px;font-weight:700;color:var(--mute);margin:0 0 3px 2px}",
    ".rfb .grid input,.rfb .grid select{width:100%}",
    ".rfb .item{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:9px}",
    ".rfb .item .top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
    ".rfb .tag{font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;background:var(--p2);color:var(--dim)}",
    ".rfb .tag.b{background:var(--bs);color:var(--b2)}.rfb .tag.r{background:#fdecec;color:var(--risk)}.rfb .tag.w{background:#fff6e8;color:#b45309}",
    ".rfb .item .u{font-size:12.5px;font-weight:700;margin-top:6px}",
    ".rfb .item .c{font-size:11.5px;color:var(--dim);margin-top:4px;line-height:1.5}",
    ".rfb .item .acts{display:flex;gap:7px;margin-top:9px}",
    ".rfb .item .acts button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 11px;font-size:11px;font-weight:700;color:var(--dim);cursor:pointer}",
    ".rfb .imgbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--bs);border:1px dashed #cfe0ff;border-radius:10px;padding:10px 12px;margin-bottom:10px}",
    ".rfb .imglbl{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--b);color:var(--b2);border-radius:9px;padding:8px 12px;font-size:12px;font-weight:800;cursor:pointer}",
    ".rfb .msg{font-size:11.5px;font-weight:700;margin-top:6px}",
    ".rfb .ph{border:1.5px dashed var(--line);border-radius:14px;padding:22px;text-align:center;color:var(--mute);font-size:12.5px}",
    ".rfb .cnt{font-size:11px;color:var(--mute);margin:2px 0 10px}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountRefBank(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="rfb"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId, uid=window._myUid;

    function blankForm(){ return { id:null, source_type:'기출', school:'', region:'', region_sido:(defSido()||''), region_sigungu:'', year:(new Date().getFullYear()-1), round:'중간고사', grade:'고1', semester:'1학기', subject:'수학', unit_large:'', unit_mid:'', unit_small:'', qtype:'', difficulty:'', content:'', answer:'', source_ref:'' }; }
    function defSido(){ try{ var rr=(window._acadRegions||[]); if(rr.length&&rr[0].sido)return rr[0].sido; }catch(e){} return ''; }
    var S={ rows:[], filter:{school:'',grade:'',subject:''}, form:null, loading:true, imgBusy:false, imgMsg:'', msg:'' };

    host.innerHTML='<div class="rfb"><div id="rfb-root"></div></div>';
    var root=host.querySelector('#rfb-root');

    async function load(){
      S.loading=true; render();
      try{ var r=await sb().from('ref_exam_bank').select('*').eq('academy_id',acid).order('created_at',{ascending:false}).limit(500);
        S.rows=(r&&r.data)||[]; }catch(e){ S.rows=[]; S.msg='불러오기 실패: '+(e.message||e); }
      S.loading=false; render();
    }

    function filtered(){ return S.rows.filter(function(x){
      if(S.filter.school && String(x.school||'').indexOf(S.filter.school)<0) return false;
      if(S.filter.grade && x.grade!==S.filter.grade) return false;
      if(S.filter.subject && x.subject!==S.filter.subject) return false;
      return true; }); }

    function opts(arr,val){ return arr.map(function(o){ return '<option value="'+esc(o[0])+'"'+(o[0]===val?' selected':'')+'>'+esc(o[1])+'</option>'; }).join(''); }
    function gradeOpts(v){ return ['','초6','중1','중2','중3','고1','고2','고3'].map(function(g){ return '<option value="'+g+'"'+(g===v?' selected':'')+'>'+(g||'전체')+'</option>'; }).join(''); }
    function selOpts(arr,v){ return arr.map(function(o){ return '<option value="'+esc(o)+'"'+(o===v?' selected':'')+'>'+esc(o)+'</option>'; }).join(''); }
    function sidoOpts(v){ var L=(window.krSido?window.krSido():[]); return '<option value="">광역 선택</option>'+L.map(function(s){ return '<option value="'+esc(s)+'"'+(s===v?' selected':'')+'>'+esc(s)+'</option>'; }).join(''); }
    function sigunguOpts(sido,v){ var L=(window.krSigungu?window.krSigungu(sido):[]); return '<option value="">'+(L.length?'기초단체 선택':'(해당없음)')+'</option>'+L.map(function(g){ return '<option value="'+esc(g)+'"'+(g===v?' selected':'')+'>'+esc(g)+'</option>'; }).join(''); }

    function formHTML(){
      var f=S.form; if(!f) return '';
      function inp(k,ph,w){ return '<div'+(w?' class="full"':'')+'><label class="f">'+ph+'</label><input id="rf-'+k+'" value="'+esc(f[k])+'" placeholder="'+ph+'"></div>'; }
      return '<div class="card"><div class="h">'+(f.id?'✏️ 기출 수정':'➕ 기출 추가')+' <span class="sub">· 주변 고교/모의/수능 근거</span></div>'
        +'<div class="imgbar"><label class="imglbl">📷📄 사진·PDF로 자동 입력<input id="rf-img" type="file" accept="image/*,application/pdf,.pdf" multiple style="display:none"></label>'
        +'<span style="font-size:11px;color:var(--b2)">문제지 사진 또는 <b>PDF</b>를 올리면 AI가 단원·난이도·내용을 채워줍니다. PDF는 1개로 여러 쪽을 한 번에 처리합니다.</span>'
        +(S.imgMsg?'<div class="msg" style="width:100%;color:'+(S.imgBusy?'#3182f6':(/실패/.test(S.imgMsg)?'#f04452':'#12b76a'))+'">'+esc(S.imgMsg)+'</div>':'')+'</div>'
        +'<div class="grid">'
        +'<div><label class="f">구분</label><select id="rf-source_type">'+opts(STYPE,f.source_type)+'</select></div>'
        +inp('school','학교명 (예: 전주한빛고)')
        +'<div><label class="f">광역 (시·도)</label><select id="rf-region_sido">'+sidoOpts(f.region_sido)+'</select></div>'
        +'<div><label class="f">기초 (시·군·구)</label><select id="rf-region_sigungu">'+sigunguOpts(f.region_sido,f.region_sigungu)+'</select></div>'
        +inp('year','시험 연도')
        +'<div><label class="f">학기</label><select id="rf-semester">'+selOpts(['1학기','2학기'],f.semester)+'</select></div>'
        +'<div><label class="f">시험 구분</label><select id="rf-round">'+selOpts(['중간고사','기말고사','학력평가','모의고사','수능','기타'],f.round)+'</select></div>'
        +'<div><label class="f">학년</label><select id="rf-grade">'+gradeOpts(f.grade)+'</select></div>'
        +inp('subject','과목')
        +'<div><label class="f">난이도</label><select id="rf-difficulty">'+opts(DIFF,f.difficulty)+'</select></div>'
        +inp('unit_large','대단원')+inp('unit_mid','중단원')
        +inp('unit_small','소단원')+inp('qtype','유형 (예: 함수·도형 융합)')
        +'<div class="full"><label class="f">문항 내용/출제 특징</label><textarea id="rf-content" placeholder="문항 요지·출제 포인트">'+esc(f.content)+'</textarea></div>'
        +inp('answer','정답/해설 요지',true)
        +inp('source_ref','출처 메모 (URL·자료명)',true)
        +'</div>'
        +'<div style="margin-top:12px"><button class="btn" id="rf-save">저장</button> <button class="btn sub" id="rf-cancel">취소</button>'
        +(f.id?' <button class="btn danger" id="rf-del">삭제</button>':'')
        +' <span id="rf-msg" style="font-size:12px;margin-left:6px">'+esc(S.msg)+'</span></div></div>';
    }

    function listHTML(){
      var rows=filtered();
      if(!rows.length) return '<div class="ph">'+(S.rows.length?'필터에 맞는 기출이 없습니다.':'아직 등록된 기출이 없습니다. [➕ 기출 추가] 또는 📷 사진으로 시작하세요.')+'</div>';
      return rows.map(function(x){
        var dcl=(x.difficulty==='최상'?'r':(x.difficulty==='상'?'w':''));
        var unit=[x.unit_large,x.unit_mid,x.unit_small].filter(Boolean).join(' › ');
        return '<div class="item"><div class="top">'
          +'<span class="tag b">'+esc(x.source_type||'기출')+'</span>'
          +(x.school?'<span class="tag">'+esc(x.school)+'</span>':'')
          +((x.region||x.region_sigungu)?'<span class="tag">📍 '+esc(x.region||x.region_sigungu)+'</span>':'')
          +(x.year?'<span class="tag">'+esc(x.year)+(x.semester?' '+esc(x.semester):'')+(x.round?' '+esc(x.round):'')+'</span>':'')
          +(x.grade?'<span class="tag">'+esc(x.grade)+(x.subject?' '+esc(x.subject):'')+'</span>':'')
          +(x.difficulty?'<span class="tag '+dcl+'">난이도 '+esc(x.difficulty)+'</span>':'')
          +(x.qtype?'<span class="tag">'+esc(x.qtype)+'</span>':'')
          +(x.image_url?'<span class="tag">'+(/\.pdf$/i.test(x.image_url)?'📄 PDF':'🖼️ 이미지')+' 첨부</span>':'')+'</div>'
          +(unit?'<div class="u">'+esc(unit)+'</div>':'')
          +(x.content?'<div class="c">'+esc(x.content)+'</div>':'')
          +'<div class="acts"><button data-edit="'+x.id+'">수정</button><button data-del="'+x.id+'">삭제</button></div></div>';
      }).join('');
    }

    function render(){
      var head='<div class="row1">'
        +'<input id="rf-fschool" placeholder="학교 검색" value="'+esc(S.filter.school)+'" style="flex:1;min-width:120px">'
        +'<select id="rf-fgrade">'+gradeOpts(S.filter.grade)+'</select>'
        +'<input id="rf-fsubject" placeholder="과목" value="'+esc(S.filter.subject)+'" style="width:90px">'
        +(S.form?'':'<button class="btn" id="rf-new">➕ 기출 추가</button>')+'</div>';
      var body;
      if(S.form) body=formHTML();
      else if(S.loading) body='<div class="ph">불러오는 중…</div>';
      else body='<div class="cnt">총 '+S.rows.length+'건 · 표시 '+filtered().length+'건</div>'+listHTML();
      root.innerHTML=head+body; bind();
    }

    // 업로드한 기출 이미지(문제 자체)를 비공개 버킷에 저장 → 경로 반환(배치 1회만)
    async function uploadRefImages(){
      if(S._imgPath!==undefined) return S._imgPath;
      var files=S._imgFiles||[];
      if(!files.length){ S._imgPath=null; return null; }
      try{
        var f0=files[0];
        var nm=String(f0.name||''); var dot=nm.lastIndexOf('.'); var ext=(dot>=0?nm.slice(dot+1):'').toLowerCase().replace(/[^a-z0-9]/g,'');
        if(!ext){ ext=(f0.type&&f0.type.indexOf('png')>=0)?'png':((f0.type&&f0.type.indexOf('pdf')>=0)?'pdf':'jpg'); }
        var path=acid+'/'+Date.now()+'_'+Math.random().toString(36).slice(2,8)+'.'+ext;
        var up=await sb().storage.from('refbank').upload(path, f0, {upsert:false, contentType:(f0.type||'application/octet-stream')});
        if(up&&up.error){ S._imgPath=null; return null; }
        S._imgPath=path; return path;
      }catch(e){ S._imgPath=null; return null; }
    }
    function regionText(f){ var sd=(window.krSidoShort?window.krSidoShort(f.region_sido):(f.region_sido||'')); return [sd||'', f.region_sigungu||''].filter(Boolean).join(' ')||null; }
    async function doSave(){
      var f=S.form; var m=root.querySelector('#rf-msg');
      ['source_type','school','region_sido','region_sigungu','year','round','grade','semester','subject','unit_large','unit_mid','unit_small','qtype','difficulty','content','answer','source_ref'].forEach(function(k){
        var e=root.querySelector('#rf-'+k); if(e) f[k]=e.value; });
      if(!f.school && !f.unit_large && !f.content){ S.msg='학교 또는 단원/내용을 입력하세요.'; if(m)m.textContent=S.msg; return; }
      if(m) m.textContent='저장 중…';
      var row={ academy_id:acid, source_type:f.source_type||null, school:f.school||null, region:regionText(f),
        region_sido:f.region_sido||null, region_sigungu:f.region_sigungu||null,
        year:(f.year?parseInt(f.year,10)||null:null), round:f.round||null, grade:f.grade||null, semester:f.semester||null,
        subject:f.subject||null, unit_large:f.unit_large||null, unit_mid:f.unit_mid||null, unit_small:f.unit_small||null,
        qtype:f.qtype||null, difficulty:f.difficulty||null, content:f.content||null, answer:f.answer||null, source_ref:f.source_ref||null };
      try{
        if(f.id){ var u=await sb().from('ref_exam_bank').update(row).eq('id',f.id); if(u.error)throw u.error; }
        else{ row.created_by=uid; var ipath=await uploadRefImages(); if(ipath) row.image_url=ipath; var i=await sb().from('ref_exam_bank').insert(row); if(i.error)throw i.error; }
        S.form=null; S.msg=''; await load();
      }catch(e){ S.msg='저장 실패: '+(e.message||e); if(m)m.textContent=S.msg; }
    }
    async function doDelete(id){
      if(!confirm('이 기출 항목을 삭제할까요?')) return;
      try{ var d=await sb().from('ref_exam_bank').delete().eq('id',id); if(d.error)throw d.error; S.form=null; await load(); }
      catch(e){ S.msg='삭제 실패: '+(e.message||e); render(); }
    }

    async function doExtract(files){
      var f=S.form; if(!f||!files||!files.length) return;
      var arr=Array.prototype.slice.call(files,0,6);
      var big=arr.filter(function(x){ return x && x.size>18*1024*1024; });
      if(big.length){ S.imgBusy=false; S.imgMsg='자동 입력 실패: 파일이 너무 큽니다(개당 18MB 이하). PDF는 해상도를 낮추거나 쪽수를 나눠 올려주세요.'; render(); return; }
      var hasPdf=arr.some(function(x){ return /pdf/i.test(x.type||'') || /\.pdf$/i.test(x.name||''); });
      S._imgFiles=arr; S._imgPath=undefined;
      S.imgBusy=true; S.imgMsg=(hasPdf?'PDF':'이미지')+' 분석 중… (최대 1분)'; render();
      try{
        var imgs=[]; for(var i=0;i<arr.length;i++){ imgs.push(await fileB64(arr[i])); }
        var tok=await token();
        var r=await fetch(fnBase()+'/refbank-extract',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
          body:JSON.stringify({ context:{ school:f.school, grade:f.grade, subject:f.subject, year:f.year, source_type:f.source_type }, files:imgs, images:imgs })});
        var j=await r.json().catch(function(){return{error:'응답 오류'};});
        if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status));
        var items=j.items||[];
        if(!items.length){ S.imgBusy=false; S.imgMsg='추출된 문항이 없습니다. 더 선명한 파일로 시도해보세요.'; render(); return; }
        // 첫 항목은 현재 폼에 채우고, 2개 이상이면 나머지는 일괄 저장 제안
        var it=items[0];
        ['unit_large','unit_mid','unit_small','qtype','difficulty','content','answer'].forEach(function(k){ if(it[k]!=null && it[k]!=='') f[k]=it[k]; });
        if(it.year && !f.year) f.year=it.year;
        S.imgBusy=false;
        if(items.length>1){
          S._extra=items.slice(1);
          S.imgMsg='✓ '+items.length+'문항 인식 · 첫 문항을 폼에 채웠습니다. 나머지 '+(items.length-1)+'개는 아래 [나머지 일괄 저장]으로 추가하세요.';
        } else { S._extra=null; S.imgMsg='✓ 1문항 인식 · 폼에 채웠습니다. 확인 후 [저장]하세요.'; }
        render();
      }catch(e){ S.imgBusy=false; S.imgMsg='자동 입력 실패: '+(e.message||e); render(); }
    }
    async function saveExtra(){
      if(!S._extra||!S._extra.length) return; var f=S.form;
      var rows=S._extra.map(function(it){ return { academy_id:acid, created_by:uid, source_type:f.source_type||null, school:f.school||null, region:regionText(f),
        region_sido:f.region_sido||null, region_sigungu:f.region_sigungu||null,
        year:(it.year||f.year?parseInt(it.year||f.year,10)||null:null), round:f.round||null, grade:f.grade||null, semester:f.semester||null, subject:f.subject||null,
        unit_large:it.unit_large||null, unit_mid:it.unit_mid||null, unit_small:it.unit_small||null, qtype:it.qtype||null, difficulty:it.difficulty||null,
        content:it.content||null, answer:it.answer||null, source_ref:f.source_ref||null }; });
      try{ var ipath=(S._imgPath!==undefined)?S._imgPath:await uploadRefImages(); if(ipath) rows.forEach(function(r){ r.image_url=ipath; });
        var ins=await sb().from('ref_exam_bank').insert(rows); if(ins.error)throw ins.error; S._extra=null; S.imgMsg='✓ 나머지 일괄 저장 완료'; await load(); }
      catch(e){ S.imgMsg='일괄 저장 실패: '+(e.message||e); render(); }
    }

    function bind(){
      var fs=root.querySelector('#rf-fschool'); if(fs) fs.oninput=function(){ S.filter.school=this.value; if(!S.form)render(); };
      var fg=root.querySelector('#rf-fgrade'); if(fg) fg.onchange=function(){ S.filter.grade=this.value; render(); };
      var fsub=root.querySelector('#rf-fsubject'); if(fsub) fsub.oninput=function(){ S.filter.subject=this.value; if(!S.form)render(); };
      var nw=root.querySelector('#rf-new'); if(nw) nw.onclick=function(){ S.form=blankForm(); S.msg=''; S.imgMsg=''; S._extra=null; S._imgFiles=null; S._imgPath=undefined; render(); };
      var rsd=root.querySelector('#rf-region_sido'); if(rsd) rsd.onchange=function(){ if(S.form){ S.form.region_sido=this.value; S.form.region_sigungu=''; } var g=root.querySelector('#rf-region_sigungu'); if(g) g.innerHTML=sigunguOpts(this.value,''); };
      var sv=root.querySelector('#rf-save'); if(sv) sv.onclick=doSave;
      var cx=root.querySelector('#rf-cancel'); if(cx) cx.onclick=function(){ S.form=null; S.msg=''; render(); };
      var dl=root.querySelector('#rf-del'); if(dl) dl.onclick=function(){ doDelete(S.form.id); };
      var img=root.querySelector('#rf-img'); if(img) img.onchange=function(){ doExtract(this.files); this.value=''; };
      root.querySelectorAll('[data-edit]').forEach(function(b){ b.onclick=function(){ var id=this.getAttribute('data-edit'); var row=S.rows.filter(function(x){return String(x.id)===String(id);})[0]; if(row){ S.form=Object.assign(blankForm(),row); S.msg=''; S.imgMsg=''; S._extra=null; S._imgFiles=null; S._imgPath=undefined; render(); } }; });
      root.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ doDelete(this.getAttribute('data-del')); }; });
      if(S._extra&&S._extra.length){ var host2=root.querySelector('#rf-msg'); if(host2){ var btn=document.createElement('button'); btn.className='btn sub'; btn.textContent='나머지 일괄 저장 ('+S._extra.length+')'; btn.style.marginLeft='6px'; btn.onclick=saveExtra; host2.parentNode.appendChild(btn); } }
    }

    await load();
  }

  window.mountRefBank = mountRefBank;
})();
