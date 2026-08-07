/* ARCHE · 시즌 골라 담기 (Penta Vision / Track Season Picker)
 * season_picker_mockup.html 마크업/스타일 그대로 + Supabase 실데이터 연동.
 * 의존: window.sb (supabase-js client). 없으면 안내만 렌더.
 * 사용:
 *   ArcheSeasonPicker.mount(el, {
 *     course:'vision'|'track', level:'starter'|'architecture'|'', studentId:'<student_id>',
 *     onTrial:function(p){}, onStart:function(p){}, onOpen:function(p){},
 *     onCart:function(p, ref){}   // 🛒 담기. ref='vision:<level>:<season>' | 'track::<season>'
 *   });
 * level 토글(기초/심화)은 vision에서만 노출·재조회.
 */
(function(){
  var CSSID='asp-style';
  function injectCSS(){
    if(document.getElementById(CSSID))return;
    var s=document.createElement('style'); s.id=CSSID;
    s.textContent=[
    ".asp{--blue:#3182f6;--blue-deep:#1b64da;--blue-soft:#e8f3ff;--navy:#141a29;--gold:#c8a24a;--gold-soft:#f6efdb;--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--line:#e5e8eb;--bg:#f2f4f6;--safe:#12b76a;--safe-soft:#ecfdf3;--warn:#9a7b28;--warn-soft:#fffaeb;",
      "font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;color:var(--ink);letter-spacing:-.01em;line-height:1.6}",
    ".asp *{box-sizing:border-box}",
    ".asp .top{text-align:center;margin-bottom:8px}",
    ".asp .top .eb{font-size:12px;font-weight:800;color:var(--gold);letter-spacing:1px}",
    ".asp .top h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:8px 0 6px}",
    ".asp .top h1 em{font-style:normal;color:var(--blue)}",
    ".asp .top p{font-size:14px;color:var(--dim);max-width:600px;margin:0 auto;line-height:1.7}",
    ".asp .lvltoggle{display:flex;gap:6px;justify-content:center;margin-top:16px}",
    ".asp .lvltoggle button{border:1px solid var(--line);background:#fff;color:var(--dim);font:inherit;font-weight:700;font-size:12.5px;padding:8px 16px;border-radius:20px;cursor:pointer}",
    ".asp .lvltoggle button.on{background:var(--blue);border-color:var(--blue);color:#fff}",
    ".asp .seasons{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}",
    "@media(max-width:860px){.asp .seasons{grid-template-columns:1fr}}",
    ".asp .sc{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;transition:.16s;position:relative}",
    ".asp .sc:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(25,31,40,.10);border-color:#e3d9b6}",
    ".asp .sc .cap{background:linear-gradient(135deg,var(--navy),#20283c);color:#fff;padding:20px 20px 18px;position:relative;overflow:hidden}",
    ".asp .sc .cap::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 15%,rgba(200,162,74,.25),transparent 50%)}",
    ".asp .sc .sn{position:relative;font-size:11px;font-weight:800;letter-spacing:1px;color:var(--gold-soft);background:rgba(200,162,74,.18);border:1px solid rgba(200,162,74,.35);border-radius:20px;padding:4px 11px;display:inline-block}",
    ".asp .sc .ct{position:relative;font-size:18px;font-weight:800;margin:12px 0 4px;line-height:1.3}",
    ".asp .sc .cm{position:relative;font-size:12px;color:#c3cdda;font-weight:600}",
    ".asp .sc .body{padding:18px 20px 20px;display:flex;flex-direction:column;flex:1}",
    ".asp .sc .hl{font-size:11px;font-weight:800;color:var(--mute);margin-bottom:9px;letter-spacing:.02em}",
    ".asp .sc .tp{display:flex;gap:8px;font-size:13px;padding:6px 0;color:var(--ink);align-items:flex-start}",
    ".asp .sc .tp .d{color:var(--gold);font-weight:900;flex:none}",
    ".asp .sc .more{font-size:11.5px;color:var(--mute);font-weight:600;margin:6px 0 0 15px}",
    ".asp .sc .fu{display:flex;gap:6px;flex-wrap:wrap;margin-top:13px}",
    ".asp .sc .fu span{font-size:10.5px;font-weight:700;color:var(--blue-deep);background:var(--blue-soft);border-radius:20px;padding:3px 9px}",
    ".asp .sc .cta{margin-top:auto;padding-top:16px;display:flex;gap:8px}",
    ".asp .btn{flex:1;border:none;border-radius:12px;font:inherit;font-weight:800;font-size:13px;padding:12px;cursor:pointer;text-align:center}",
    ".asp .btn.pri{background:var(--navy);color:#fff}",
    ".asp .btn.ghost{background:#fff;color:var(--blue-deep);border:1.5px solid #cfd9f0}",
    ".asp .btn.owned{background:var(--safe);color:#fff}",
    ".asp .btn.lock{background:#f2f4f7;color:#8b95a1;border:1.5px solid #e5e8eb}",
    ".asp .btn.lock:hover{background:#eef1f5;color:#4e5968}",
    ".asp .sc .lockbadge{position:absolute;top:14px;right:14px;z-index:2;font-size:10.5px;font-weight:800;color:#8b95a1;background:#f2f4f7;border-radius:20px;padding:4px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08)}",
    ".asp .btn.cart{width:100%;flex:none;margin-top:8px;background:var(--gold-soft);color:var(--warn);border:1.5px solid #e3d9b6}",
    ".asp .btn.cart:hover{background:#f1e7c6}",
    ".asp .btn.cart.added{background:var(--safe-soft);color:#137a44;border-color:#a6e6c3}",
    ".asp .sc .trial{position:absolute;top:14px;right:14px;z-index:2;font-size:10.5px;font-weight:800;color:var(--warn);background:#fff;border-radius:20px;padding:4px 10px;box-shadow:0 2px 8px rgba(0,0,0,.12)}",
    ".asp .sc .ownedbadge{position:absolute;top:14px;right:14px;z-index:2;font-size:10.5px;font-weight:800;color:#fff;background:var(--safe);border-radius:20px;padding:4px 10px;box-shadow:0 2px 8px rgba(0,0,0,.12)}",
    ".asp .foot{text-align:center;font-size:12.5px;color:var(--mute);margin-top:24px;line-height:1.7}",
    ".asp .aspmsg{text-align:center;color:var(--mute);font-size:13px;padding:40px 0}"
    ].join('');
    document.head.appendChild(s);
  }
  function esc(v){return (v==null?'':String(v)).replace(/[&<>"]/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x];});}
  function nl2br(v){return esc(v).replace(/\n/g,'<br>');}

  var LEVELS=[['starter','초5~6 · 기초'],['architecture','중1~2 · 심화']];

  function cardHTML(p, isFirst){
    // [무료 정책] 무료 체험 1강은 각 코스(비전 기초·심화·트랙)의 '첫 시즌'에서만 제공
    var bullets=(p.bullets||[]).map(function(b){return '<div class="tp"><span class="d">◆</span>'+esc(b)+'</div>';}).join('');
    var fu=(p.fusion_tags||[]).map(function(f){return '<span>'+esc(f)+'</span>';}).join('');
    var more=p.more_note?('<div class="more">'+esc(p.more_note)+'</div>'):'';
    var corner=p.owned?('<span class="ownedbadge">✓ 이용중</span>')
      :(isFirst?('<span class="trial">'+esc(p.trial_label||'🎟️ 1강 무료')+'</span>')
      :'<span class="lockbadge">🔒 구독 전용</span>');
    // 무료: 각 코스 첫 시즌 1강만. 첫 시즌 전체·나머지 시즌은 구독/구매 필요.
    var cta=p.owned
      ? '<button class="btn owned" data-act="open" data-id="'+p.id+'">이어서 학습 →</button>'
      : (isFirst
          ? '<button class="btn ghost" data-act="trial" data-id="'+p.id+'">체험 1강 (무료)</button><button class="btn pri" data-act="sub" data-id="'+p.id+'">구독하고 전체 이용 →</button>'
          : '<button class="btn lock" data-act="sub" data-id="'+p.id+'">🔒 구독 후 이용</button>');
    // 🛒 담기: 미구독 카드에 노출 (vision·track 모두 store_products 등록됨)
    var cartBtn=(!p.owned)
      ? '<button class="btn cart" data-act="cart" data-id="'+p.id+'">🛒 장바구니에 담기</button>'
      : '';
    return '<div class="sc">'+corner
      +'<div class="cap"><span class="sn">시즌 '+esc(p.season)+(p.lesson_count?(' · '+p.lesson_count+'강'):'')+'</span><div class="ct">'+nl2br(p.caption_title)+'</div><div class="cm">'+esc(p.caption_meta||'')+'</div></div>'
      +'<div class="body"><div class="hl">이런 걸 배워요</div>'+bullets+more
      +'<div class="fu">'+fu+'</div>'
      +'<div class="cta">'+cta+'</div>'+cartBtn+'</div></div>';
  }

  function mount(el, opts){
    opts=opts||{}; injectCSS();
    if(typeof el==='string')el=document.getElementById(el)||document.querySelector(el);
    if(!el)return;
    var course=opts.course||'vision';
    var state={ level: (course==='vision') ? (opts.level||'starter') : (opts.level||'') };
    el.classList.add('asp');
    el.innerHTML=
      '<div class="top"><div class="eb">'+(course==='track'?'PENTA TRACK':'PENTA VISION')+'</div>'
      +'<h1>흥미로운 <em>시즌을 골라</em> 시작하세요</h1>'
      +'<p>순서에 얽매이지 않아요. 관심 가는 주제의 시즌부터 담아 시작하고, 각 시즌은 독립적으로 수강·완주할 수 있습니다.</p>'
      +((course==='vision')?('<div class="lvltoggle">'+LEVELS.map(function(l){return '<button data-lv="'+l[0]+'"'+(l[0]===state.level?' class="on"':'')+'>'+esc(l[1])+'</button>';}).join('')+'</div>'):'')+'</div>'
      +'<div class="seasons" id="asp-seasons"><div class="aspmsg">불러오는 중…</div></div>'
      +'<div class="foot">시즌은 원하는 순서로 선택할 수 있어요. 한 시즌을 완주하면 다음 시즌 추천과 성장 리포트가 이어집니다.</div>';

    var grid=el.querySelector('#asp-seasons');

    function load(){
      grid.innerHTML='<div class="aspmsg">불러오는 중…</div>';
      var sb=window.sb;
      if(!sb||!sb.rpc){ grid.innerHTML='<div class="aspmsg">로그인/DB 미연결 — 새로고침 해주세요.</div>'; return; }
      sb.rpc('list_season_catalog',{p_stage:course,p_level:state.level,p_student:opts.studentId||null})
        .then(function(res){
          if(res.error){ grid.innerHTML='<div class="aspmsg">불러오기 실패: '+esc(res.error.message)+'</div>'; return; }
          var rows=res.data||[];
          if(!rows.length){ grid.innerHTML='<div class="aspmsg">준비된 시즌이 없습니다.</div>'; return; }
          grid.innerHTML=rows.map(function(p,i){return cardHTML(p, i===0);}).join('');
          el._aspRows=rows;
        })
        .catch(function(e){ grid.innerHTML='<div class="aspmsg">오류: '+esc(e&&e.message||e)+'</div>'; });
    }

    // 레벨 토글
    el.querySelectorAll('.lvltoggle button').forEach(function(b){
      b.addEventListener('click',function(){
        state.level=b.dataset.lv;
        el.querySelectorAll('.lvltoggle button').forEach(function(x){x.classList.toggle('on',x===b);});
        load();
      });
    });

    // 카드 액션(체험/시작/열기/담기)
    grid.addEventListener('click',function(ev){
      var btn=ev.target.closest('button[data-act]'); if(!btn)return;
      var id=+btn.dataset.id, act=btn.dataset.act;
      var p=(el._aspRows||[]).filter(function(r){return r.id===id;})[0]; if(!p)return;
      if(act==='trial' && opts.onTrial) opts.onTrial(p);
      else if(act==='start' && opts.onStart) opts.onStart(p);
      else if(act==='sub'){ if(opts.onSub) opts.onSub(p); else if(opts.onStart) opts.onStart(p); }
      else if(act==='open' && opts.onOpen) opts.onOpen(p);
      else if(act==='cart'){
        var ref=course+':'+(state.level||'')+':'+p.season;
        if(opts.onCart){
          try{ opts.onCart(p, ref); }catch(e){}
          btn.textContent='✓ 담았어요'; btn.classList.add('added');
          setTimeout(function(){ btn.textContent='🛒 장바구니에 담기'; btn.classList.remove('added'); }, 1600);
        }
      }
    });

    load();
    return { reload: load, setLevel:function(lv){ state.level=lv; load(); } };
  }

  window.ArcheSeasonPicker={ mount: mount };
})();
