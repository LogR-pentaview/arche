/* ============================================================================
 * arche_prehs_schools.js · 예비고1 상담 — 우리 학원 주변 고교 자료 관리 (원장·부원장)
 * ----------------------------------------------------------------------------
 * - 학원 전용 고교 자료를 prehs_academy_schools 테이블에 저장(공용 prehs_schools 는 건드리지 않음)
 * - 입력 방식 2가지: ① 파일 업로드(PDF·이미지·엑셀) → AI 추출(prehs-extract) → 검토·수정 ② 수기 입력 폼
 * - 저장된 학교는 예비고1 개별 상담의 [후보 고교] 목록에 자동 합류(같은 이름이면 학원 자료 우선)
 * 의존 전역: window.sb, window._acadId, window._isOwner / _myRole, (선택) window.XLSX, window.PREHS_DATA
 * 제공: window.ArchePrehsSchools.open({ onChange })
 * ==========================================================================*/
(function(){
  "use strict";
  var TAGS=['의약·생명','공학·AI·SW','자연과학·수학','인문·언어','사회·법·경제','교육','예체능·미디어'];
  var TERMS=['1-1','1-2','2-1','2-2','3-1','3-2'];
  var TYPES=['','일반선택','진로선택','융합선택'];
  var MAX_FILE=12*1024*1024, MAX_TOTAL=18*1024*1024;

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function acid(){ return window._acadId||(window._academy&&window._academy.id)||null; }
  function canManage(){ return window._isOwner===true || window._myRole==='manager'; }
  function lines(t){ return String(t||'').split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean); }

  /* 키워드 사전(prehs_meta.dict → PREHS_DATA.dict)으로 과목·동아리 태그 자동 분류 */
  function autoTag(text){
    var dict=(window.PREHS_DATA&&window.PREHS_DATA.dict)||null; if(!dict) return '';
    var t=String(text||''), out=[];
    TAGS.forEach(function(tag){ var kws=dict[tag]||[]; for(var i=0;i<kws.length;i++){ if(kws[i]&&t.indexOf(kws[i])>=0){ out.push(tag); break; } } });
    return out.join(',');
  }
  function cleanTags(s){ var a=String(s||'').split(/[,，、]/).map(function(x){return x.trim();}).filter(function(x){return TAGS.indexOf(x)>=0;}); return a.filter(function(x,i){return a.indexOf(x)===i;}).join(','); }

  var S={ rows:[], E:null, ov:null, busy:false, msg:'', msgCls:'', files:[] };

  /* ---------- 공통 UI ---------- */
  var CSS='<style>'
    +'#phs-ov{position:fixed;inset:0;z-index:9500;background:rgba(15,20,30,.55);overflow:auto;padding:18px 12px;font-family:inherit}'
    +'#phs-ov .phs-box{background:var(--panel,#fff);color:var(--ink,#1b1f24);max-width:980px;margin:0 auto;border-radius:16px;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.35)}'
    +'#phs-ov h3{margin:0;font-size:16px}#phs-ov .phs-sub{font-size:12px;color:var(--ink-mute,#7a8594);line-height:1.6}'
    +'#phs-ov .phs-card{border:1px solid var(--line,#e5e8eb);border-radius:12px;padding:12px 14px;margin-top:12px;background:var(--panel,#fff)}'
    +'#phs-ov .phs-h{font-weight:800;font-size:13.5px;margin-bottom:8px}'
    +'#phs-ov input[type=text],#phs-ov input[type=number],#phs-ov select,#phs-ov textarea{box-sizing:border-box;width:100%;padding:8px 10px;border:1px solid var(--line,#d9dde3);border-radius:8px;font-size:12.5px;background:var(--panel-2,#fff);color:inherit;font-family:inherit}'
    +'#phs-ov textarea{min-height:64px;resize:vertical;line-height:1.5}'
    +'#phs-ov .phs-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}'
    +'#phs-ov label.phs-l{display:block;font-size:11.5px;color:var(--ink-mute,#7a8594);margin-bottom:3px}'
    +'#phs-ov .phs-btn{border:1px solid var(--line,#d9dde3);background:var(--panel-2,#f4f6f8);color:inherit;border-radius:8px;padding:7px 12px;font-size:12.5px;cursor:pointer}'
    +'#phs-ov .phs-btn.pri{background:#2f7d5b;color:#fff;border-color:transparent;font-weight:700}'
    +'#phs-ov .phs-btn.dan{color:#c33}#phs-ov .phs-btn:disabled{opacity:.5;cursor:default}'
    +'#phs-ov table.phs-t{width:100%;border-collapse:collapse;font-size:12px}#phs-ov table.phs-t th{background:var(--panel-2,#f4f6f8);padding:5px;border:1px solid var(--line,#e5e8eb);font-weight:600}'
    +'#phs-ov table.phs-t td{border:1px solid var(--line,#e5e8eb);padding:2px}#phs-ov table.phs-t td input,#phs-ov table.phs-t td select{border:0;background:transparent;padding:6px}'
    +'#phs-ov .phs-li{display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid var(--line-soft,#eef1f4);flex-wrap:wrap}'
    +'#phs-ov .phs-msg{font-size:12px;margin-top:8px;line-height:1.6}'
    +'#phs-ov .phs-tw{overflow-x:auto}'
    +'</style>';

  function setMsg(t,cls){ S.msg=t||''; S.msgCls=cls||''; var m=S.ov&&S.ov.querySelector('#phs-msg'); if(m){ m.textContent=S.msg; m.style.color=S.msgCls==='err'?'#c33':(S.msgCls==='ok'?'#2f7d5b':'var(--ink-mute,#7a8594)'); } }

  function shell(inner){
    S.ov.innerHTML=CSS+'<div class="phs-box"><div style="display:flex;align-items:center;gap:10px"><h3>🏫 우리 학원 주변 고교 자료</h3><span style="flex:1"></span><button class="phs-btn" data-a="close">닫기 ✕</button></div>'+inner+'</div>';
    bind();
  }

  /* ---------- 목록 ---------- */
  async function loadRows(){
    S.rows=[];
    try{ var r=await sb().from('prehs_academy_schools').select('name,data,source,updated_at').eq('academy_id',acid()).order('name'); if(r.error) throw r.error; S.rows=r.data||[]; }
    catch(e){ setMsg('목록을 불러오지 못했습니다: '+((e&&e.message)||e),'err'); }
  }
  function renderList(){
    var h='<div class="phs-sub" style="margin-top:6px">예비고1 개별 상담의 <b>[후보 고교]</b> 목록에 우리 학원이 직접 등록한 학교가 함께 나타납니다. 공용 제공 학교와 이름이 같으면 <b>학원 자료가 우선</b> 적용됩니다.</div>';
    h+='<div class="phs-card"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div class="phs-h" style="margin:0">등록한 학교 '+S.rows.length+'개</div><span style="flex:1"></span>'+(canManage()?'<button class="phs-btn pri" data-a="new">＋ 고교 추가</button>':'<span class="phs-sub">원장·부원장만 등록·수정할 수 있습니다.</span>')+'</div>';
    if(!S.rows.length) h+='<div class="phs-sub" style="padding:14px 4px">아직 등록한 학교가 없습니다. [＋ 고교 추가]에서 학교 자료 파일(교육과정 편성표·평가계획·동아리 현황)을 올리거나 직접 입력해 보세요.</div>';
    S.rows.forEach(function(r){
      var d=r.data||{};
      h+='<div class="phs-li"><b style="font-size:14px">'+esc(r.name)+'</b><span class="phs-sub">'+esc(d.region||'')+' · 비율 '+((d.ratio||[]).length)+'줄 · 수행 '+((d.perf||[]).length)+'건 · 동아리 '+((d.clubs||[]).length)+'개 · 선택과목 묶음 '+((d.groups||[]).length)+'개 · '+esc((r.updated_at||'').slice(0,10))+'</span><span style="flex:1"></span>'
        +(canManage()?'<button class="phs-btn" data-a="edit" data-n="'+esc(r.name)+'">수정</button><button class="phs-btn dan" data-a="del" data-n="'+esc(r.name)+'">삭제</button>':'')+'</div>';
    });
    h+='</div><div id="phs-msg" class="phs-msg"></div>';
    shell(h); setMsg(S.msg,S.msgCls);
  }

  /* ---------- 편집 상태 ---------- */
  function blankE(){ return { orig:null, name:'', region:'', ratio:'', perf:'', clubHead:'', clubs:[], groups:[], source:'' }; }
  function fromRow(r){
    var d=r.data||{};
    return { orig:r.name, name:r.name, region:d.region||'', ratio:(d.ratio||[]).join('\n'), perf:(d.perf||[]).join('\n'), clubHead:d.clubHead||'',
      clubs:(d.clubs||[]).map(function(c){return {n:c.n||'',c:c.c||'',t:c.t||'',a:c.a||''};}),
      groups:(d.groups||[]).map(function(g){return {term:g.term||'2-1',label:g.label||'',limit:(g.limit==null?'':g.limit),courses:(g.courses||[]).map(function(c){return {n:c.n||'',a:c.a||'',t:c.t||'',ty:c.ty||''};})};}),
      source:r.source||'' };
  }
  function setPath(path,val){
    var p=path.split('.'),o=S.E; for(var i=0;i<p.length-1;i++){ o=o[p[i]]; if(o==null) return; } o[p[p.length-1]]=val;
  }

  /* ---------- 편집 화면 ---------- */
  function inp(path,val,ph,type){ return '<input type="'+(type||'text')+'" data-f="'+path+'" value="'+esc(val)+'" placeholder="'+esc(ph||'')+'">'; }
  function tarea(path,val,ph,h){ return '<textarea data-f="'+path+'" placeholder="'+esc(ph||'')+'"'+(h?' style="min-height:'+h+'px"':'')+'>'+esc(val)+'</textarea>'; }
  function renderEdit(){
    var E=S.E, h='';
    h+='<div class="phs-sub" style="margin-top:6px">'+(E.orig?'<b>'+esc(E.orig)+'</b> 수정':'새 학교 등록')+' — 파일로 자동 추출하거나, 아래 칸에 직접 입력하세요. 저장 전에 반드시 내용을 확인해 주세요.</div>';

    // 1) AI 추출
    h+='<div class="phs-card"><div class="phs-h">① 파일로 자동 입력 <span class="phs-sub" style="font-weight:400">(선택 · PDF·사진·엑셀 · 여러 파일 가능)</span></div>'
      +'<div class="phs-sub" style="margin-bottom:8px">학교 홈페이지에 공개된 <b>교육과정 편성표 · 1학기 교수학습·평가계획 · 동아리 현황</b>을 올리면 비율·수행평가·동아리·선택과목을 자동으로 채웁니다. 자료에 없는 항목은 비워 둡니다. 자료 종류별로 나눠 여러 번 올려도 됩니다(채워진 항목만 덮어씀).</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input type="file" id="phs-file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt" style="width:auto;border:0;padding:0">'
      +'<select id="phs-focus" style="width:auto"><option value="">자료 종류: 자동 판별</option><option value="교육과정 편성표(선택과목)">교육과정 편성표</option><option value="교수학습·평가계획(비율·수행평가)">평가계획</option><option value="동아리 운영 현황">동아리 현황</option></select>'
      +'<button class="phs-btn pri" data-a="extract" id="phs-ext">🤖 AI로 추출</button></div>'
      +'<div id="phs-files" class="phs-sub" style="margin-top:6px"></div></div>';

    // 2) 기본
    h+='<div class="phs-card"><div class="phs-h">② 기본 정보</div><div class="phs-g"><div><label class="phs-l">학교명 *</label>'+inp('name',E.name,'예: 전주고')+'</div><div><label class="phs-l">지역 *</label>'+inp('region',E.region,'예: 전주 / 김포 / 목동')+'</div></div></div>';

    // 3) 비율·수행
    h+='<div class="phs-card"><div class="phs-h">③ 지필·수행 비율 / 수행평가 <span class="phs-sub" style="font-weight:400">(한 줄에 하나)</span></div><div class="phs-g">'
      +'<div><label class="phs-l">지필·수행 비율 (정기:수행)</label>'+tarea('ratio',E.ratio,'전체: 국어 60:40 / 수학 60:40 / 영어 70:30 (정기:수행)\n국어 정기 60(30+30) : 수행 40',120)+'</div>'
      +'<div><label class="phs-l">수행평가 주요 형태</label>'+tarea('perf',E.perf,'[국어] ① 진로독서 서평쓰기 · 20점 · 5월 2주\n[수학] ① 문제 만들고 발표하기 · 20점',120)+'</div></div></div>';

    // 4) 동아리
    h+='<div class="phs-card"><div class="phs-h">④ 동아리·대회 <span class="phs-sub" style="font-weight:400">'+E.clubs.length+'개</span></div>'
      +'<div style="margin-bottom:8px"><label class="phs-l">동아리 요약 (선택)</label>'+inp('clubHead',E.clubHead,'예: 40개 · 활동내용은 자료에 없음')+'</div>'
      +'<div class="phs-tw"><table class="phs-t"><tr><th style="width:26%">동아리명</th><th style="width:20%">분류</th><th style="width:24%">진로 태그(콤마)</th><th>활동·인원</th><th style="width:34px"></th></tr>'
      +E.clubs.map(function(c,i){ return '<tr><td>'+inp('clubs.'+i+'.n',c.n)+'</td><td>'+inp('clubs.'+i+'.c',c.c,'예: 이공·AI·SW')+'</td><td>'+inp('clubs.'+i+'.t',c.t,'비우면 자동 분류')+'</td><td>'+inp('clubs.'+i+'.a',c.a)+'</td><td><button class="phs-btn dan" data-a="delclub" data-i="'+i+'" style="padding:3px 7px">×</button></td></tr>'; }).join('')
      +'</table></div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="phs-btn" data-a="addclub">＋ 한 줄 추가</button></div>'
      +'<div style="margin-top:8px"><label class="phs-l">붙여넣기로 한꺼번에 추가 — 한 줄에 <b>동아리명, 분류, 활동설명</b> (분류·설명은 생략 가능)</label>'+'<textarea id="phs-clubbulk" placeholder="로봇공학반, 이공·AI·SW, 1·2학년 20명\n독서토론반, 인문·사회·독서·언어"></textarea><button class="phs-btn" data-a="bulkclub" style="margin-top:6px">붙여넣은 동아리 추가</button></div></div>';

    // 5) 선택과목
    h+='<div class="phs-card"><div class="phs-h">⑤ 선택과목 편성 <span class="phs-sub" style="font-weight:400">(학생이 고르는 과목 묶음만 · 공통과목 제외)</span></div>';
    E.groups.forEach(function(g,gi){
      h+='<div style="border:1px solid var(--line,#e5e8eb);border-radius:10px;padding:10px;margin-bottom:10px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
        +'<div style="width:90px"><label class="phs-l">학년-학기</label><select data-f="groups.'+gi+'.term">'+TERMS.map(function(t){return '<option'+(t===g.term?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'
        +'<div style="flex:1;min-width:180px"><label class="phs-l">묶음 이름</label>'+inp('groups.'+gi+'.label',g.label,'예: 진로선택 교과(군) 간 · 택4')+'</div>'
        +'<div style="width:90px"><label class="phs-l">택 N개</label>'+inp('groups.'+gi+'.limit',g.limit,'4','number')+'</div>'
        +'<button class="phs-btn dan" data-a="delgroup" data-g="'+gi+'">묶음 삭제</button></div>'
        +'<div class="phs-tw" style="margin-top:8px"><table class="phs-t"><tr><th style="width:26%">과목명</th><th style="width:14%">유형</th><th>내용 요지</th><th style="width:24%">진로 태그(콤마)</th><th style="width:34px"></th></tr>'
        +g.courses.map(function(c,ci){ return '<tr><td>'+inp('groups.'+gi+'.courses.'+ci+'.n',c.n)+'</td><td><select data-f="groups.'+gi+'.courses.'+ci+'.ty">'+TYPES.map(function(t){return '<option'+(t===c.ty?' selected':'')+' value="'+t+'">'+(t||'—')+'</option>';}).join('')+'</select></td><td>'+inp('groups.'+gi+'.courses.'+ci+'.a',c.a)+'</td><td>'+inp('groups.'+gi+'.courses.'+ci+'.t',c.t,'비우면 자동 분류')+'</td><td><button class="phs-btn dan" data-a="delcourse" data-g="'+gi+'" data-i="'+ci+'" style="padding:3px 7px">×</button></td></tr>'; }).join('')
        +'</table></div><div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start"><button class="phs-btn" data-a="addcourse" data-g="'+gi+'">＋ 과목 추가</button>'
        +'<textarea id="phs-cb-'+gi+'" placeholder="붙여넣기: 한 줄에 과목명, 내용요지 (요지 생략 가능)" style="flex:1;min-width:200px;min-height:40px"></textarea><button class="phs-btn" data-a="bulkcourse" data-g="'+gi+'">붙여넣은 과목 추가</button></div></div>';
    });
    h+='<button class="phs-btn" data-a="addgroup">＋ 선택과목 묶음 추가</button></div>';

    h+='<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="phs-btn pri" data-a="save" style="padding:9px 20px">저장</button><button class="phs-btn" data-a="back">취소</button></div><div id="phs-msg" class="phs-msg"></div>';
    shell(h); setMsg(S.msg,S.msgCls); renderFileList();
  }
  function renderFileList(){ var el=S.ov&&S.ov.querySelector('#phs-files'); if(el&&S.E&&S.E.source) el.textContent='최근 추출 자료: '+S.E.source; }

  /* ---------- 이벤트 ---------- */
  function bind(){
    var ov=S.ov; if(!ov) return;
    ov.onclick=function(e){ if(e.target===ov) close(); var b=e.target.closest&&e.target.closest('[data-a]'); if(b) act(b); };
    ov.oninput=function(e){ var t=e.target; if(t&&t.getAttribute&&t.getAttribute('data-f')){ var v=t.value; setPath(t.getAttribute('data-f'),v); } };
    ov.onchange=function(e){ var t=e.target; if(t&&t.getAttribute&&t.getAttribute('data-f')) setPath(t.getAttribute('data-f'),t.value); };
  }
  function close(){ if(S.ov){ S.ov.remove(); S.ov=null; } }
  async function act(b){
    var a=b.getAttribute('data-a'), E=S.E;
    if(a==='close') return close();
    if(a==='new'){ S.E=blankE(); S.E.groups.push({term:'2-1',label:'',limit:'',courses:[]}); S.msg=''; return renderEdit(); }
    if(a==='edit'){ var r=S.rows.filter(function(x){return x.name===b.getAttribute('data-n');})[0]; if(r){ S.E=fromRow(r); S.msg=''; renderEdit(); } return; }
    if(a==='back'){ S.E=null; S.msg=''; return renderList(); }
    if(a==='del'){ var nm=b.getAttribute('data-n'); if(!confirm('"'+nm+'" 자료를 삭제할까요?\n이 학교로 저장된 기존 상담 기록은 유지됩니다.')) return;
      var d=await sb().from('prehs_academy_schools').delete().eq('academy_id',acid()).eq('name',nm); if(d.error){ setMsg('삭제 실패: '+d.error.message,'err'); return; }
      await loadRows(); S.msg='삭제했습니다.'; S.msgCls='ok'; renderList(); fire(); return; }
    if(!E) return;
    if(a==='addclub'){ E.clubs.push({n:'',c:'',t:'',a:''}); return renderEdit(); }
    if(a==='delclub'){ E.clubs.splice(+b.getAttribute('data-i'),1); return renderEdit(); }
    if(a==='bulkclub'){ var ta=S.ov.querySelector('#phs-clubbulk'); lines(ta&&ta.value).forEach(function(l){ var p=l.split(/\s*[,\t]\s*/); E.clubs.push({n:p[0]||'',c:p[1]||'',t:'',a:p.slice(2).join(', ')}); }); return renderEdit(); }
    if(a==='addgroup'){ E.groups.push({term:'2-1',label:'',limit:'',courses:[]}); return renderEdit(); }
    if(a==='delgroup'){ if(confirm('이 선택과목 묶음을 삭제할까요?')){ E.groups.splice(+b.getAttribute('data-g'),1); renderEdit(); } return; }
    if(a==='addcourse'){ E.groups[+b.getAttribute('data-g')].courses.push({n:'',a:'',t:'',ty:''}); return renderEdit(); }
    if(a==='delcourse'){ E.groups[+b.getAttribute('data-g')].courses.splice(+b.getAttribute('data-i'),1); return renderEdit(); }
    if(a==='bulkcourse'){ var gi=+b.getAttribute('data-g'), t2=S.ov.querySelector('#phs-cb-'+gi); lines(t2&&t2.value).forEach(function(l){ var p=l.split(/\s*[,\t]\s*/); E.groups[gi].courses.push({n:p[0]||'',a:p.slice(1).join(', '),t:'',ty:''}); }); return renderEdit(); }
    if(a==='extract') return extract();
    if(a==='save') return save();
  }
  function fire(){ try{ if(S.onChange) S.onChange(); }catch(e){} }

  /* ---------- 파일 → AI 추출 ---------- */
  function b64FromBuf(buf){ var bytes=new Uint8Array(buf), s='', CH=0x8000; for(var i=0;i<bytes.length;i+=CH) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH)); return btoa(s); }
  function decodeTxt(buf){ var u=new Uint8Array(buf); var off=(u[0]===0xEF&&u[1]===0xBB&&u[2]===0xBF)?3:0; try{ return new TextDecoder('utf-8',{fatal:true}).decode(u.subarray(off)); }catch(e){ try{ return new TextDecoder('euc-kr').decode(u.subarray(off)); }catch(e2){ return new TextDecoder('utf-8').decode(u.subarray(off)); } } }
  function imgDown(file){
    return new Promise(function(res,rej){
      var url=URL.createObjectURL(file), im=new Image();
      im.onload=function(){ var M=1800, s=Math.min(1,M/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*s); c.height=Math.round(im.height*s); c.getContext('2d').drawImage(im,0,0,c.width,c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',0.85).split(',')[1]); };
      im.onerror=function(){ URL.revokeObjectURL(url); rej(new Error('이미지를 읽을 수 없습니다: '+file.name)); }; im.src=url;
    });
  }
  async function readFiles(list){
    var files=[], texts=[], total=0, names=[];
    for(var i=0;i<list.length;i++){
      var f=list[i], nm=f.name||'', ext=(nm.split('.').pop()||'').toLowerCase();
      if(f.size>MAX_FILE) throw new Error('"'+nm+'" 파일이 너무 큽니다(최대 12MB). 쪽수를 나눠서 올려 주세요.');
      if(ext==='pdf'){ var buf=await f.arrayBuffer(); var b=b64FromBuf(buf); total+=b.length; files.push({mime:'application/pdf',data:b,name:nm}); }
      else if(/^(png|jpe?g|webp)$/.test(ext)){ var d=await imgDown(f); total+=d.length; files.push({mime:'image/jpeg',data:d,name:nm}); }
      else if(/^(xlsx|xls)$/.test(ext)){ if(!window.XLSX) throw new Error('엑셀 라이브러리가 로드되지 않았습니다. 새로고침 후 다시 시도하거나 PDF로 올려 주세요.');
        var wb=XLSX.read(await f.arrayBuffer(),{type:'array'}); var t=wb.SheetNames.map(function(sn){ return '## 시트: '+sn+'\n'+XLSX.utils.sheet_to_csv(wb.Sheets[sn],{blankrows:false}); }).join('\n\n'); texts.push({name:nm,text:t}); }
      else if(/^(csv|txt)$/.test(ext)){ texts.push({name:nm,text:decodeTxt(await f.arrayBuffer())}); }
      else throw new Error('지원하지 않는 형식입니다: '+nm+' (PDF·이미지·엑셀·CSV만 가능, 한글(HWP)은 PDF로 변환해 주세요)');
      names.push(nm);
    }
    if(total>MAX_TOTAL) throw new Error('파일 용량 합계가 너무 큽니다. 자료를 나눠서 올려 주세요.');
    return {files:files,texts:texts,names:names};
  }
  async function extract(){
    var E=S.E, fi=S.ov.querySelector('#phs-file'), btn=S.ov.querySelector('#phs-ext');
    if(!fi||!fi.files||!fi.files.length){ setMsg('먼저 자료 파일을 선택해 주세요.','err'); return; }
    if(S.busy) return; S.busy=true; if(btn){ btn.disabled=true; btn.textContent='추출 중… (최대 1~2분)'; }
    try{
      setMsg('파일을 읽는 중…');
      var rd=await readFiles(Array.prototype.slice.call(fi.files));
      setMsg('AI가 자료를 분석하는 중입니다… (자료가 많으면 1~2분 걸립니다)');
      var sess=(await sb().auth.getSession()).data.session, base=(window.FN_BASE)||((window.SB_URL||'')+'/functions/v1');
      var focus=(S.ov.querySelector('#phs-focus')||{}).value||'';
      var resp=await fetch(base+'/prehs-extract',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+(sess?sess.access_token:''),'apikey':(window.SB_KEY||'')},body:JSON.stringify({school:E.name||'',focus:focus,files:rd.files.map(function(x){return {mime:x.mime,data:x.data};}),texts:rd.texts})});
      var js=await resp.json().catch(function(){return {error:'서버 응답을 읽을 수 없습니다 (HTTP '+resp.status+')'};});
      if(!resp.ok||js.error||!js.data) throw new Error(js.error||('HTTP '+resp.status));
      var d=js.data, n={r:0,p:0,c:0,g:0,k:0};
      if(!E.name&&d.name) E.name=d.name; if(!E.region&&d.region) E.region=d.region;
      if(d.ratio&&d.ratio.length){ E.ratio=d.ratio.join('\n'); n.r=d.ratio.length; }
      if(d.perf&&d.perf.length){ E.perf=d.perf.join('\n'); n.p=d.perf.length; }
      if(d.clubHead) E.clubHead=d.clubHead;
      if(d.clubs&&d.clubs.length){ E.clubs=d.clubs.map(function(c){return {n:c.n,c:c.c,t:c.t,a:c.a};}); n.c=d.clubs.length; }
      if(d.groups&&d.groups.length){ E.groups=d.groups.map(function(g){return {term:TERMS.indexOf(g.term)>=0?g.term:'2-1',label:g.label,limit:(g.limit==null?'':g.limit),courses:g.courses.map(function(c){return {n:c.n,a:c.a,t:c.t,ty:c.ty};})}; }); n.g=d.groups.length; d.groups.forEach(function(g){ n.k+=g.courses.length; }); }
      E.source=rd.names.join(', ');
      S.msg='✓ 추출 완료 — 비율 '+n.r+'줄 · 수행평가 '+n.p+'건 · 동아리 '+n.c+'개 · 선택과목 묶음 '+n.g+'개(과목 '+n.k+'개). 아래 내용을 확인·수정한 뒤 [저장]을 눌러 주세요. 자료에서 찾지 못한 항목은 비어 있습니다.'; S.msgCls='ok';
      S.busy=false; renderEdit(); return;
    }catch(e){ S.busy=false; if(btn){ btn.disabled=false; btn.textContent='🤖 AI로 추출'; } setMsg('추출 실패: '+((e&&e.message)||e),'err'); }
  }

  /* ---------- 저장 ---------- */
  function buildData(E){
    var clubs=E.clubs.filter(function(c){return String(c.n||'').trim();}).map(function(c){ var t=cleanTags(c.t)||autoTag(c.n+' '+(c.a||'')+' '+(c.c||'')); return {n:String(c.n).trim(),c:String(c.c||'').trim()||'기타',t:t,a:String(c.a||'').trim()}; });
    var groups=E.groups.map(function(g){
      var courses=g.courses.filter(function(c){return String(c.n||'').trim();}).map(function(c){ var t=cleanTags(c.t)||autoTag(c.n+' '+(c.a||'')); return {n:String(c.n).trim(),a:String(c.a||'').trim(),t:t,ty:c.ty||''}; });
      var lim=parseInt(g.limit,10);
      return {term:g.term||'2-1',label:String(g.label||'').trim()||(g.term+' 선택'),limit:(lim>0?lim:null),courses:courses};
    }).filter(function(g){return g.courses.length;});
    return { region:String(E.region||'').trim(), ratio:lines(E.ratio), perf:lines(E.perf), clubHead:String(E.clubHead||'').trim(), clubs:clubs, groups:groups };
  }
  async function save(){
    var E=S.E, name=String(E.name||'').trim(), region=String(E.region||'').trim();
    if(!name){ setMsg('학교명을 입력해 주세요.','err'); return; }
    if(!region){ setMsg('지역을 입력해 주세요(예: 전주, 김포). 지역별로 학교 목록이 묶여 표시됩니다.','err'); return; }
    var data=buildData(E);
    if(!data.ratio.length&&!data.perf.length&&!data.clubs.length&&!data.groups.length){ setMsg('비율·수행평가·동아리·선택과목 중 최소 한 가지는 입력해 주세요.','err'); return; }
    var dup=S.rows.some(function(r){return r.name===name;});
    if(dup&&E.orig!==name&&!confirm('"'+name+'" 학교가 이미 등록되어 있습니다. 덮어쓸까요?')) return;
    setMsg('저장 중…');
    var row={academy_id:acid(),name:name,data:data,source:E.source||'직접 입력',active:true,updated_at:new Date().toISOString()};
    var r=await sb().from('prehs_academy_schools').upsert(row,{onConflict:'academy_id,name'});
    if(r.error){ setMsg('저장 실패: '+r.error.message,'err'); return; }
    if(E.orig&&E.orig!==name){ try{ await sb().from('prehs_academy_schools').delete().eq('academy_id',acid()).eq('name',E.orig); }catch(e){} }
    await loadRows(); S.E=null; S.msg='✓ "'+name+'" 저장 완료 — 예비고1 상담의 [후보 고교] 목록에 반영됩니다.'; S.msgCls='ok'; renderList(); fire();
  }

  /* ---------- 진입 ---------- */
  async function open(opts){
    S.onChange=opts&&opts.onChange; S.E=null; S.msg=''; S.msgCls='';
    if(!sb()||!acid()){ alert('로그인 후 이용할 수 있습니다.'); return; }
    if(S.ov) S.ov.remove();
    S.ov=document.createElement('div'); S.ov.id='phs-ov'; document.body.appendChild(S.ov);
    S.ov.innerHTML=CSS+'<div class="phs-box"><div class="phs-sub">불러오는 중…</div></div>';
    bind(); await loadRows(); renderList();
  }
  window.ArchePrehsSchools={ open:open, version:'1.0', _buildData:buildData, _autoTag:autoTag };
})();
