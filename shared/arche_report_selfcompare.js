/* ============================================================================
 * arche_report_selfcompare.js · 자기비교 리포트 (과거의 나 · 과목편차 · 내신대비 사고력)
 * ----------------------------------------------------------------------------
 * 원칙: 타인 서열 비교 없음. 오직 학생 본인의 여러 단면.
 * 데이터원: reflection_snapshots(sri/c2/resilience 시계열) + student_metrics + 내신
 * API: ArcheReportSelf.render(mount, data)
 *   data = {
 *     student:{name, grade, hope, meta},
 *     growth:{ pct, axes:[5], past:[5(0~10)], now:[5(0~10)], note },
 *     subjects:[{name, icon, score(0~10), tag, color}],
 *     gaps:[{subj, icon, naesin(1~9등급), think(0~10),
 *            verdict:'hidden-gem'|'aligned'|'watch', insight,
 *            diagnosis?:{cause, metrics:[{name,val(0~100),hi(bool)}], habit, rx:[{type:'think'|'study',text}], cta}}],
 *     evidence, consultantConfirmed
 *   }
 * ==========================================================================*/
(function () {
  "use strict";
  var CSS = ".arsc{max-width:760px;margin:0 auto;font-family:'Pretendard Variable',Pretendard,sans-serif;color:#191f28}"
    + ".arsc *{box-sizing:border-box}"
    + ".arsc .eb{font-size:11px;font-weight:800;color:#3182f6;letter-spacing:.14em;text-transform:uppercase;margin-bottom:6px}"
    + ".arsc .h1{font-size:21px;font-weight:800}.arsc .sub{font-size:13px;color:#4e5968;margin-top:6px;line-height:1.6}"
    + ".arsc .pr{display:inline-flex;gap:7px;font-size:11.5px;font-weight:700;color:#00b8a9;background:rgba(0,184,169,.09);border-radius:99px;padding:5px 13px;margin-top:12px}"
    + ".arsc .tgt{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #e5e8eb;border-radius:14px;padding:14px 18px;margin:18px 0 20px}"
    + ".arsc .av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3182f6,#00b8a9);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}"
    + ".arsc .nm{font-size:14px;font-weight:800}.arsc .mt{font-size:12px;color:#8b95a1;margin-top:2px}"
    + ".arsc .sl{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8b95a1;margin:26px 4px 12px;display:flex;align-items:center;gap:8px}.arsc .sl .n{width:20px;height:20px;border-radius:6px;background:#191f28;color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center}"
    + ".arsc .card{background:#fff;border:1px solid #e5e8eb;border-radius:18px;padding:22px 24px;margin-bottom:14px}"
    + ".arsc .ct{font-size:15px;font-weight:800;margin-bottom:4px}.arsc .cd{font-size:12.5px;color:#8b95a1;line-height:1.55;margin-bottom:16px}"
    + ".arsc .hero{display:flex;align-items:center;gap:18px;background:linear-gradient(135deg,#0f9d8f,#12b76a);border-radius:14px;padding:18px 20px;color:#fff;margin-bottom:16px}.arsc .hero .p{font-size:36px;font-weight:800;font-family:ui-monospace,monospace;line-height:1}.arsc .hero .t{font-size:13px;font-weight:800}.arsc .hero .d{font-size:12px;opacity:.92;margin-top:3px;line-height:1.5}"
    + ".arsc .legend{display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:12px}.arsc .legend span{display:inline-flex;align-items:center;gap:6px;font-weight:700}.arsc .sw{width:14px;height:4px;border-radius:2px}.arsc .past{color:#8b95a1}.arsc .past .sw{background:#c3cbd4}.arsc .now{color:#00b8a9}.arsc .now .sw{background:#00b8a9}"
    + ".arsc .srow{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #eef1f4}.arsc .srow:last-child{border-bottom:none}.arsc .sic{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}.arsc .snm{font-size:13.5px;font-weight:800}.arsc .stag{font-size:11px;color:#8b95a1;margin-top:1px}.arsc .sbar{height:8px;border-radius:99px;background:#e5e8eb;overflow:hidden;margin-top:7px}.arsc .sbar i{display:block;height:100%;border-radius:99px}.arsc .sval{width:44px;text-align:right;font-size:15px;font-weight:800;font-family:ui-monospace,monospace}"
    + ".arsc .note{font-size:12px;color:#4e5968;line-height:1.6;background:#f4f6f8;border-radius:10px;padding:12px 15px;margin-top:16px}.arsc .note b{color:#191f28}"
    + ".arsc .gap{margin-bottom:20px}.arsc .gh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}.arsc .gs{font-size:14px;font-weight:800}.arsc .gv{font-size:11px;font-weight:800;border-radius:99px;padding:3px 11px}.arsc .gv.hidden-gem{background:rgba(0,184,169,.12);color:#00b8a9}.arsc .gv.aligned{background:#f4f6f8;color:#8b95a1}.arsc .gv.watch{background:rgba(247,144,9,.12);color:#f79009}"
    + ".arsc .dl{display:flex;align-items:center;gap:10px;margin-bottom:8px}.arsc .dlb{width:76px;font-size:11.5px;font-weight:700;color:#4e5968;flex:none}.arsc .dt{flex:1;height:9px;border-radius:99px;background:#e5e8eb;overflow:hidden}.arsc .dt i{display:block;height:100%;border-radius:99px}.arsc .dt i.na{background:linear-gradient(90deg,#8b95a1,#b0b8c1)}.arsc .dt i.th{background:linear-gradient(90deg,#3182f6,#00b8a9)}.arsc .dv{width:56px;text-align:right;font-size:12px;font-weight:800;font-family:ui-monospace,monospace;flex:none}"
    + ".arsc .gi{font-size:12px;line-height:1.6;margin-top:10px;padding:11px 14px;border-radius:10px}.arsc .gi.pos{background:rgba(0,184,169,.06);color:#4e5968}.arsc .gi.pos b{color:#00b8a9}.arsc .gi.neu{background:#f4f6f8;color:#4e5968}"
    + ".arsc .diag{margin-top:12px;border:1px solid rgba(247,144,9,.25);border-radius:12px;overflow:hidden}.arsc .db{padding:13px 15px}.arsc .db+.db{border-top:1px solid #eef1f4}.arsc .dlab{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;margin-bottom:7px}.arsc .dlab.cause{color:#f79009}.arsc .dlab.rx{color:#3182f6}.arsc .dtx{font-size:12px;color:#4e5968;line-height:1.6}.arsc .dtx b{color:#191f28}"
    + ".arsc .mm{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}.arsc .m{flex:1;min-width:88px;background:#f4f6f8;border-radius:8px;padding:7px 9px}.arsc .m .mn{font-size:10px;font-weight:700;margin-bottom:3px;color:#8b95a1}.arsc .m .mb{height:5px;border-radius:99px;background:#e5e8eb;overflow:hidden}.arsc .m .mb i{display:block;height:100%}.arsc .m.hi .mb i{background:#12b76a}.arsc .m.hi .mn{color:#12b76a}.arsc .m.lo .mb i{background:#f04452}.arsc .m.lo .mn{color:#f04452}"
    + ".arsc .rx{display:flex;gap:9px;margin-top:9px}.arsc .rxic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex:none}.arsc .rxic.think{background:rgba(0,184,169,.12)}.arsc .rxic.study{background:rgba(49,130,246,.1)}.arsc .rxt{font-size:11.5px;font-weight:800;margin-bottom:2px}.arsc .rxt.think{color:#00b8a9}.arsc .rxt.study{color:#2563eb}.arsc .rxd{font-size:11.5px;color:#4e5968;line-height:1.55}.arsc .cta{display:inline-flex;gap:6px;font-size:11px;font-weight:700;color:#3182f6;background:rgba(49,130,246,.08);border-radius:8px;padding:6px 11px;margin-top:9px}"
    + ".arsc .ctag{font-size:10.5px;color:#8b95a1;margin-top:10px}"
    + ".arsc .ev{font-size:12px;color:#8b95a1;line-height:1.6;background:#f4f6f8;border-radius:10px;padding:12px 15px;margin-top:14px}.arsc .ev b{color:#4e5968}"
    + ".arsc .dis{font-size:11px;color:#8b95a1;line-height:1.6;margin-top:20px;padding:14px 16px;background:#f4f6f8;border-radius:12px}.arsc .dis b{color:#4e5968}"
    + ".arsc .foot{display:flex;justify-content:space-between;font-size:11px;color:#8b95a1;margin-top:18px;padding-top:14px;border-top:1px solid #e5e8eb}";

  function inject(){ if(document.getElementById("arsc-css"))return; var s=document.createElement("style");s.id="arsc-css";s.textContent=CSS;document.head.appendChild(s); }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  function radarSVG(axes, past, now){
    var C=150, cy=138, R=100, N=axes.length||5;
    function pt(i,r){var a=-Math.PI/2+i*2*Math.PI/N;return [C+r*Math.cos(a),cy+r*Math.sin(a)];}
    var g="";
    [1,0.66,0.33].forEach(function(f){var p=[];for(var i=0;i<N;i++){var xy=pt(i,R*f);p.push(xy[0].toFixed(0)+","+xy[1].toFixed(0));}g+='<polygon points="'+p.join(" ")+'" fill="none" stroke="#eef1f4" stroke-width="1.2"/>';});
    for(var i=0;i<N;i++){var xy=pt(i,R);g+='<line x1="150" y1="138" x2="'+xy[0].toFixed(0)+'" y2="'+xy[1].toFixed(0)+'" stroke="#e0e4e9"/>';}
    function poly(arr,fill,stroke,dash){var p=[];for(var i=0;i<N;i++){var xy=pt(i,R*Math.max(0,Math.min(10,arr[i]||0))/10);p.push(xy[0].toFixed(0)+","+xy[1].toFixed(0));}return '<polygon points="'+p.join(" ")+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(dash?2:2.5)+'"'+(dash?' stroke-dasharray="4 3"':'')+' stroke-linejoin="round"/>';}
    if(past) g+=poly(past,"rgba(176,184,193,.14)","#c3cbd4",true);
    if(now){ g+=poly(now,"rgba(0,184,169,.2)","#00b8a9",false);
      for(var k=0;k<N;k++){var xy=pt(k,R*Math.max(0,Math.min(10,now[k]||0))/10);g+='<circle cx="'+xy[0].toFixed(0)+'" cy="'+xy[1].toFixed(0)+'" r="4" fill="#00b8a9"/>';}}
    for(var j=0;j<N;j++){var xy=pt(j,R+22);g+='<text x="'+xy[0].toFixed(0)+'" y="'+xy[1].toFixed(0)+'" font-size="12" font-weight="700" fill="#191f28" text-anchor="middle" dominant-baseline="middle">'+esc(axes[j])+'</text>';}
    return '<svg width="300" height="290" viewBox="0 0 300 290">'+g+'</svg>';
  }

  function render(mount, d){
    inject(); d=d||{};
    var st=d.student||{}, gr=d.growth||{}, initial=(st.name||"학").charAt(0);
    var root=document.createElement("div"); root.className="arsc";
    var html =
      '<div class="eb">Self-Comparison · 나를 기준으로 한 비교</div>'
      + '<div class="h1">남이 아니라, 나를 기준으로 봅니다</div>'
      + '<div class="sub">등수가 아니라 — 과거의 나, 과목별 나, 성적이 못 보여준 나. 세 개의 거울.</div>'
      + '<div class="pr">🌱 타인 서열 비교 없음 · 오직 나의 여러 단면</div>'
      + '<div class="tgt"><div class="av">'+esc(initial)+'</div><div><div class="nm">'+esc(st.name||"학생")+' · '+esc(st.grade||"")+(st.hope?' · '+esc(st.hope):"")+'</div><div class="mt">'+esc(st.meta||"")+'</div></div></div>';

    // ① 성장
    if(gr.now){
      html += '<div class="sl"><span class="n">1</span> 과거의 나와 비교 · 성장</div><div class="card">'
        + '<div class="ct">3개월 전의 나 → 지금의 나</div><div class="cd">첫 측정과 현재의 역량 레이더를 겹쳐 봅니다.</div>'
        + (gr.pct!=null?'<div class="hero"><div class="p">'+(gr.pct>=0?"+":"")+gr.pct+'%</div><div><div class="t">역량 면적이 '+Math.abs(gr.pct)+'% '+(gr.pct>=0?"넓어졌어요":"변화했어요")+'</div><div class="d">'+esc(gr.note||"")+'</div></div></div>':"")
        + '<div style="text-align:center">'+radarSVG(gr.axes||["연결지성","회복지성","확장지성","발상지성","사고지성"], gr.past, gr.now)+'</div>'
        + '<div class="legend"><span class="past"><span class="sw"></span>3개월 전</span><span class="now"><span class="sw"></span>지금</span></div></div>';
    }
    // ② 과목편차
    if(d.subjects&&d.subjects.length){
      html += '<div class="sl"><span class="n">2</span> 과목별 나 · 사고력 편차</div><div class="card"><div class="ct">과목마다 사고의 결이 다릅니다</div><div class="cd">같은 학생도 과목에 따라 사고력이 다르게 발현됩니다.</div>';
      d.subjects.forEach(function(s){
        var col=s.color||"#00b8a9";
        html+='<div class="srow"><div class="sic" style="background:'+hexa(col,.12)+'">'+esc(s.icon||"📘")+'</div>'
          +'<div style="flex:1;min-width:0"><div class="snm">'+esc(s.name)+'</div>'+(s.tag?'<div class="stag">'+esc(s.tag)+'</div>':"")
          +'<div class="sbar"><i style="width:'+(s.score*10)+'%;background:'+col+'"></i></div></div>'
          +'<div class="sval" style="color:'+col+'">'+(+s.score).toFixed(1)+'</div></div>';
      });
      if(d.subjectNote) html+='<div class="note">📊 '+d.subjectNote+'</div>';
      html+='</div>';
    }
    // ③ 내신 대비 사고력
    if(d.gaps&&d.gaps.length){
      html += '<div class="sl"><span class="n">3</span> 성적이 못 보여준 나 · 내신 대비 사고력</div><div class="card">'
        + '<div class="cd">내신 <b>등급</b>과 아르케가 측정한 <b>사고력</b>을 나란히 놓습니다. 어긋나는 지점에 성적표가 놓친 신호가 있습니다.</div>';
      d.gaps.forEach(function(g,idx){
        var vw={"hidden-gem":"✦ 숨은 강점","aligned":"≈ 성적-사고 일치","watch":"△ 살펴볼 지점"}[g.verdict]||"";
        var naW=Math.round((10-(g.naesin||5))/9*100+10); if(naW>100)naW=100; if(naW<0)naW=0;
        html+='<div class="gap"'+(idx===d.gaps.length-1?' style="margin-bottom:0"':"")+'><div class="gh"><span class="gs">'+esc((g.icon||"")+" "+g.subj)+'</span><span class="gv '+g.verdict+'">'+esc(vw)+'</span></div>'
          +'<div class="dl"><span class="dlb">내신 등급</span><span class="dt"><i class="na" style="width:'+naW+'%"></i></span><span class="dv">'+esc(g.naesin)+'등급</span></div>'
          +'<div class="dl"><span class="dlb">사고력</span><span class="dt"><i class="th" style="width:'+(g.think*10)+'%"></i></span><span class="dv">'+(+g.think).toFixed(1)+'/10</span></div>'
          +'<div class="gi '+(g.verdict==="hidden-gem"?"pos":"neu")+'">'+esc(g.insight||"")+'</div>';
        if(g.diagnosis){
          var dg=g.diagnosis;
          html+='<div class="diag"><div class="db"><div class="dlab cause">🔍 원인 진단</div><div class="dtx">'+esc(dg.cause||"")+'</div>';
          if(dg.metrics&&dg.metrics.length){html+='<div class="mm">'+dg.metrics.map(function(m){return '<div class="m '+(m.hi?"hi":"lo")+'"><div class="mn">'+esc(m.name)+'</div><div class="mb"><i style="width:'+m.val+'%"></i></div></div>';}).join("")+'</div>';}
          html+='</div>';
          if(dg.habit) html+='<div class="db"><div class="dlab cause">🧩 사고 습관</div><div class="dtx">'+esc(dg.habit)+'</div></div>';
          if(dg.rx&&dg.rx.length){ html+='<div class="db"><div class="dlab rx">💡 개선 방향</div>';
            dg.rx.forEach(function(r){var t=r.type==="study";html+='<div class="rx"><div class="rxic '+(t?"study":"think")+'">'+(t?"📚":"🧠")+'</div><div><div class="rxt '+(t?"study":"think")+'">'+(t?"학습법":"사고법")+'</div><div class="rxd">'+esc(r.text)+'</div></div></div>';});
            if(dg.cta) html+='<div class="cta">＋ '+esc(dg.cta)+' →</div>';
            html+='</div>';
          }
          html+='</div>';
        }
        html+='</div>';
      });
      if(d.consultantConfirmed) html+='<div class="ctag">🖊️ 이 진단·처방은 담당 컨설턴트가 검토·확정했습니다.</div>';
      html+='</div>';
    }
    html += (d.evidence?'<div class="ev"><b>산출 근거</b> — '+esc(d.evidence)+'</div>':"")
      + '<div class="dis"><b>안내</b> — 모든 비교는 <b>학생 본인의 데이터 안에서만</b> 이루어지며 타 학생과의 서열·순위를 포함하지 않습니다. 수치는 특허 출원(10-2026-0053173) 기반 참고 자료로 생활기록부 공식 기재문·학교 평가를 대체하지 않습니다.</div>'
      + '<div class="foot"><span>특허 출원 10-2026-0053173 · 다차원 자기비교 분석</span><span style="font-family:ui-monospace,monospace">'+esc(d.date||"")+' · penta-view.com</span></div>';
    root.innerHTML=html; mount.innerHTML=""; mount.appendChild(root);
    return root;
  }
  function hexa(hex,a){ if(!/^#/.test(hex))return hex; var n=parseInt(hex.slice(1),16); return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")"; }

  window.ArcheReportSelf = { render: render, version: "1.0" };
})();
