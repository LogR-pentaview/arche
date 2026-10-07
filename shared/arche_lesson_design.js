/* ============================================================================
 * arche_lesson_design.js · 수업 설계 / 수업 준비 지원
 * ----------------------------------------------------------------------------
 * 의존 전역: window.sb, window._acadId, window._myUid, window._isOwner/_canManage,
 *            window.careernet(action,query)  (커리어넷 엣지)
 * 데이터  : academy_classes / exam_papers / exam_items / exam_item_results /
 *           special_classes / ref_exam_bank / curriculum_units
 * 제공     : window.mountLessonDesign(host)
 *
 * [2026-10] 추가: '이 단원 기출 자동검색'(A) + 학생 투사 프레젠테이션/수업 전 출력물(B)
 *                 + 표준 단원 매핑(curriculum_units) 기반 동의어 정규화(C)
 * ==========================================================================*/
(function(){
  "use strict";
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sb(){ return window.sb; }
  function col(v){ return v<=50?'#f04452':(v<=65?'#f79009':(v<=84?'#7bc86c':'#12b76a')); }
  function fnBase(){ return window.FN_BASE||((window.SB_URL||'')+'/functions/v1'); }
  async function token(){ try{ var s=(await sb().auth.getSession()).data.session; return s?s.access_token:''; }catch(e){ return ''; } }

  // 매칭에서 과도하게 넓게 걸리는 일반 용어(단독으로는 매칭 제외)
  var GENERIC=['함수','방정식','부등식','통계','수열','미분','적분','집합','명제','확률','도형','다항식',
    '수와 연산','문자와 식','식의 계산','변화와 관계','도형과 측정','자료와 가능성',
    '수학','국어','영어','사회','과학'];
  var DIFF_RANK={ '최상':4,'상':3,'중':2,'하':1 };
  var HI_SUBJ=/(공통수학|수학Ⅰ|수학Ⅱ|수학1|수학2|대수|미적분|기하|확률과\s*통계|통합과학|통합사회|공통국어|공통영어|국어Ⅰ|영어Ⅰ|고등)/;
  // 문항의 학교급(중/고) 판정
  function rowLevel(x){
    var g=String((x&&x.grade)||'');
    if(/^중/.test(g)) return '중';
    if(/^고/.test(g)||g==='고등') return '고';
    if(HI_SUBJ.test(String((x&&x.subject)||'')+' '+String((x&&x.unit_large)||''))) return '고';
    return '';
  }
  function levelOfGrade(g){ g=String(g||''); if(/^중/.test(g)) return '중'; if(/^고/.test(g)||g==='고등') return '고'; return ''; }
  // 출처 분류: 내신(학교 기출) / 학평(전국연합 학력평가·모의고사) / 수능
  function srcCat(x){ var s=String((x&&x.source_type)||'');
    if(/수능/.test(s)) return '수능';
    if(/학평|모의|학력/.test(s)) return '학평';
    return '내신';
  }

  function injectCSS(){
    if(document.getElementById('lsd-css'))return;
    var s=document.createElement('style'); s.id='lsd-css';
    s.textContent=[
    ".lsd{--b:#3182f6;--b2:#1b64da;--line:#e8ebee;--mute:#8b95a1;--dim:#4e5968;--ink:#191f28;--p2:#f4f6f8;--safe:#12b76a;--warn:#f79009;--risk:#f04452;--vs:#f3eefe;--violet:#7c3aed;--gold:#b7791f;--bs:#eaf1ff}",
    ".lsd *{box-sizing:border-box}",
    ".lsd .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px;margin-bottom:11px}",
    ".lsd .h{font-size:14px;font-weight:800;margin-bottom:8px}.lsd .h .sub{font-size:11px;font-weight:600;color:var(--mute)}",
    ".lsd .d{font-size:12px;color:var(--dim);line-height:1.65}",
    ".lsd .row1{display:flex;gap:8px;flex-wrap:wrap;align-items:center}",
    ".lsd input,.lsd select,.lsd textarea{padding:8px 10px;border:1px solid var(--line);border-radius:8px;font-size:12.5px;font-family:inherit;color:var(--ink);background:#fff}",
    ".lsd textarea{width:100%;min-height:52px;resize:vertical}",
    ".lsd .btn{border:none;border-radius:9px;padding:9px 14px;font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:var(--b);color:#fff}",
    ".lsd .btn.sub{background:#fff;color:var(--dim);border:1px solid var(--line)}",
    ".lsd .btn.gold{background:#fffaf0;color:var(--gold);border:1px solid #f0d9a8}",
    ".lsd .btn:disabled{opacity:.5;cursor:default}",
    ".lsd label.f{display:block;font-size:10.5px;font-weight:700;color:var(--mute);margin:0 0 3px 2px}",
    // 수업준비 패널
    ".lsd .prep{border:1px solid #cfe0ff;background:linear-gradient(180deg,#f7faff,#fff)}",
    ".lsd .prep .h{color:var(--b2)}",
    ".lsd .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".lsd .pgrid .full{grid-column:1 / -1}",
    ".lsd .pgrid select,.lsd .pgrid input{width:100%}",
    ".lsd .cov{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 6px}",
    ".lsd .covpill{font-size:11px;font-weight:800;background:#eef4ff;color:var(--b2);border:1px solid #d5e4ff;border-radius:20px;padding:4px 11px}",
    ".lsd .covpill.warn{background:#fff6e8;color:#b45309;border-color:#f3dcae}",
    ".lsd .covpill.link{background:#eefaf2;color:#0f7a43;border-color:#bfe8cf}",
    ".lsd .qitem{border:1px solid var(--line);border-radius:12px;padding:11px 12px;margin-bottom:8px;background:#fff}",
    ".lsd .qitem .top{display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
    ".lsd .qtag{font-size:10px;font-weight:800;padding:3px 8px;border-radius:20px;background:var(--p2);color:var(--dim)}",
    ".lsd .qtag.b{background:var(--bs);color:var(--b2)}.lsd .qtag.r{background:#fdecec;color:var(--risk)}.lsd .qtag.w{background:#fff6e8;color:#b45309}",
    ".lsd .qtag.g{background:#eef2f7;color:#415168}.lsd .qtag.link{background:#eafaf1;color:#0f7a43;border:1px solid #bfe8cf}",
    ".lsd .qtag.v{background:#f3eefe;color:#6b3fc0}.lsd .qtag.hp{background:#e7f0ff;color:#1b64da}",
    ".lsd .qitem.xlv{border-color:#bfe8cf;background:#fbfffd}",
    ".lsd .qitem .ct{font-size:12px;color:var(--ink);margin-top:7px;line-height:1.55}",
    ".lsd .qitem .un{font-size:11px;color:var(--mute);margin-top:4px}",
    ".lsd .qimg{margin-top:8px}.lsd .qimg img{max-height:140px;max-width:100%;border:1px solid var(--line);border-radius:8px;cursor:zoom-in;display:block}",
    "#lsd-lb{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:18px;cursor:zoom-out}",
    "#lsd-lb img{max-width:96vw;max-height:94vh;border-radius:8px;background:#fff}",
    "#lsd-proj .pjimg{max-width:72vw;max-height:52vh;border-radius:10px;background:#fff;margin:0 auto 22px;display:none}",
    ".lsd .cpnote{font-size:10.5px;color:var(--mute);margin-top:9px;line-height:1.5}",
    // 기존 카드
    ".lsd .cc{display:inline-flex;flex-direction:column;gap:1px;border:1px solid #cfe0ff;background:#eff5ff;border-radius:10px;padding:8px 11px;margin:0 7px 7px 0}",
    ".lsd .cc b{font-size:12.5px;color:var(--b)}.lsd .cc small{font-size:10.5px;color:var(--mute)}",
    ".lsd .weak{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #eef1f4}.lsd .weak:first-child{border-top:none}",
    ".lsd .weak .nm{flex:1;font-size:12px}.lsd .b2{width:110px;height:7px;background:var(--p2);border-radius:5px;overflow:hidden}.lsd .b2 i{display:block;height:100%}",
    ".lsd .pc{width:34px;text-align:right;font-size:11.5px;font-weight:800}",
    ".lsd table{width:100%;border-collapse:collapse;font-size:12px}.lsd th{color:var(--mute);font-size:10.5px;font-weight:800;text-align:left;padding:5px 6px;border-bottom:1px solid var(--line)}.lsd td{padding:6px;border-bottom:1px solid #eef1f4}",
    ".lsd .tag{display:inline-block;background:var(--p2);border-radius:5px;padding:1px 7px;font-size:10px;color:var(--dim);margin-left:4px}",
    ".lsd .ph{border:1.5px dashed var(--line);border-radius:12px;padding:16px;text-align:center;color:var(--mute);font-size:12px}",
    ".lsd .note{font-size:11px;color:var(--mute);margin-top:8px;line-height:1.6}",
    // 투사(프레젠테이션) 오버레이
    "#lsd-proj{position:fixed;inset:0;z-index:99999;background:#0b1020;color:#fff;display:flex;flex-direction:column;font-family:inherit}",
    "#lsd-proj .pjhead{display:flex;align-items:center;justify-content:space-between;padding:18px 26px;border-bottom:1px solid rgba(255,255,255,.12)}",
    "#lsd-proj .pjhead .t{font-size:clamp(18px,2.4vw,30px);font-weight:900;letter-spacing:-.3px}",
    "#lsd-proj .pjhead .t small{display:block;font-size:13px;font-weight:600;color:#9fb3d8;margin-top:3px}",
    "#lsd-proj .pjx{background:rgba(255,255,255,.12);color:#fff;border:none;border-radius:10px;padding:9px 15px;font-size:14px;font-weight:800;cursor:pointer}",
    "#lsd-proj .pjbody{flex:1;display:flex;flex-direction:column;justify-content:center;padding:4vh 7vw;overflow:auto}",
    "#lsd-proj .pjmeta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px}",
    "#lsd-proj .pjmeta span{font-size:clamp(13px,1.5vw,20px);font-weight:800;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:30px;padding:8px 18px}",
    "#lsd-proj .pjmeta span.r{background:rgba(240,68,82,.22);border-color:rgba(240,68,82,.5)}",
    "#lsd-proj .pjmeta span.w{background:rgba(247,144,9,.22);border-color:rgba(247,144,9,.5)}",
    "#lsd-proj .pjmeta span.link{background:rgba(18,183,106,.22);border-color:rgba(18,183,106,.55);color:#9fe6c0}",
    "#lsd-proj .pjq{font-size:clamp(22px,3.4vw,46px);font-weight:800;line-height:1.5;letter-spacing:-.4px}",
    "#lsd-proj .pjq .lbl{display:block;font-size:clamp(13px,1.3vw,18px);font-weight:800;color:#7fd1ff;margin-bottom:14px}",
    "#lsd-proj .pjans{margin-top:30px;font-size:clamp(15px,1.8vw,24px);color:#9fe6c0;line-height:1.5}",
    "#lsd-proj .pjfoot{display:flex;align-items:center;justify-content:space-between;padding:16px 26px;border-top:1px solid rgba(255,255,255,.12)}",
    "#lsd-proj .pjnav{background:#1b64da;color:#fff;border:none;border-radius:10px;padding:11px 22px;font-size:15px;font-weight:800;cursor:pointer}",
    "#lsd-proj .pjnav:disabled{opacity:.35;cursor:default}",
    "#lsd-proj .pjcount{font-size:15px;font-weight:800;color:#9fb3d8}",
    "#lsd-proj .pjcp{font-size:11px;color:#6b7da0;margin-top:22px}",
    // 출력물(프린트)
    "#lsd-print{display:none}",
    "@media print{ body.lsd-printing>*:not(#lsd-print){display:none !important;} #lsd-print{display:block !important;} @page{margin:14mm;} }",
    "#lsd-print .ph-wrap{font-family:'Noto Sans CJK KR','Malgun Gothic',sans-serif;color:#111}",
    "#lsd-print h1{font-size:19px;margin:0 0 4px}#lsd-print .sub{font-size:12px;color:#555;margin-bottom:2px}",
    "#lsd-print h2{font-size:14px;color:#1A237E;border-bottom:2px solid #e8ecf3;padding-bottom:3px;margin:16px 0 7px}",
    "#lsd-print ul{margin:4px 0 8px 18px}#lsd-print p{margin:4px 0;font-size:11.5px;line-height:1.6}",
    "#lsd-print .cov2{font-size:12px;color:#1b64da;font-weight:700;margin:8px 0 14px}",
    "#lsd-print table{width:100%;border-collapse:collapse;font-size:11.5px}",
    "#lsd-print th{background:#f2f5f9;border:1px solid #d7dee6;padding:6px 7px;text-align:left;font-size:10.5px}",
    "#lsd-print td{border:1px solid #d7dee6;padding:6px 7px;vertical-align:top;line-height:1.5}",
    "#lsd-print .fn{font-size:10px;color:#777;margin-top:12px;line-height:1.5}"
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

    var S={ classes:[], classId:null, weak:[], storyHTML:'', stunit:'', cq:'', careerHTML:'',
      // 수업준비
      pArea:'', pGrade:'', pUnitText:'', cuAll:[], cuKey:'',
      selCourse:'', selLarge:'', selMid:'', selSmall:'',
      pRows:[], pMsg:'', pBusy:false, pCov:null, pAdd:false, pAddMsg:'', pBaseLevel:'' };

    try{
      var rc=await sb().from('academy_classes').select('id,name,subject,grade_band,teacher_id').eq('academy_id',acid).order('created_at');
      var list=(rc&&rc.data)||[]; if(!canManage&&uid) list=list.filter(function(c){return c.teacher_id===uid;});
      S.classes=list; if(list[0]) S.classId=list[0].id;
    }catch(e){ S.classes=[]; }

    host.innerHTML='<div class="lsd"><div id="lsd-root"></div></div>';
    var root=host.querySelector('#lsd-root');

    function clsOpts(){ return S.classes.map(function(c){ return '<option value="'+c.id+'"'+(c.id===S.classId?' selected':'')+'>'+esc(c.name)+(c.subject?' · '+esc(c.subject):'')+'</option>'; }).join(''); }
    function curClass(){ return S.classes.filter(function(c){return c.id===S.classId;})[0]||{}; }
    function gradeFromBand(b){ b=String(b||''); var m=b.match(/(초[1-6]|중[1-3]|고[1-3])/); return m?m[1]:''; }

    var AREAS=['수학','과학','국어','사회','역사','영어'];
    function areaFromSubject(s){ s=String(s||'');
      if(/역사|한국사|세계사/.test(s)) return '역사';
      if(/수학|미적|기하|대수|확률|통계/.test(s)) return '수학';
      if(/과학|물리|화학|생명|지구|통합과학/.test(s)) return '과학';
      if(/사회|지리|정치|경제|윤리|통합사회/.test(s)) return '사회';
      if(/영어/.test(s)) return '영어';
      if(/국어|문학|독서|화법|작문|언어/.test(s)) return '국어';
      return '수학';
    }
    function syncPrepDefaults(){
      var cls=curClass();
      if(!S.pArea) S.pArea=areaFromSubject(cls.subject)||'수학';
      if(!S.pGrade) S.pGrade=gradeFromBand(cls.grade_band)||'';
    }

    // ---- 표준 단원 로드(해당 학년 전체) ----
    async function loadCurriculum(){
      var key=S.pGrade||'all';
      if(S.cuKey===key){ return; }
      S.cuKey=key; S.cuAll=[];
      try{
        var q=sb().from('curriculum_units').select('id,subject,grade,course,unit_large,unit_mid,order_no,aliases')
          .eq('active',true).order('order_no',{ascending:true}).limit(2000);
        var r=await q; var rows=(r&&r.data)||[];
        if(S.pGrade) rows=rows.filter(function(x){
          if(!x.grade) return true;
          if(x.grade===S.pGrade) return true;
          if(x.grade==='고등' && S.pGrade.charAt(0)==='고') return true;
          if(x.grade==='중등' && S.pGrade.charAt(0)==='중') return true;
          return false;
        });
        S.cuAll=rows;
      }catch(e){ S.cuAll=[]; }
    }
    // ---- 계층 파생(과목 › 대단원 › 중단원 › 소단원) ----
    function rowsArea(){ return S.cuAll.filter(function(r){ return (r.subject||'')===S.pArea; }); }
    function uniqOrdered(rows, key){ var seen={}, out=[]; rows.forEach(function(r){ var v=r[key]; if(v && !seen[v]){ seen[v]=1; out.push(v); } }); return out; }
    function listCourses(){ return uniqOrdered(rowsArea(),'course'); }
    function listLarges(){ return uniqOrdered(rowsArea().filter(function(r){return r.course===S.selCourse;}),'unit_large'); }
    function listMids(){ return uniqOrdered(rowsArea().filter(function(r){return r.course===S.selCourse && r.unit_large===S.selLarge && r.unit_mid;}),'unit_mid'); }
    function listSmalls(){
      var rows=rowsArea().filter(function(r){ return r.course===S.selCourse && r.unit_large===S.selLarge && (!S.selMid || (r.unit_mid||'')===S.selMid); });
      var out=[]; rows.forEach(function(r){ (r.aliases||[]).forEach(function(a){ if(a && out.indexOf(a)<0) out.push(a); }); });
      return out;
    }
    function selRows(){
      return rowsArea().filter(function(r){
        if(S.selCourse && r.course!==S.selCourse) return false;
        if(S.selLarge && r.unit_large!==S.selLarge) return false;
        if(S.selMid && (r.unit_mid||'')!==S.selMid) return false;
        return true;
      });
    }
    function buildSelection(){
      var free=(S.pUnitText||'').trim();
      var label = S.selSmall || S.selMid || S.selLarge || S.selCourse || free;
      var terms=[];
      if(S.selSmall){ terms=[S.selSmall]; }
      else if(free && !S.selCourse){ terms=[free]; }
      else {
        var rows=selRows(), set=[];
        rows.forEach(function(r){
          [r.unit_mid,r.unit_large].forEach(function(t){ if(t&&set.indexOf(t)<0) set.push(t); });
          (r.aliases||[]).forEach(function(t){ if(t&&set.indexOf(t)<0) set.push(t); });
        });
        terms=set;
      }
      if(free && terms.indexOf(free)<0) terms.unshift(free);
      var keep=terms.filter(function(t){ return String(t).length>=2 && GENERIC.indexOf(t)<0; });
      if(!keep.length && terms.length) keep=[terms[0]];
      return { label:label||'', terms:keep };
    }

    // ---- 자동검색 ----
    async function searchPrep(){
      syncPrepDefaults();
      var sel=buildSelection();
      var terms=sel.terms, label=sel.label;
      S.pBaseLevel = levelOfGrade(S.pGrade); // '중' 기준 검색이면 고1 연계도 함께
      if(!terms.length){ S.pMsg='과목·단원을 선택하거나 직접 입력하세요.'; render(); return; }
      S.pBusy=true; S.pMsg=''; S.pRows=[]; S.pCov=null; render();
      try{
        // 과목명 하드필터 제거: 수능 미적분·기하·확통처럼 과목명이 달라도 개념(단원 term)으로 매칭.
        // 과목 일치는 랭킹 가점으로만 사용.
        var q=sb().from('ref_exam_bank')
          .select('id,source_type,school,region,year,round,grade,semester,subject,unit_large,unit_mid,unit_small,qtype,difficulty,content,answer,image_url')
          .order('year',{ascending:false}).limit(700);
        var r=await q; var rows=(r&&r.data)||[];
        var psub=String(S.pArea||'');
        var scored=[];
        rows.forEach(function(x){
          var hay=[x.unit_large,x.unit_mid,x.unit_small,x.content,x.qtype].map(function(v){return String(v||'');});
          var hit=0, unitHit=0;
          terms.forEach(function(t){
            var inUnit = (hay[0].indexOf(t)>=0)||(hay[1].indexOf(t)>=0)||(hay[2].indexOf(t)>=0)
                         || (t.indexOf(hay[0])>=0&&hay[0])||(t.indexOf(hay[1])>=0&&hay[1]);
            var inAny = inUnit || hay[3].indexOf(t)>=0 || hay[4].indexOf(t)>=0;
            if(inUnit) unitHit++; if(inAny) hit++;
          });
          if(!hit) return;
          var gradeMatch = (!S.pGrade || !x.grade || x.grade===S.pGrade)?0:-1;
          var subjAff = (psub && String(x.subject||'').indexOf(psub)>=0)?1:0; // 과목 일치 가점
          var score = unitHit*10 + hit*2 + (DIFF_RANK[x.difficulty]||0) + (x.year?Math.min(x.year-2000,30)*0.05:0) + gradeMatch*0.5 + subjAff*1.5;
          scored.push({row:x, score:score, unitHit:unitHit});
        });
        scored.sort(function(a,b){ return b.score-a.score; });
        S.pRows=scored.map(function(s){return s.row;});
        // 커버리지
        var schools={}, years={}, xlv=0, src={'내신':0,'학평':0,'수능':0};
        S.pRows.forEach(function(x){ if(x.school) schools[x.school]=1; if(x.year) years[x.year]=1;
          src[srcCat(x)]++;
          if(S.pBaseLevel==='중' && rowLevel(x)==='고') xlv++; });
        S.pCov={ n:S.pRows.length, schools:Object.keys(schools).length, years:Object.keys(years).sort(), label:label, xlv:xlv, base:S.pBaseLevel, src:src };
        // 문제 이미지 서명 URL(비공개 버킷) 생성
        S.pImg={};
        try{ var paths=[]; S.pRows.forEach(function(x){ if(x.image_url) paths.push(x.image_url); });
          if(paths.length){ var uniq=[]; paths.forEach(function(p){ if(uniq.indexOf(p)<0) uniq.push(p); });
            var su=await sb().storage.from('refbank').createSignedUrls(uniq, 3600);
            (((su&&su.data)||[])).forEach(function(o){ if(o&&o.path&&o.signedUrl) S.pImg[o.path]=o.signedUrl; }); } }catch(e){}
        S.pMsg = S.pRows.length ? '' : '해당 단원으로 매칭된 기출이 아직 없습니다. 기출은행에 자료가 쌓이면 자동으로 검색됩니다.';
      }catch(e){ S.pMsg='검색 실패: '+((e&&e.message)||e); }
      S.pBusy=false; render();
    }

    // ---- 문제 이미지 확대(라이트박스) ----
    function openLightbox(url){ if(!url) return; var old=document.getElementById('lsd-lb'); if(old) old.remove(); var d=document.createElement('div'); d.id='lsd-lb'; d.innerHTML='<img src="'+esc(url)+'">'; d.onclick=function(){ d.remove(); }; document.body.appendChild(d); }

    // ---- 투사(학생 제시) ----
    function openProjection(){
      var rows=S.pRows; if(!rows||!rows.length) return;
      var label=(S.pCov&&S.pCov.label)||'이 단원';
      var idx=0;
      var old=document.getElementById('lsd-proj'); if(old) old.remove();
      var ov=document.createElement('div'); ov.id='lsd-proj';
      function meta(x){
        var dcl=(x.difficulty==='최상'?'r':(x.difficulty==='상'?'w':''));
        var arr=[];
        if(x.school) arr.push('<span>'+esc(x.school)+'</span>');
        if(x.year) arr.push('<span>'+esc(x.year)+(x.round?(' '+esc(x.round)):'')+'</span>');
        else if(x.source_type) arr.push('<span>'+esc(x.source_type)+'</span>');
        if(x.grade) arr.push('<span>'+esc(x.grade)+'</span>');
        if(S.pBaseLevel==='중' && rowLevel(x)==='고') arr.push('<span class="link">🔗 고1 연계</span>');
        if(x.difficulty) arr.push('<span class="'+dcl+'">난이도 '+esc(x.difficulty)+'</span>');
        if(x.qtype) arr.push('<span>'+esc(x.qtype)+'</span>');
        return arr.join('');
      }
      function slide(){
        var x=rows[idx];
        var unit=[x.unit_large,x.unit_mid,x.unit_small].filter(Boolean).join(' › ');
        ov.querySelector('.pjmeta').innerHTML=meta(x);
        var pim=ov.querySelector('.pjimg'); var iu=(x.image_url&&S.pImg&&S.pImg[x.image_url])?S.pImg[x.image_url]:''; if(pim){ if(iu){ pim.src=iu; pim.style.display='block'; } else { pim.removeAttribute('src'); pim.style.display='none'; } }
        ov.querySelector('.pjq').innerHTML='<span class="lbl">📌 지금 이 내용, 학교에서는 이렇게 출제돼요'+(unit?(' · '+esc(unit)):'')+'</span>'+esc(x.content||'(요지 미등록)');
        var ans=ov.querySelector('.pjans'); ans.innerHTML = x.answer?('💡 접근: '+esc(x.answer)):''; ans.style.display=x.answer?'block':'none';
        ov.querySelector('.pjcount').textContent=(idx+1)+' / '+rows.length;
        ov.querySelector('.pjprev').disabled=(idx<=0);
        ov.querySelector('.pjnext').disabled=(idx>=rows.length-1);
      }
      ov.innerHTML=''
        +'<div class="pjhead"><div class="t">'+esc(label)+' <small>주변 학교 실제 출제 사례 · 아르케 기출은행</small></div><button class="pjx">✕ 닫기 (Esc)</button></div>'
        +'<div class="pjbody"><div class="pjmeta"></div><img class="pjimg" alt="문제"><div class="pjq"></div><div class="pjans"></div>'
          +'<div class="pjcp">※ 저작권 보호를 위해 문항 원문이 아닌 출제 요지·메타정보를 제시합니다. 원문은 보유 자료를 활용하세요.</div></div>'
        +'<div class="pjfoot"><button class="pjnav pjprev">◀ 이전</button><div class="pjcount"></div><button class="pjnav pjnext">다음 ▶</button></div>';
      document.body.appendChild(ov);
      function close(){ document.removeEventListener('keydown',key); ov.remove(); }
      function key(e){ if(e.key==='Escape')close(); else if(e.key==='ArrowRight'||e.key===' '){ if(idx<rows.length-1){idx++;slide();} } else if(e.key==='ArrowLeft'){ if(idx>0){idx--;slide();} } }
      ov.querySelector('.pjx').onclick=close;
      ov.querySelector('.pjprev').onclick=function(){ if(idx>0){idx--;slide();} };
      ov.querySelector('.pjnext').onclick=function(){ if(idx<rows.length-1){idx++;slide();} };
      document.addEventListener('keydown',key);
      slide();
    }

    // ---- 수업 전 출력물(프린트 핸드아웃) ----
    function buildHandout(){
      var rows=S.pRows; if(!rows||!rows.length) return;
      var cov=S.pCov||{}; var label=cov.label||'이 단원';
      var cls=curClass();
      var head='수학';
      var now=new Date(); var ymd=now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0');
      var trs=rows.map(function(x){
        var xl=(cov.base==='중' && rowLevel(x)==='고');
        var where=[x.school||x.source_type||'-', (x.year?x.year:''), (x.round||''), (x.grade||'')].filter(Boolean).join(' ')
          +(xl?' <b style="color:#0f7a43">[고1 연계]</b>':'');
        var unit=[x.unit_large,x.unit_mid].filter(Boolean).join(' › ');
        return '<tr'+(xl?' style="background:#fbfffd"':'')+'><td style="white-space:nowrap">'+where+'</td>'
          +'<td style="white-space:nowrap">'+esc(x.difficulty||'')+'</td>'
          +'<td style="white-space:nowrap">'+esc(x.qtype||'')+'</td>'
          +'<td>'+esc(x.content||'')+(x.answer?('<br><span style="color:#1b64da">💡 '+esc(x.answer)+'</span>'):'')+(unit?('<br><span style="color:#888;font-size:10px">'+esc(unit)+'</span>'):'')
            +((x.image_url&&S.pImg&&S.pImg[x.image_url])?('<br><img src="'+esc(S.pImg[x.image_url])+'" style="max-width:280px;max-height:220px;margin-top:5px;border:1px solid #ddd">'):'')+'</td></tr>';
      }).join('');
      var covline='주변 학교 '+(cov.schools||0)+'곳 · '+((cov.years&&cov.years.length)?(cov.years[cov.years.length-1]+'~'+cov.years[0]):'연도 다양')+' · 총 '+rows.length+'문항'+((cov.xlv)?(' · 🔗 고1 연계 '+cov.xlv+'문항 포함'):'');
      var html='<div class="ph-wrap">'
        +'<h1>📌 '+esc(label)+' — 학교 기출 출제 경향</h1>'
        +'<div class="sub">'+esc(S.pArea||'')+(S.pGrade?(' · '+esc(S.pGrade)):'')+(cls&&cls.name?(' · '+esc(cls.name)):'')+' · 수업 준비 자료 · '+ymd+'</div>'
        +'<div class="cov2">이 단원은 주변 학교에서 이렇게 출제됩니다 — '+esc(covline)+'</div>'
        +'<table><thead><tr><th style="width:24%">출처(학교·연도)</th><th style="width:9%">난이도</th><th style="width:18%">유형</th><th>출제 요지</th></tr></thead><tbody>'+trs+'</tbody></table>'
        +'<div class="fn">※ 본 자료는 저작권 보호를 위해 문항 원문이 아닌 출제 요지·메타정보를 정리한 것입니다. 수업 중 원문 제시는 보유한 정식 자료를 활용하세요. · 아르케 기출은행 자동생성</div>'
        +'</div>';
      var box=document.getElementById('lsd-print'); if(!box){ box=document.createElement('div'); box.id='lsd-print'; document.body.appendChild(box); }
      box.innerHTML=html;
      document.body.classList.add('lsd-printing');
      var done=function(){ document.body.classList.remove('lsd-printing'); window.removeEventListener('afterprint',done); };
      window.addEventListener('afterprint',done);
      setTimeout(function(){ try{ window.print(); }catch(e){ done(); } }, 60);
    }

    // ===== 수업 설계안 문서 다운로드 =====
    function ymdStr(){ var n=new Date(); return n.getFullYear()+'.'+String(n.getMonth()+1).padStart(2,'0')+'.'+String(n.getDate()).padStart(2,'0'); }
    function designHas(){ return !!(S.storyData || (S.careerItems&&S.careerItems.length) || (S.weak&&S.weak.length) || (S.pRows&&S.pRows.length)); }
    function designSections(){
      var out='';
      var d=S.storyData;
      if(d){
        out+='<h2>📚 수업안'+(S.storyUnit?(' — '+esc(S.storyUnit)):'')+'</h2>';
        if(d.story) out+='<p style="background:#f3eefe;padding:9px 11px;border-radius:6px"><b>🎬 스토리텔링</b> &nbsp;'+esc(d.story)+'</p>';
        out+='<p><b>① 도입(Hook)</b><br>'+esc(d.hook||'')+'</p>';
        out+='<p><b>② 타과목 연계</b></p><ul>'+(d.cross||[]).map(function(c){return '<li><b>'+esc(c.subject||'')+'</b> — '+esc(c.link||'')+'</li>';}).join('')+'</ul>';
        out+='<p><b>③ 핵심 발문</b></p><ul>'+(d.questions||[]).map(function(q){return '<li>'+esc(q)+'</li>';}).join('')+'</ul>';
        out+='<p><b>④ 진로 연결</b><br>'+esc(d.career||'')+'</p>';
        out+='<p><b>⑤ 형성평가</b><br>'+esc(d.formative||'')+'</p>';
        out+='<p style="font-size:11px;color:#888">✨ AI 생성('+esc(S.storyModel||'gemini')+') · 교사 검토 후 사용</p>';
      }
      if(S.careerItems&&S.careerItems.length){
        out+='<h2>🧭 수업 연계 진로·학과'+(S.careerQ?(' — '+esc(S.careerQ)):'')+'</h2>';
        out+='<p>'+S.careerItems.map(function(x){return '<b>'+esc(x.major||'')+'</b>('+esc(x.series||'')+')';}).join(' · ')+'</p>'
          +(S.careerFb?('<p style="font-size:11px;color:#888">※ 단원 직접 매칭이 없어 '+esc(S.pArea||'')+' 계열로 보완</p>'):'');
      }
      if(S.weak&&S.weak.length){
        out+='<h2>🎯 취약 단원 (최근 시험)</h2><table><thead><tr><th>단원</th><th>유형</th><th>정답률</th></tr></thead><tbody>'
          +S.weak.map(function(w){return '<tr><td>'+esc(w.name)+'</td><td>'+esc(w.qt||'')+'</td><td>'+w.pct+'%</td></tr>';}).join('')+'</tbody></table>';
      }
      if(S.pRows&&S.pRows.length){
        var cov=S.pCov||{};
        out+='<h2>🧪 이 단원 학교 기출 출제 경향'+(cov.label?(' — '+esc(cov.label)):'')+'</h2>';
        out+='<p style="color:#1b64da;font-size:12px">주변학교 '+(cov.schools||0)+'곳 · 총 '+S.pRows.length+'문항'
          +((cov.src&&cov.src['학평'])?(' · 학평 '+cov.src['학평']):'')+((cov.src&&cov.src['수능'])?(' · 수능 '+cov.src['수능']):'')+'</p>';
        out+='<table><thead><tr><th>출처</th><th>난이도</th><th>유형</th><th>출제 요지</th></tr></thead><tbody>'
          +S.pRows.slice(0,40).map(function(x){
            var where=[x.school||x.source_type||'-',(x.year||''),(x.round||''),(x.grade||'')].filter(Boolean).join(' ');
            return '<tr><td>'+esc(where)+'</td><td>'+esc(x.difficulty||'')+'</td><td>'+esc(x.qtype||'')+'</td><td>'+esc(x.content||'')+'</td></tr>';
          }).join('')+'</tbody></table>'
          +'<p style="font-size:11px;color:#888">※ 저작권 보호를 위해 문항 원문이 아닌 출제 요지·메타정보입니다.</p>';
      }
      return out;
    }
    function downloadDesignDoc(){
      if(!designHas()){ alert('저장할 설계 내용이 없습니다. AI 수업안 생성·진로 검색·기출 검색 중 하나 이상을 먼저 진행하세요.'); return; }
      var cls=curClass();
      var head=[S.pArea, S.pGrade, curSelLabel()].filter(Boolean).join(' · ');
      var css='body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;color:#222;font-size:11pt;line-height:1.6;margin:24px}'
        +'h1{font-size:19pt;color:#1A237E;margin:0 0 4px}h2{font-size:13pt;color:#1A237E;border-bottom:2px solid #e8ecf3;padding-bottom:3px;margin:18px 0 7px}'
        +'.meta{font-size:10.5pt;color:#555;margin-bottom:6px}table{width:100%;border-collapse:collapse;font-size:10pt;margin:6px 0}'
        +'th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f2f5fa}ul{margin:4px 0 8px 18px}p{margin:4px 0}';
      var html='<!doctype html><html><head><meta charset="utf-8"><title>수업 설계안</title><style>'+css+'</style></head><body>'
        +'<h1>수업 설계안</h1>'
        +'<div class="meta">'+(cls&&cls.name?esc(cls.name)+' · ':'')+esc(head)+' · 작성일 '+ymdStr()+'</div>'
        +designSections()
        +'<p style="margin-top:22px;font-size:10pt;color:#888;text-align:center">ARCHE 학원앱 · 수업 설계 자동 생성</p>'
        +'</body></html>';
      try{
        var blob=new Blob(['﻿'+html], {type:'application/msword'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a'); a.href=url; a.download='수업설계안_'+ymdStr().replace(/\./g,'')+'.doc';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
      }catch(e){ alert('다운로드 실패: '+((e&&e.message)||e)); }
    }
    function printDesignDoc(){
      if(!designHas()){ alert('인쇄할 설계 내용이 없습니다. AI 수업안 생성·진로 검색·기출 검색 중 하나 이상을 먼저 진행하세요.'); return; }
      var cls=curClass();
      var head=[S.pArea, S.pGrade, curSelLabel()].filter(Boolean).join(' · ');
      var html='<div class="ph-wrap"><h1>📘 수업 설계안</h1>'
        +'<div class="sub">'+(cls&&cls.name?esc(cls.name)+' · ':'')+esc(head)+' · 작성일 '+ymdStr()+'</div>'
        +'<div style="height:6px"></div>'+designSections()
        +'<div class="fn">ARCHE 학원앱 · 수업 설계 자동 생성</div></div>';
      var box=document.getElementById('lsd-print'); if(!box){ box=document.createElement('div'); box.id='lsd-print'; document.body.appendChild(box); }
      box.innerHTML=html;
      document.body.classList.add('lsd-printing');
      var done=function(){ document.body.classList.remove('lsd-printing'); window.removeEventListener('afterprint',done); };
      window.addEventListener('afterprint',done);
      setTimeout(function(){ try{ window.print(); }catch(e){ done(); } }, 60);
    }
    function refreshDesign(){ var el=root.querySelector('#lsd-design'); if(el){ el.outerHTML=designCard(); var dd=root.querySelector('#lsd-dldoc'); if(dd) dd.onclick=downloadDesignDoc; var pd=root.querySelector('#lsd-prdoc'); if(pd) pd.onclick=printDesignDoc; } }
    function designCard(){
      var has=designHas();
      var chk=function(ok,label){ return '<span style="font-size:11.5px;color:'+(ok?'#0f7a43':'#b0b8c4')+';margin-right:12px">'+(ok?'✅':'⬜')+' '+label+'</span>'; };
      return '<div class="card" id="lsd-design" style="border:1px solid #cfe0ff;background:linear-gradient(180deg,#f7faff,#fff)">'
        +'<div class="h" style="color:#1b64da">✅ 수업 설계안 완료 · 저장 <span class="sub">· 설계한 내용을 문서로</span></div>'
        +'<div style="margin:6px 0 10px">'+chk(!!S.storyData,'AI 수업안')+chk(!!(S.careerItems&&S.careerItems.length),'진로·학과')+chk(!!(S.weak&&S.weak.length),'취약 단원')+chk(!!(S.pRows&&S.pRows.length),'기출 경향')+'</div>'
        +'<div class="row1"><button class="btn" id="lsd-dldoc"'+(has?'':' disabled')+'>📄 문서 다운로드 (.doc)</button>'
        +'<button class="btn gold" id="lsd-prdoc"'+(has?'':' disabled')+'>🖨️ 인쇄 / PDF 저장</button></div>'
        +'<div class="note">위에서 생성·검색한 내용(수업안·진로·취약·기출)이 한 문서로 모입니다. <b>[문서 다운로드]</b>는 한글·워드 편집용, <b>[인쇄]</b>는 바로 출력/PDF 저장용이에요.'
        +(has?'':' <b style="color:#b45309">· 아직 저장할 내용이 없습니다. 위에서 수업안·진로·기출 중 하나를 먼저 진행하세요.</b>')+'</div></div>';
    }

    function render(){
      syncPrepDefaults();
      root.innerHTML=''
        +'<div class="row1" style="margin-bottom:12px"><select id="lsd-cls">'+(S.classes.length?clsOpts():'<option>담당 반 없음</option>')+'</select></div>'
        +prepCard()+careerCard()+weakCard()+storyCard()+designCard();
      bind();
    }

    // ===== 수업준비: 이 단원 기출 자동검색 (A) =====
    function prepCard(){
      var gradeSel=['','초6','중1','중2','중3','고1','고2','고3'].map(function(g){return '<option value="'+g+'"'+(g===S.pGrade?' selected':'')+'>'+(g||'학년')+'</option>';}).join('');
      var areaSel=AREAS.map(function(a){return '<option value="'+a+'"'+(a===S.pArea?' selected':'')+'>'+a+'</option>';}).join('');
      var courses=listCourses();
      var larges=S.selCourse?listLarges():[];
      var mids=(S.selCourse&&S.selLarge)?listMids():[];
      var smalls=(S.selCourse&&S.selLarge)?listSmalls():[];
      function optList(arr,selv){ return '<option value="">— 선택 —</option>'+arr.map(function(v){return '<option value="'+esc(v)+'"'+(v===selv?' selected':'')+'>'+esc(v)+'</option>';}).join(''); }
      var crumb=[S.selCourse,S.selLarge,S.selMid,S.selSmall].filter(Boolean).join(' › ');
      var body='';
      if(S.pBusy){ body='<div class="ph">🔎 기출은행에서 이 단원 출제 사례를 검색 중…</div>'; }
      else if(S.pCov){
        var cov=S.pCov; var covHTML='<div class="cov">'
          +'<span class="covpill">📄 '+cov.n+'문항</span>'
          +'<span class="covpill'+(cov.schools?'':' warn')+'">🏫 학교 '+cov.schools+'곳</span>'
          +'<span class="covpill'+(cov.years.length?'':' warn')+'">🗓️ '+(cov.years.length?(cov.years[cov.years.length-1]+'~'+cov.years[0]):'연도 미상')+'</span>'
          +((cov.src&&cov.src['내신'])?('<span class="covpill">🏫 내신 '+cov.src['내신']+'</span>'):'')
          +((cov.src&&cov.src['학평'])?('<span class="covpill">📝 학평 '+cov.src['학평']+'</span>'):'')
          +((cov.src&&cov.src['수능'])?('<span class="covpill" style="background:#f3eefe;color:#6b3fc0;border-color:#ddd0f5">🎯 수능 '+cov.src['수능']+'</span>'):'')
          +((cov.xlv)?('<span class="covpill link">🔗 고1 연계 '+cov.xlv+'문항</span>'):'')
          +'</div>';
        var list=S.pRows.slice(0,30).map(function(x){
          var dcl=(x.difficulty==='최상'?'r':(x.difficulty==='상'?'w':''));
          var unit=[x.unit_large,x.unit_mid,x.unit_small].filter(Boolean).join(' › ');
          var xl=(cov.base==='중' && rowLevel(x)==='고');
          var sc=srcCat(x); var scCls=(sc==='수능'?'v':(sc==='학평'?'hp':'b'));
          return '<div class="qitem'+(xl?' xlv':'')+'"><div class="top">'
            +'<span class="qtag '+scCls+'">'+sc+'</span>'
            +(x.school?'<span class="qtag">'+esc(x.school)+'</span>':'')
            +(x.year?'<span class="qtag">'+esc(x.year)+(x.round?(' '+esc(x.round)):'')+'</span>':'')
            +(x.grade?'<span class="qtag g">'+esc(x.grade)+'</span>':'')
            +(xl?'<span class="qtag link">🔗 고1 연계</span>':'')
            +(x.difficulty?'<span class="qtag '+dcl+'">난이도 '+esc(x.difficulty)+'</span>':'')
            +(x.qtype?'<span class="qtag">'+esc(x.qtype)+'</span>':'')+'</div>'
            +(x.content?'<div class="ct">'+esc(x.content)+'</div>':'<div class="ct" style="color:var(--mute)">(출제 요지 미등록)</div>')
            +(unit?'<div class="un">'+esc(unit)+'</div>':'')
            +((x.image_url&&S.pImg&&S.pImg[x.image_url])?('<div class="qimg"><img src="'+esc(S.pImg[x.image_url])+'" data-full="'+esc(S.pImg[x.image_url])+'"></div>'):'')
            +'</div>';
        }).join('');
        var actions = S.pRows.length ? ('<div class="row1" style="margin:4px 0 10px"><button class="btn" id="lsd-proj-btn">🖥️ 수업용 보기 (학생 투사)</button><button class="btn gold" id="lsd-print-btn">🖨️ 수업 전 출력물</button></div>') : '';
        body=covHTML
          +((cov.base==='고')?('<div class="note" style="color:#334">🎓 고등은 <b>주변학교 내신 · 전국연합 학력평가 · 수능</b>을 함께 검색합니다.</div>'):'')
          +((cov.xlv)?('<div class="note" style="color:#0f7a43">🔗 중등 단원이라, 같은 개념의 <b>고1 기출(주변학교·학력평가 포함)</b> '+cov.xlv+'문항도 함께 찾았습니다. 아래 <b>🔗 고1 연계</b> 표시를 참고하세요.</div>'):'')
          +actions+(S.pMsg?('<div class="d" style="color:var(--warn);margin-bottom:8px">'+esc(S.pMsg)+'</div>'):'')+list
          +(S.pRows.length>30?'<div class="note">상위 30문항 표시 · 출력물/투사는 전체 '+S.pRows.length+'문항 포함</div>':'')
          +'<div class="cpnote">※ 저작권 보호를 위해 문항 원문이 아닌 <b>출제 요지·메타정보</b>를 제시합니다. 수업 중 원문 제시는 보유 정식 자료를 활용하세요.</div>';
      } else {
        body='<div class="ph">과목군·학년을 고른 뒤 <b>과목 → 대단원 → 중단원 → 소단원</b> 순으로 좁혀 [🔎 검색]하면, 주변 학교의 실제 출제 사례를 모아줍니다.</div>'
          +(S.pMsg?('<div class="d" style="color:var(--warn);margin-top:8px">'+esc(S.pMsg)+'</div>'):'');
      }
      var addBox = S.pAdd ? (''
        +'<div style="margin-top:12px;border-top:1px dashed var(--line);padding-top:12px">'
        +'<div class="h" style="font-size:12.5px">➕ 기출 빠른 등록 <span class="sub">· 기출은행에 바로 저장</span></div>'
        +'<div class="row1"><select id="lsd-rsrc">'+[['기출','학교 기출'],['모의고사','모의고사'],['학평','학력평가'],['수능','수능']].map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>';}).join('')+'</select>'
        +'<input id="lsd-rschool" placeholder="학교/출처" style="width:120px"><input id="lsd-ryear" type="number" placeholder="연도" style="width:80px"></div>'
        +'<div class="row1" style="margin-top:6px"><input id="lsd-rul" placeholder="대단원" style="width:130px"><input id="lsd-rum" placeholder="중단원" style="width:130px"><input id="lsd-rqt" placeholder="유형" style="width:100px"><select id="lsd-rdiff"><option value="">난이도</option>'+['하','중','상','최상'].map(function(d){return '<option>'+d+'</option>';}).join('')+'</select></div>'
        +'<textarea id="lsd-rcontent" style="margin-top:6px" placeholder="출제 요지 (원문 전체 복사 금지 · 무엇을 묻는지 1~2문장)"></textarea>'
        +'<div style="margin-top:8px"><button class="btn sub" id="lsd-radd">기출은행에 저장</button> <span id="lsd-rmsg" style="font-size:12px;margin-left:6px">'+esc(S.pAddMsg||'')+'</span></div></div>'
        ) : '';
      return '<div class="card prep"><div class="h">🎯 이 단원, 학교에선 이렇게 출제돼요 <span class="sub">· 수업준비 · 기출은행 자동검색</span></div>'
        +'<div class="d">현재 강의 중인 단원을 고르면, 주변 중·고교에서 실제 출제된 문항을 자동으로 찾아 수업 중 학생에게 투사하거나 출력물로 준비할 수 있습니다.</div>'
        +'<div class="pgrid" style="margin-top:10px">'
        +'<div><label class="f">과목군</label><select id="lsd-parea">'+areaSel+'</select></div>'
        +'<div><label class="f">학년</label><select id="lsd-pgrade">'+gradeSel+'</select></div>'
        +'<div class="full"><label class="f">① 과목</label><select id="lsd-selcourse">'+optList(courses,S.selCourse)+'</select></div>'
        +(S.selCourse?('<div class="full"><label class="f">② 대단원</label><select id="lsd-sellarge">'+optList(larges,S.selLarge)+'</select></div>'):'')
        +((S.selLarge&&mids.length)?('<div class="full"><label class="f">③ 중단원</label><select id="lsd-selmid">'+optList(mids,S.selMid)+'</select></div>'):'')
        +((S.selLarge&&smalls.length)?('<div class="full"><label class="f">'+(mids.length?'④ 소단원':'③ 세부 단원')+' <span style="font-weight:600;color:var(--mute)">· 선택 시 더 정밀</span></label><select id="lsd-selsmall">'+optList(smalls,S.selSmall)+'</select></div>'):'')
        +'<div class="full"><label class="f">또는 직접 입력</label><input id="lsd-putext" value="'+esc(S.pUnitText)+'" placeholder="예: 이차함수의 그래프"></div>'
        +'</div>'
        +(crumb?('<div style="margin-top:8px;font-size:11.5px;color:var(--b2);font-weight:700">📍 '+esc(crumb)+'</div>'):'')
        +'<div class="row1" style="margin-top:10px"><button class="btn" id="lsd-psearch">🔎 이 단원 기출 검색</button>'
        +'<button class="btn sub" id="lsd-padd-toggle">'+(S.pAdd?'빠른 등록 닫기':'➕ 기출 빠른 등록')+'</button></div>'
        +'<div style="margin-top:12px">'+body+'</div>'
        +addBox
        +'</div>';
    }

    // 1) 수업 연계 진로·학과 (커리어넷)
    function curSelLabel(){ return S.selSmall||S.selMid||S.selLarge||S.selCourse||''; }
    function careerCard(){
      var cls=curClass();
      var selLbl=curSelLabel();
      return '<div class="card"><div class="h">🧭 수업 연계 진로·학과 <span class="sub">· 커리어넷</span></div>'
        +'<div class="d">수업 주제·단원과 연결되는 학과·계열을 찾아 수업 동기부여에 활용합니다. <b>위에서 고른 중단원</b>으로 바로 검색할 수 있어요.</div>'
        +(selLbl?('<div style="margin:8px 0 2px"><button class="btn sub" id="lsd-cuse" style="font-size:11.5px">📍 선택 단원 «'+esc(selLbl)+'»으로 찾기</button></div>'):'')
        +'<div class="row1" style="margin-top:7px"><input id="lsd-cq" placeholder="키워드 (예: 이차함수, 통계, 유전)" value="'+esc(S.cq||selLbl||cls.subject||'')+'" style="flex:1;min-width:160px">'
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

    // 3) 수업 스토리텔링
    function storyCard(){
      var selLbl=curSelLabel();
      var val=S.stunit||selLbl||'';
      return '<div class="card"><div class="h">✍️ 수업 스토리텔링 · 단원 연계 <span class="sub">· 설계 가이드</span></div>'
        +'<div class="d">위에서 고른 <b>과목·단원</b>이 자동으로 반영됩니다. 필요하면 아래에서 직접 수정하세요.</div>'
        +(selLbl?('<div style="margin:8px 0 2px"><button class="btn sub" id="lsd-stuse" style="font-size:11.5px">📍 선택 단원 «'+esc(selLbl)+'»으로 설계</button></div>'):'')
        +'<div class="row1" style="margin-top:7px"><input id="lsd-stunit" placeholder="단원/주제 (예: 이차함수의 그래프)" value="'+esc(val)+'" style="flex:1;min-width:180px"><button class="btn" id="lsd-stai">✨ AI 생성</button><button class="btn sub" id="lsd-stgo">가이드(템플릿)</button></div>'
        +'<div id="lsd-stres" style="margin-top:10px">'+(S.storyHTML||'')+'</div>'
        +'<div class="note">※ [✨ AI 생성]은 선택한 <b>과목('+esc(S.selCourse||S.pArea||'')+')·학년('+esc(S.pGrade||'')+')·단원</b>(+취약점)을 반영해 도입·타과목 연계·핵심 발문·진로 연결·형성평가·스토리텔링을 생성합니다. 교사 검토·수정 후 사용하세요.</div></div>';
    }

    function bind(){
      function resetSel(){ S.selCourse=''; S.selLarge=''; S.selMid=''; S.selSmall=''; }
      var cl=root.querySelector('#lsd-cls'); if(cl) cl.onchange=function(){ S.classId=this.value; S.weak=[]; S.pArea=''; S.pGrade=''; resetSel(); S.cuKey=''; S.pRows=[]; S.pCov=null; syncPrepDefaults(); loadCurriculum().then(render); };
      // 수업준비 — 계단식 선택
      var pa=root.querySelector('#lsd-parea'); if(pa) pa.onchange=function(){ S.pArea=this.value; resetSel(); render(); };
      var pg=root.querySelector('#lsd-pgrade'); if(pg) pg.onchange=function(){ S.pGrade=this.value; resetSel(); S.cuKey=''; loadCurriculum().then(render); };
      var sc=root.querySelector('#lsd-selcourse'); if(sc) sc.onchange=function(){ S.selCourse=this.value; S.selLarge=''; S.selMid=''; S.selSmall=''; render(); };
      var sl=root.querySelector('#lsd-sellarge'); if(sl) sl.onchange=function(){ S.selLarge=this.value; S.selMid=''; S.selSmall=''; render(); };
      var sm=root.querySelector('#lsd-selmid'); if(sm) sm.onchange=function(){ S.selMid=this.value; S.selSmall=''; render(); };
      var ss=root.querySelector('#lsd-selsmall'); if(ss) ss.onchange=function(){ S.selSmall=this.value; render(); };
      var put=root.querySelector('#lsd-putext'); if(put) put.oninput=function(){ S.pUnitText=this.value; };
      var pse=root.querySelector('#lsd-psearch'); if(pse) pse.onclick=searchPrep;
      var pat=root.querySelector('#lsd-padd-toggle'); if(pat) pat.onclick=function(){ S.pAdd=!S.pAdd; S.pAddMsg=''; render(); };
      var pj=root.querySelector('#lsd-proj-btn'); if(pj) pj.onclick=openProjection;
      var pr=root.querySelector('#lsd-print-btn'); if(pr) pr.onclick=buildHandout;
      var dd=root.querySelector('#lsd-dldoc'); if(dd) dd.onclick=downloadDesignDoc;
      var pd=root.querySelector('#lsd-prdoc'); if(pd) pd.onclick=printDesignDoc;
      root.querySelectorAll('.qimg img').forEach(function(im){ im.onclick=function(){ openLightbox(this.getAttribute('data-full')); }; });
      var ra=root.querySelector('#lsd-radd'); if(ra) ra.onclick=quickAddBank;
      // 기존
      var cg=root.querySelector('#lsd-cgo'); if(cg) cg.onclick=function(){ careerSearch(); };
      var cu=root.querySelector('#lsd-cuse'); if(cu) cu.onclick=function(){ careerSearch(curSelLabel()); };
      var wl=root.querySelector('#lsd-wload'); if(wl) wl.onclick=loadWeak;
      var sp=root.querySelector('#lsd-spadd'); if(sp) sp.onclick=addSpecial;
      var st=root.querySelector('#lsd-stgo'); if(st) st.onclick=storyGuide;
      var ai=root.querySelector('#lsd-stai'); if(ai) ai.onclick=function(){ aiStory(); };
      var su=root.querySelector('#lsd-stuse'); if(su) su.onclick=function(){ aiStory(curSelLabel()); };
    }

    async function quickAddBank(){
      var m=root.querySelector('#lsd-rmsg'); var g=function(id){ var e=root.querySelector('#'+id); return e?(e.value||'').trim():''; };
      var row={ academy_id:acid, source_type:(root.querySelector('#lsd-rsrc').value||'기출'),
        school:g('lsd-rschool')||null, year:Number(g('lsd-ryear'))||null, subject:S.pArea||null, grade:S.pGrade||null,
        unit_large:g('lsd-rul')||null, unit_mid:g('lsd-rum')||null, qtype:g('lsd-rqt')||null,
        difficulty:(root.querySelector('#lsd-rdiff').value||null), content:g('lsd-rcontent')||null, created_by:uid||null };
      if(!row.school && !row.unit_large && !row.content){ if(m)m.textContent='학교/단원/요지 중 하나는 입력하세요.'; return; }
      if(m) m.textContent='저장 중…';
      var r=await sb().from('ref_exam_bank').insert(row); if(r.error){ if(m)m.textContent='실패: '+r.error.message; return; }
      S.pAddMsg='✓ 기출은행에 저장됨'; if(m)m.textContent=S.pAddMsg;
    }

    async function aiStory(forceU){
      var inp=root.querySelector('#lsd-stunit');
      var u=(forceU!=null?String(forceU):(inp?inp.value:'')||'').trim(); S.stunit=u; if(inp&&forceU!=null) inp.value=u;
      var box=root.querySelector('#lsd-stres');
      if(!u){ S.storyHTML='<div class="d" style="color:var(--mute)">단원/주제를 선택하거나 입력하세요.</div>'; box.innerHTML=S.storyHTML; return; }
      box.innerHTML='<div class="d" style="color:var(--mute)">✨ AI가 수업 설계를 생성 중… (최대 40초)</div>';
      var cls=curClass();
      var payload={ unit:u, subject:S.selCourse||S.pArea||cls.subject||'', grade:S.pGrade||gradeFromBand(cls.grade_band)||'', weakness:(S.weak&&S.weak[0]?S.weak[0].name:''), career:'' };
      try{
        var tok=await token();
        var r=await fetch(fnBase()+'/lesson-ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify({payload:payload})});
        var jd=await r.json();
        if(!r.ok||jd.error) throw new Error(jd.error||('HTTP '+r.status));
        var d=null; try{ d=JSON.parse(jd.text); }catch(e){ d=null; }
        if(!d){ S.storyHTML='<div class="d">'+esc(jd.text||'생성 결과가 비어 있습니다.')+'</div>'; box.innerHTML=S.storyHTML; return; }
        S.storyData=d; S.storyModel=jd.model||'gemini'; S.storyUnit=u;
        var cross=(d.cross||[]).map(function(c){return '<li><b>'+esc(c.subject||'')+'</b> — '+esc(c.link||'')+'</li>';}).join('');
        var qs=(d.questions||[]).map(function(q){return '<li>'+esc(q)+'</li>';}).join('');
        S.storyHTML='<div class="d" style="line-height:1.75">'
          +(d.story?'<div style="background:var(--vs);border-radius:10px;padding:10px 12px;margin-bottom:9px">🎬 '+esc(d.story)+'</div>':'')
          +'<b>① 도입(Hook)</b><div style="margin:2px 0 7px">'+esc(d.hook||'')+'</div>'
          +'<b>② 타과목 연계</b><ul style="margin:3px 0 7px 16px">'+cross+'</ul>'
          +'<b>③ 핵심 발문</b><ul style="margin:3px 0 7px 16px">'+qs+'</ul>'
          +'<b>④ 진로 연결</b><div style="margin:2px 0 7px">'+esc(d.career||'')+'</div>'
          +'<b>⑤ 형성평가</b><div style="margin:2px 0 0">'+esc(d.formative||'')+'</div>'
          +'</div><div class="note">✨ AI 생성('+esc(jd.model||'gemini')+') · 교사 검토 후 사용</div>';
        box.innerHTML=S.storyHTML; refreshDesign();
      }catch(e){ S.storyHTML='<div class="d" style="color:var(--risk)">AI 생성 실패: '+esc((e&&e.message)||e)+'</div>'; box.innerHTML=S.storyHTML; }
    }

    async function careerSearch(forceQ){
      var inp=root.querySelector('#lsd-cq');
      var q=(forceQ!=null?String(forceQ):(inp?inp.value:'')||'').trim(); S.cq=q;
      if(inp && forceQ!=null) inp.value=q;
      var box=root.querySelector('#lsd-cres');
      if(!q){ S.careerHTML='<div class="d" style="color:var(--mute)">키워드를 입력하세요.</div>'; box.innerHTML=S.careerHTML; return; }
      if(!window.careernet){ S.careerHTML='<div class="d" style="color:var(--risk)">커리어넷 연동이 없습니다.</div>'; box.innerHTML=S.careerHTML; return; }
      box.innerHTML='<div class="d" style="color:var(--mute)">커리어넷 검색 중…</div>';
      try{
        var r=await window.careernet('major_search',q); var items=(r&&r.items)||[]; var usedFallback=false;
        // 단원명이 너무 구체적이라 학과 직접 매칭이 없으면 과목군 계열로 보완
        if(!items.length && S.pArea && S.pArea!==q){
          var r2=await window.careernet('major_search',S.pArea); items=(r2&&r2.items)||[]; usedFallback=true;
        }
        S.careerItems=items.slice(0,12); S.careerQ=q; S.careerFb=usedFallback;
        if(!items.length){ S.careerHTML='<div class="d" style="color:var(--mute)">「'+esc(q)+'」에 연결되는 학과를 찾지 못했습니다. 더 일반적인 키워드(과목·계열)로 시도해보세요.</div>'; }
        else { S.careerHTML=(usedFallback?('<div class="note" style="margin:0 0 8px">※ 「'+esc(q)+'」 직접 매칭이 없어 <b>'+esc(S.pArea)+'</b> 계열로 보완 검색했습니다.</div>'):'')
          +items.slice(0,12).map(function(x){ return '<span class="cc"><b>'+esc(x.major||'')+'</b><small>'+esc(x.series||'')+'</small></span>'; }).join('')
          +'<div class="note">수업 도입에서 "<b>'+esc(q)+'</b> 단원이 '+esc(items[0].series||'')+' 계열로 어떻게 이어지는지" 연결해 설명하면 동기부여에 좋습니다.</div>'; }
      }catch(e){ S.careerHTML='<div class="d" style="color:var(--risk)">조회 실패: '+esc((e&&e.message)||e)+'</div>'; }
      box.innerHTML=S.careerHTML; refreshDesign();
    }

    async function loadWeak(){
      S.weak=[]; if(!S.classId){ render(); return; }
      var p=await sb().from('exam_papers').select('id').eq('class_id',S.classId).order('exam_date',{ascending:false}).limit(1);
      var pid=p&&p.data&&p.data[0]&&p.data[0].id; if(!pid){ alert('이 반의 등록된 시험이 없습니다. [시험 분석]에서 먼저 시험을 등록·채점하세요.'); return; }
      var it=await sb().from('exam_items').select('item_no,unit_mid,unit_large,qtype').eq('paper_id',pid);
      var items=(it&&it.data)||[];
      var rr=await sb().from('exam_item_results').select('item_no,correct').eq('paper_id',pid);
      var agg={};
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

    syncPrepDefaults();
    await loadCurriculum();
    render();
  }

  window.mountLessonDesign = mountLessonDesign;
})();
