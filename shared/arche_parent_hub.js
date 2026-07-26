/* ============================================================================
 * arche_parent_hub.js · 학부모 전송함(parent_inbox) 허브
 * ----------------------------------------------------------------------------
 * 컨설턴트: ArcheParentHub.mountSend(container) — 소식지·시간표·새강좌·월간분석표·
 *           진로/수행 결과 등을 학부모에게 전송(전체/개별).
 * 학부모  : ArcheParentHub.loadInbox(academyId, studentId) → 항목 배열,
 *           ArcheParentHub.openItem(item) 오버레이 열람.
 * 의존: window.sb, window._acadId
 * ==========================================================================*/
(function(){
  "use strict";
  var TYPES=[
    {v:'notice',    label:'📢 소식지·안내'},
    {v:'timetable', label:'📅 시간표'},
    {v:'new_course',label:'🆕 새 강좌 안내'},
    {v:'monthly',   label:'📊 월간 분석표'},
    {v:'design',    label:'🧭 진로 징검다리 결과'},
    {v:'perf',      label:'📝 수행평가 결과'},
    {v:'etc',       label:'✉️ 기타'}
  ];
  function typeLabel(t){ var f=TYPES.filter(function(x){return x.v===t;})[0]; return f?f.label:'✉️ 기타'; }
  function acadId(){ return window._acadId || (window._academy&&window._academy.id) || null; }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function el(h){var t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild;}

  var CSS=""
    +".aph{max-width:900px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#243244}"
    +".aph *{box-sizing:border-box}"
    +".aph h2{font-size:19px;font-weight:900;color:#1A237E;margin:0 0 4px}"
    +".aph .sub{font-size:12.5px;color:#6b7688;margin-bottom:14px}"
    +".aph .card{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,23,51,.04)}"
    +".aph .fl{font-size:11.5px;font-weight:800;color:#8b95a1;margin:10px 0 5px}"
    +".aph select,.aph input[type=text],.aph textarea{width:100%;border:1.5px solid #dfe3ec;border-radius:9px;padding:10px 12px;font:inherit;font-size:13.5px;background:#fbfcfe;color:#243244}"
    +".aph textarea{resize:vertical}"
    +".aph .row{display:flex;gap:10px;flex-wrap:wrap}.aph .row>*{flex:1;min-width:150px}"
    +".aph .btn{border:none;border-radius:10px;padding:11px 18px;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff}"
    +".aph .btn:disabled{opacity:.5}"
    +".aph .btn.mut{background:#f0f2f6;color:#6b7688}"
    +".aph .it{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #eef1f4}.aph .it:last-child{border:0}"
    +".aph .it .tt{flex:1}.aph .it .tt b{font-size:13.5px;color:#243244}.aph .it .tt .m{font-size:11.5px;color:#8b95a1;margin-top:2px}"
    +".aph .tag{font-size:10.5px;font-weight:800;background:#eef1ff;color:#1A237E;border-radius:99px;padding:3px 9px}"
    +".aph .del{font-size:11px;color:#c0313d;background:#fdf0f1;border:1px solid #f3c0c5;border-radius:8px;padding:5px 9px;cursor:pointer}"
    +".aph-ov{position:fixed;inset:0;background:rgba(8,11,46,.55);z-index:10000;overflow:auto;padding:24px 14px}"
    +".aph-ovc{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:22px}"
    +".aph-ovc .x{float:right;border:0;background:#1A237E;color:#fff;border-radius:8px;padding:6px 12px;font-weight:800;cursor:pointer}"
    +".aph-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#1A237E;color:#fff;font-size:13px;font-weight:700;padding:11px 18px;border-radius:99px;z-index:10001;opacity:0;transition:.2s}"
    +".aph-toast.on{opacity:1}";
  function inject(){ if(!document.getElementById('aph-css')){var s=document.createElement('style');s.id='aph-css';s.textContent=CSS;document.head.appendChild(s);} }
  function toast(m){ var t=document.querySelector('.aph-toast'); if(!t){t=el('<div class="aph-toast"></div>');document.body.appendChild(t);} t.textContent=m;t.classList.add('on');setTimeout(function(){t.classList.remove('on');},2200); }

  async function loadStaffStudents(){
    var q=window.sb.from('students').select('id,name,grade').eq('academy_id',acadId());
    if(window._isOwner===false && window._myUid){ q=q.eq('consultant_uid',window._myUid); }
    var r=await q.order('name'); return (r&&r.data)||[];
  }
  async function push(studentId,type,title,body,link){
    var r=await window.sb.rpc('push_parent_item',{p_academy:acadId(),p_student:studentId||null,p_type:type,p_title:title,p_body:body,p_data:null,p_link:link||null});
    if(r.error)throw r.error; return r.data;
  }
  async function listSent(){
    var r=await window.sb.from('parent_inbox').select('id,student_id,type,title,created_at,active').eq('academy_id',acadId()).eq('active',true).order('created_at',{ascending:false}).limit(30);
    if(r.error)throw r.error; return r.data||[];
  }
  async function deactivate(id){ var r=await window.sb.from('parent_inbox').update({active:false}).eq('id',id); if(r.error)throw r.error; }

  // 학부모용 조회 (RLS로 자녀+broadcast만)
  async function loadInbox(academyId, studentId){
    var r=await window.sb.from('parent_inbox').select('*').eq('academy_id',academyId||acadId()).eq('active',true).order('created_at',{ascending:false});
    if(r.error) return [];
    return r.data||[];
  }

  function openItem(item){
    inject();
    var ov=el('<div class="aph-ov"><div class="aph-ovc"><button class="x">✕ 닫기</button><div style="clear:both"></div></div></div>');
    var c=ov.querySelector('.aph-ovc');
    c.appendChild(el('<div style="font-size:11px;font-weight:800;color:#8b95a1;letter-spacing:.03em;margin-top:6px">'+esc(typeLabel(item.type))+'</div>'));
    c.appendChild(el('<h2 style="font-size:19px;font-weight:900;color:#1A237E;margin:4px 0 8px">'+esc(item.title||'(제목 없음)')+'</h2>'));
    c.appendChild(el('<div style="font-size:11.5px;color:#8b95a1;margin-bottom:14px">'+esc((item.created_at||'').slice(0,10))+'</div>'));
    if(item.body) c.appendChild(el('<div style="font-size:14px;color:#39465a;line-height:1.85;white-space:pre-wrap">'+esc(item.body)+'</div>'));
    if(item.link) c.appendChild(el('<div style="margin-top:14px"><a href="'+esc(item.link)+'" target="_blank" rel="noopener" style="color:#1A237E;font-weight:700;text-decoration:underline;font-size:13.5px">첨부·링크 열기 →</a></div>'));
    document.body.appendChild(ov);
    ov.querySelector('.x').addEventListener('click',function(){ov.remove();});
    ov.addEventListener('click',function(e){ if(e.target===ov)ov.remove(); });
  }

  function renderList(container, items){
    inject();
    if(!items.length){ container.innerHTML='<div style="text-align:center;color:#8b95a1;font-size:13.5px;padding:30px">받은 항목이 없습니다.</div>'; return; }
    container.innerHTML='';
    items.forEach(function(it){
      var row=el('<div class="it"><div class="tt"><b>'+esc(it.title||'(제목 없음)')+'</b><div class="m">'+esc((it.created_at||'').slice(0,10))+(it.student_id?'':' · 전체 공지')+'</div></div><span class="tag">'+esc(typeLabel(it.type).replace(/^[^ ]+ /,''))+'</span></div>');
      row.style.cursor='pointer';
      row.addEventListener('click',function(){ openItem(it); });
      container.appendChild(row);
    });
  }

  // ── 컨설턴트 전송 도구 ──────────────────────────────────────────────────
  async function mountSend(container){
    inject();
    container=container||document.getElementById('parent-hub-mount');
    if(!container) return;
    var root=el('<div class="aph"></div>'); container.innerHTML=''; container.appendChild(root);
    if(!window.sb){ root.innerHTML='<div class="card">로그인 후 이용할 수 있어요.</div>'; return; }
    root.innerHTML='<h2>학부모에게 보내기</h2><div class="sub">소식지·시간표·새 강좌·월간 분석표, 진로/수행 결과 등을 학부모 대시보드로 전송합니다.</div>'
      +'<div class="card" id="aph-form"></div><h2 style="font-size:15px;margin-top:8px">최근 보낸 항목</h2><div class="card" id="aph-sent"><div class="sub" style="margin:0">불러오는 중…</div></div>';
    var form=root.querySelector('#aph-form');
    var students=[]; try{ students=await loadStaffStudents(); }catch(e){}
    form.innerHTML=''
      +'<div class="row"><div><div class="fl">유형</div><select id="aph-type">'+TYPES.map(function(t){return '<option value="'+t.v+'">'+t.label+'</option>';}).join('')+'</select></div>'
      +'<div><div class="fl">받는 대상</div><select id="aph-target"><option value="">전체 학부모(공지)</option>'+students.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+(s.grade?(' · '+esc(s.grade)):'')+' 학부모</option>';}).join('')+'</select></div></div>'
      +'<div class="fl">제목</div><input type="text" id="aph-title" placeholder="예: 3월 학원 소식 / 김서연 월간 분석표">'
      +'<div class="fl">내용</div><textarea id="aph-body" rows="5" placeholder="학부모에게 전달할 내용을 입력하세요."></textarea>'
      +'<div class="fl">링크·첨부 URL (선택)</div><input type="text" id="aph-link" placeholder="https:// (PDF·구글드라이브 등, 선택)">'
      +'<div style="margin-top:14px"><button class="btn" id="aph-send">학부모에게 보내기</button></div>'
      +'<div id="aph-msg" style="font-size:12.5px;margin-top:8px;min-height:14px"></div>';
    var sentBox=root.querySelector('#aph-sent');
    async function refresh(){ try{ var rows=await listSent(); if(!rows.length){ sentBox.innerHTML='<div class="sub" style="margin:0">아직 보낸 항목이 없습니다.</div>'; return; }
      sentBox.innerHTML=''; rows.forEach(function(it){
        var nm = it.student_id ? '개별' : '전체 공지';
        var row=el('<div class="it"><div class="tt"><b>'+esc(it.title||'(제목 없음)')+'</b><div class="m">'+esc(typeLabel(it.type))+' · '+nm+' · '+esc((it.created_at||'').slice(0,10))+'</div></div></div>');
        var d=el('<button class="del">삭제</button>'); d.addEventListener('click',async function(){ if(!confirm('이 항목을 학부모 대시보드에서 내릴까요?'))return; try{ await deactivate(it.id); toast('삭제됨'); refresh(); }catch(e){ toast('실패: '+(e.message||e)); } });
        row.appendChild(d); sentBox.appendChild(row);
      });
    }catch(e){ sentBox.innerHTML='<div class="sub" style="margin:0;color:#c0313d">'+esc(e.message||e)+'</div>'; } }
    form.querySelector('#aph-send').addEventListener('click', async function(){
      var btn=this; var type=form.querySelector('#aph-type').value, target=form.querySelector('#aph-target').value||null;
      var title=form.querySelector('#aph-title').value.trim(), body=form.querySelector('#aph-body').value.trim(), link=form.querySelector('#aph-link').value.trim();
      var msg=form.querySelector('#aph-msg');
      if(!title){ msg.style.color='#c0313d'; msg.textContent='제목을 입력하세요.'; return; }
      btn.disabled=true; msg.style.color='#6b7688'; msg.textContent='전송 중…';
      try{ await push(target, type, title, body, link);
        msg.style.color='#137a44'; msg.textContent=(target?'해당 학부모':'전체 학부모')+'에게 전송했습니다.';
        form.querySelector('#aph-title').value=''; form.querySelector('#aph-body').value=''; form.querySelector('#aph-link').value='';
        refresh();
      }catch(e){ msg.style.color='#c0313d'; msg.textContent='전송 실패: '+(e.message||e); }
      btn.disabled=false;
    });
    refresh();
  }

  // ── 샘플(미리보기) — 미수강 카드에서 "이런 걸 받게 됩니다" 풍부 미리보기 ──
  function samplePentaReport(){
    return {level:'starter',stage:'vision',student:{name:'○○(예시)',grade:''},lesson:{season:1,week:1,theme:'천부인권',title:'나에게는 소중한 권리가 있어요',date:'예시'},
      persona:{name:'따뜻한 규칙 디자이너',tagline:'친구의 마음까지 살피며 모두를 위한 규칙을 그리는 눈을 가졌어요.'},
      radar:{axes:['숫자·논리','과학·발명','역사·사회','마음','예술·디자인'],before:[5,4,5,6,5],after:[7,6,7,9,8],growthPct:41,note:'마음과 역사·사회의 눈이 크게 자랐어요.'},
      frequencies:[{name:'💗 마음의 눈',score:9,note:'친구 입장을 잘 헤아려요'},{name:'🎨 예술·디자인',score:8,note:'표현으로 설득해요'},{name:'🏛 역사·사회',score:7,note:'옛날과 지금을 비교해요'},{name:'🔢 숫자·논리',score:7,note:'공평하게 따져요'},{name:'🔬 과학·발명',score:6,note:'방법을 찾아내요'}],
      compass:{value:64,label:'“많은 사람이 편해도 한 사람도 속상하지 않아야 해요” — 존엄 쪽에 마음이 더 가 있어요.'},
      benchmark:{topic:'다수가 좋아하지만 소수가 다치는 상황에 대한 생각의 깊이',levels:[{label:'또래 평균',text:'많은 사람이 좋아하니까 그냥 해요.'},{label:'우리 아이',text:'다치는 친구를 위해 규칙을 살짝 바꾸면 모두 할 수 있어요.'},{label:'생각 마스터',text:'원인을 없애고 안 되면 다른 선택권을 줘요.'}]},
      golden:{sentence:'내 권리가 소중하면, 친구 권리도 똑같이 소중해요.',critique:'‘나’에서 ‘우리’로 시야를 넓히는, 공동체 감수성이 뛰어난 표현이에요.'},
      book:{title:'거짓말 같은 이야기',author:'강경수 글·그림',publisher:'시공주니어',desc:'세계 곳곳에서 기본 권리를 누리지 못하는 어린이들의 이야기를 담담히 보여주는 그림책이에요.',why:'권리에 대한 이해를 세계로 넓히기에 좋은 책이에요.'},
      homeTalk:{intro:'오늘 배운 권리 이야기를 저녁 식탁에서 가볍게 이어가 보세요.',items:[{q:'우리 집에서 네가 꼭 지켰으면 하는 권리는?',tip:'왜 그렇게 생각했는지 한 번 더 물어봐 주세요.'},{q:'네가 만든 규칙을 집에도 적용한다면?',tip:'부모님도 함께 지킬 규칙 하나를 정해보세요.'}]},
      roadmap:{items:[{icon:'📝',title:'추천 활동',desc:'우리 반 권리 약속 포스터 만들기'},{icon:'🎬',title:'추천 영상',desc:'유니세프 어린이 권리 애니메이션'}],nextQuestion:'모두의 권리를 지키면서 규칙을 어긴 친구는 어떻게 대할까?'},
      consultantConfirmed:false };
  }
  function sampleSheet(title, subtitle, sections){
    var h='<div style="background:#fff;border-radius:16px;padding:22px 22px;font-family:\'Noto Sans KR\',sans-serif;color:#243244">'
      +'<div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#8b95a1">'+esc(title)+'</div>'
      +'<div style="font-size:19px;font-weight:900;color:#1A237E;margin:3px 0 2px">'+esc(subtitle)+'</div>'
      +'<div style="font-size:12px;color:#8b95a1;margin-bottom:14px">예시 리포트 — 수강 시 자녀 맞춤으로 제공됩니다</div>';
    sections.forEach(function(sec){
      h+='<div style="border:1px solid #e6e9f0;border-radius:12px;padding:14px 16px;margin-bottom:10px">'
        +'<div style="font-size:13px;font-weight:800;color:#1A237E;margin-bottom:6px">'+esc(sec.h)+'</div>'
        +'<div style="font-size:13px;color:#39465a;line-height:1.75">'+sec.b+'</div></div>';
    });
    return h+'</div>';
  }
  function sampleDesign(){
    return sampleSheet('진로 징검다리 · CAREER STEPPING','진로 설계 결과지',[
      {h:'🧭 진로 성향 요약', b:'논리적 분석력과 사회 현상에 대한 관심이 함께 높게 나타납니다. 데이터로 사회 문제를 해석하는 활동에서 몰입도가 높았습니다.'},
      {h:'🎯 추천 진로 방향', b:'· 1순위: 데이터·사회과학 융합 분야<br>· 2순위: 미디어·커뮤니케이션<br>· 3순위: 정책·법'},
      {h:'📚 고교 연계 제안', b:'확률과 통계, 사회·문화, 정보 과목과 연계한 탐구를 권장합니다. (세특 방향 제안이며 대필이 아닙니다.)'},
      {h:'👪 가정 연계', b:'“요즘 관심 있는 사회 문제가 뭐야?”처럼 열린 질문으로 대화를 이어가 보세요.'}
    ]);
  }
  function samplePerf(){
    return sampleSheet('수행평가 도우미 · PERFORMANCE','수행평가 준비 결과지',[
      {h:'📝 과제 이해도', b:'주제의 핵심 요구사항을 정확히 파악했고, 자료 조사의 방향 설정이 우수합니다.'},
      {h:'🧩 구조 설계', b:'서론–본론–결론의 논리 흐름을 스스로 설계했습니다. 근거 자료 2건을 적절히 배치했습니다.'},
      {h:'💡 보완 피드백', b:'주장에 대한 반론을 한 가지 추가하면 설득력이 더 높아집니다. (내용 대필이 아닌 방향 코칭입니다.)'},
      {h:'👪 가정 연계', b:'발표 리허설을 집에서 한 번 들어봐 주시면 자신감 형성에 도움이 됩니다.'}
    ]);
  }
  function renderSample(container, type, title){
    inject();
    var head='<div style="background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff;border-radius:16px;padding:18px 20px;margin-bottom:14px">'
      +'<div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#E8D9A0">SAMPLE · 미리보기</div>'
      +'<div style="font-size:18px;font-weight:900;margin-top:4px">'+esc(title||'')+' — 이런 결과를 받아보실 수 있어요</div></div>';
    var wrap=document.createElement('div'); wrap.innerHTML=head; container.appendChild(wrap);
    var sb=document.createElement('div'); wrap.appendChild(sb);
    if(type==='penta' && window.ArchePentaReport){ try{ window.ArchePentaReport.render(sb, samplePentaReport()); }catch(e){ sb.innerHTML='<div style="padding:20px;color:#39465a">샘플 리포트를 불러오지 못했어요.</div>'; } }
    else if(type==='design'){ sb.innerHTML=sampleDesign(); }
    else if(type==='perf'){ sb.innerHTML=samplePerf(); }
    else { sb.innerHTML='<div style="background:#fff;border-radius:14px;padding:20px;color:#39465a;line-height:1.8">곧 제공되는 기능입니다.</div>'; }
    var cta=document.createElement('div');
    cta.style.cssText='background:#fffdf4;border:1px solid #E8D9A0;border-radius:14px;padding:16px 18px;margin-top:14px;text-align:center';
    cta.innerHTML='<div style="font-size:13.5px;font-weight:800;color:#b8860b">이 리포트는 예시입니다. 수강하시면 자녀 맞춤 리포트를 받아보실 수 있어요.</div>'
      +'<div style="font-size:12.5px;color:#8b95a1;margin-top:6px">수강·상담 문의는 담당 선생님께 연락해 주세요 🙏</div>';
    wrap.appendChild(cta);
  }

  window.ArcheParentHub={ mountSend:mountSend, loadInbox:loadInbox, openItem:openItem, renderList:renderList, renderSample:renderSample, typeLabel:typeLabel, TYPES:TYPES, version:'1.1' };
})();
