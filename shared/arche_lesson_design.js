/* ============================================================================
 * arche_lesson_design.js · 수업 설계 지원 (C)
 * ----------------------------------------------------------------------------
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage,
 *            window.careernet(action,query)  (커리어넷 엣지)
 * 데이터  : academy_classes / exam_papers / exam_items / exam_item_results /
 *           special_classes / ref_exam_bank
 * 제공     : window.mountLessonDesign(host)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function col(v){ return v<=50?'#f04452':(v<=65?'#f79009':(v<=84?'#7bc86c':'#12b76a')); }

  function injectCSS(){
    if(document.getElementById('lsd-css'))return;
    var s=document.createElement('style'); s.id='lsd-css';
    s.textContent=[
    ".lsd{--b:#3182f6;--line:#e8ebee;--mute:#8b95a1;--dim:#4e5968;--ink:#191f28;--p2:#f4f6f8;--safe:#12b76a;--warn:#f79009;--risk:#f04452;--vs:#f3eefe;--violet:#7c3aed}",
    ".lsd *{box-sizing:border-box}",
    ".lsd .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".lsd .h{font-size:14px;font-weight:800;margin-bottom:8px}.lsd .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".lsd .d{font-size:12px;color:var(--dim);line-height:1.65}",
    ".lsd .row1{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".lsd input,.lsd select,.lsd textarea{padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit;color:var(--ink);background:#fff}",
    ".lsd textarea{width:100%;min-height:52px;resize:vertical}",
    ".lsd .btn{border:none;border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:var(--b);color:#fff}",
    ".lsd .btn.sub{background:#fff;color:var(--dim);border:1px solid var(--line)}",
    ".lsd .cc{display:inline-flex;flex-direction:column;gap:1px;border:1px solid #cfe0ff;background:#eff5ff;border-radius:10px;padding:8px 11px;margin:0 7px 7px 0}",
    ".lsd .cc b{font-size:12.5px;color:var(--b)}.lsd .cc small{font-size:10.5px;color:var(--mute)}",
    ".lsd .weak{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #eef1f4}.lsd .weak:first-child{border-top:none}",
    ".lsd .weak .nm{flex:1;font-size:12px}.lsd .b2{width:110px;height:7px;background:var(--p2);border-radius:5px;overflow:hidden}.lsd .b2 i{display:block;height:100%}",
    ".lsd .pc{width:34px;text-align:right;font-size:11.5px;font-weight:800}",
    ".lsd table{width:100%;border-collapse:collapse;font-size:12px}.lsd th{color:var(--mute);font-size:10.5px;font-weight:800;text-align:left;padding:5px 6px;border-bottom:1px solid var(--line)}.lsd td{padding:6px;border-bottom:1px solid #eef1f4}",
    ".lsd .tag{display:inline-block;background:var(--p2);border-radius:5px;padding:1px 7px;font-size:10px;color:var(--dim);margin-left:4px}",
    ".lsd .ph{border:1.5px dashed var(--line);border-radius:12px;padding:16px;text-align:center;color:var(--mute);font-size:12px}",
    ".lsd .note{font-size:11px;color:var(--mute);margin-top:8px;line-height:1.6}"
    ].join("\n");
    document.head.appendChild(s);
  }

  async function mountLessonDesign(host){
    if(typeof host==='string') host=document.getElementById(host)||document.querySelector(host);
    if(!host) return;
    injectCSS();
    if(!window.sb || !window._acadId){ host.innerHTML='<div class="lsd"><div class="ph">🔌 로그인 후 이용할 수 있어요.</div></div>'; return; }
    var acid=window._acadId, uid=window._myUid;
    var canManage=(window._isOwner===true||window._canManage===true||window._myRole==='owner'||window._myRole==='manager');

    var S={ classes:[], classId:null, weak:[], bankSubj:'', bankSrc:'', bank:[], cq:'', careerHTML:'', stunit:'', storyHTML:'' };

    try{
      var rc=await sb().from('academy_classes').select('id,name,subject,grade_band,teacher_id').eq('academy_id',acid).order('created_at');
      var list=(rc&&rc.data)||[]; if(!canManage&&uid) list=list.filter(function(c){return c.teacher_id===uid;});
      S.classes=list; if(list[0]) S.classId=list[0].id;
    }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="lsd"><div id="lsd-root"></div></div>';
    var root=host.querySelector('#lsd-root');

    function clsOpts(){ return S.classes.map(function(c){ return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>'; }).join(''); }
    function curClass(){ return S.classes.filter(function(c){return c.id===S.classId;})[0]||{}; }

    function render(){
      root.innerHTML=''
        +'<div class="row1" style="margin-bottom:12px"><select id="lsd-cls">'+(S.classes.length?clsOpts():'<option>담당 반 없음</option>')+'</select></div>'
        +careerCard()+weakCard()+bankCard()+storyCard();
      bind();
    }

    // 1) 수업 연계 진로·학과 (커리어넷)
    function careerCard(){
      var cls=curClass();
      return '<div class="card"><div class="h">🧭 수업 연계 진로·학과 <span class="sub">· 커리어넷</span></div>'
        +'<div class="d">수업 주제·단원과 연결되는 학과·계열을 찾아 수업 동기부여에 활용합니다.</div>'
        +'<div class="row1" style="margin-top:9px"><input id="lsd-cq" placeholder="키워드 (예: 함수, 통계, 생명과학)" value="'+esc(S.cq||cls.subject||'')+'" style="flex:1;min-width:160px">'
        +'<button class="btn" id="lsd-cgo">🔎 학과 찾기</button></div>'
        +'<div id="lsd-cres" style="margin-top:10px">'+(S.careerHTML||'')+'</div></div>';
    }

    // 2) 취약점 특강 전략
    function weakCard(){
      var rows=S.weak.length? S.weak.map(function(w){ return '<div class="weak"><div class="nm">'+esc(w.name)+(w.qt?'<span class="tag">'+esc(w.qt)+'</span>':'')+'</div><div class="b2"><i style="width:'+w.pct+'%;background:'+col(w.pct)+'"></i></div><div class="pc" style="color:'+col(w.pct)+'">'+w.pct+'</div></div>'; }).join('')
        : '<div class="ph">[분석] 버튼으로 최근 시험의 취약 단원을 불러오세요.</div>';
      return '<div class="card"><div class="h">🎯 취약점 특강 전략 <span class="sub">· 시험 분석 연계</span></div>'
        +'<div class="row1"><button class="btn sub" id="lsd-wload">최근 시험 취약 단원 분석</button></div>'
        +'<div style="margin-top:8px">'+rows+'</div>'
        +(S.weak.length?('<div style="margin-top:12px;border-top:1px dashed var(--line);padding-top:12px"><div class="h" style="font-size:13px">➕ 특강 개설</div>'
          +'<div class="row1"><input id="lsd-sptitle" placeholder="특강명" value="'+esc(S.weak[0]?(S.weak[0].name+' 집중 특강'):'')+'" style="flex:1;min-width:160px">'
          +'<input id="lsd-spweeks" type="number" placeholder="주수" value="4" style="width:70px">'
          +'<input id="lsd-spprice" type="number" placeholder="수강료" style="width:100px"></div>'
          +'<textarea id="lsd-spbasis" style="margin-top:8px" placeholder="개설 근거">'+esc(weakBasis())+'</textarea>'
          +'<div style="margin-top:8px"><button class="btn" id="lsd-spadd">특강 개설</button> <span id="lsd-spmsg" style="font-size:12px;margin-left:6px"></span></div>'
          +'<div class="note">개설한 특강은 가정통신문·학부모 앱에서 수강신청 근거로 연결됩니다.</div></div>'):'')
        +'</div>';
    }
    function weakBasis(){ if(!S.weak.length)return ''; return '최근 시험 분석 결과 '+S.weak.slice(0,3).map(function(w){return w.name+'('+w.pct+'%)';}).join(', ')+' 영역의 정답률이 낮아 집중 보강이 필요합니다.'; }

    // 3) 기출 자료실
    function bankCard(){
      var rows=S.bank.length? '<div style="overflow-x:auto"><table><thead><tr><th>구분</th><th>학교/출처</th><th>과목</th><th>단원</th><th>유형</th><th>난이도</th></tr></thead><tbody>'
        +S.bank.map(function(r){ var srcLab={naesin:'내신',nearby_high:'주변고교',mock:'학평',suneung:'수능'}[r.source_type]||r.source_type;
          return '<tr><td>'+esc(srcLab)+'</td><td>'+esc(r.school||r.source_ref||'-')+(r.year?(' '+r.year):'')+'</td><td>'+esc(r.subject||'')+'</td><td style="font-size:11px">'+esc([r.unit_large,r.unit_mid].filter(Boolean).join(' › ')||'-')+'</td><td>'+esc(r.qtype||'')+'</td><td>'+esc(r.difficulty||'')+'</td></tr>';
        }).join('')+'</tbody></table></div>' : '<div class="ph">자료가 없습니다. 아래에서 조회하거나 기출을 등록하세요.</div>';
      return '<div class="card"><div class="h">📚 기출 자료실 <span class="sub">· 주변고교·학평·수능 기출은행</span></div>'
        +'<div class="row1"><input id="lsd-bsubj" placeholder="과목" value="'+esc(S.bankSubj)+'" style="width:100px">'
        +'<select id="lsd-bsrc"><option value="">전체 구분</option>'
          +[['naesin','내신'],['nearby_high','주변고교'],['mock','학평'],['suneung','수능']].map(function(o){return '<option value="'+o[0]+'"'+(S.bankSrc===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'
        +'<button class="btn sub" id="lsd-bsearch">조회</button></div>'
        +'<div style="margin-top:10px">'+rows+'</div>'
        +'<div style="margin-top:12px;border-top:1px dashed var(--line);padding-top:12px"><div class="h" style="font-size:13px">➕ 기출 등록</div>'
        +'<div class="row1"><select id="lsd-rsrc">'+[['nearby_high','주변고교'],['naesin','내신'],['mock','학평'],['suneung','수능']].map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>';}).join('')+'</select>'
        +'<input id="lsd-rschool" placeholder="학교/출처" style="width:120px"><input id="lsd-ryear" type="number" placeholder="연도" style="width:80px"><input id="lsd-rsubj" placeholder="과목" style="width:90px"></div>'
        +'<div class="row1" style="margin-top:6px"><input id="lsd-rul" placeholder="대단원" style="width:120px"><input id="lsd-rum" placeholder="중단원" style="width:120px"><input id="lsd-rqt" placeholder="유형" style="width:90px"><input id="lsd-rdiff" placeholder="난이도(상/중/하)" style="width:120px"></div>'
        +'<textarea id="lsd-rcontent" style="margin-top:6px" placeholder="문항/요지 (선택)"></textarea>'
        +'<div style="margin-top:8px"><button class="btn" id="lsd-radd">자료 등록</button> <span id="lsd-rmsg" style="font-size:12px;margin-left:6px"></span></div></div></div>';
    }

    // 4) 수업 스토리텔링 (가이드 템플릿)
    function storyCard(){
      return '<div class="card"><div class="h">✍️ 수업 스토리텔링 · 단원 연계 <span class="sub">· 설계 가이드</span></div>'
        +'<div class="row1"><input id="lsd-stunit" placeholder="단원/주제 (예: 일차함수의 그래프)" value="'+esc(S.stunit||'')+'" style="flex:1;min-width:180px"><button class="btn sub" id="lsd-stgo">가이드 생성</button></div>'
        +'<div id="lsd-stres" style="margin-top:10px">'+(S.storyHTML||'')+'</div>'
        +'<div class="note">※ 단원과 연결된 실생활 사례·타과목 연계·핵심 발문 틀을 제시합니다. AI 자동 생성(서사 완성)은 전용 엔진 연동 시 제공됩니다.</div></div>';
    }

    function bind(){
      var cl=root.querySelector('#lsd-cls'); if(cl) cl.onchange=function(){ S.classId=this.value; S.weak=[]; render(); };
      var cg=root.querySelector('#lsd-cgo'); if(cg) cg.onclick=careerSearch;
      var wl=root.querySelector('#lsd-wload'); if(wl) wl.onclick=loadWeak;
      var sp=root.querySelector('#lsd-spadd'); if(sp) sp.onclick=addSpecial;
      var bs=root.querySelector('#lsd-bsearch'); if(bs) bs.onclick=searchBank;
      var ra=root.querySelector('#lsd-radd'); if(ra) ra.onclick=addBank;
      var st=root.querySelector('#lsd-stgo'); if(st) st.onclick=storyGuide;
    }

    async function careerSearch(){
      var q=(root.querySelector('#lsd-cq').value||'').trim(); S.cq=q; var box=root.querySelector('#lsd-cres');
      if(!q){ S.careerHTML='<div class="d" style="color:var(--mute)">키워드를 입력하세요.</div>'; box.innerHTML=S.careerHTML; return; }
      if(!window.careernet){ S.careerHTML='<div class="d" style="color:var(--risk)">커리어넷 연동이 없습니다.</div>'; box.innerHTML=S.careerHTML; return; }
      box.innerHTML='<div class="d" style="color:var(--mute)">커리어넷 검색 중…</div>';
      try{ var r=await window.careernet('major_search',q); var items=(r&&r.items)||[];
        if(!items.length){ S.careerHTML='<div class="d" style="color:var(--mute)">검색 결과가 없습니다.</div>'; }
        else { S.careerHTML=items.slice(0,12).map(function(x){ return '<span class="cc"><b>'+esc(x.major||'')+'</b><small>'+esc(x.series||'')+'</small></span>'; }).join('')
          +'<div class="note">수업 도입에서 "이 단원이 '+esc(items[0].series||'')+' 계열로 어떻게 이어지는지" 연결해 설명하면 동기부여에 좋습니다.</div>'; }
      }catch(e){ S.careerHTML='<div class="d" style="color:var(--risk)">조회 실패: '+esc((e&&e.message)||e)+'</div>'; }
      box.innerHTML=S.careerHTML;
    }

    async function loadWeak(){
      S.weak=[]; if(!S.classId){ render(); return; }
      // 최근 시험
      var p=await sb().from('exam_papers').select('id').eq('class_id',S.classId).order('exam_date',{ascending:false}).limit(1);
      var pid=p&&p.data&&p.data[0]&&p.data[0].id; if(!pid){ alert('이 반의 등록된 시험이 없습니다. [시험 분석]에서 먼저 시험을 등록·채점하세요.'); return; }
      var it=await sb().from('exam_items').select('item_no,unit_mid,unit_large,qtype').eq('paper_id',pid);
      var items=(it&&it.data)||[];
      var rr=await sb().from('exam_item_results').select('item_no,correct').eq('paper_id',pid);
      var agg={}; // 중단원 → {c,t,qt}
      var byNo={}; items.forEach(function(x){ byNo[x.item_no]=x; });
      ((rr&&rr.data)||[]).forEach(function(r){ var it0=byNo[r.item_no]; if(!it0)return; var key=(it0.unit_mid||it0.unit_large||('문항'+r.item_no));
        var a=agg[key]=agg[key]||{c:0,t:0,qt:it0.qtype||''}; a.t++; if(r.correct===true)a.c++; });
      var arr=Object.keys(agg).map(function(k){ var a=agg[k]; return {name:k, qt:a.qt, pct:a.t?Math.round(a.c/a.t*100):0}; });
      arr=arr.filter(function(w){return w.pct<=65;}).sort(function(a,b){return a.pct-b.pct;});
      if(!arr.length){ arr=Object.keys(agg).map(function(k){var a=agg[k];return {name:k,qt:a.qt,pct:a.t?Math.round(a.c/a.t*100):0};}).sort(function(a,b){return a.pct-b.pct;}).slice(0,3); }
      S.weak=arr; render();
    }

    async function addSpecial(){
      var m=root.querySelector('#lsd-spmsg'); var title=(root.querySelector('#lsd-sptitle').value||'').trim(); if(!title){ alert('특강명을 입력하세요.'); return; }
      var cls=curClass(); m.textContent='개설 중…';
      var row={ academy_id:acid, title:title, subject:cls.subject||null, target_grade:cls.grade_band||null,
        weeks:Number(root.querySelector('#lsd-spweeks').value||0)||null, price:Number(root.querySelector('#lsd-spprice').value||0)||null,
        basis:(root.querySelector('#lsd-spbasis').value||'').trim()||null, status:'open', created_by:uid||null };
      var r=await sb().from('special_classes').insert(row); if(r.error){ m.textContent='실패: '+r.error.message; return; }
      m.textContent='✓ 특강이 개설되었습니다.';
    }

    async function searchBank(){
      S.bankSubj=(root.querySelector('#lsd-bsubj').value||'').trim(); S.bankSrc=root.querySelector('#lsd-bsrc').value||'';
      var q=sb().from('ref_exam_bank').select('source_type,school,year,subject,unit_large,unit_mid,qtype,difficulty,source_ref').order('created_at',{ascending:false}).limit(50);
      if(S.bankSubj) q=q.ilike('subject','%'+S.bankSubj+'%');
      if(S.bankSrc) q=q.eq('source_type',S.bankSrc);
      try{ var r=await q; S.bank=(r&&r.data)||[]; }catch(e){ S.bank=[]; }
      render();
    }

    async function addBank(){
      var m=root.querySelector('#lsd-rmsg'); var g=function(id){ var e=root.querySelector('#'+id); return e?(e.value||'').trim():''; };
      var row={ academy_id:acid, source_type:(root.querySelector('#lsd-rsrc').value||'nearby_high'),
        school:g('lsd-rschool')||null, year:Number(g('lsd-ryear'))||null, subject:g('lsd-rsubj')||null,
        unit_large:g('lsd-rul')||null, unit_mid:g('lsd-rum')||null, qtype:g('lsd-rqt')||null, difficulty:g('lsd-rdiff')||null,
        content:g('lsd-rcontent')||null, created_by:uid||null };
      m.textContent='등록 중…';
      var r=await sb().from('ref_exam_bank').insert(row); if(r.error){ m.textContent='실패: '+r.error.message; return; }
      m.textContent='✓ 등록됨'; searchBank();
    }

    function storyGuide(){
      var u=(root.querySelector('#lsd-stunit').value||'').trim(); S.stunit=u; var box=root.querySelector('#lsd-stres');
      if(!u){ S.storyHTML='<div class="d" style="color:var(--mute)">단원/주제를 입력하세요.</div>'; box.innerHTML=S.storyHTML; return; }
      S.storyHTML='<div class="d" style="line-height:1.8">'
        +'<b>① 실생활 도입</b> — "'+esc(u)+'"이 일상/뉴스에서 어떻게 쓰이나요? (동기부여 질문으로 시작)<br>'
        +'<b>② 타과목 연계</b> — 이 단원과 연결되는 다른 과목 개념을 1~2개 짚기 (예: 과학 데이터, 사회 통계)<br>'
        +'<b>③ 핵심 발문</b> — 왜 그런가? / 다르게 접근하면? / 반례는? (학생 사고 유도)<br>'
        +'<b>④ 진로 연결</b> — 위 [수업 연계 진로·학과]에서 찾은 계열과 연결해 마무리<br>'
        +'<b>⑤ 형성 평가</b> — 오늘 배운 것을 한 문장으로 설명하기</div>';
      box.innerHTML=S.storyHTML;
    }

    render();
  }

  window.mountLessonDesign = mountLessonDesign;
})();
