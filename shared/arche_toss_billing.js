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

  // 고등 추천 상품 = 아르케 이용권(단품 pass) · 가격은 store_products(arche5)와 일치해야 함
  var ARCHE_PASS = { ref:'arche5', price:9900, name:'아르케 5회 이용권' };

  // 학년 → 추천 상품 매칭
  //   초등: 펜타 비전(융합사고 입문)  ·  중등(중1~3): 펜타 올인원(전영역)  ·  고등~N수: 아르케 이용권(진로 징검다리·수행평가 도우미, 단품)
  //   'arche' 는 구독 tier가 아니라 단품 이용권을 뜻하는 특수값.
  function recommendPlan(grade){
    var g=String(grade||'');
    if(g.indexOf('고')>=0 || /N\s*수|재수|수능/i.test(g)) return 'arche';
    if(g.indexOf('중')>=0) return 'allinone';
    if(g.indexOf('초')>=0) return 'vision';
    return 'vision';
  }
  function recoReason(grade){
    var g=String(grade||'').trim();
    if(g.indexOf('고')>=0 || /N\s*수|재수|수능/i.test(g)) return '고등 진로·수행평가';
    if(g.indexOf('중')>=0) return '중등 전영역';
    if(g.indexOf('초')>=0) return '초등 융합사고';
    return '';
  }

  // 자녀 목록 로드 — ctx.children 우선, 없으면 RLS로 본인(학부모=학원소유자) 자녀 조회
  async function loadChildren(ctx){
    if(ctx && Array.isArray(ctx.children) && ctx.children.length) return ctx.children;
    try{
      var r=await sb().from('students').select('id,name,grade').order('created_at',{ascending:true});
      return (r&&r.data)||[];
    }catch(e){ return []; }
  }

  async function mount(container, ctx){
    inject(); ctx=ctx||{};
    var root=document.createElement('div'); root.className='kgb'; container.innerHTML=''; container.appendChild(root);
    root.innerHTML='<div style="font-size:16px;font-weight:800;margin-bottom:10px">구독 · 결제</div><div id="kgb-body">불러오는 중…</div>';
    var body=root.querySelector('#kgb-body');
    var st; try{ st=await status(); }catch(e){ body.innerHTML='<div class="warn">결제 모듈 상태를 불러오지 못했어요: '+esc(e.message)+'</div>'; return; }
    var pl; try{ pl=(await plans()).plans; }catch(e){ pl={}; }
    var children=await loadChildren(ctx);
    var bkId=(st.billing_keys&&st.billing_keys[0]&&st.billing_keys[0].id)||null;
    // 자녀별 선택 상태(미구독 자녀 대상): { childId: {checked, plan} }
    var pick={};
    children.forEach(function(c){ pick[c.id]={checked:false, plan:recommendPlan(c.grade)}; });

    function activeSubFor(childId){ return (st.subscriptions||[]).filter(function(s){return s.status==='active'&&String(s.student_id)===String(childId);})[0]||null; }
    function activeCount(){ return (st.subscriptions||[]).filter(function(s){return s.status==='active';}).length; }
    // 형제할인 반영 예상액(정가 기준, 프로모 할인은 추가 적용될 수 있음)
    function estimate(){
      var existing=activeCount(), i=0, total=0;
      children.forEach(function(c){
        var p=pick[c.id]; if(!p.checked||activeSubFor(c.id)||!pl[p.plan])return; // 구독 tier만 집계(아르케 단품 제외)
        var base=pl[p.plan].monthly||0;
        var firstEver=(existing===0 && i===0);
        total+=firstEver?base:Math.round(base*0.7); i++;
      });
      return {total:total, count:i};
    }

    function draw(){
      var configWarn=!st.configured?'<div class="warn" style="margin-bottom:10px">🔧 결제 준비 중입니다. (토스페이먼츠 설정 완료 후 활성화)</div>':'';
      // 카드 라인
      var bk0=(st.billing_keys&&st.billing_keys[0])||{};
      var cardLine=bkId?('<div class="sub"><div>💳 <b>'+esc(bk0.card_company||'등록 카드')+'</b> <span style="color:#8b95a1;font-size:12px">'+esc(bk0.card_masked||'')+'</span></div><button id="kgb-cardchg" style="border:0;background:#f0f2f6;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">카드 변경</button></div>'):'';

      if(children.length===0){
        // 자녀 정보를 못 불러온 경우 — 레거시 단일 구독 흐름으로 폴백
        var cards=Object.keys(pl).map(function(k){ var p=pl[k]; return '<div class="plan'+(k==='vision'?' on':'')+'" data-k="'+k+'"><div class="nm">'+esc(p.name)+'</div><div class="pr">'+p.monthly.toLocaleString('ko-KR')+'원<span style="font-size:11px;color:#8b95a1">/월</span></div></div>'; }).join('');
        body.innerHTML=configWarn+cardLine+'<div style="font-size:12px;color:#8b95a1;margin:2px 0 12px">월 단위 정기결제 · 언제든 해지 가능</div>'+cards
          +(bkId?'<button class="btn" id="kgb-sub">구독하기</button>':'<button class="btn" id="kgb-card">💳 결제 카드 등록</button>');
        var chosen='vision';
        body.querySelectorAll('.plan').forEach(function(el){ el.onclick=function(){ chosen=el.getAttribute('data-k'); body.querySelectorAll('.plan').forEach(function(x){x.classList.toggle('on',x===el);}); }; });
        wireCard();
        var sb1=body.querySelector('#kgb-sub'); if(sb1) sb1.onclick=async function(){ sb1.disabled=true; try{ var r=await subscribe(chosen, ctx.studentId, bkId); if(r.ok){ alert('구독이 시작됐어요!'); st=await status(); draw(); } else { alert('결제 실패: '+JSON.stringify(r.charge&&r.charge.detail||r)); sb1.disabled=false; } }catch(e){ alert('오류: '+e.message); sb1.disabled=false; } };
        return;
      }

      // 자녀별 카드 목록
      var planOpts=function(cur, reco){ return Object.keys(pl).map(function(k){ return '<option value="'+k+'"'+(k===cur?' selected':'')+'>'+esc(pl[k].name)+' · 월 '+pl[k].monthly.toLocaleString('ko-KR')+'원'+(k===reco?' · 추천':'')+'</option>'; }).join(''); };
      var rows=children.map(function(c){
        var sub=activeSubFor(c.id);
        if(sub){
          var credit=Number(sub.credit_krw)||0;
          var others=Object.keys(pl).filter(function(k){return k!==sub.plan;});
          var chgOpts='<option value="">상품 변경…</option>'+others.map(function(k){ return '<option value="'+k+'">'+esc(pl[k].name)+' (월 '+pl[k].monthly.toLocaleString('ko-KR')+'원)</option>'; }).join('');
          var creditBadge=credit>0?('<span style="font-size:11px;font-weight:800;padding:2px 7px;border-radius:20px;background:#eef4ff;color:#2b6cf6;margin-left:6px">크레딧 '+credit.toLocaleString('ko-KR')+'원</span>'):'';
          return '<div class="sub" style="flex-wrap:wrap">'
            +'<div style="flex:1 1 auto"><b>'+esc(c.name||'자녀')+'</b> <span class="st" style="margin-left:6px">이용중</span><br><span style="font-size:12px;color:#8b95a1">'+esc((pl[sub.plan]&&pl[sub.plan].name)||sub.plan)+' · 월 '+Number(sub.price).toLocaleString('ko-KR')+'원</span>'+creditBadge+'</div>'
            +'<button data-cancel="'+sub.id+'" style="border:0;background:#f0f2f6;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer;font-size:12px">해지</button>'
            +'<select data-chg="'+sub.id+'" style="flex:1 1 100%;margin-top:8px;padding:9px 10px;border:1px solid #e5e8eb;border-radius:8px;font:inherit;font-size:13px;background:#fff">'+chgOpts+'</select>'
            +'</div>';
        } else {
          var p=pick[c.id];
          var reco=recommendPlan(c.grade), reason=recoReason(c.grade);
          var gradeTxt=String(c.grade||'').trim();
          var nameHead='<b>'+esc(c.name||'자녀')+'</b>'+(gradeTxt?' <span style="font-size:11px;color:#8b95a1">'+esc(gradeTxt)+'</span>':'')+' <span style="font-size:11px;font-weight:800;color:#c2410c;background:#fff2e8;border-radius:20px;padding:2px 7px;margin-left:4px">미구독</span>';
          if(reco==='arche'){
            // 고등 → 아르케 이용권(단품 pass) 추천 · 바로구매 (구독 아님)
            return '<div class="sub" style="flex-wrap:wrap">'
              +'<div style="flex:1 1 auto">'+nameHead
                +'<div style="font-size:12px;color:#137a44;font-weight:800;margin-top:6px">🎯 고등 맞춤 추천 · <b>'+esc(ARCHE_PASS.name)+'</b> <span style="font-weight:600;color:#4b8f6a">(진로 징검다리·수행평가 · 단품)</span></div></div>'
              +'<button data-arche="'+c.id+'" style="flex:1 1 100%;margin-top:8px;border:0;border-radius:10px;padding:12px;font-weight:800;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#141a29,#2a3a58);color:#fff">아르케 5회 이용권 구매 · '+ARCHE_PASS.price.toLocaleString('ko-KR')+'원</button>'
              +'</div>';
          }
          var recoLine='<div style="flex:1 1 100%;font-size:12px;color:#137a44;font-weight:800;margin-top:6px">🎯 '+(gradeTxt?esc(gradeTxt)+' ':'')+'맞춤 추천 · <b>'+esc(pl[reco]?pl[reco].name:'')+'</b>'+(reason?' <span style="font-weight:600;color:#4b8f6a">('+esc(reason)+')</span>':'')+'</div>';
          return '<div class="sub" data-child="'+c.id+'" style="flex-wrap:wrap;'+(p.checked?'border-color:#141a29;background:#f7f8fa':'')+'">'
            +'<label style="display:flex;align-items:center;gap:10px;flex:1 1 auto;cursor:pointer">'
            +'<input type="checkbox" data-ck="'+c.id+'"'+(p.checked?' checked':'')+' style="width:18px;height:18px">'
            +'<span>'+nameHead+'</span></label>'
            +recoLine
            +'<select data-plan="'+c.id+'" style="flex:1 1 100%;margin-top:6px;padding:9px 10px;border:1px solid #e5e8eb;border-radius:8px;font:inherit;font-size:13px;background:#fff">'+planOpts(p.plan, reco)+'</select>'
            +'</div>';
        }
      }).join('');

      var unpaid=children.filter(function(c){return !activeSubFor(c.id);});
      var unpaidNames=unpaid.map(function(c){return esc(c.name||'자녀');});
      var banner=unpaid.length? '<div class="warn" style="margin:10px 0">👀 <b>'+unpaidNames.join(', ')+'</b> 자녀는 아직 구독 전이에요. 구독은 <b>자녀 1명 단위</b>라, 자녀마다 각각 필요해요.</div>':'';
      var sibNote=children.length>1?'<div style="font-size:12px;color:#137a44;background:#eafaf0;border-radius:10px;padding:9px 12px;margin:8px 0;font-weight:700">🎁 둘째 자녀부터 <b>30% 형제 할인</b>이 자동 적용돼요.</div>':'';

      var est=estimate();
      var payBtn = !bkId
        ? '<button class="btn" id="kgb-card">💳 결제 카드 먼저 등록</button>'
        : (est.count>0
            ? '<button class="btn" id="kgb-buy">선택한 '+est.count+'명 구독하기 · 예상 월 '+est.total.toLocaleString('ko-KR')+'원</button>'
            : '<button class="btn" id="kgb-buy" disabled>구독할 자녀를 선택하세요</button>');
      var estNote=(bkId&&est.count>0)?'<div style="font-size:11px;color:#8b95a1;margin-top:6px;text-align:center">형제할인 반영 예상액 · 런칭 프로모 대상이면 결제 시 추가 할인됩니다</div>':'';

      body.innerHTML=configWarn+cardLine
        +'<div style="font-size:12px;font-weight:800;color:#6b7688;margin:10px 0 6px">자녀별 구독 현황</div>'
        +rows+banner+sibNote+payBtn+estNote
        +'<div style="font-size:11px;color:#8b95a1;margin-top:10px;text-align:center">월 단위 정기결제 · 언제든 해지 가능</div>';

      // 이벤트 바인딩
      wireCard();
      body.querySelectorAll('[data-arche]').forEach(function(b){ b.onclick=function(){
        var childId=b.getAttribute('data-arche');
        if(!window.ArcheCart||!window.ArcheCart.buyNow){ alert('구매 모듈을 불러오지 못했어요. 스토어에서 아르케 이용권을 구매해 주세요.'); return; }
        try{ window.ArcheCart.buyNow(childId, ARCHE_PASS.ref, ARCHE_PASS.price); }catch(e){ alert('구매 시작 실패: '+e.message); }
      }; });
      body.querySelectorAll('[data-ck]').forEach(function(ck){ ck.onchange=function(){ pick[ck.getAttribute('data-ck')].checked=ck.checked; draw(); }; });
      body.querySelectorAll('[data-plan]').forEach(function(se){ se.onchange=function(){ pick[se.getAttribute('data-plan')].plan=se.value; draw(); }; });
      body.querySelectorAll('[data-cancel]').forEach(function(b){ b.onclick=async function(){ if(!confirm('이 자녀의 구독을 해지할까요?'))return; try{ await cancel(b.getAttribute('data-cancel')); st=await status(); draw(); }catch(e){ alert('해지 실패: '+e.message); } }; });
      body.querySelectorAll('[data-chg]').forEach(function(sel){ sel.onchange=async function(){
        var newPlan=sel.value; if(!newPlan)return;
        var subId=sel.getAttribute('data-chg');
        var cur=(st.subscriptions||[]).filter(function(x){return x.id===subId;})[0]||{};
        var oldP=(pl[cur.plan]&&pl[cur.plan].monthly)||0, newP=(pl[newPlan]&&pl[newPlan].monthly)||0;
        var msg=(newP>oldP)
          ? (pl[newPlan].name+'(으)로 즉시 전환합니다.\n\n남은 기간만큼의 차액이 지금 카드로 청구되고, 다음 결제일부터 '+pl[newPlan].name+' 정상가로 청구됩니다. 진행할까요?')
          : (pl[newPlan].name+'(으)로 즉시 전환합니다.\n\n지금 결제는 없고, 남은 기간만큼의 차액이 크레딧으로 적립되어 다음 결제에서 자동 차감됩니다. 진행할까요?');
        if(!confirm(msg)){ sel.value=''; return; }
        sel.disabled=true;
        try{ var r=await changePlan(subId, newPlan);
          if(r.ok){ if(r.direction==='upgrade') alert(r.charged>0?('전환 완료 — 차액 '+Number(r.charged).toLocaleString('ko-KR')+'원 청구.'):'전환 완료 — 차액 소액이라 청구 없이 전환.'); else alert('전환 완료 — 차액 '+Number(r.credit_added||0).toLocaleString('ko-KR')+'원 크레딧 적립. 다음 결제에서 차감돼요.'); st=await status(); draw(); }
          else { alert('변경 실패: '+JSON.stringify(r.detail||r)); sel.disabled=false; sel.value=''; }
        }catch(e){ alert('변경 실패: '+e.message); sel.disabled=false; sel.value=''; }
      }; });
      var buyBtn=body.querySelector('#kgb-buy');
      if(buyBtn&&!buyBtn.disabled) buyBtn.onclick=async function(){
        if(!st.configured){ alert('결제 준비 중입니다.'); return; }
        var targets=children.filter(function(c){ return pick[c.id].checked && !activeSubFor(c.id); });
        if(!targets.length){ alert('구독할 자녀를 선택하세요.'); return; }
        if(!confirm(targets.length+'명 자녀를 구독합니다. 등록된 카드로 지금 결제됩니다. 진행할까요?'))return;
        buyBtn.disabled=true; buyBtn.textContent='처리 중…';
        var ok=0, fail=[];
        for(var i=0;i<targets.length;i++){
          var c=targets[i];
          try{ var r=await subscribe(pick[c.id].plan, c.id, bkId); if(r&&r.ok)ok++; else fail.push(c.name||'자녀'); }
          catch(e){ fail.push((c.name||'자녀')+'('+e.message+')'); }
        }
        st=await status();
        if(fail.length) alert(ok+'명 구독 완료. 실패: '+fail.join(', ')+'\n(카드 승인 실패 시 잠시 후 다시 시도해 주세요.)');
        else alert(ok+'명 자녀 구독이 시작됐어요!');
        draw();
      };
    }

    function wireCard(){
      var cardBtn=body.querySelector('#kgb-card');
      if(cardBtn) cardBtn.onclick=async function(){ if(!st.configured){ alert('결제 준비 중입니다.'); return; } try{ await registerCard(ctx); }catch(e){ alert('카드 등록 실패: '+e.message); } };
      var cardChg=body.querySelector('#kgb-cardchg');
      if(cardChg) cardChg.onclick=async function(){ if(!st.configured){ alert('결제 준비 중입니다.'); return; } if(!confirm('새 카드로 변경할까요? 카드 인증창으로 이동합니다.'))return; try{ await registerCard(ctx); }catch(e){ alert('카드 변경 실패: '+e.message); } };
    }

    draw();
  }

  window.ArcheTossBilling={ plans:plans, status:status, subscribe:subscribe, cancel:cancel, changePlan:changePlan, registerCard:registerCard, issueFromRedirect:issueFromRedirect, mount:mount, primeTier:primeTier, recommendPlan:recommendPlan, version:'1.5-toss' };
})();
