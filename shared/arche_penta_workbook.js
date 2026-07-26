/* ============================================================================
 * arche_penta_workbook.js · 펜타 시리즈 데이터 기반 워크북 엔진
 * ----------------------------------------------------------------------------
 * 목적: 회차 콘텐츠(penta_catalog.content)를 받아 인터랙티브 워크북을 렌더하고,
 *       학생이 [제출]만 누르면 save_penta_submission RPC로 저장.
 *       (컨설턴트가 회차만 선택 → 학생 진행 → 제출 → 리포트 생성 흐름)
 * API:
 *   ArchePentaWorkbook.render(mount, opts)
 *     opts = {
 *       lesson : {stage,level,season,week,theme,title,subtitle,gradeBand,
 *                 radarAxes:[5], intro, stages:[{key,name,icon,desc,blocks:[...]}],
 *                 submit:{label,note}},
 *       academyId, studentId,               // 미지정 시 window._acadId / window._activeStudent 사용
 *       mode      : 'live'|'preview',        // preview는 실제 저장 안 함
 *       prefill   : {answers, radar_before, radar_after, compass},  // 재열람용(선택)
 *       readOnly  : false,
 *       onSubmit  : function(result){}       // 제출 성공 콜백(선택)
 *     }
 * 블록 타입: info · stats · radar · scale · text · choice · career
 * ==========================================================================*/
(function () {
  "use strict";

  var CSS = ""
    + ".apw{max-width:820px;margin:0 auto;font-family:'Noto Sans KR',sans-serif;color:#243244}"
    + ".apw *{box-sizing:border-box}"
    + ".apw .wbcover{background:linear-gradient(135deg,#1A237E,#0F1548 72%,#080b2e);color:#fff;border-radius:18px;padding:26px 24px;position:relative;overflow:hidden}"
    + ".apw .wbcover::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 86% 14%,rgba(212,175,55,.22),transparent 46%)}"
    + ".apw .wbeb{position:relative;font-size:11px;font-weight:800;letter-spacing:2px;color:#E8D9A0}"
    + ".apw .wbcover h1{position:relative;font-size:22px;font-weight:900;margin:7px 0 3px}"
    + ".apw .wbcover .sub{position:relative;font-size:13px;color:#c7cdf0;line-height:1.6}"
    + ".apw .wbcover .band{position:relative;display:inline-block;margin-top:10px;font-size:11.5px;font-weight:700;color:#1A237E;background:#E8D9A0;border-radius:99px;padding:4px 12px}"
    + ".apw .stg{background:#fff;border:1px solid #e6e9f0;border-radius:16px;padding:20px 22px;margin-top:14px;box-shadow:0 1px 3px rgba(0,23,51,.04)}"
    + ".apw .stgh{display:flex;align-items:center;gap:11px;margin-bottom:4px}"
    + ".apw .stgic{flex:none;width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#1A237E,#0F1548);display:grid;place-items:center;font-size:19px}"
    + ".apw .stgn{font-size:17px;font-weight:900;color:#1A237E}"
    + ".apw .stgd{font-size:12.5px;color:#6b7688;line-height:1.6;margin:2px 0 14px}"
    + ".apw .blk{margin-top:16px}"
    + ".apw .q{font-size:14px;font-weight:800;color:#243244;line-height:1.6;margin-bottom:7px}"
    + ".apw .q .qn{display:inline-block;min-width:22px;height:22px;line-height:22px;text-align:center;font-size:11px;background:#1A237E;color:#fff;border-radius:6px;margin-right:8px;font-weight:900}"
    + ".apw .hint{font-size:12px;color:#8b95a1;line-height:1.6;margin:-3px 0 8px 30px}"
    + ".apw textarea,.apw input[type=text]{width:100%;border:1.5px solid #dfe3ec;border-radius:11px;padding:12px 13px;font:inherit;font-size:14px;color:#243244;resize:vertical;background:#fbfcfe}"
    + ".apw textarea:focus,.apw input[type=text]:focus{outline:none;border-color:#1A237E;background:#fff}"
    + ".apw .info{background:#f4f7fc;border:1px solid #e0e7f3;border-left:4px solid #1A237E;border-radius:10px;padding:13px 15px}"
    + ".apw .info .it{font-size:13px;font-weight:800;color:#1A237E;margin-bottom:4px}"
    + ".apw .info .ib{font-size:13px;color:#39465a;line-height:1.75}"
    + ".apw .stats{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}"
    + ".apw .stat{flex:1;min-width:120px;background:#0F1548;color:#fff;border-radius:12px;padding:12px 14px}"
    + ".apw .stat .sv{font-size:22px;font-weight:900;font-family:'Playfair Display',serif;color:#E8D9A0}"
    + ".apw .stat .sk{font-size:11.5px;color:#c7cdf0;margin-top:2px;line-height:1.4}"
    + ".apw .sld{display:flex;align-items:center;gap:12px;padding:8px 0}"
    + ".apw .sld .sn{flex:none;width:96px;font-size:12.5px;font-weight:800;color:#243244}"
    + ".apw .sld input[type=range]{flex:1;accent-color:#1A237E}"
    + ".apw .sld .sv{flex:none;width:30px;text-align:right;font-weight:900;color:#1A237E;font-family:'Playfair Display',serif}"
    + ".apw .scwrap{background:#f7f9fd;border-radius:12px;padding:14px 16px}"
    + ".apw .scends{display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;color:#1A237E;margin-bottom:6px}"
    + ".apw .scwrap input[type=range]{width:100%;accent-color:#D4AF37}"
    + ".apw .scval{text-align:center;font-size:12px;color:#6b7688;margin-top:4px}"
    + ".apw .opts{display:flex;flex-direction:column;gap:8px}"
    + ".apw .opt{border:1.5px solid #dfe3ec;border-radius:11px;padding:11px 13px;cursor:pointer;background:#fbfcfe;transition:.12s}"
    + ".apw .opt:hover{border-color:#9aa6c8}"
    + ".apw .opt.on{border-color:#1A237E;background:#eef1ff;box-shadow:inset 0 0 0 1px #1A237E}"
    + ".apw .opt .ol{font-size:13.5px;font-weight:800;color:#243244}"
    + ".apw .opt .od{font-size:12px;color:#6b7688;margin-top:2px;line-height:1.5}"
    + ".apw .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}"
    + ".apw .card{border:1.5px solid #dfe3ec;border-radius:13px;padding:13px;cursor:pointer;background:#fbfcfe;transition:.12s}"
    + ".apw .card:hover{border-color:#9aa6c8}"
    + ".apw .card.on{border-color:#12b76a;background:#f0fbf4;box-shadow:inset 0 0 0 1px #12b76a}"
    + ".apw .card .cn{font-size:14px;font-weight:900;color:#1A237E}"
    + ".apw .card .cd{font-size:11.5px;color:#6b7688;line-height:1.5;margin:4px 0 7px}"
    + ".apw .card .csub{font-size:10.5px;font-weight:700;color:#b8860b;background:rgba(212,175,55,.12);border-radius:6px;padding:4px 7px;line-height:1.5}"
    + ".apw .bar{position:sticky;bottom:0;margin-top:18px;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border-top:1px solid #e6e9f0;padding:14px 4px;display:flex;gap:10px;align-items:center;justify-content:space-between;z-index:3}"
    + ".apw .bar .prog{font-size:12px;color:#6b7688}"
    + ".apw .bar .prog b{color:#1A237E}"
    + ".apw .subbtn{border:none;border-radius:12px;padding:13px 26px;font:inherit;font-size:15px;font-weight:900;color:#fff;background:linear-gradient(135deg,#1A237E,#0F1548);cursor:pointer;box-shadow:0 4px 14px rgba(16,21,72,.28)}"
    + ".apw .subbtn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}"
    + ".apw .note{font-size:11.5px;color:#8b95a1;line-height:1.6;margin-top:8px;text-align:center}"
    + ".apw .msg{margin-top:12px;border-radius:11px;padding:12px 15px;font-size:13px;line-height:1.6;display:none}"
    + ".apw .msg.ok{display:block;background:#f0fbf4;border:1px solid #bfe6cd;color:#137a44}"
    + ".apw .msg.err{display:block;background:#fdf0f1;border:1px solid #f3c0c5;color:#c0313d}"
    + ".apw .ro{opacity:.72;pointer-events:none}";

  function inject(){
    if(!document.getElementById('apw-css')){var s=document.createElement('style');s.id='apw-css';s.textContent=CSS;document.head.appendChild(s);}
    if(!document.getElementById('apw-font')){var l=document.createElement('link');l.id='apw-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Noto+Sans+KR:wght@400;700;900&display=swap';document.head.appendChild(l);}
  }
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function el(html){var t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstChild;}

  function render(mount, opts){
    inject();
    opts=opts||{}; var L=opts.lesson||{}; var mode=opts.mode||'live'; var ro=!!opts.readOnly;
    var pre=opts.prefill||{};
    var academyId = opts.academyId || window._acadId || (window._academy&&window._academy.id) || null;
    var studentId = opts.studentId || (window._activeStudent&&window._activeStudent.id) || null;
    var axes = L.radarAxes || ['영역1','영역2','영역3','영역4','영역5'];

    // 상태
    var state = {
      answers: Object.assign({}, pre.answers||{}),
      radar_before: (pre.radar_before||axes.map(function(){return 5;})).slice(),
      radar_after:  (pre.radar_after ||axes.map(function(){return 5;})).slice(),
      compass: (pre.compass!=null?pre.compass:50)
    };
    var required = [];   // 필수 text 블록 id 목록(진행률)

    var root=document.createElement('div'); root.className='apw'+(ro?' ro':'');

    // 커버
    var cover='<div class="wbcover"><div class="wbeb">PENTA '+(L.stage==='track'?'TRACK':'VISION')+' · 워크북'+(L.season?(' · 시즌'+esc(L.season)+' '+esc(L.week||1)+'주차'):'')+'</div>'
      +'<h1>'+esc(L.title||'펜타 워크북')+'</h1>'
      +(L.subtitle?'<div class="sub">'+esc(L.subtitle)+'</div>':'')
      +(L.theme?'<div class="sub">주제 · '+esc(L.theme)+'</div>':'')
      +(L.gradeBand?'<div class="band">'+esc(L.gradeBand)+'</div>':'')+'</div>';
    root.appendChild(el(cover));
    if(L.intro){ var iv=document.createElement('div'); iv.className='stg'; iv.innerHTML='<div class="stgd" style="margin:0">'+esc(L.intro)+'</div>'; root.appendChild(iv); }

    // 스테이지/블록
    (L.stages||[]).forEach(function(stg){
      var sec=document.createElement('div'); sec.className='stg';
      sec.innerHTML='<div class="stgh"><div class="stgic">'+esc(stg.icon||'✦')+'</div><div class="stgn">'+esc(stg.name||'')+'</div></div>'
        +(stg.desc?'<div class="stgd">'+esc(stg.desc)+'</div>':'');
      (stg.blocks||[]).forEach(function(b){ sec.appendChild(renderBlock(b)); });
      root.appendChild(sec);
    });

    // 제출 바
    var bar=document.createElement('div'); bar.className='bar';
    bar.innerHTML='<div class="prog"><b class="apw-done">0</b> / '+required.length+' 작성</div>';
    var btn=document.createElement('button'); btn.className='subbtn'; btn.type='button';
    btn.textContent=(L.submit&&L.submit.label)||'제출하기';
    bar.appendChild(btn); root.appendChild(bar);
    var noteEl=document.createElement('div'); noteEl.className='note';
    noteEl.textContent=(L.submit&&L.submit.note)||'제출하면 담당 선생님이 확인한 뒤 나만의 리포트를 만들어 드려요.';
    root.appendChild(noteEl);
    var msg=document.createElement('div'); msg.className='msg'; root.appendChild(msg);

    function updateProg(){
      var done=required.filter(function(id){return (state.answers[id]||'').toString().trim().length>0;}).length;
      var d=root.querySelector('.apw-done'); if(d)d.textContent=done;
    }
    root.addEventListener('input', updateProg);

    if(ro){ btn.style.display='none'; noteEl.style.display='none'; }
    btn.addEventListener('click', function(){ doSubmit(btn,msg,noteEl); });

    function doSubmit(btn,msg,noteEl){
      var miss=required.filter(function(id){return (state.answers[id]||'').toString().trim().length===0;});
      if(miss.length){ msg.className='msg err'; msg.textContent='아직 '+miss.length+'개 문항이 비어 있어요. 모두 채운 뒤 제출해 주세요.'; try{root.querySelector('[data-id="'+miss[0]+'"]').scrollIntoView({behavior:'smooth',block:'center'});}catch(_){} return; }
      var payload={
        p_academy: academyId, p_student: studentId,
        p_stage: L.stage||'vision', p_level: L.level||'',
        p_season: L.season||1, p_week: L.week||1,
        p_theme: L.theme||'', p_title: L.title||'',
        p_answers: state.answers, p_radar_before: state.radar_before,
        p_radar_after: state.radar_after, p_compass: +state.compass
      };
      if(mode==='preview' || !(window.sb&&window.sb.rpc&&academyId&&studentId)){
        msg.className='msg ok';
        msg.textContent = mode==='preview'
          ? '미리보기 모드 — 실제 저장은 하지 않았어요. 내용은 잘 작성됐습니다! 👍'
          : '로그인/학생 선택 상태에서 제출됩니다. (지금은 미리보기)';
        if(opts.onSubmit)opts.onSubmit({preview:true,payload:payload});
        return;
      }
      btn.disabled=true; btn.textContent='제출 중…';
      window.sb.rpc('save_penta_submission', payload).then(function(res){
        btn.disabled=false; btn.textContent=(L.submit&&L.submit.label)||'제출하기';
        if(res&&res.error){ msg.className='msg err'; msg.textContent='제출 실패: '+res.error.message; }
        else { msg.className='msg ok'; msg.textContent='제출 완료! 🎉 선생님이 확인한 뒤 나만의 리포트를 만들어 주실 거예요.'; btn.style.display='none'; noteEl.style.display='none'; if(opts.onSubmit)opts.onSubmit({id:res&&res.data,payload:payload}); }
      }, function(e){ btn.disabled=false; btn.textContent=(L.submit&&L.submit.label)||'제출하기'; msg.className='msg err'; msg.textContent='제출 실패: '+e; });
    }

    // ── 블록 렌더러 ─────────────────────────────────────────────────────
    function renderBlock(b){
      var w=document.createElement('div'); w.className='blk';
      if(b.id) w.setAttribute('data-id', b.id);
      var t=b.t||b.type;

      if(t==='info'){
        w.innerHTML='<div class="info">'+(b.title?'<div class="it">'+esc(b.title)+'</div>':'')+'<div class="ib">'+esc(b.body||'')+'</div></div>';
        return w;
      }
      if(t==='stats'){
        var s='<div class="stats">';
        (b.items||[]).forEach(function(it){ s+='<div class="stat"><div class="sv">'+esc(it.v)+'</div><div class="sk">'+esc(it.k)+'</div></div>'; });
        w.innerHTML=s+'</div>'; return w;
      }
      if(t==='text'){
        if(!b.optional && b.id) required.push(b.id);
        var qn=b.n?'<span class="qn">'+esc(b.n)+'</span>':'';
        w.innerHTML='<div class="q">'+qn+esc(b.q||'')+'</div>'+(b.hint?'<div class="hint">'+esc(b.hint)+'</div>':'')
          +'<textarea rows="'+(b.rows||3)+'" placeholder="'+esc(b.placeholder||'여기에 생각을 적어 보세요')+'">'+esc(state.answers[b.id]||'')+'</textarea>';
        var ta=w.querySelector('textarea'); ta.addEventListener('input',function(){state.answers[b.id]=ta.value;});
        return w;
      }
      if(t==='scale'){
        var isCompass=(b.role==='compass'||b.id==='compass');
        var cur=isCompass?state.compass:(state.answers[b.id]!=null?state.answers[b.id]:Math.round(((b.min||0)+(b.max||100))/2));
        var qn2=b.n?'<span class="qn">'+esc(b.n)+'</span>':'';
        w.innerHTML='<div class="q">'+qn2+esc(b.q||'')+'</div>'+(b.hint?'<div class="hint">'+esc(b.hint)+'</div>':'')
          +'<div class="scwrap"><div class="scends"><span>'+esc(b.minLabel||b.min||0)+'</span><span>'+esc(b.maxLabel||b.max||100)+'</span></div>'
          +'<input type="range" min="'+(b.min||0)+'" max="'+(b.max||100)+'" value="'+cur+'"><div class="scval">'+cur+'</div></div>';
        var rg=w.querySelector('input'), vv=w.querySelector('.scval');
        rg.addEventListener('input',function(){ vv.textContent=rg.value; if(isCompass)state.compass=+rg.value; else state.answers[b.id]=+rg.value; });
        if(isCompass)state.compass=+cur; else if(b.id)state.answers[b.id]=+cur;
        return w;
      }
      if(t==='radar'){
        var isBefore=(b.mode==='before');
        var arr=isBefore?state.radar_before:state.radar_after;
        var rax=b.axes||axes;
        var qn3=b.n?'<span class="qn">'+esc(b.n)+'</span>':'';
        var s2='<div class="q">'+qn3+esc(b.q||(isBefore?'지금 내 생각의 힘은 어느 정도일까? (수업 전)':'수업이 끝난 지금은 어떨까? (수업 후)'))+'</div>';
        rax.forEach(function(ax,i){
          s2+='<div class="sld" data-i="'+i+'"><div class="sn">'+esc(ax)+'</div><input type="range" min="0" max="10" value="'+(arr[i]!=null?arr[i]:5)+'"><div class="sv">'+(arr[i]!=null?arr[i]:5)+'</div></div>';
        });
        w.innerHTML=s2;
        w.querySelectorAll('.sld').forEach(function(row){
          var i=+row.getAttribute('data-i'), rg=row.querySelector('input'), vv=row.querySelector('.sv');
          rg.addEventListener('input',function(){ vv.textContent=rg.value; arr[i]=+rg.value; });
        });
        return w;
      }
      if(t==='choice'){
        if(!b.optional && b.id) required.push(b.id);
        var qn4=b.n?'<span class="qn">'+esc(b.n)+'</span>':'';
        var multi=!!b.multi;
        var chosen = multi ? (Array.isArray(state.answers[b.id])?state.answers[b.id].slice():[]) : (state.answers[b.id]||'');
        var s3='<div class="q">'+qn4+esc(b.q||'')+'</div>'+(b.hint?'<div class="hint">'+esc(b.hint)+'</div>':'')+'<div class="opts">';
        (b.options||[]).forEach(function(o){
          var on = multi ? (chosen.indexOf(o.v)>=0) : (chosen===o.v);
          s3+='<div class="opt'+(on?' on':'')+'" data-v="'+esc(o.v)+'"><div class="ol">'+esc(o.label||o.v)+'</div>'+(o.desc?'<div class="od">'+esc(o.desc)+'</div>':'')+'</div>';
        });
        w.innerHTML=s3+'</div>';
        w.querySelectorAll('.opt').forEach(function(op){
          op.addEventListener('click',function(){
            var v=op.getAttribute('data-v');
            if(multi){
              var a=Array.isArray(state.answers[b.id])?state.answers[b.id]:[];
              var k=a.indexOf(v); if(k>=0)a.splice(k,1); else a.push(v);
              state.answers[b.id]=a; op.classList.toggle('on');
            } else {
              state.answers[b.id]=v;
              w.querySelectorAll('.opt').forEach(function(x){x.classList.remove('on');});
              op.classList.add('on');
            }
            root.dispatchEvent(new Event('input'));
          });
        });
        return w;
      }
      if(t==='career'){
        // 진로 내비게이터: 카드 선택 + 선택 이유 서술
        var cid=b.id||'career_choice'; var rid=b.reasonId||(cid+'_reason');
        if(b.id) required.push(cid); required.push(rid);
        var chosenC=state.answers[cid]||'';
        var qn5=b.n?'<span class="qn">'+esc(b.n)+'</span>':'';
        var s4='<div class="q">'+qn5+esc(b.q||'가장 끌리는 진로를 골라 보세요')+'</div><div class="cards">';
        (b.options||[]).forEach(function(o){
          var on=(chosenC===o.n);
          s4+='<div class="card'+(on?' on':'')+'" data-v="'+esc(o.n)+'"><div class="cn">'+esc(o.n)+'</div>'+(o.d?'<div class="cd">'+esc(o.d)+'</div>':'')+(o.subj?'<div class="csub">관련 과목 · '+esc(o.subj)+'</div>':'')+'</div>';
        });
        s4+='</div><div class="q" style="margin-top:14px">'+esc(b.reasonQ||'왜 그 진로에 끌렸는지 적어 보세요')+'</div>'
          +'<textarea rows="3" placeholder="예: 내 관심사와 연결되는 이유를 적어 보세요">'+esc(state.answers[rid]||'')+'</textarea>';
        w.innerHTML=s4;
        w.querySelectorAll('.card').forEach(function(cd){
          cd.addEventListener('click',function(){ state.answers[cid]=cd.getAttribute('data-v'); w.querySelectorAll('.card').forEach(function(x){x.classList.remove('on');}); cd.classList.add('on'); root.dispatchEvent(new Event('input')); });
        });
        var rta=w.querySelector('textarea'); rta.addEventListener('input',function(){state.answers[rid]=rta.value;});
        return w;
      }
      // 알 수 없는 타입 무시
      w.style.display='none'; return w;
    }

    updateProg();
    mount.innerHTML=''; mount.appendChild(root);
    return { root:root, state:state,
      collect:function(){ return { answers:state.answers, radar_before:state.radar_before, radar_after:state.radar_after, compass:+state.compass }; } };
  }

  window.ArchePentaWorkbook = { render: render, version: '1.0' };
})();
