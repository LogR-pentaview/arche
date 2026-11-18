/* ============================================================================
 * arche_ramyeon_season.js · '~와 함께라면' 시즌 성장 리포트 (v1)
 * API: ArcheRamyeonSeason.mount(host, {studentId,name,grade})
 * 데이터: penta_submissions(stage='ramyeon_lit', status='sent', report.kind==='ramyeon') 집계 — AI 호출 없음
 * 구성: 시즌 5눈 레이더(이전 시즌 비교) · 5눈×5강 히트표 · 관찰 ≤2(참고용) · 그림 모음 · 황금 문장
 * ============================================================================ */
(function(){
  'use strict';
  var EYES=[{ax:'F1',ic:'📖',nm:'이야기',c:'#e0453a'},{ax:'F2',ic:'🌿',nm:'자연',c:'#2f9e8f'},{ax:'F3',ic:'🌍',nm:'세상',c:'#2b6cb0'},{ax:'F4',ic:'💗',nm:'마음',c:'#d6578a'},{ax:'F5',ic:'🎨',nm:'아름다움',c:'#d4a94a'}];
  var LVI=['','🌱','🌿','🌸','🍎'], LVN=['','씨앗','새싹','꽃','열매'];
  var SNAME={1:'나',2:'가족',3:'친구',4:'마을과 나라'};
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function sbc(){ return window.sb; }
  var CSS='.rsn{font-family:-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#241c12;line-height:1.65;font-size:15px;max-width:760px;margin:0 auto}.rsn *{box-sizing:border-box}'
  +'.rsn .hero{background:linear-gradient(150deg,#14203a,#22335a);color:#fff;border-radius:18px;padding:18px;position:relative;overflow:hidden}.rsn .hero:after{content:"🍜";position:absolute;right:14px;top:8px;font-size:50px}'
  +'.rsn .eb{font-size:11.5px;letter-spacing:.06em;color:#f0a830;font-weight:800}.rsn .hero h1{font-size:20px;margin:6px 0 2px;padding-right:56px}.rsn .hero .mt{font-size:12.5px;color:#c9d2e8}'
  +'.rsn .tabs{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}.rsn .tabs button{border:1px solid #e6dcc6;background:#fff;border-radius:999px;padding:7px 13px;font:inherit;font-size:12.5px;font-weight:800;color:#5b4f40;cursor:pointer}.rsn .tabs button.on{background:#14203a;color:#fff;border-color:#14203a}.rsn .tabs button:disabled{opacity:.4;cursor:default}'
  +'.rsn .card{background:#fffdf7;border:1px solid #e6dcc6;border-radius:16px;padding:16px;margin-top:14px}.rsn .card h2{font-size:16.5px;margin:0 0 4px}.rsn .sub{font-size:12.5px;color:#8a7d6a;margin:0 0 12px}'
  +'.rsn .rd{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center}.rsn .lg{font-size:12.5px;color:#5b4f40;display:flex;flex-direction:column;gap:6px}.rsn .lg i{display:inline-block;width:18px;height:0;border-top:3px solid;margin-right:6px;vertical-align:3px}'
  +'.rsn table{border-collapse:collapse;width:100%;font-size:12.5px}.rsn th,.rsn td{border:1px solid #e6dcc6;padding:7px 4px;text-align:center}.rsn th{background:#f3ecd9;font-size:11.5px}.rsn td.l{text-align:left;font-weight:800;white-space:nowrap;padding-left:7px}.rsn td.av{font-weight:800;color:#e0453a}.rsn td small{display:block;color:#8a7d6a;font-size:10.5px;font-weight:600}'
  +'.rsn .ob{border-left:4px solid #d4a94a;background:#fff;border-radius:0 12px 12px 0;padding:9px 12px;margin-top:9px;font-size:13.5px}.rsn .tag{font-size:11px;font-weight:800;color:#9b7424;background:#fff0c4;border-radius:6px;padding:1px 6px;margin-left:6px}'
  +'.rsn .arts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rsn figure{margin:0;border:1px solid #e6dcc6;border-radius:12px;overflow:hidden;background:#fcfaf4}.rsn figure img{display:block;width:100%;height:auto}.rsn figcaption{font-size:11px;padding:5px 7px;color:#5b4f40;border-top:1px solid #e6dcc6;line-height:1.4}'
  +'.rsn .gs{border-left:4px solid #d4a94a;background:#fff7df;border-radius:0 12px 12px 0;padding:9px 12px;margin-top:8px;font-size:14px;font-weight:700}.rsn .gs small{display:block;color:#8a7d6a;font-weight:600;font-size:11.5px}'
  +'.rsn .empty{text-align:center;color:#8a7d6a;padding:30px 10px}.rsn .foot{font-size:12px;color:#8a7d6a;margin-top:18px;line-height:1.7;text-align:center}.rsn .pr{border:1px solid #14203a;background:#fff;color:#14203a;border-radius:10px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:800;cursor:pointer;margin-top:12px}'
  +'@media(max-width:520px){.rsn .arts{grid-template-columns:1fr 1fr}}@media print{.rsn .tabs,.rsn .pr{display:none}}';
  function inject(){ if(document.getElementById('rsn-css'))return; var s=document.createElement('style'); s.id='rsn-css'; s.textContent=CSS; document.head.appendChild(s); }

  function avgOf(arr){ var v=arr.filter(function(x){return x!=null;}); return v.length?v.reduce(function(a,b){return a+b;},0)/v.length:null; }
  function aggregate(subs){ // → {season:{lessons:{week:rep}, avg:[5], cnt:[5]}}
    var by={};
    subs.forEach(function(s){ var r=s.report; if(!r||r.kind!=='ramyeon')return; var se=+s.season, wk=+s.week; (by[se]=by[se]||{lessons:{}}).lessons[wk]=r; });
    Object.keys(by).forEach(function(se){ var o=by[se]; o.avg=[];o.cnt=[];
      for(var i=0;i<5;i++){ var lv=[]; Object.keys(o.lessons).forEach(function(wk){ var e=((o.lessons[wk].eyes)||[])[i]; if(e&&e.level)lv.push(e.level); }); o.cnt.push(lv.length); o.avg.push(avgOf(lv)); }
    });
    return by;
  }
  function radarSvg(cur, prev){
    var W=260,cx=130,cy=130,R=92,n=5;
    function pt(i,r){ var a=-Math.PI/2+i*2*Math.PI/n; return [cx+r*Math.cos(a),cy+r*Math.sin(a)]; }
    var g='';
    for(var k=1;k<=4;k++){ var ps=[]; for(var i=0;i<n;i++){ var p=pt(i,R*k/4); ps.push(p[0].toFixed(1)+','+p[1].toFixed(1)); } g+='<polygon points="'+ps.join(' ')+'" fill="none" stroke="#e6dcc6"/>'; }
    for(var j=0;j<n;j++){ var q=pt(j,R); g+='<line x1="'+cx+'" y1="'+cy+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'" stroke="#e6dcc6"/>'; }
    function poly(av,stroke,fill,dash){ var vs=av.map(function(v,i){ var p=pt(i,R*(v||0)/4); return p[0].toFixed(1)+','+p[1].toFixed(1); }); return '<polygon points="'+vs.join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2" stroke-linejoin="round"'+(dash?' stroke-dasharray="5 4"':'')+'/>'; }
    if(prev) g+=poly(prev,'#8a7d6a','rgba(138,125,106,.08)',true);
    g+=poly(cur,'#e0453a','rgba(224,69,58,.18)',false);
    cur.forEach(function(v,i){ if(v){ var p=pt(i,R*v/4); g+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4" fill="'+EYES[i].c+'" stroke="#fff" stroke-width="1.5"/>'; } var l=pt(i,R+24); g+='<text x="'+l[0].toFixed(1)+'" y="'+(l[1]+4).toFixed(1)+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+(v?'#241c12':'#a89b86')+'">'+EYES[i].ic+(v?'':' —')+'</text>'; });
    return '<svg viewBox="0 0 '+W+' '+W+'" width="240" height="240" role="img" aria-label="시즌 5개의 눈 레이더">'+g+'</svg>';
  }
  function fx(v){ return v==null?'—':(Math.round(v*10)/10).toFixed(1); }
  function observations(o, p){
    var out=[];
    if(p){ var best=-1,bd=0; for(var i=0;i<5;i++){ if(o.avg[i]!=null&&p.avg[i]!=null&&o.cnt[i]>=1){ var d=o.avg[i]-p.avg[i]; if(d>bd){bd=d;best=i;} } }
      if(best>=0&&bd>=0.5) out.push({t:'지난 시즌보다 <b>'+EYES[best].nm+'의 눈</b>이 커졌어요 (평균 '+fx(p.avg[best])+' → '+fx(o.avg[best])+').',low:o.cnt[best]<2}); }
    var top=-1,tv=0; for(var k=0;k<5;k++){ if(o.cnt[k]>=2&&o.avg[k]>tv){tv=o.avg[k];top=k;} }
    if(top<0){ for(var k2=0;k2<5;k2++){ if(o.avg[k2]!=null&&o.avg[k2]>tv){tv=o.avg[k2];top=k2;} } }
    if(top>=0&&out.length<2) out.push({t:'이번 시즌은 <b>'+EYES[top].nm+'의 눈</b>에서 가장 많은 생각이 보였어요.',low:o.cnt[top]<2});
    var low=-1,lv2=9; for(var m=0;m<5;m++){ if(o.cnt[m]>=2&&o.avg[m]<lv2){lv2=o.avg[m];low=m;} }
    if(low>=0&&low!==top&&out.length<2) out.push({t:'다음 시즌에는 <b>'+EYES[low].nm+'의 눈</b>을 키우는 질문을 집에서 함께 나눠 보세요.',low:true});
    return out.slice(0,2);
  }
  function drawSeason(root, name, by, season){
    var o=by[season]; var seasons=Object.keys(by).map(Number).sort(); var prevS=null; seasons.forEach(function(s){ if(s<season) prevS=s; });
    var p=prevS!=null?by[prevS]:null;
    var h='';
    var weeks=[1,2,3,4,5];
    h+='<div class="card"><h2>👁️ 시즌 '+season+' · '+esc(SNAME[season]||'')+' — 5개의 눈</h2><p class="sub">이번 시즌 '+Object.keys(o.lessons).length+'강의 평균이에요. 점선은 '+(p?'지난 시즌('+prevS+')':'—')+'.</p><div class="rd">'+radarSvg(o.avg,p?p.avg:null)
      +'<div class="lg"><span><i style="border-color:#e0453a"></i>이번 시즌</span>'+(p?'<span><i style="border-color:#8a7d6a;border-top-style:dashed"></i>지난 시즌</span>':'<span style="color:#8a7d6a;font-size:11.5px">첫 시즌이라 비교할 지난 시즌이 없어요</span>')+'<span style="color:#8a7d6a;font-size:11.5px">바깥쪽일수록 🍎 열매</span></div></div></div>';
    h+='<div class="card"><h2>🗓️ 강별 5개의 눈</h2><p class="sub">🌱씨앗 🌿새싹 🌸꽃 🍎열매 · — 은 그 강에서 쓰지 않은 눈이에요.</p><div style="overflow-x:auto"><table><tr><th></th>'+weeks.map(function(w){return '<th>'+w+'강</th>';}).join('')+'<th>평균</th></tr>';
    EYES.forEach(function(E,i){ h+='<tr><td class="l">'+E.ic+' '+E.nm+'</td>'+weeks.map(function(w){ var r=o.lessons[w]; var e=r&&(r.eyes||[])[i]; return '<td>'+(e&&e.level?LVI[e.level]:'—')+'</td>'; }).join('')+'<td class="av">'+fx(o.avg[i])+'<small>'+o.cnt[i]+'회 관찰'+(o.cnt[i]===1?' · 참고용':'')+'</small></td></tr>'; });
    h+='</table></div></div>';
    var ob=observations(o,p);
    if(ob.length) h+='<div class="card"><h2>🔎 이번 시즌 관찰</h2>'+ob.map(function(x){return '<div class="ob">'+x.t+(x.low?'<span class="tag">참고용</span>':'')+'</div>';}).join('')+'<p class="sub" style="margin-top:10px">관찰 횟수가 적은 눈은 참고용으로만 봐 주세요.</p></div>';
    var arts=[]; weeks.forEach(function(w){ var r=o.lessons[w]; if(r)(r.drawings||[]).forEach(function(d){ if(d.img)arts.push({w:w,d:d,t:(r.lesson&&r.lesson.work)||''}); }); });
    if(arts.length) h+='<div class="card"><h2>🎨 이번 시즌 그림 모음</h2><p class="sub">그림 솜씨가 아니라 담긴 생각을 모았어요.</p><div class="arts">'+arts.map(function(a){ return '<figure><img alt="아이 그림" src="'+esc(a.d.img)+'"><figcaption><b>'+a.w+'강</b> '+esc(a.d.caption||'')+'</figcaption></figure>'; }).join('')+'</div></div>';
    var gs=[]; weeks.forEach(function(w){ var r=o.lessons[w]; if(r&&r.golden&&r.golden.sentence)gs.push({w:w,s:r.golden.sentence,t:(r.lesson&&r.lesson.work)||''}); });
    if(gs.length) h+='<div class="card"><h2>✨ 이번 시즌 황금 문장</h2>'+gs.map(function(x){return '<div class="gs">'+esc(x.s)+'<small>'+x.w+'강 · '+esc(x.t)+'</small></div>';}).join('')+'</div>';
    h+='<button class="pr" onclick="window.print()">🖨️ 인쇄 / PDF로 저장</button><div class="foot">이 리포트는 부모님이 발행한 강별 리포트를 모아 만든 것입니다.<br>다른 아이와 비교하지 않으며, 지난 시즌의 아이와 비교합니다.</div>';
    root.innerHTML=h;
  }
  async function mount(host, ctx){
    inject(); ctx=ctx||{};
    host.innerHTML='<div class="rsn"><div class="empty">불러오는 중…</div></div>'; var root=host.firstChild;
    var subs=[];
    try{ var r=await sbc().from('penta_submissions').select('season,week,report,status,sent_at').eq('student_id',ctx.studentId).eq('stage','ramyeon_lit').eq('status','sent'); if(r.error)throw r.error; subs=r.data||[]; }
    catch(e){ root.innerHTML='<div class="empty">리포트를 불러오지 못했어요: '+esc(e.message||e)+'</div>'; return; }
    var by=aggregate(subs); var seasons=Object.keys(by).map(Number).sort();
    var hero='<div class="hero"><div class="eb">~와 함께라면 · 시즌 성장 리포트</div><h1>'+esc(ctx.name||'우리 아이')+'의 5개의 눈</h1><div class="mt">강별 리포트를 발행하면 시즌 리포트가 쌓여요.</div></div>';
    if(!seasons.length){ root.innerHTML=hero+'<div class="card"><div class="empty">아직 발행된 강별 리포트가 없어요.<br>자녀가 제출한 강에서 [AI 리포트 생성 → 발행]을 하면 여기에 모여요.</div></div>'; return; }
    var cur=seasons[seasons.length-1];
    function paint(){
      root.innerHTML=hero+'<div class="tabs">'+[1,2,3,4].map(function(s){ return '<button data-s="'+s+'" class="'+(s===cur?'on':'')+'"'+(by[s]?'':' disabled')+'>시즌 '+s+' · '+esc(SNAME[s])+'</button>'; }).join('')+'</div><div id="rsn-body"></div>';
      root.querySelectorAll('.tabs button').forEach(function(b){ b.addEventListener('click',function(){ if(b.disabled)return; cur=+b.dataset.s; paint(); }); });
      drawSeason(root.querySelector('#rsn-body'), ctx.name, by, cur);
    }
    paint();
  }
  window.ArcheRamyeonSeason={ mount:mount, aggregate:aggregate, version:'1.0' };
})();
