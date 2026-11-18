/* ============================================================================
 * arche_ramyeon_report.js · '~와 함께라면' 5개의 눈 성장 리포트 렌더러 (v1)
 * API: ArcheRamyeonReport.render(mount, report)   (report.kind==='ramyeon')
 * 원칙: 실력이 아닌 '생각이 담긴 정도' · 근거 문장 필수 · 서열 비교 없음
 * ============================================================================ */
(function(){
  'use strict';
  var EYES=[{ax:'F1',ic:'📖',nm:'이야기의 눈',c:'#e0453a'},{ax:'F2',ic:'🌿',nm:'자연의 눈',c:'#2f9e8f'},{ax:'F3',ic:'🌍',nm:'세상의 눈',c:'#2b6cb0'},{ax:'F4',ic:'💗',nm:'마음의 눈',c:'#d6578a'},{ax:'F5',ic:'🎨',nm:'아름다움의 눈',c:'#d4a94a'}];
  var LV=['','🌱 씨앗','🌿 새싹','🌸 꽃','🍎 열매'];
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var CSS='.ramr{font-family:-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#241c12;line-height:1.65;font-size:15px;max-width:760px;margin:0 auto;padding:4px 2px 30px}'
  +'.ramr *{box-sizing:border-box}'
  +'.ramr .hero{background:linear-gradient(150deg,#14203a,#22335a);color:#fff;border-radius:18px;padding:20px 18px 18px;position:relative;overflow:hidden}'
  +'.ramr .hero:after{content:"🍜";position:absolute;right:14px;top:8px;font-size:54px}'
  +'.ramr .eb{font-size:11.5px;letter-spacing:.06em;color:#f0a830;font-weight:800}'
  +'.ramr .hero h1{font-size:20px;margin:6px 0 2px;line-height:1.4;padding-right:60px}'
  +'.ramr .hero .mt{font-size:12.5px;color:#c9d2e8}'
  +'.ramr .chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.ramr .chip{background:rgba(255,255,255,.14);border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700}'
  +'.ramr .card{background:#fffdf7;border:1px solid #e6dcc6;border-radius:16px;padding:16px;margin-top:14px}'
  +'.ramr .card h2{font-size:16.5px;margin:0 0 4px}.ramr .card .sub{font-size:12.5px;color:#8a7d6a;margin:0 0 12px}'
  +'.ramr .sum{font-size:15px}'
  +'.ramr .rd{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center}'
  +'.ramr .lg{font-size:12.5px;color:#5b4f40;display:flex;flex-direction:column;gap:6px}.ramr .lg i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}'
  +'.ramr .eyes{display:grid;gap:9px}'
  +'.ramr .eye{border:1px solid #e6dcc6;border-radius:13px;padding:11px 12px;background:#fff}'
  +'.ramr .eye .hd{display:flex;align-items:center;gap:8px}.ramr .eye .ic{font-size:22px}.ramr .eye b{font-size:14px}.ramr .eye .lv{margin-left:auto;font-size:12.5px;font-weight:800;border-radius:999px;padding:2px 10px;background:#f3ecd9}'
  +'.ramr .eye .bar{display:flex;gap:4px;margin-top:8px}.ramr .eye .bar i{flex:1;height:7px;border-radius:5px;background:#eee4cd}'
  +'.ramr .eye p{margin:7px 0 0;font-size:13.5px;color:#5b4f40}'
  +'.ramr .eye q{display:block;margin-top:6px;border-left:3px solid #d4a94a;padding:2px 0 2px 9px;font-size:13px;color:#241c12;quotes:none}'
  +'.ramr .eye.off{opacity:.6;background:#faf6ea}.ramr .tag{font-size:11px;font-weight:800;color:#9b7424;background:#fff0c4;border-radius:6px;padding:1px 6px;margin-left:6px}'
  +'.ramr .arts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ramr figure{margin:0;border:1px solid #e6dcc6;border-radius:12px;overflow:hidden;background:#fcfaf4}'
  +'.ramr figure img{display:block;width:100%;height:auto}.ramr figcaption{font-size:11.5px;padding:6px 8px;color:#5b4f40;border-top:1px solid #e6dcc6;line-height:1.45}.ramr figcaption b{display:block;color:#241c12;font-size:12px}'
  +'.ramr .gold{background:linear-gradient(135deg,#fff7df,#fff0c4);border:2px solid #d4a94a;border-radius:16px;padding:16px;margin-top:14px}'
  +'.ramr .gold .t{font-size:12px;font-weight:800;color:#9b7424}.ramr .gold q{display:block;font-size:17px;font-weight:800;line-height:1.6;margin:8px 0 4px;quotes:none}.ramr .gold .by{font-size:12.5px;color:#5b4f40}'
  +'.ramr .self{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ramr .self div{background:#f3ecd9;border-radius:10px;padding:8px;text-align:center;font-size:12px}.ramr .self b{display:block;font-size:16px;color:#e0453a}'
  +'.ramr .qa{border-left:4px solid #d4a94a;background:#fff;border-radius:0 12px 12px 0;padding:9px 12px;margin-top:9px;font-size:13.5px}.ramr .qa small{display:block;color:#8a7d6a;font-size:12px;margin-top:3px}'
  +'.ramr .foot{font-size:12px;color:#8a7d6a;margin-top:18px;line-height:1.7;text-align:center}'
  +'@media(max-width:520px){.ramr .arts{grid-template-columns:1fr 1fr}}';
  function inject(){ if(document.getElementById('ramr-css'))return; var s=document.createElement('style'); s.id='ramr-css'; s.textContent=CSS; document.head.appendChild(s); }

  function radarSvg(eyes){
    var W=250,cx=125,cy=125,R=88,n=5;
    function pt(i,r){ var a=-Math.PI/2+i*2*Math.PI/n; return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; }
    var g='';
    for(var k=1;k<=4;k++){ var ps=[]; for(var i=0;i<n;i++){ var p=pt(i,R*k/4); ps.push(p[0].toFixed(1)+','+p[1].toFixed(1)); } g+='<polygon points="'+ps.join(' ')+'" fill="none" stroke="#e6dcc6" stroke-width="1"/>'; }
    for(var i2=0;i2<n;i2++){ var p2=pt(i2,R); g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+'" stroke="#e6dcc6"/>'; }
    var vs=[],dots='';
    eyes.forEach(function(e,i){ var l=e.level||0; var p=pt(i,R*l/4); vs.push(p[0].toFixed(1)+','+p[1].toFixed(1)); if(e.level) dots+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4" fill="'+EYES[i].c+'" stroke="#fff" stroke-width="1.5"/>'; });
    g+='<polygon points="'+vs.join(' ')+'" fill="rgba(224,69,58,.18)" stroke="#e0453a" stroke-width="2" stroke-linejoin="round"/>'+dots;
    eyes.forEach(function(e,i){ var p=pt(i,R+22); g+='<text x="'+p[0].toFixed(1)+'" y="'+(p[1]+4).toFixed(1)+'" text-anchor="middle" font-size="11.5" font-weight="700" fill="'+(e.level?'#241c12':'#a89b86')+'">'+EYES[i].ic+(e.level?'':' —')+'</text>'; });
    return '<svg viewBox="0 0 '+W+' '+W+'" width="230" height="230" role="img" aria-label="5개의 눈 레이더">'+g+'</svg>';
  }

  function render(mount, r){
    inject(); r=r||{};
    var eyes=(r.eyes||[]).slice(); while(eyes.length<5) eyes.push({axis:'F'+(eyes.length+1),level:null});
    var L=r.lesson||{}, S=r.student||{};
    var h='<div class="ramr">';
    h+='<div class="hero"><div class="eb">~와 함께라면 · 5개의 눈 성장 리포트</div><h1>'+esc((r.persona&&r.persona.name)||(S.name?S.name+'의 오늘':'오늘의 생각'))+'</h1><div class="mt">'+esc((r.persona&&r.persona.tagline)||'')+'</div>'
      +'<div class="chips">'+(S.name?'<span class="chip">'+esc(S.name)+(S.grade?' · '+esc(S.grade):'')+'</span>':'')+(L.season?'<span class="chip">시즌 '+esc(L.season)+' · '+esc(L.week)+'강</span>':'')+(L.work?'<span class="chip">'+esc(L.work)+'</span>':'')+(L.date?'<span class="chip">'+esc(L.date)+'</span>':'')+'</div></div>';
    if(r.summary) h+='<div class="card"><h2>🍜 오늘의 한 그릇</h2><div class="sum">'+esc(r.summary)+'</div></div>';
    h+='<div class="card"><h2>👁️ 5개의 눈</h2><p class="sub">잘하고 못하고가 아니라 "생각이 얼마나 담겼는지"를 봤어요. 이번 강에서 쓰지 않은 눈은 비워 두었어요.</p><div class="rd">'+radarSvg(eyes)
      +'<div class="lg">'+EYES.map(function(e,i){ var lv=eyes[i].level; return '<span><i style="background:'+e.c+'"></i>'+e.nm+' · '+(lv?LV[lv]:'<span style="color:#a89b86">측정 안 함</span>')+'</span>'; }).join('')+'<span style="color:#8a7d6a;font-size:11.5px">바깥쪽일수록 🍎 열매 (4단계)</span></div></div></div>';
    h+='<div class="card"><h2>📋 눈별 관찰</h2><div class="eyes">';
    eyes.forEach(function(e,i){
      var E=EYES[i]; var lv=e.level;
      var bar='<div class="bar">'+[1,2,3,4].map(function(k){ return '<i style="'+(lv&&k<=lv?'background:'+E.c:'')+'"></i>'; }).join('')+'</div>';
      if(!lv){ h+='<div class="eye off"><div class="hd"><span class="ic">'+E.ic+'</span><b>'+E.nm+'</b><span class="lv">측정 안 함</span></div><p>'+esc(e.reason||'이번 강에서는 사용하지 않았어요')+'</p></div>'; return; }
      h+='<div class="eye"><div class="hd"><span class="ic">'+E.ic+'</span><b>'+E.nm+'</b>'+(e.confidence==='low'?'<span class="tag">참고용</span>':'')+'<span class="lv">'+LV[lv]+'</span></div>'+bar
        +(e.note?'<p>'+esc(e.note)+'</p>':'')+(e.evidence||[]).map(function(q){ return '<q>'+esc(q)+'</q>'; }).join('')+'</div>';
    });
    h+='</div></div>';
    var dr=r.drawings||[];
    if(dr.length) h+='<div class="card"><h2>🎨 오늘 그린 그림</h2><p class="sub">그림 솜씨가 아니라 그림 속에 담긴 생각을 봤어요.</p><div class="arts">'+dr.map(function(d){ return '<figure>'+(d.img?'<img alt="아이가 그린 그림" src="'+esc(d.img)+'">':'')+'<figcaption>'+(d.caption?'<b>'+esc(d.caption)+'</b>':'')+esc(d.observation||'')+'</figcaption></figure>'; }).join('')+'</div></div>';
    if(r.golden&&r.golden.sentence) h+='<div class="gold"><div class="t">✨ 오늘의 황금 문장</div><q>'+esc(r.golden.sentence)+'</q><div class="by">'+esc(r.golden.critique||'')+'</div></div>';
    var sf=r.self; if(sf&&sf.axes&&sf.axes.length){
      h+='<div class="card"><h2>🙋 내가 느낀 눈의 성장</h2><p class="sub">아이가 스스로 체크한 숫자예요. (공부 전 → 후)</p><div class="self">'+sf.axes.map(function(a,i){ return '<div>'+esc(a)+'<b>'+esc(sf.before[i])+' → '+esc(sf.after[i])+'</b></div>'; }).join('')+'</div></div>';
    }
    var hm=r.home||[]; if(hm.length) h+='<div class="card"><h2>🏠 집에서 이어 가기</h2>'+hm.map(function(x){ return '<div class="qa">'+esc(x.q)+(x.tip?'<small>'+esc(x.tip)+'</small>':'')+'</div>'; }).join('')+'</div>';
    h+='<div class="foot">이 리포트는 아이가 직접 쓰고 그린 내용을 바탕으로 AI가 만든 초안을 부모님이 확인해 발행한 것입니다.<br>다른 아이와 비교하지 않으며, 어제의 아이가 오늘 얼마나 자랐는지를 봅니다.</div></div>';
    mount.innerHTML=h;
  }
  window.ArcheRamyeonReport={ render:render, version:'1.0' };
})();
