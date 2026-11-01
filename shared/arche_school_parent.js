/* ============================================================================
 * arche_school_parent.js · 학교 학부모 대시보드 v1.0
 * ----------------------------------------------------------------------------
 * 학교 계정(academies.account_type='school')의 학부모가 로그인했을 때 보이는 화면.
 * 학원용 대시보드(출석률·자체시험·수강 게이팅·샘플/수강문의)를 쓰지 않고,
 * 교사가 보낸 가정통신문·알림장·시간표·수업/수행평가 안내·성장 리포트(첨부)를 보여줍니다.
 * 호출: ArcheSchoolParent.mount(rootEl, student, {name:'학교명'})
 * 의존: window.sb, ArcheParentHub(loadInbox/renderList), pvOverlay(), pvOpenPenta(), pvEsc(), pvInjectCss()
 * ==========================================================================*/
(function(){
  "use strict";
  if(window.ArcheSchoolParent) return;
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var CSS=".sp-recent{background:#fff;border:1px solid #eef1f4;border-radius:18px;padding:6px 18px;box-shadow:0 1px 3px rgba(25,31,40,.04)}"
    +".sp-recent .aph .it{padding:12px 0}"
    +".sp-hint{font-size:11.5px;color:#8b95a1;text-align:center;margin-top:24px;line-height:1.75}"
    +".pv-card .cnt{font-size:11px;color:#8b95a1;margin:-6px 0 10px}";
  function css(){ if(document.getElementById('sp-css'))return; var s=document.createElement('style'); s.id='sp-css'; s.textContent=CSS; document.head.appendChild(s); }

  var GROUPS=[
    {k:'notice',   ic:'📢', title:'가정통신문·학교 공지', desc:'학교·학급에서 보낸 공지와 가정통신문을 확인하세요.', types:['notice']},
    {k:'homenote', ic:'🔔', title:'알림장',             desc:'담임·교과 선생님이 보낸 알림장입니다.',               types:['homenote']},
    {k:'timetable',ic:'📅', title:'시간표·학사일정',     desc:'시간표와 학사일정을 확인하세요.',                     types:['timetable']},
    {k:'class',    ic:'📘', title:'수업 안내',           desc:'워크북 수업 안내와 준비물을 확인하세요.',             types:['class_info']},
    {k:'perf',     ic:'📝', title:'수행평가 안내·결과',   desc:'수행평가 안내와 결과를 확인하세요.',                   types:['perf']},
    {k:'report',   ic:'📊', title:'학습 성장 리포트',     desc:'선생님이 보낸 자녀의 분석 리포트(첨부 파일 포함)입니다.', types:['monthly','design']},
    {k:'counsel',  ic:'💬', title:'상담 안내',           desc:'학부모 상담 일정과 안내를 확인하세요.',               types:['counsel']},
    {k:'etc',      ic:'✉️', title:'기타 안내',           desc:'그 밖의 안내 사항입니다.',                             types:['etc','new_course']}
  ];

  async function mount(root, stu, info){
    css();
    var school=(info&&info.name)||window._schoolName||'';
    var h='<div class="pv-wrap">'
      +'<div class="pv-top"><button class="lo" onclick="sbSignOutReload()">로그아웃</button>'
      +'<div class="av">'+esc((stu.name||'자').slice(0,1))+'</div>'
      +'<div class="who"><div class="eb">PENTAVIEW · 학교 학부모</div>'
      +'<h1>'+esc(stu.name||'자녀')+' 학부모님</h1>'
      +'<div class="meta">'+(school?'<span class="chip gold">'+esc(school)+'</span>':'')+(stu.grade?'<span class="chip">'+esc(stu.grade)+'</span>':'')+'</div></div></div>'
      +'<div class="pv-sec">🆕 최근 소식</div><div class="sp-recent" id="sp-recent"><div class="pv-exempty" style="text-align:center;color:#8b95a1;font-size:12.5px;padding:18px 0">불러오는 중…</div></div>'
      +'<div class="pv-sec">📬 받은 자료</div><div class="pv-grid" id="sp-grid"></div>'
      +'<div class="sp-hint">선생님이 보낸 소식이 이곳에 모입니다.<br>문의 사항은 담임·담당 선생님께 연락해 주세요.</div></div>';
    root.innerHTML=h;
    var inbox=[]; try{ if(window.ArcheParentHub) inbox=await ArcheParentHub.loadInbox(stu.academy_id, stu.id); }catch(e){}
    var rec=root.querySelector('#sp-recent'); rec.innerHTML='<div class="aph" id="sp-rl"></div>';
    if(!inbox.length){ rec.innerHTML='<div style="text-align:center;color:#8b95a1;font-size:13px;padding:22px 0">아직 도착한 소식이 없어요.</div>'; }
    else if(window.ArcheParentHub){ ArcheParentHub.renderList(rec.querySelector('#sp-rl'), inbox.slice(0,5)); }

    var grid=root.querySelector('#sp-grid'); grid.innerHTML='';
    var cards=[{ic:'🧠',title:'수업 워크북 성장 리포트',desc:'자녀가 수업에서 작성한 워크북과 분석 리포트를 확인하세요.',count:0,open:function(){ if(window.pvOpenPenta) pvOpenPenta(stu); }}];
    GROUPS.forEach(function(g){
      var items=inbox.filter(function(it){ return g.types.indexOf(it.type)>=0; });
      if(!items.length && ['notice','homenote','report'].indexOf(g.k)<0) return;   // 비어 있는 보조 항목은 숨김
      cards.push({ic:g.ic,title:g.title,desc:g.desc,count:items.length,items:items});
    });
    cards.forEach(function(c){
      var card=document.createElement('div'); card.className='pv-card on';
      var badge=c.items? (c.count?'<span class="pv-badge pv-on">'+c.count+'건</span>':'<span class="pv-badge pv-std">도착 전</span>') : '<span class="pv-badge pv-std">상시 제공</span>';
      card.innerHTML='<div class="chd"><div class="ic">'+c.ic+'</div><h3>'+esc(c.title)+'</h3>'+badge+'</div><div class="d">'+esc(c.desc)+'</div><button class="pv-btn">열람하기'+(c.count?' ('+c.count+')':'')+' →</button>';
      card.querySelector('button').addEventListener('click',function(){
        if(c.open) return c.open();
        if(window.pvOpenList) pvOpenList(c.title, c.items||[]);
      });
      grid.appendChild(card);
    });
  }
  window.ArcheSchoolParent={ mount:mount, version:'1.0' };
})();
