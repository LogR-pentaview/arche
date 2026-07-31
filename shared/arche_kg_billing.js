/* ============================================================================
 * arche_kg_billing.js · KG이니시스 B2C 정기결제(빌링) 프런트 모듈  [준비/스캐폴드]
 * ----------------------------------------------------------------------------
 * 흐름: 플랜 선택 → 카드 등록(INIStdPay 빌링 인증창) → billKey 발급 → 구독 생성/청구.
 * 의존: window.sb(Supabase), 로그인 세션(학부모=b2c academy owner).
 *       INIStdPay.js (KG 표준결제창) 는 registerCard 시 동적 로드.
 * API : ArcheKGBilling.plans() / .status() / .subscribe() / .cancel()
 *       ArcheKGBilling.registerCard({buyerName, onDone})
 *       ArcheKGBilling.mount(container, ctx)
 * ★ 실계약(KG_MID 등) + 리턴페이지(/billing/return) + 엣지함수 kg-billing 배포 후 동작.
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL = 'https://dvxepjctjazobrkjrkdw.supabase.co';
  var STDPAY_JS = 'https://stdpay.inicis.com/stdjs/INIStdPay.js';   // 운영. 테스트: stgstdpay.inicis.com
  var RETURN_URL = (location.origin || '') + '/billing/return';     // billing_return.html 호스팅 경로
  var CLOSE_URL  = (location.origin || '') + '/billing/close';

  function sb(){ return window.sb; }
  async function token(){ try{var s=await sb().auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function call(action, payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/kg-billing';
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(Object.assign({action:action}, payload||{}))});
    var d=await r.json(); if(!r.ok) throw new Error(d.error||('오류('+r.status+')')); return d;
  }
  function loadStdPay(){ return new Promise(function(res,rej){ if(window.INIStdPay)return res(); var s=document.createElement('script'); s.src=STDPAY_JS; s.onload=function(){res();}; s.onerror=function(){rej(new Error('INIStdPay 로드 실패'));}; document.head.appendChild(s); }); }

  // API
  function plans(){ return call('plans'); }
  async function status(){ var d=await call('status');
    // 소크 등 티어 게이팅용 전역 주입: 활성 구독 플랜 → window._pentaTier
    try{ var a=(d.subscriptions||[]).filter(function(s){return s.status==='active';})[0]; window._pentaTier = a ? a.plan : ((d.trial||d.demo||window._demo)?'trial':''); }catch(e){}
    return d; }
  // 앱 로드 시 1회 티어 프라임(구독 화면 미진입에도 소크 상한 반영)
  function primeTier(){ try{ if(window._tierPrimed)return; window._tierPrimed=1; status().catch(function(){}); }catch(e){} }
  function subscribe(plan, cycle, studentId, billingKeyId){ return call('subscribe',{plan:plan,cycle:cycle||'monthly',student_id:studentId||null,billing_key_id:billingKeyId}); }
  function cancel(subId){ return call('cancel',{subscription_id:subId}); }

  // 카드 등록: 서버 서명 파라미터 → INIStdPay 빌링 인증창 → (리턴페이지가 issue_billkey 호출)
  async function registerCard(opts){
    opts=opts||{};
    var pre=await call('prepare_billauth',{buyername:opts.buyerName||''});
    if(!pre.ok) throw new Error('서명 파라미터 발급 실패');
    await loadStdPay();
    // 인증 결과 수신: 리턴페이지가 window.postMessage({type:'kg-billkey', ...}) 로 알림
    var handler=function(ev){
      if(!ev.data || ev.data.type!=='kg-billkey') return;
      window.removeEventListener('message', handler);
      if(ev.data.ok){ if(opts.onDone)opts.onDone(null, ev.data); }
      else { if(opts.onDone)opts.onDone(new Error(ev.data.error||'카드 등록 실패')); }
    };
    window.addEventListener('message', handler);
    // 폼 구성 후 결제창 호출
    var f=document.getElementById('SendPayForm_id'); if(f)f.remove();
    f=document.createElement('form'); f.id='SendPayForm_id'; f.method='POST'; f.style.display='none';
    var p=Object.assign({}, pre.params, { returnUrl: RETURN_URL, closeUrl: CLOSE_URL });
    Object.keys(p).forEach(function(k){ var i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=p[k]; f.appendChild(i); });
    document.body.appendChild(f);
    try{ window.INIStdPay.pay('SendPayForm_id'); }catch(e){ window.removeEventListener('message',handler); throw e; }
  }

  // ── 간단 UI (플랜 선택 · 카드등록 · 구독 · 관리) ──
  var CSS=".kgb{max-width:460px;margin:0 auto;font-family:'Pretendard Variable',Pretendard,sans-serif;color:#191f28}"
    +".kgb .plan{display:flex;align-items:center;gap:12px;border:1.5px solid #e5e8eb;border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer}"
    +".kgb .plan.on{border-color:#141a29;background:#f5f6f8}"
    +".kgb .plan .nm{font-weight:800;font-size:15px}.kgb .plan .pr{margin-left:auto;font-weight:800;color:#141a29}"
    +".kgb .cyc{display:flex;gap:6px;margin:8px 0 14px}.kgb .cyc button{flex:1;border:1px solid #dfe3ec;background:#fff;border-radius:9px;padding:9px;font:inherit;font-weight:700;cursor:pointer}.kgb .cyc button.on{background:#141a29;color:#fff;border-color:#141a29}"
    +".kgb .btn{display:block;width:100%;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:15px;padding:14px;cursor:pointer;background:linear-gradient(135deg,#141a29,#2a3a58);color:#fff;margin-top:8px}"
    +".kgb .btn:disabled{opacity:.5}"
    +".kgb .sub{background:#fff;border:1px solid #eef1f4;border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px}"
    +".kgb .sub .st{margin-left:auto;font-size:11px;font-weight:800;padding:3px 8px;border-radius:20px;background:#e9f9ef;color:#137a44}"
    +".kgb .warn{background:#fff8e6;border:1px solid #f0dca6;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#8a6d1f;line-height:1.6}";
  function inject(){ if(!document.getElementById('kgb-css')){var s=document.createElement('style');s.id='kgb-css';s.textContent=CSS;document.head.appendChild(s);} }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  async function mount(container, ctx){
    inject(); ctx=ctx||{};
    var root=document.createElement('div'); root.className='kgb'; container.innerHTML=''; container.appendChild(root);
    root.innerHTML='<div style="font-size:16px;font-weight:800;margin-bottom:10px">구독 · 결제</div><div id="kgb-body">불러오는 중…</div>';
    var body=root.querySelector('#kgb-body');
    var st; try{ st=await status(); }catch(e){ body.innerHTML='<div class="warn">결제 모듈 상태를 불러오지 못했어요: '+esc(e.message)+'</div>'; return; }
    if(!st.configured){ body.innerHTML='<div class="warn">🔧 결제 준비 중입니다. (KG이니시스 계약·설정 완료 후 활성화)</div>'; }
    var pl; try{ pl=(await plans()).plans; }catch(e){ pl={}; }
    var chosen='vision', cyc='monthly', bkId=(st.billing_keys&&st.billing_keys[0]&&st.billing_keys[0].id)||null;
    function priceOf(){ var p=pl[chosen]; return p?(cyc==='annual'?p.annual:p.monthly):0; }
    function draw(){
      var cards=Object.keys(pl).map(function(k){ var p=pl[k]; return '<div class="plan'+(k===chosen?' on':'')+'" data-k="'+k+'"><div><div class="nm">'+esc(p.name)+'</div></div><div class="pr">'+ (cyc==='annual'?p.annual:p.monthly).toLocaleString('ko-KR')+'원</div></div>'; }).join('');
      var subs=(st.subscriptions||[]).filter(function(s){return s.status==='active';}).map(function(s){ return '<div class="sub"><div><b>'+esc((pl[s.plan]&&pl[s.plan].name)||s.plan)+'</b> <span style="font-size:12px;color:#8b95a1">'+(s.cycle==='annual'?'연간':'월간')+' '+Number(s.price).toLocaleString('ko-KR')+'원</span></div><span class="st">이용중</span><button data-cancel="'+s.id+'" style="border:0;background:#f0f2f6;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">해지</button></div>'; }).join('');
      body.innerHTML=(subs?('<div style="font-size:12px;font-weight:800;color:#6b7688;margin-bottom:6px">내 구독</div>'+subs+'<hr style="border:none;border-top:1px solid #eef1f4;margin:14px 0">'):'')
        +'<div class="cyc"><button data-cyc="monthly" class="'+(cyc==='monthly'?'on':'')+'">월간</button><button data-cyc="annual" class="'+(cyc==='annual'?'on':'')+'">연간(2개월 무료)</button></div>'
        +cards
        +(bkId?'<button class="btn" id="kgb-sub">'+priceOf().toLocaleString('ko-KR')+'원 구독하기</button>'
              :'<button class="btn" id="kgb-card">💳 결제 카드 등록</button>')
        +(!st.configured?'':'');
      body.querySelectorAll('.plan').forEach(function(el){ el.onclick=function(){ chosen=el.getAttribute('data-k'); draw(); }; });
      body.querySelectorAll('[data-cyc]').forEach(function(b){ b.onclick=function(){ cyc=b.getAttribute('data-cyc'); draw(); }; });
      body.querySelectorAll('[data-cancel]').forEach(function(b){ b.onclick=async function(){ if(!confirm('구독을 해지할까요?'))return; try{ await cancel(b.getAttribute('data-cancel')); st=await status(); draw(); }catch(e){ alert('해지 실패: '+e.message); } }; });
      var cardBtn=body.querySelector('#kgb-card');
      if(cardBtn) cardBtn.onclick=function(){ if(!st.configured){ alert('결제 준비 중입니다.'); return; } registerCard({ buyerName:ctx.parentName||'', onDone:async function(err,d){ if(err){ alert('카드 등록 실패: '+err.message); return; } st=await status(); bkId=(st.billing_keys&&st.billing_keys[0]&&st.billing_keys[0].id)||null; draw(); } }); };
      var subBtn=body.querySelector('#kgb-sub');
      if(subBtn) subBtn.onclick=async function(){ subBtn.disabled=true; subBtn.textContent='처리 중…'; try{ var r=await subscribe(chosen, cyc, ctx.studentId, bkId); if(r.ok){ alert('구독이 시작됐어요!'); st=await status(); draw(); } else { alert('결제 실패: '+JSON.stringify(r.charge&&r.charge.detail||r)); subBtn.disabled=false; } }catch(e){ alert('오류: '+e.message); subBtn.disabled=false; } };
    }
    draw();
  }

  window.ArcheKGBilling={ plans:plans, status:status, subscribe:subscribe, cancel:cancel, registerCard:registerCard, mount:mount, primeTier:primeTier, version:'0.1-scaffold' };
})();
