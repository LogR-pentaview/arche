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

  function render(mount,d){
    d=d||{};
    if(d.stage==='track') return renderTrack(mount,d);
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
  window.ArchePentaReport={ render:render, version:'1.0' };
})();
