/* ============================================================================
 * arche_toss_billing.js · 토스페이먼츠 B2C 정기결제(빌링) 프런트 모듈
 * ----------------------------------------------------------------------------
 * 흐름: 플랜 선택 → 카드 등록(TossPayments.requestBillingAuth 리다이렉트) → billingKey 발급
 *       → 구독 생성/청구. 단품은 장바구니(arche_cart.js)에서 checkout_cart 로 처리.
 * 의존: window.sb(Supabase), window.TOSS_CLIENT_KEY(config.js), TossPayments SDK(v1).
 * API : ArcheTossBilling.plans()/.status()/.subscribe()/.cancel()/.mount(container, ctx)
 *       ArcheTossBilling.registerCard(ctx)          — 카드등록 리다이렉트 시작
 *       ArcheTossBilling.issueFromRedirect(authKey, customerKey) — 복귀 후 빌링키 발급
 * ★ TOSS_SECRET_KEY 미설정 시 configured:false → "결제 준비 중" 안내(무해).
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL = 'https://dvxepjctjazobrkjrkdw.supabase.co';
  var FN = '/functions/v1/toss-b2c';

  function sb(){ return window.sb; }
  async function token(){ try{var s=await sb().auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function call(action, payload){
    var url=(window.SB_URL||PROJECT_URL)+FN;
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(Object.assign({action:action}, payload||{}))});
    var d=await r.json().catch(function(){return {};}); if(!r.ok) throw new Error(d.error||('오류('+r.status+')')); return d;
  }

  // API
  function plans(){ return call('plans'); }
  async function status(){ var d=await call('status');
    try{ var a=(d.subscriptions||[]).filter(function(s){return s.status==='active';})[0]; window._pentaTier = a ? a.plan : ((d.trial||d.demo||window._demo)?'trial':''); }catch(e){}
    return d; }
  function primeTier(){ try{ if(window._tierPrimed)return; window._tierPrimed=1; status().catch(function(){}); }catch(e){} }
  function subscribe(plan, studentId, billingKeyId){ return call('subscribe',{plan:plan,student_id:studentId||null,billing_key_id:billingKeyId||null}); }
  function cancel(subId){ return call('cancel',{subscription_id:subId}); }
  function changePlan(subId, newPlan){ return call('change_plan',{subscription_id:subId, plan:newPlan}); }

  // 카드 등록: TossPayments 빌링 인증창(리다이렉트). 복귀 시 issueFromRedirect 로 발급.
  async function registerCard(ctx){
    ctx=ctx||{};
    if(!window.TossPayments) throw new Error('토스 SDK 미로드 — 새로고침 해주세요.');
    var key = window.TOSS_CLIENT_KEY; if(!key) throw new Error('TOSS_CLIENT_KEY 미설정');
    var e=await call('ensure'); if(!e.customer_key) throw new Error('고객키 발급 실패');
    var base=location.origin+location.pathname;
    var tp=TossPayments(key);
    await tp.requestBillingAuth('카드',{ customerKey:e.customer_key, successUrl:base+'?billing=success', failUrl:base+'?billing=fail' });
  }
  function issueFromRedirect(authKey, customerKey){ return call('issue',{authKey:authKey, customerKey:customerKey}); }

  // ── 간단 UI (플랜 선택 · 카드등록 · 구독 · 관리) ──
  var CSS=".kgb{max-width:460px;margin:0 auto;font-family:'Pretendard Variable',Pretendard,sans-serif;color:#191f28}"
    +".kgb .plan{display:flex;align-items:center;gap:12px;border:1.5px solid #e5e8eb;border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer}"
    +".kgb .plan.on{border-color:#141a29;background:#f5f6f8}"
    +".kgb .plan .nm{font-weight:800;font-size:15px}.kgb .plan .pr{margin-left:auto;font-weight:800;color:#141a29}"
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
    if(!st.configured){ body.innerHTML='<div class="warn">🔧 결제 준비 중입니다. (토스페이먼츠 계약·설정 완료 후 활성화)</div>'; }
    var pl; try{ pl=(await plans()).plans; }catch(e){ pl={}; }
    var chosen='vision', bkId=(st.billing_keys&&st.billing_keys[0]&&st.billing_keys[0].id)||null;
    function priceOf(){ var p=pl[chosen]; return p?p.monthly:0; }
    function draw(){
      var cards=Object.keys(pl).map(function(k){ var p=pl[k]; return '<div class="plan'+(k===chosen?' on':'')+'" data-k="'+k+'"><div><div class="nm">'+esc(p.name)+'</div></div><div class="pr">'+ p.monthly.toLocaleString('ko-KR')+'원<span style="font-size:11px;color:#8b95a1;font-weight:600">/월</span></div></div>'; }).join('');
      var subs=(st.subscriptions||[]).filter(function(s){return s.status==='active';}).map(function(s){
        var credit=Number(s.credit_krw)||0;
        var others=Object.keys(pl).filter(function(k){return k!==s.plan;});
        var opts='<option value="">상품 변경…</option>'+others.map(function(k){ return '<option value="'+k+'">'+esc(pl[k].name)+' (월 '+pl[k].monthly.toLocaleString('ko-KR')+'원)</option>'; }).join('');
        var creditBadge=credit>0?('<span style="font-size:11px;font-weight:800;padding:3px 8px;border-radius:20px;background:#eef4ff;color:#2b6cf6;margin-left:6px">크레딧 '+credit.toLocaleString('ko-KR')+'원</span>'):'';
        return '<div class="sub" style="flex-wrap:wrap">'
          +'<div style="flex:1 1 auto"><b>'+esc((pl[s.plan]&&pl[s.plan].name)||s.plan)+'</b> <span style="font-size:12px;color:#8b95a1">월간 '+Number(s.price).toLocaleString('ko-KR')+'원</span>'+creditBadge+'</div>'
          +'<span class="st">이용중</span>'
          +'<button data-cancel="'+s.id+'" style="border:0;background:#f0f2f6;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">해지</button>'
          +'<select data-chg="'+s.id+'" style="flex:1 1 100%;margin-top:8px;padding:9px 10px;border:1px solid #e5e8eb;border-radius:8px;font:inherit;font-size:13px;background:#fff">'+opts+'</select>'
          +'</div>';
      }).join('');
      // 등록 카드 표시 + 카드 변경(재등록) — 카드가 있으면 노출
      var bk0=(st.billing_keys&&st.billing_keys[0])||{};
      var cardLine=bkId?('<div class="sub"><div>💳 <b>'+esc(bk0.card_company||'등록 카드')+'</b> <span style="color:#8b95a1;font-size:12px">'+esc(bk0.card_masked||'')+'</span></div><button id="kgb-cardchg" style="border:0;background:#f0f2f6;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">카드 변경</button></div>'):'';
      body.innerHTML=(subs?('<div style="font-size:12px;font-weight:800;color:#6b7688;margin-bottom:6px">내 구독</div>'+subs+'<hr style="border:none;border-top:1px solid #eef1f4;margin:14px 0">'):'')
        +cardLine
        +'<div style="font-size:12px;color:#8b95a1;margin:2px 0 12px;font-weight:600">월 단위 정기결제 · 언제든 해지 가능</div>'
        +cards
        +(bkId?'<button class="btn" id="kgb-sub">월 '+priceOf().toLocaleString('ko-KR')+'원 구독하기</button>'
              :'<button class="btn" id="kgb-card">💳 결제 카드 등록</button>');
      body.querySelectorAll('.plan').forEach(function(el){ el.onclick=function(){ chosen=el.getAttribute('data-k'); draw(); }; });
      body.querySelectorAll('[data-cancel]').forEach(function(b){ b.onclick=async function(){ if(!confirm('구독을 해지할까요?'))return; try{ await cancel(b.getAttribute('data-cancel')); st=await status(); draw(); }catch(e){ alert('해지 실패: '+e.message); } }; });
      body.querySelectorAll('[data-chg]').forEach(function(sel){ sel.onchange=async function(){
        var newPlan=sel.value; if(!newPlan)return;
        var subId=sel.getAttribute('data-chg');
        var cur=(st.subscriptions||[]).filter(function(x){return x.id===subId;})[0]||{};
        var oldP=(pl[cur.plan]&&pl[cur.plan].monthly)||0, newP=(pl[newPlan]&&pl[newPlan].monthly)||0;
        var up=newP>oldP;
        var msg=up
          ? (pl[newPlan].name+'(으)로 즉시 전환합니다.\n\n남은 기간만큼 계산한 차액이 지금 카드로 청구되고, 다음 결제일부터는 '+pl[newPlan].name+' 정상가로 청구됩니다. 진행할까요?')
          : (pl[newPlan].name+'(으)로 즉시 전환합니다.\n\n지금 결제는 없고, 남은 기간만큼의 차액이 크레딧으로 적립되어 다음 결제에서 자동 차감됩니다. 진행할까요?');
        if(!confirm(msg)){ sel.value=''; return; }
        sel.disabled=true;
        try{
          var r=await changePlan(subId, newPlan);
          if(r.ok){
            if(r.direction==='upgrade') alert(r.charged>0?('전환 완료 — 차액 '+Number(r.charged).toLocaleString('ko-KR')+'원이 청구되었습니다.'):'전환 완료 — 차액이 소액이라 청구 없이 전환됐어요.');
            else alert('전환 완료 — 차액 '+Number(r.credit_added||0).toLocaleString('ko-KR')+'원이 크레딧으로 적립됐어요. 다음 결제에서 차감됩니다.');
            st=await status(); draw();
          } else { alert('변경 실패: '+JSON.stringify(r.detail||r)); sel.disabled=false; sel.value=''; }
        }catch(e){ alert('변경 실패: '+e.message); sel.disabled=false; sel.value=''; }
      }; });
      var cardBtn=body.querySelector('#kgb-card');
      if(cardBtn) cardBtn.onclick=async function(){ if(!st.configured){ alert('결제 준비 중입니다.'); return; } try{ await registerCard(ctx); }catch(e){ alert('카드 등록 실패: '+e.message); } };
      var cardChg=body.querySelector('#kgb-cardchg');
      if(cardChg) cardChg.onclick=async function(){ if(!st.configured){ alert('결제 준비 중입니다.'); return; } if(!confirm('새 카드로 변경할까요? 카드 인증창으로 이동합니다.'))return; try{ await registerCard(ctx); }catch(e){ alert('카드 변경 실패: '+e.message); } };
      var subBtn=body.querySelector('#kgb-sub');
      if(subBtn) subBtn.onclick=async function(){ subBtn.disabled=true; subBtn.textContent='처리 중…'; try{ var r=await subscribe(chosen, ctx.studentId, bkId); if(r.ok){ alert('구독이 시작됐어요!'); st=await status(); draw(); } else { alert('결제 실패: '+JSON.stringify(r.charge&&r.charge.detail||r)); subBtn.disabled=false; } }catch(e){ alert('오류: '+e.message); subBtn.disabled=false; } };
    }
    draw();
  }

  window.ArcheTossBilling={ plans:plans, status:status, subscribe:subscribe, cancel:cancel, changePlan:changePlan, registerCard:registerCard, issueFromRedirect:issueFromRedirect, mount:mount, primeTier:primeTier, version:'1.2-toss' };
})();
