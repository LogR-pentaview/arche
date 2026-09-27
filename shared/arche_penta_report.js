/* ============================================================================
 * arche_penta_report.js · PentaView 평가 리포트 (펜타 비전)
 * ----------------------------------------------------------------------------
 * 데이터원: penta_submissions(학생 워크북 답변) → arche-ai penta_vision_report →
 *           컨설턴트 검토·수정 → 학부모 전달. (학생은 [제출]만, 리포트는 서버가 생성)
 * API: ArchePentaReport.render(mount, data)
 *   data = {
 *     level:'starter'|'architecture', student:{name,grade}, lesson:{season,week,theme,title,date},
 *     persona:{name,tagline},
 *     radar:{axes:[5],before:[5],after:[5],growthPct},
 *     frequencies:[{name,score,note}],           // 5
 *     compass:{value(0~100),label},
 *     benchmark:{topic, levels:[{label,text},{label,text},{label,text}]},
 *     golden:{sentence,critique},
 *     roadmap:{items:[{icon,title,desc}], nextQuestion},
 *     consultantConfirmed:bool, date
 *   }
 * ==========================================================================*/
(function () {
  "use strict";
  var COPY = {
    starter: { eyebrow:"PentaView · 성장 리포트", radarTitle:"생각의 힘이 이만큼 자랐어요", radarNote:"수업 처음(금색)과 지금(남색)을 겹쳐 그렸어요. 남색이 넓을수록 생각이 자란 거예요.",
      freqTitle:"5가지 눈 프로파일", compassTitle:"내 마음의 저울", benchTitle:"이만큼 깊이 생각했어요", goldenTitle:"오늘의 멋진 말", goldenBy:"선생님 한마디", roadTitle:"다음엔 이렇게 해봐요", growthWord:"생각의 힘", homeTitle:"집에서 함께 이야기해 보세요" },
    architecture: { eyebrow:"PentaView · 지성 성장 리포트", radarTitle:"지적 영토가 이만큼 확장됐습니다", radarNote:"초기(금색)와 최종(남색) 레이더를 중첩했습니다. 면적 차이가 오늘 확장한 지적 영토입니다.",
      freqTitle:"5대 지성 주파수 프로파일", compassTitle:"도덕 컴퍼스 · 효율 vs 존엄", benchTitle:"3단계 벤치마크 대조", goldenTitle:"황금 문장", goldenBy:"수석 교육공학자 비평", roadTitle:"지성 도약 로드맵", growthWord:"지적 영토", homeTitle:"가정 연계 대화 가이드" }
  };
  var CSS = ".apr{max-width:760px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#243244}"
    + ".apr *{box-sizing:border-box}"
    + ".apr .serif{font-family:'Playfair Display',serif}"
    + ".apr .cover{background:linear-gradient(150deg,#1A237E,#0F1548 70%,#080b2e);color:#fff;border-radius:18px;padding:30px 26px;position:relative;overflow:hidden}"
    + ".apr .cover::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 84% 12%,rgba(212,175,55,.22),transparent 45%)}"
    + ".apr .eb{position:relative;font-size:11px;font-weight:800;letter-spacing:2px;color:#E8D9A0}"
    + ".apr .cover h1{position:relative;font-size:24px;font-weight:900;margin:8px 0 3px}"
    + ".apr .cover .meta{position:relative;font-size:13px;color:#c7cdf0}"
    + ".apr .persona{position:relative;margin-top:16px;background:rgba(255,255,255,.08);border:1px solid rgba(212,175,55,.35);border-radius:14px;padding:14px 16px}"
    + ".apr .persona .pl{font-size:11px;color:#E8D9A0;font-weight:700;letter-spacing:1px}"
    + ".apr .persona .pn{font-size:20px;font-weight:900;color:#fff;margin:2px 0}"
    + ".apr .persona .pt{font-size:13px;color:#d7dcff;line-height:1.6}"
    + ".apr .sec{background:#fff;border:1px solid #e6e9f0;border-radius:16px;padding:22px 24px;margin-top:14px;box-shadow:0 1px 3px rgba(0,23,51,.04)}"
    + ".apr .st{font-size:12px;font-weight:800;letter-spacing:.05em;color:#8b95a1;text-transform:uppercase;margin-bottom:4px}"
    + ".apr .sh{font-size:18px;font-weight:900;color:#1A237E;margin-bottom:4px}"
    + ".apr .sd{font-size:13px;color:#6b7688;line-height:1.6;margin-bottom:14px}"
    + ".apr .hero{display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#0f9d8f,#12b76a);border-radius:14px;padding:16px 18px;color:#fff;margin-bottom:14px}"
    + ".apr .hero .p{font-size:34px;font-weight:900;font-family:'Playfair Display',serif;line-height:1}"
    + ".apr .hero .t{font-size:13px;font-weight:800}.apr .hero .d{font-size:12px;opacity:.92;margin-top:2px}"
    + ".apr .radarbox{text-align:center}"
    + ".apr .legend{display:flex;gap:18px;justify-content:center;margin-top:6px;font-size:12px;font-weight:700}"
    + ".apr .legend .sw{width:16px;height:5px;border-radius:3px;display:inline-block;margin-right:6px;vertical-align:middle}"
    + ".apr .frow{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #eef1f4}.apr .frow:last-child{border-bottom:none}"
    + ".apr .fn{flex:none;width:120px;font-size:13px;font-weight:800;color:#243244}"
    + ".apr .fbar{flex:1;height:9px;background:#e6e9f0;border-radius:99px;overflow:hidden}.apr .fbar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#1A237E,#D4AF37)}"
    + ".apr .fv{flex:none;width:38px;text-align:right;font-weight:900;font-family:'Playfair Display',serif;color:#1A237E}"
    + ".apr .fnote{font-size:11.5px;color:#8b95a1;margin-top:2px}"
    + ".apr .compass{background:#f7f9fd;border-radius:12px;padding:16px}"
    + ".apr .ce{display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:#1A237E}"
    + ".apr .ct{position:relative;height:10px;border-radius:99px;background:linear-gradient(90deg,#1A237E,#c9a227);margin:12px 0 4px}"
    + ".apr .cm{position:absolute;top:-4px;width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #D4AF37;transform:translateX(-50%)}"
    + ".apr .clbl{text-align:center;font-size:12.5px;color:#39465a;margin-top:8px}"
    + ".apr .bench{display:grid;grid-template-columns:1fr;gap:9px}"
    + ".apr .bcell{border-radius:12px;padding:13px 15px;font-size:13px;line-height:1.7}"
    + ".apr .b0{background:#f4f6f8;color:#6b7688}.apr .b1{background:rgba(212,175,55,.12);border:1.5px solid #D4AF37;color:#243244}.apr .b2{background:#eef1ff;color:#39465a}"
    + ".apr .blab{font-size:11px;font-weight:800;letter-spacing:.03em;display:block;margin-bottom:3px}"
    + ".apr .b0 .blab{color:#8b95a1}.apr .b1 .blab{color:#b8860b}.apr .b2 .blab{color:#1A237E}"
    + ".apr .golden{background:linear-gradient(135deg,#1A237E,#0F1548);color:#fff;border-radius:14px;padding:20px}"
    + ".apr .gq{position:relative;font-size:17px;font-weight:800;line-height:1.6;font-family:'Playfair Display',serif;padding-left:26px}"
    + ".apr .gq::before{content:'\\201C';position:absolute;left:0;top:-6px;font-size:40px;color:#D4AF37;font-family:'Playfair Display',serif}"
    + ".apr .gc{font-size:12.5px;color:#c7cdf0;line-height:1.7;margin-top:12px;border-top:1px solid rgba(255,255,255,.15);padding-top:10px}"
    + ".apr .gc b{color:#E8D9A0}"
    + ".apr .ritem{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #eef1f4}.apr .ritem:last-child{border-bottom:none}"
    + ".apr .ric{flex:none;width:34px;height:34px;border-radius:10px;background:#eef1ff;display:grid;place-items:center;font-size:17px}"
    + ".apr .rt{font-size:13.5px;font-weight:800;color:#243244}.apr .rd{font-size:12.5px;color:#6b7688;line-height:1.6}"
    + ".apr .nextq{background:#fffdf4;border:1px solid #E8D9A0;border-radius:12px;padding:13px 15px;margin-top:12px;font-size:13px;color:#39465a;line-height:1.7}"
    + ".apr .nextq b{color:#b8860b}"
    + ".apr .book{display:flex;gap:14px;background:#fffdf4;border:1px solid #E8D9A0;border-radius:14px;padding:16px}"
    + ".apr .bspine{flex:none;width:46px;height:64px;border-radius:4px 8px 8px 4px;background:linear-gradient(135deg,#1A237E,#0F1548);border-left:5px solid #D4AF37;display:grid;place-items:center;font-size:24px;box-shadow:0 3px 8px rgba(16,21,72,.25)}"
    + ".apr .bt{font-size:16px;font-weight:900;color:#1A237E}"
    + ".apr .bmeta{font-size:12.5px;color:#6b7688;font-weight:700;margin:2px 0 8px}"
    + ".apr .bdesc{font-size:13px;color:#39465a;line-height:1.7}"
    + ".apr .bwhy{font-size:12.5px;color:#b8860b;background:rgba(212,175,55,.1);border-radius:8px;padding:8px 11px;margin-top:9px;line-height:1.6}"
    + ".apr .home{background:#f3f8f4;border:1px solid #cfe6d4;border-radius:14px;padding:6px 16px}"
    + ".apr .htcard{padding:12px 0;border-top:1px dashed #cfe6d4}.apr .htcard:first-child{border-top:0}"
    + ".apr .htq{font-size:14px;font-weight:800;color:#1A237E;line-height:1.65}"
    + ".apr .htip{font-size:12px;color:#4e6b57;line-height:1.6;margin-top:5px}"
    + ".apr .ctag{font-size:11.5px;color:#8b95a1;margin-top:12px;display:flex;gap:6px;align-items:center}"
    + ".apr .foot{display:flex;justify-content:space-between;font-size:11px;color:#8b95a1;margin-top:16px;padding-top:12px;border-top:1px solid #e6e9f0}"
    + ".apr .glo{display:flex;flex-direction:column;gap:8px}"
    + ".apr .gloi{background:#f7f8fb;border:1px solid #e6e9f0;border-radius:9px;padding:9px 12px}"
    + ".apr .gloi b{display:block;color:#1A237E;font-size:13px;margin-bottom:2px}"
    + ".apr .gloi span{display:block;color:#4e5968;font-size:12px;line-height:1.6}"
    + ".apr .disc{font-size:11px;color:#8b95a1;line-height:1.6;margin-top:14px;padding:12px 14px;background:#f4f6f8;border-radius:10px}"
    + ".apr .adm{background:linear-gradient(180deg,#f7f9fd,#fff)}"
    + ".apr .admrow{margin-top:12px}.apr .admlab{font-size:11px;font-weight:800;letter-spacing:.03em;color:#8b95a1;text-transform:uppercase;margin-bottom:7px}"
    + ".apr .chips{display:flex;flex-wrap:wrap;gap:7px}"
    + ".apr .apr-chip{display:inline-block;font-size:12.5px;font-weight:700;padding:6px 12px;border-radius:99px;background:#eef1ff;color:#1A237E;border:1px solid #d7ddf5}"
    + ".apr .apr-chip.sub{background:rgba(212,175,55,.12);color:#b8860b;border-color:#E8D9A0}"
    + ".apr ol.setech{margin:4px 0 0;padding-left:20px}.apr ol.setech li{font-size:13px;color:#243244;line-height:1.7;margin-bottom:6px;font-weight:600}"
    + ".apr .setnote{font-size:11px;color:#8b95a1;line-height:1.6;margin-top:6px;background:#fffdf4;border:1px solid #E8D9A0;border-radius:8px;padding:8px 11px}";

  function inject(){ if(document.getElementById('apr-css'))return; var s=document.createElement('style');s.id='apr-css';s.textContent=CSS;document.head.appendChild(s);
    if(!document.getElementById('apr-font')){var l=document.createElement('link');l.id='apr-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Sans+KR:wght@400;700;900&display=swap';document.head.appendChild(l);} }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  function _xbar(mount,root,d){ if(!window.ArcheExport)return;
    var nm=(d&&d.student&&d.student.name)||'자녀'; var stg=(d&&d.stage==='track')?'트랙':'비전';
    var title=nm+'님 펜타 '+stg+' 리포트'+((d&&d.lesson&&d.lesson.title)?(' · '+d.lesson.title):'');
    var c=(d&&d.stage==='track')?'#6fa81c':'#c8a24a';
    var tb=document.createElement('div'); tb.style.cssText='display:flex;justify-content:flex-end;gap:7px;margin:0 0 8px;flex-wrap:wrap';
    function mk(l,fn){ var b=document.createElement('button'); b.textContent=l; b.style.cssText='font:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:8px;border:1px solid '+c+';background:#fff;color:'+c+';cursor:pointer'; b.onclick=fn; return b; }
    tb.appendChild(mk('📄 PDF 저장·인쇄',function(){ ArcheExport.printNode(root,{title:title,styleIds:['apr-css']}); }));
    tb.appendChild(mk('📝 DOCX',function(){ ArcheExport.docx({title:title,html:root.innerHTML}); }));
    mount.appendChild(tb); }

  function radarSVG(axes,before,after){
    var C=150,cy=140,R=100,N=axes.length||5;
    function pt(i,r){var a=-Math.PI/2+i*2*Math.PI/N;return [C+r*Math.cos(a),cy+r*Math.sin(a)];}
    var g='';
    [1,.66,.33].forEach(function(f){var p=[];for(var i=0;i<N;i++){var xy=pt(i,R*f);p.push(xy[0].toFixed(0)+','+xy[1].toFixed(0));}g+='<polygon points="'+p.join(' ')+'" fill="none" stroke="#eef1f4" stroke-width="1.2"/>';});
    for(var i=0;i<N;i++){var xy=pt(i,R);g+='<line x1="150" y1="140" x2="'+xy[0].toFixed(0)+'" y2="'+xy[1].toFixed(0)+'" stroke="#e6e9f0"/>';}
    function poly(arr,fill,stroke,dash){var p=[];for(var i=0;i<N;i++){var v=Math.max(0,Math.min(10,arr[i]||0));var xy=pt(i,R*v/10);p.push(xy[0].toFixed(0)+','+xy[1].toFixed(0));}return '<polygon points="'+p.join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(dash?2:2.5)+'"'+(dash?' stroke-dasharray="4 3"':'')+' stroke-linejoin="round"/>';}
    if(before) g+=poly(before,'rgba(212,175,55,.18)','#D4AF37',true);
    if(after){ g+=poly(after,'rgba(26,35,126,.26)','#1A237E',false); for(var k=0;k<N;k++){var xy=pt(k,R*Math.max(0,Math.min(10,after[k]||0))/10);g+='<circle cx="'+xy[0].toFixed(0)+'" cy="'+xy[1].toFixed(0)+'" r="4" fill="#1A237E"/>';} }
    for(var j=0;j<N;j++){var xy=pt(j,R+20);g+='<text x="'+xy[0].toFixed(0)+'" y="'+xy[1].toFixed(0)+'" font-size="11" font-weight="800" fill="#1A237E" text-anchor="middle" dominant-baseline="middle">'+esc(axes[j])+'</text>';}
    return '<svg width="300" height="285" viewBox="0 0 300 285">'+g+'</svg>';
  }

  function chip(t,cls){return '<span class="apr-chip '+(cls||'')+'">'+esc(t)+'</span>';}

  // 📚 용어집 섹션 (자동노출) — d.glossary/d.terms 있으면 렌더
  function gloSectionHtml(d){
    var g=d&&(d.glossary||d.terms); if(!Array.isArray(g)||!g.length)return '';
    var items=g.map(function(t){ if(typeof t==='string'){var p=t.split(/[:：\-–—]/);return {term:(p.shift()||'').trim(),def:(p.join(':')||'').trim()};} return {term:(t.term||t.t||t.word||t.name||''),def:(t.def||t.d||t.desc||t.meaning||t.gloss||'')}; }).filter(function(x){return x.term||x.def;});
    if(!items.length)return '';
    var rows=items.map(function(x){return '<div class="gloi"><b>'+esc(x.term)+'</b>'+(x.def?'<span>'+esc(x.def)+'</span>':'')+'</div>';}).join('');
    return '<div class="sec"><div class="sh">📚 이번 회차 용어집</div><div class="glo">'+rows+'</div></div>';
  }

  // 문장력(표현력) 진단 — 골든 합격 자소서 문장 퀄리티를 기준으로 산출
  function exprHtml(d){
    var ex=d&&d.expression; if(!ex||(!ex.note&&ex.score==null))return '';
    var lc={'우수':'#2f9e44','양호':'#1971c2','성장중':'#e8590c','첫걸음':'#868e96','기초':'#868e96'}[ex.level]||'#1971c2';
    var sc=(ex.score!=null&&!isNaN(+ex.score))?(+ex.score).toFixed(0):'-';
    var h='<div class="sec"><div class="sh">✍️ 문장력 진단</div>'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">'
      +'<div style="font-size:23px;font-weight:900;color:'+lc+';line-height:1">'+sc+'<span style="font-size:12px;color:#8b95a1;font-weight:700">/10</span></div>'
      +(ex.level?'<span style="font-size:11px;font-weight:800;color:'+lc+';background:'+lc+'14;border:1px solid '+lc+'44;border-radius:20px;padding:3px 11px">'+esc(ex.level)+'</span>':'')
      +'</div>';
    if(ex.note) h+='<div class="sd" style="margin-bottom:'+((ex.tips&&ex.tips.length)?'9px':'0')+'">'+esc(ex.note)+'</div>';
    if(ex.tips&&ex.tips.length) h+='<ul style="margin:0;padding-left:18px;font-size:12.5px;color:#495057;line-height:1.75">'+ex.tips.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>';
    h+='<div style="margin-top:10px;font-size:10.5px;color:#adb5bd">※ 우수한 사고·표현 사례를 기준으로 학년 수준을 감안해 진단합니다. 대필이 아닌 표현 성장 안내입니다.</div>';
    return h+'</div>';
  }

  // ── 펜타 트랙 리포트 (중3 · 교과융합 + 고교학점제/세특 연계) ──────────────
  function renderTrack(mount,d){
    inject(); d=d||{};
    var st=d.student||{}, ls=d.lesson||{}, sig=d.signature||{}, vel=d.velocity||{}, bm=d.benchmark||{},
        adm=d.admissions||{}, gd=d.golden||{}, road=d.roadmap||{};
    var root=document.createElement('div'); root.className='apr';
    var h='';
    h+='<div class="cover"><div class="eb">PENTAVIEW · 트랙 · 융합 사고 리포트 · 특허 10-2026-0053173</div>'
      +'<h1 class="serif">'+esc(st.name||'학생')+' 님의 트랙 리포트</h1>'
      +'<div class="meta">'+esc((ls.title||'')+(ls.theme?(' · '+ls.theme):''))+' · 시즌'+esc(ls.season||1)+' '+esc(ls.week||1)+'주차'+(st.grade?(' · '+esc(st.grade)):' · 중3')+'</div>';
    if(sig.name) h+='<div class="persona"><div class="pl">융합 사고 시그니처</div><div class="pn">'+esc(sig.name)+'</div><div class="pt">'+esc(sig.desc||'')+'</div></div>';
    h+='</div>';
    // velocity (사고 가속도 0~100)
    if(vel.score!=null){
      h+='<div class="sec"><div class="st">THINKING VELOCITY</div><div class="sh">사고 가속도</div>'
        +'<div class="hero"><div class="p">'+Math.round(vel.score)+'</div><div><div class="t">수업 전 → 후, 사고 깊이의 변화</div><div class="d">'+esc(vel.note||'')+'</div></div></div></div>';
    }
    // 진로 주파수
    if(d.frequencies&&d.frequencies.length){
      h+='<div class="sec"><div class="sh">진로 주파수 프로파일</div>';
      d.frequencies.forEach(function(f){
        h+='<div class="frow"><div class="fn">'+esc(f.name)+(f.note?'<div class="fnote">'+esc(f.note)+'</div>':'')+'</div><div class="fbar"><i style="width:'+(f.score*10)+'%"></i></div><div class="fv">'+(+f.score).toFixed(1)+'</div></div>';
      });
      h+='</div>';
    }
    // benchmark Lv.1~3
    if(bm.levels&&bm.levels.length){
      h+='<div class="sec"><div class="sh">3단계 융합 사고 벤치마크</div>'+(bm.topic?'<div class="sd">'+esc(bm.topic)+'</div>':'')+'<div class="bench">';
      bm.levels.forEach(function(lv,i){ h+='<div class="bcell b'+i+'"><span class="blab">'+esc(lv.label)+'</span>'+esc(lv.text)+'</div>'; });
      h+='</div></div>';
    }
    // 고교학점제·세특 연계 (트랙 핵심)
    if((adm.subjects&&adm.subjects.length)||(adm.setech_topics&&adm.setech_topics.length)){
      h+='<div class="sec adm"><div class="st">고교학점제 · 생기부 연계</div><div class="sh">🎓 진학 설계 브릿지</div>'
        +'<div class="sd">이 수업에서 드러난 사고 성향을 바탕으로, 고교 진학 시 참고할 방향입니다. (확정 아닌 <b>탐색 제안</b>)</div>';
      if(adm.subjects&&adm.subjects.length){
        h+='<div class="admrow"><div class="admlab">권장 선택과목</div><div class="chips">'+adm.subjects.map(function(s){return chip(s,'sub');}).join('')+'</div></div>';
      }
      if(adm.setech_topics&&adm.setech_topics.length){
        h+='<div class="admrow"><div class="admlab">세특 탐구주제 씨앗</div><ol class="setech">'+adm.setech_topics.map(function(s){return '<li>'+esc(s)+'</li>';}).join('')+'</ol>'
          +'<div class="setnote">※ 위 주제는 <b>탐구 방향 제안</b>이며, 세특은 학생이 직접 탐구·작성해야 합니다(대필 아님).</div></div>';
      }
      h+='</div>';
    }
    // [신규] 과목별 사고 분석 (5과목 · 고교 교육과정 기준)
    if(d.subjects && d.subjects.length){ nrInject();
      h+='<div class="sec"><div class="sh">📚 과목별 사고 분석 <span style="font-size:11.5px;font-weight:700;color:#8b95a1">· 고교 교육과정 기준</span></div>'
        +'<div class="sd">이 회차 답변에서 드러난 사고를 다섯 과목으로 나눠, 분석 → 예상 학습 약점(고교 과정) → 성장 전략으로 정리했습니다.</div>'
        +'<div class="nr" style="max-width:none">'+nrSubjectsHTML(d.subjects, (d.student&&d.student.grade)||d.grade||'고1')+'</div></div>';
    }
    // golden
    if(gd.sentence){
      h+='<div class="sec" style="padding:0;background:transparent;border:0;box-shadow:none"><div class="golden"><div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#E8D9A0;margin-bottom:10px">✦ 황금 통찰</div>'
        +'<div class="gq">'+esc(gd.sentence)+'</div>'
        +(gd.critique?'<div class="gc"><b>융합 사고 비평</b> — '+esc(gd.critique)+'</div>':'')+'</div></div>';
    }
    // 문장력 진단
    h+=exprHtml(d);
    // book
    if(d.book && d.book.title){
      h+='<div class="sec"><div class="sh">📚 이 주제와 어울리는 책 한 권</div>'
        +'<div class="book"><div class="bspine">📖</div><div>'
        +'<div class="bt">'+esc(d.book.title)+'</div>'
        +'<div class="bmeta">'+esc(d.book.author||'')+(d.book.publisher?(' · '+esc(d.book.publisher)):'')+'</div>'
        +(d.book.desc?'<div class="bdesc">'+esc(d.book.desc)+'</div>':'')
        +(d.book.why?'<div class="bwhy">💡 이 학생에게 추천하는 이유 — '+esc(d.book.why)+'</div>':'')
        +'</div></div></div>';
    }
    // roadmap
    if((road.items&&road.items.length)||road.nextQuestion){
      h+='<div class="sec"><div class="sh">지성 도약 로드맵</div>';
      (road.items||[]).forEach(function(it){ h+='<div class="ritem"><div class="ric">'+esc(it.icon||'📌')+'</div><div><div class="rt">'+esc(it.title)+'</div><div class="rd">'+esc(it.desc||'')+'</div></div></div>'; });
      if(road.nextQuestion) h+='<div class="nextq">🤔 <b>다음에 생각해볼 질문</b> — '+esc(road.nextQuestion)+'</div>';
      h+='</div>';
    }
    // 가정 연계
    if(d.homeTalk && (d.homeTalk.items||[]).length){
      h+='<div class="sec"><div class="sh">🏠 가정 연계 대화 가이드</div>'
        +(d.homeTalk.intro?'<div class="sd">'+esc(d.homeTalk.intro)+'</div>':'')+'<div class="home">';
      d.homeTalk.items.forEach(function(it,i){
        h+='<div class="htcard"><div class="htq">'+(i+1)+'. '+esc(it.q)+'</div>'+(it.tip?'<div class="htip">💬 '+esc(it.tip)+'</div>':'')+'</div>';
      });
      h+='</div></div>';
    }
    h+=gloSectionHtml(d);
    if(d.consultantConfirmed) h+='<div class="ctag">🖊️ 이 리포트는 담당 컨설턴트가 검토·확정 후 발행했습니다.</div>';
    h+='<div class="disc">본 리포트는 특허 출원 기술(10-2026-0053173) 기반 인지 진단 <b>참고 자료</b>로, 타 학생과의 서열·순위 비교를 포함하지 않으며 합격을 보장하지 않습니다. 진학 정보는 탐색 제안입니다.</div>'
      +'<div class="foot"><span>PentaView · 펜타 트랙</span><span>'+esc(d.date||'')+' · penta-view.com</span></div>';
    root.innerHTML=h; mount.innerHTML=''; _xbar(mount,root,d); mount.appendChild(root); return root;
  }

  /* ===================== [신규 v2] 5과목 사고 분석 리포트 ===================== */
  var NR_CSS = ".nr{max-width:820px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#14181f}"
    + ".nr *{box-sizing:border-box}"
    + ".nr .top{background:linear-gradient(115deg,#4f46e5,#7c3aed 60%,#c026a8);color:#fff;border-radius:16px;padding:24px 26px;position:relative;overflow:hidden}"
    + ".nr .top .ey{font-size:11px;font-weight:800;letter-spacing:2px;opacity:.9}"
    + ".nr .top h1{font-size:22px;font-weight:900;margin:7px 0 0}"
    + ".nr .top .meta{font-size:12.5px;opacity:.96;margin-top:9px;line-height:1.7}"
    + ".nr .top .tag{display:inline-block;margin-top:11px;font-size:10px;font-weight:700;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);padding:4px 10px;border-radius:100px}"
    + ".nr .sec{margin-top:16px}"
    + ".nr .sh{display:flex;align-items:center;gap:8px;font-size:15.5px;font-weight:900;margin-bottom:3px}"
    + ".nr .sh .bar{width:4px;height:16px;border-radius:3px;background:#4f46e5}"
    + ".nr .sd{font-size:12px;color:#8a92a3;margin-bottom:13px}"
    + ".nr .persona{display:flex;align-items:center;gap:11px;background:linear-gradient(100deg,#f2f0fe,#fdf0f8);border:1px solid #e6ddf7;border-radius:13px;padding:12px 15px;margin-bottom:15px}"
    + ".nr .persona .em{width:40px;height:40px;border-radius:10px;background:#4f46e5;color:#fff;display:grid;place-items:center;font-size:20px;flex:none}"
    + ".nr .persona .nm{font-size:15.5px;font-weight:900}.nr .persona .tl{font-size:12px;color:#4a5160;margin-top:2px}"
    + ".nr .sum{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:center}"
    + ".nr .radarbox{background:#f6f7fa;border:1px solid #e5e8ee;border-radius:14px;padding:6px}"
    + ".nr .lead{font-size:13px;line-height:1.85;color:#4a5160}.nr .lead b{color:#14181f}"
    + ".nr .tiles{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}"
    + ".nr .tile{border:1px solid #e5e8ee;border-radius:11px;padding:11px 13px}"
    + ".nr .tile .k{font-size:10px;font-weight:800;color:#8a92a3}.nr .tile .v{font-size:15px;font-weight:900;margin-top:3px}.nr .tile .s{font-size:10.5px;color:#8a92a3;margin-top:2px}"
    + ".nr .levleg{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;font-size:10.5px}"
    + ".nr .levleg .l{display:flex;align-items:center;gap:5px;background:#f6f7fa;border:1px solid #e5e8ee;border-radius:100px;padding:3px 9px;font-weight:700;color:#4a5160}"
    + ".nr .levleg .l i{width:8px;height:8px;border-radius:50%}"
    + ".nr .subj{border:1px solid #e5e8ee;border-left:5px solid var(--ac);border-radius:12px;padding:15px 17px;margin-bottom:12px}"
    + ".nr .subj-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}"
    + ".nr .subj-ic{width:32px;height:32px;border-radius:9px;background:var(--ac);color:#fff;display:grid;place-items:center;font-size:15px;font-weight:900;flex:none}"
    + ".nr .subj-name{font-size:15.5px;font-weight:900}.nr .subj-lens{font-size:11px;color:#8a92a3;font-weight:600}"
    + ".nr .lvbadge{margin-left:auto;font-size:10.5px;font-weight:800;padding:5px 11px;border-radius:100px;display:flex;align-items:center;gap:5px}"
    + ".nr .lvbadge i{width:8px;height:8px;border-radius:50%}"
    + ".nr .scoreln{display:flex;align-items:center;gap:10px;margin:11px 0 3px}"
    + ".nr .track{flex:1;height:8px;border-radius:5px;background:#eef0f4;overflow:hidden}.nr .track i{display:block;height:100%;border-radius:5px;background:var(--ac)}"
    + ".nr .scnum{font-size:12.5px;font-weight:900;min-width:52px;text-align:right}"
    + ".nr .lvcap{font-size:11px;color:#8a92a3}.nr .lvcap b{color:#4a5160}"
    + ".nr .step{margin-top:11px}.nr .step .h{font-size:11px;font-weight:900;color:#4f46e5;margin-bottom:4px}"
    + ".nr .step .b{font-size:12.5px;line-height:1.7;color:#4a5160}.nr .step .b b{color:#14181f}"
    + ".nr .quote{display:block;font-size:11.5px;color:#4a5160;background:#f6f7fa;border-left:2px solid var(--ac);padding:6px 9px;border-radius:0 6px 6px 0;margin-top:5px;font-style:italic}"
    + ".nr .weak{background:#fff6ed;border:1px solid #f0d3ad;border-radius:9px;padding:10px 12px;margin-top:11px}"
    + ".nr .weak .h{font-size:11px;font-weight:900;color:#b5651a;display:flex;align-items:center;gap:6px;margin-bottom:4px}"
    + ".nr .weak .h .pv{font-size:9px;font-weight:800;background:#f3e0c6;color:#8a5a12;padding:2px 7px;border-radius:100px;margin-left:auto}"
    + ".nr .weak p{font-size:12.3px;line-height:1.7;color:#7a5f38}.nr .weak p b{color:#8a4e10}"
    + ".nr .strat{margin-top:11px;border-top:1px dashed #e5e8ee;padding-top:10px}"
    + ".nr .strat .h{font-size:11.5px;font-weight:900;color:#0a7a4a;margin-bottom:7px}"
    + ".nr .strat .st{display:grid;grid-template-columns:88px 1fr;gap:8px;margin-bottom:6px}"
    + ".nr .strat .st .t{font-size:11px;font-weight:800;color:#14181f}.nr .strat .st .d{font-size:12px;line-height:1.6;color:#4a5160}.nr .strat .st .d b{color:#14181f}"
    + ".nr .card{border:1px solid #e5e8ee;border-radius:12px;padding:15px 17px}"
    + ".nr .golden{background:linear-gradient(100deg,#fffaf0,#fff5f8);border:1px solid #f0e3c8}"
    + ".nr .golden .q{font-size:14.5px;font-weight:800;line-height:1.6}"
    + ".nr .golden .c{font-size:12.3px;color:#4a5160;margin-top:8px;line-height:1.7}.nr .golden .c b{color:#b0740a}"
    + ".nr .rx{border:1px solid #e5e8ee;border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}"
    + ".nr .rx .pri{flex:none;font-size:10px;font-weight:800;padding:5px 9px;border-radius:8px;white-space:nowrap;margin-top:2px}"
    + ".nr .rx h4{font-size:13.5px;font-weight:800;margin-bottom:3px}.nr .rx p{font-size:12.3px;line-height:1.7;color:#4a5160}.nr .rx p b{color:#14181f}"
    + ".nr .talk .q{font-size:13px;font-weight:800}.nr .talk .t{font-size:12px;color:#4a5160;margin-top:3px;line-height:1.6}.nr .talk .t b{color:#4f46e5}.nr .talk .it{padding:9px 0;border-top:1px dashed #e5e8ee}.nr .talk .it:first-child{border-top:0}"
    + ".nr .book{display:flex;gap:13px}.nr .book .cv{width:52px;height:72px;border-radius:6px;background:linear-gradient(160deg,#4f46e5,#c026a8);flex:none;display:grid;place-items:center;color:#fff;font-size:20px}"
    + ".nr .book h4{font-size:14px;font-weight:900}.nr .book .au{font-size:11px;color:#8a92a3;margin:2px 0 6px}.nr .book p{font-size:12px;line-height:1.6;color:#4a5160}.nr .book p b{color:#14181f}"
    + ".nr .foot{margin-top:16px;padding-top:12px;border-top:1px solid #e5e8ee;font-size:10px;color:#8a92a3;line-height:1.65}.nr .foot b{color:#4a5160}";

  var NR_SUBJ = {
    kor:{n:'국어',ic:'국',lens:'글을 읽고 내 생각으로 정리하기',c:'#2a78d6'},
    mat:{n:'수학',ic:'수',lens:'숫자와 규칙으로 따져보기',c:'#1baf7a'},
    soc:{n:'사회',ic:'사',lens:'배운 걸 실제 사회에 연결하기',c:'#4a3aa7'},
    sci:{n:'과학',ic:'과',lens:'원인과 결과를 끝까지 파기',c:'#eb6834'},
    art:{n:'예술',ic:'예',lens:'새롭게 상상하고 나만의 방식으로 표현하기',c:'#c2557e'}
  };
  var NR_ORDER=['kor','mat','sci','soc','art'];
  function nrLevel(sc){ sc=+sc||0;
    if(sc>=90)return {name:'최상위',dot:'#0a7a0a',bg:'#e7f6e7',fg:'#0a7a0a',note:'또래 중에서도 아주 뛰어납니다.'};
    if(sc>=80)return {name:'우수',dot:'#2a78d6',bg:'#e8f0fb',fg:'#245fa8',note:'또래 평균보다 뚜렷이 앞섭니다.'};
    if(sc>=65)return {name:'양호',dot:'#e0900a',bg:'#fdf2df',fg:'#a56d09',note:'또래 평균 수준입니다.'};
    if(sc>=50)return {name:'성장중',dot:'#c2557e',bg:'#fbe9f0',fg:'#a83a68',note:'지금 도와주면 크게 오를 구간입니다.'};
    return {name:'기초',dot:'#8a92a3',bg:'#eef0f4',fg:'#6b7382',note:'기초부터 차근차근 다지면 좋습니다.'};
  }
  function nrRadar(items){ // items:[{name,score,color}] length 5
    var cx=170,cy=150,R=118,N=items.length;
    function pt(i,f){var a=-Math.PI/2+i*2*Math.PI/N;return [cx+R*f*Math.cos(a),cy+R*f*Math.sin(a)];}
    var g='';
    [0.25,0.5,0.75,1].forEach(function(f){var p=[];for(var i=0;i<N;i++){var xy=pt(i,f);p.push(xy[0].toFixed(1)+','+xy[1].toFixed(1));}g+='<polygon points="'+p.join(' ')+'" fill="none" stroke="#e5e8ee" stroke-width="1"/>';});
    for(var i=0;i<N;i++){var e=pt(i,1);g+='<line x1="170" y1="150" x2="'+e[0].toFixed(1)+'" y2="'+e[1].toFixed(1)+'" stroke="#e5e8ee"/>';}
    var pp=[];for(var j=0;j<N;j++){var v=Math.max(0,Math.min(100,items[j].score||0));var xy=pt(j,v/100);pp.push(xy[0].toFixed(1)+','+xy[1].toFixed(1));}
    g+='<polygon points="'+pp.join(' ')+'" fill="rgba(79,70,229,.14)" stroke="#4f46e5" stroke-width="2"/>';
    for(var k=0;k<N;k++){var v2=Math.max(0,Math.min(100,items[k].score||0));var d=pt(k,v2/100);g+='<circle cx="'+d[0].toFixed(1)+'" cy="'+d[1].toFixed(1)+'" r="4.3" fill="'+items[k].color+'"/>';}
    for(var m=0;m<N;m++){var l=pt(m,1.2);var anc=(Math.abs(l[0]-cx)<8)?'middle':(l[0]>cx?'start':'end');g+='<text x="'+l[0].toFixed(1)+'" y="'+l[1].toFixed(1)+'" text-anchor="'+anc+'" font-size="12" font-weight="800" fill="'+items[m].color+'">'+esc(items[m].name)+' '+Math.round(items[m].score||0)+'</text>';}
    return '<svg viewBox="-34 4 408 300" width="100%" role="img" aria-label="다섯 갈래 사고 레이더">'+g+'</svg>';
  }
  function nrInject(){ if(document.getElementById('nr-css'))return; var s=document.createElement('style');s.id='nr-css';s.textContent=NR_CSS;document.head.appendChild(s);
    if(!document.getElementById('apr-font')){var l=document.createElement('link');l.id='apr-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap';document.head.appendChild(l);} }
  function nrSubjectsHTML(subjects, gradeLbl){
    var subs=(subjects||[]).map(function(x){ var m=NR_SUBJ[x.key]||{n:x.name||x.key,ic:(x.name||' ').slice(0,1),lens:x.lens||'',c:'#4f46e5'}; return {key:x.key,name:x.name||m.n,ic:m.ic,lens:x.lens||m.lens,c:m.c,score:+x.score||0,analysis:x.analysis||'',quote:x.quote||'',weakness:x.weakness||'',strat:x.strat||{},level_note:x.level_note||''}; });
    var byKey={}; subs.forEach(function(s){byKey[s.key]=s;});
    var ordered=NR_ORDER.filter(function(k){return byKey[k];}).map(function(k){return byKey[k];});
    subs.forEach(function(s){ if(NR_ORDER.indexOf(s.key)<0) ordered.push(s); });
    return ordered.map(function(s){
      var lv=nrLevel(s.score); var stg=s.strat||{};
      var h='<div class="subj" style="--ac:'+s.c+'">'
        +'<div class="subj-h"><div class="subj-ic">'+esc(s.ic)+'</div><div><div class="subj-name">'+esc(s.name)+' <span class="subj-lens">· '+esc(s.lens)+'</span></div></div>'
        +'<span class="lvbadge" style="background:'+lv.bg+';color:'+lv.fg+'"><i style="background:'+lv.dot+'"></i>'+esc(lv.name)+'</span></div>'
        +'<div class="scoreln"><div class="track"><i style="width:'+Math.max(0,Math.min(100,s.score))+'%"></i></div><div class="scnum">'+Math.round(s.score)+' / 100</div></div>'
        +'<div class="lvcap"><b>'+esc(lv.name)+'</b> — '+esc(s.level_note||lv.note)+'</div>';
      if(s.analysis) h+='<div class="step"><div class="h">📊 워크북 분석</div><div class="b">'+s.analysis+(s.quote?('<span class="quote">'+esc(s.quote)+'</span>'):'')+'</div></div>';
      if(s.weakness) h+='<div class="weak"><div class="h">⚠️ 이대로면 예상되는 학습 약점 <span class="pv">예측'+(gradeLbl?(' · '+esc(gradeLbl)+' 기준'):'')+'</span></div><p>'+s.weakness+'</p></div>';
      if(stg.class||stg.home||stg.success){
        h+='<div class="strat"><div class="h">🌱 성장 전략</div>'
          +(stg.class?'<div class="st"><div class="t">🎯 수업에서</div><div class="d">'+stg.class+'</div></div>':'')
          +(stg.home?'<div class="st"><div class="t">🏠 집에서</div><div class="d">'+stg.home+'</div></div>':'')
          +(stg.success?'<div class="st"><div class="t">✅ 성공 신호</div><div class="d">'+stg.success+'</div></div>':'')
          +'</div>';
      }
      return h+'</div>';
    }).join('');
  }
  function renderVisionNew(mount,d){
    nrInject(); d=d||{};
    var st=d.student||{}, ls=d.lesson||{}, per=d.persona||{}, sm=d.summary||{}, gd=d.golden||{};
    var subs=(d.subjects||[]).map(function(x){ var m=NR_SUBJ[x.key]||{n:x.name||x.key,ic:(x.name||' ').slice(0,1),lens:x.lens||'',c:'#4f46e5'}; return { key:x.key, name:x.name||m.n, ic:m.ic, lens:x.lens||m.lens, c:m.c, score:+x.score||0, analysis:x.analysis||'', quote:x.quote||'', weakness:x.weakness||'', strat:x.strat||{}, level_note:x.level_note||'' }; });
    // radar in fixed order
    var byKey={}; subs.forEach(function(s){byKey[s.key]=s;});
    var radarItems=NR_ORDER.filter(function(k){return byKey[k];}).map(function(k){return {name:NR_SUBJ[k].n,score:byKey[k].score,color:NR_SUBJ[k].c};});
    if(radarItems.length<subs.length){ radarItems=subs.map(function(s){return {name:s.name,score:s.score,color:s.c};}); }
    var root=document.createElement('div'); root.className='nr';
    var gradeLbl=st.grade||d.grade||'';
    var h='<div class="top"><div class="ey">PENTAVIEW · 사고 분석 리포트</div>'
      +'<h1>국·수·사·과·예 다섯 갈래 사고 분석</h1>'
      +'<div class="meta">'+esc(st.name||'학생')+(gradeLbl?(' · '+esc(gradeLbl)):'')+(ls.title?(' · 회차 '+esc(ls.title)):'')+(ls.theme?(' — '+esc(ls.theme)):'')+(d.date?(' · '+esc(d.date)):'')+'</div>'
      +'<span class="tag">답안 근거 기반 · 특허 10-2026-0053173</span></div>';
    // summary
    h+='<div class="sec"><div class="sh"><span class="bar"></span>한눈에 보기</div><div class="sd">워크북에 직접 쓴 답을 바탕으로 다섯 갈래의 생각하는 힘을 살펴봤습니다.</div>';
    if(per.name) h+='<div class="persona"><div class="em">🧭</div><div><div class="nm">“'+esc(per.name)+'”</div><div class="tl">'+esc(per.tagline||'')+'</div></div></div>';
    h+='<div class="sum"><div class="radarbox">'+nrRadar(radarItems)+'</div><div>';
    if(sm.lead) h+='<p class="lead">'+sm.lead+'</p>';
    if(sm.tiles&&sm.tiles.length){ h+='<div class="tiles">'; sm.tiles.slice(0,4).forEach(function(t){ h+='<div class="tile"><div class="k">'+esc(t.k||'')+'</div><div class="v"'+(t.color?(' style="color:'+t.color+'"'):'')+'>'+esc(t.v||'')+'</div><div class="s">'+esc(t.s||'')+'</div></div>'; }); h+='</div>'; }
    h+='</div></div></div>';
    // subjects
    h+='<div class="sec"><div class="sh"><span class="bar"></span>과목별 자세히 보기</div>'
      +'<div class="sd">각 과목을 <b>① 워크북 분석 → ② 앞으로 예상되는 학습 약점 → ③ 성장 전략</b> 순으로 정리했습니다. 등급은 같은 학년 기준이며 다른 학생과의 등수가 아닙니다.</div>'
      +'<div class="levleg"><span class="l"><i style="background:#0a7a0a"></i>최상위 90+</span><span class="l"><i style="background:#2a78d6"></i>우수 80~89</span><span class="l"><i style="background:#e0900a"></i>양호 65~79</span><span class="l"><i style="background:#c2557e"></i>성장중 50~64</span><span class="l"><i style="background:#8a92a3"></i>기초 ~49</span></div>';
    subs.forEach(function(s){
      var lv=nrLevel(s.score); var stg=s.strat||{};
      h+='<div class="subj" style="--ac:'+s.c+'">'
        +'<div class="subj-h"><div class="subj-ic">'+esc(s.ic)+'</div><div><div class="subj-name">'+esc(s.name)+' <span class="subj-lens">· '+esc(s.lens)+'</span></div></div>'
        +'<span class="lvbadge" style="background:'+lv.bg+';color:'+lv.fg+'"><i style="background:'+lv.dot+'"></i>'+esc(lv.name)+'</span></div>'
        +'<div class="scoreln"><div class="track"><i style="width:'+Math.max(0,Math.min(100,s.score))+'%"></i></div><div class="scnum">'+Math.round(s.score)+' / 100</div></div>'
        +'<div class="lvcap"><b>'+esc(lv.name)+'</b> — '+esc(s.level_note||lv.note)+'</div>';
      if(s.analysis) h+='<div class="step"><div class="h">📊 워크북 분석</div><div class="b">'+s.analysis+(s.quote?('<span class="quote">'+esc(s.quote)+'</span>'):'')+'</div></div>';
      if(s.weakness) h+='<div class="weak"><div class="h">⚠️ 이대로면 예상되는 학습 약점 <span class="pv">예측'+(gradeLbl?(' · '+esc(gradeLbl)+' 기준'):'')+'</span></div><p>'+s.weakness+'</p></div>';
      if(stg.class||stg.home||stg.success){
        h+='<div class="strat"><div class="h">🌱 성장 전략</div>'
          +(stg.class?'<div class="st"><div class="t">🎯 수업에서</div><div class="d">'+stg.class+'</div></div>':'')
          +(stg.home?'<div class="st"><div class="t">🏠 집에서</div><div class="d">'+stg.home+'</div></div>':'')
          +(stg.success?'<div class="st"><div class="t">✅ 성공 신호</div><div class="d">'+stg.success+'</div></div>':'')
          +'</div>';
      }
      h+='</div>';
    });
    h+='</div>';
    // golden
    if(gd.sentence) h+='<div class="sec"><div class="sh"><span class="bar"></span>✨ 오늘의 빛나는 생각</div><div class="card golden"><div class="q">“'+esc(gd.sentence)+'”</div>'+(gd.critique?'<div class="c"><b>선생님 한마디 —</b> '+esc(gd.critique)+'</div>':'')+'</div></div>';
    // plan
    if(d.plan&&d.plan.length){ var pc=['#fde8e8','#e8f0fb','#eef0f4'],pf=['#b3261e','#245fa8','#5a6172'];
      h+='<div class="sec"><div class="sh"><span class="bar"></span>이번 달 우선순위</div><div class="sd">위에서 예측한 약점에 맞춰 무엇부터 하면 좋은지 순서대로 정했습니다.</div>';
      d.plan.slice(0,3).forEach(function(p,i){ h+='<div class="rx"><span class="pri" style="background:'+pc[i%3]+';color:'+pf[i%3]+'">'+esc(p.priority||['가장 먼저','다음','꾸준히'][i]||'')+'</span><div><h4>'+esc(p.title||'')+'</h4><p>'+(p.desc||'')+'</p></div></div>'; });
      h+='</div>';
    }
    // home talk
    if(d.homeTalk&&(d.homeTalk.items||[]).length){
      h+='<div class="sec"><div class="sh"><span class="bar"></span>🏠 가정에서 나눌 대화</div><div class="sd">정답을 정해주기보다, 아이 생각을 끝까지 들어봐 주세요.</div><div class="card talk">';
      d.homeTalk.items.forEach(function(it){ h+='<div class="it"><div class="q">“'+esc(it.q)+'”</div>'+(it.tip?'<div class="t"><b>팁 —</b> '+esc(it.tip)+'</div>':'')+'</div>'; });
      h+='</div></div>';
    }
    // book
    if(d.book&&d.book.title){
      h+='<div class="sec"><div class="sh"><span class="bar"></span>📖 함께 읽어보면 좋은 책</div><div class="card book"><div class="cv">📘</div><div>'
        +'<h4>'+esc(d.book.title)+'</h4><div class="au">'+esc(d.book.author||'')+(d.book.publisher?(' · '+esc(d.book.publisher)):'')+'</div>'
        +(d.book.desc?'<p>'+esc(d.book.desc)+(d.book.why?(' <b>'+esc(d.book.why)+'</b>'):'')+'</p>':'')+'</div></div></div>';
    }
    h+='<div class="foot"><b>어떻게 분석했나요</b> 학생이 워크북에 직접 쓴 답만을 근거로 합니다. \'예상되는 학습 약점\'은 관찰된 사고 습관을 바탕으로 한 예측이며 학생의 학년에 맞춰 제시합니다(단정이 아닌 대비용). 점수·등급은 같은 학년 기준의 참고 수치이며 다른 학생과의 등수가 아닙니다.<br><b>운영</b> 로그.알(펜타뷰) · 특허 10-2026-0053173 · penta-view.com</div>';
    root.innerHTML=h; mount.innerHTML=''; if(window.ArcheExport){ try{ _xbar(mount,root,d); }catch(e){} } mount.appendChild(root); return root;
  }

  function render(mount,d){
    d=d||{};
    if(d.stage==='track') return renderTrack(mount,d);
    if(d && Array.isArray(d.subjects) && d.subjects.length) return renderVisionNew(mount,d); /* [신규] 5과목 스키마 */
    inject(); var L=COPY[d.level==='architecture'?'architecture':'starter'];
    var st=d.student||{}, ls=d.lesson||{}, r=d.radar||{}, per=d.persona||{}, gd=d.golden||{}, road=d.roadmap||{}, bm=d.benchmark||{};
    var root=document.createElement('div'); root.className='apr';
    var h='';
    // cover + persona
    h+='<div class="cover"><div class="eb">'+esc(L.eyebrow)+' · 특허 10-2026-0053173</div>'
      +'<h1 class="serif">'+esc(st.name||'학생')+' 님의 리포트</h1>'
      +'<div class="meta">'+esc((ls.title||'')+(ls.theme?(' · '+ls.theme):''))+' · 시즌'+esc(ls.season||1)+' '+esc(ls.week||1)+'주차'+(st.grade?(' · '+esc(st.grade)):'')+'</div>';
    if(per.name) h+='<div class="persona"><div class="pl">오늘의 지성 페르소나</div><div class="pn">'+esc(per.name)+'</div><div class="pt">'+esc(per.tagline||'')+'</div></div>';
    h+='</div>';
    // radar growth
    if(r.after){
      h+='<div class="sec"><div class="sh">'+esc(L.radarTitle)+'</div><div class="sd">'+esc(L.radarNote)+'</div>';
      if(r.growthPct!=null) h+='<div class="hero"><div class="p">'+(r.growthPct>=0?'+':'')+r.growthPct+'%</div><div><div class="t">'+esc(L.growthWord)+'이 '+Math.abs(r.growthPct)+'% '+(r.growthPct>=0?'넓어졌어요':'변화했어요')+'</div><div class="d">'+esc(r.note||'')+'</div></div></div>';
      h+='<div class="radarbox">'+radarSVG(r.axes||['','','','',''],r.before,r.after)
        +'<div class="legend"><span style="color:#b8860b"><span class="sw" style="background:#D4AF37"></span>처음</span><span style="color:#1A237E"><span class="sw" style="background:#1A237E"></span>지금</span></div></div></div>';
    }
    // frequency profile
    if(d.frequencies&&d.frequencies.length){
      h+='<div class="sec"><div class="sh">'+esc(L.freqTitle)+'</div>';
      d.frequencies.forEach(function(f){
        h+='<div class="frow"><div class="fn">'+esc(f.name)+(f.note?'<div class="fnote">'+esc(f.note)+'</div>':'')+'</div><div class="fbar"><i style="width:'+(f.score*10)+'%"></i></div><div class="fv">'+(+f.score).toFixed(1)+'</div></div>';
      });
      h+='</div>';
    }
    // compass
    if(d.compass){
      var cv=d.compass.value!=null?d.compass.value:50;
      h+='<div class="sec"><div class="sh">'+esc(L.compassTitle)+'</div>'
        +'<div class="compass"><div class="ce"><span>많은 사람의 편리 · 효율</span><span>한 사람의 소중함 · 존엄</span></div>'
        +'<div class="ct"><span class="cm" style="left:'+cv+'%"></span></div>'
        +'<div class="clbl">'+esc(d.compass.label||'')+'</div></div></div>';
    }
    // benchmark
    if(bm.levels&&bm.levels.length){
      h+='<div class="sec"><div class="sh">'+esc(L.benchTitle)+'</div>'+(bm.topic?'<div class="sd">'+esc(bm.topic)+'</div>':'')+'<div class="bench">';
      bm.levels.forEach(function(lv,i){ h+='<div class="bcell b'+i+'"><span class="blab">'+esc(lv.label)+'</span>'+esc(lv.text)+'</div>'; });
      h+='</div></div>';
    }
    // golden
    if(gd.sentence){
      h+='<div class="sec" style="padding:0;background:transparent;border:0;box-shadow:none"><div class="golden"><div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#E8D9A0;margin-bottom:10px">✦ '+esc(L.goldenTitle)+'</div>'
        +'<div class="gq">'+esc(gd.sentence)+'</div>'
        +(gd.critique?'<div class="gc"><b>'+esc(L.goldenBy)+'</b> — '+esc(gd.critique)+'</div>':'')+'</div></div>';
    }
    // 문장력 진단
    h+=exprHtml(d);
    // 추천 도서 (주제 맞춤 1권)
    if(d.book && d.book.title){
      h+='<div class="sec"><div class="sh">📚 이 주제와 어울리는 책 한 권</div>'
        +'<div class="book"><div class="bspine">📖</div><div>'
        +'<div class="bt">'+esc(d.book.title)+'</div>'
        +'<div class="bmeta">'+esc(d.book.author||'')+(d.book.publisher?(' · '+esc(d.book.publisher)):'')+'</div>'
        +(d.book.desc?'<div class="bdesc">'+esc(d.book.desc)+'</div>':'')
        +(d.book.why?'<div class="bwhy">💡 이 학생에게 추천하는 이유 — '+esc(d.book.why)+'</div>':'')
        +'</div></div></div>';
    }
    // roadmap
    if((road.items&&road.items.length)||road.nextQuestion){
      h+='<div class="sec"><div class="sh">'+esc(L.roadTitle)+'</div>';
      (road.items||[]).forEach(function(it){ h+='<div class="ritem"><div class="ric">'+esc(it.icon||'📌')+'</div><div><div class="rt">'+esc(it.title)+'</div><div class="rd">'+esc(it.desc||'')+'</div></div></div>'; });
      if(road.nextQuestion) h+='<div class="nextq">🤔 <b>다음에 생각해볼 질문</b> — '+esc(road.nextQuestion)+'</div>';
      h+='</div>';
    }
    // 가정 연계 대화
    if(d.homeTalk && (d.homeTalk.items||[]).length){
      h+='<div class="sec"><div class="sh">🏠 '+esc(L.homeTitle)+'</div>'
        +(d.homeTalk.intro?'<div class="sd">'+esc(d.homeTalk.intro)+'</div>':'')+'<div class="home">';
      d.homeTalk.items.forEach(function(it,i){
        h+='<div class="htcard"><div class="htq">'+(i+1)+'. '+esc(it.q)+'</div>'+(it.tip?'<div class="htip">💬 '+esc(it.tip)+'</div>':'')+'</div>';
      });
      h+='</div></div>';
    }
    h+=gloSectionHtml(d);
    if(d.consultantConfirmed) h+='<div class="ctag">🖊️ 이 리포트는 담당 컨설턴트가 검토·확정 후 발행했습니다.</div>';
    h+='<div class="disc">본 리포트는 특허 출원 기술(10-2026-0053173) 기반 인지 진단 <b>참고 자료</b>로, 타 학생과의 서열·순위 비교를 포함하지 않으며 학교 성적·평가를 대체하지 않습니다. 성장에는 개인차가 있습니다.</div>'
      +'<div class="foot"><span>PentaView · 펜타 비전</span><span>'+esc(d.date||'')+' · penta-view.com</span></div>';
    root.innerHTML=h; mount.innerHTML=''; _xbar(mount,root,d); mount.appendChild(root); return root;
  }
  window.ArchePentaReport={ render:render, version:'2.0' };
})();
