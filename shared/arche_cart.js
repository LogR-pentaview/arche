/* ============================================================================
 * arche_cart.js · 펜타 B2C 장바구니(카트) 프런트 모듈
 * ----------------------------------------------------------------------------
 * 학부모(B2C)가 자녀별로 시즌·아르케 회권·올인원팩을 담고 한 흐름에서 결제.
 * 체크아웃 시 서버(toss-b2c/checkout_cart)가 구독분/단건분을 자동 분리 정산.
 * 의존: window.sb (supabase-js). 결제 흐름은 toss-b2c 엣지함수 + 카드(billing_key).
 * API :
 *   ArcheCart.addByRef(studentId, 'vision:starter:3'[, qty])  // 상품 ref로 담기
 *   ArcheCart.add(studentId, productId[, qty])                // 상품 id로 담기
 *   ArcheCart.list()  / .count() / .setQty(id,q) / .remove(id) / .clear()
 *   ArcheCart.checkout(billingKeyId?)                         // 결제(구독+단건 분리)
 *   ArcheCart.mount(container, { onChange })                  // 카트 뷰 렌더
 *   ArcheCart.onChange(fn)                                    // 담김/변경 구독(뱃지용)
 * ==========================================================================*/
(function () {
  "use strict";
  var PROJECT_URL = 'https://dvxepjctjazobrkjrkdw.supabase.co';
  function sb(){ return window.sb; }
  var _subs = [];
  var _bodySnap = null;   // 결제창 열기 직전의 body 자식 스냅샷 (취소 시 토스가 삽입한 노드만 정확히 제거)
  var _cartReload = null; // 현재 마운트된 카트의 redraw 함수 (취소 시 '처리 중…' 버튼 복구)
  var _payPending = false;// 결제창이 열려 있는 중(취소 감지용)
  var _watchIv = null;    // 결제창(오버레이) 감시 타이머
  function snapBody(){ try{ _bodySnap = [].slice.call(document.body.children); }catch(e){ _bodySnap = null; } _payPending = true; startCancelWatch(); }
  // 결제 시작 이후 새로 생긴 '오버레이(iframe 포함 노드)'가 화면에 있는지 검사
  function hasPayOverlay(){
    try{
      // (a) 토스/취소 iframe이 문서 어딘가에 있으면 결제창 존재로 간주
      if(document.querySelector('iframe[src*="tosspayments"], iframe[src*="/pay/cancel"]')) return true;
      // (b) 결제 시작 이후 body에 새로 생긴 노드가 iframe을 품고 있으면 결제창으로 간주
      var cur=[].slice.call(document.body.children);
      for(var i=0;i<cur.length;i++){
        var el=cur[i];
        if(_bodySnap && _bodySnap.indexOf(el)>=0) continue;       // 결제 전부터 있던 노드는 제외
        if(el.tagName && el.tagName.toLowerCase()==='iframe') return true;
        try{ if(el.querySelector && el.querySelector('iframe')) return true; }catch(e){}
      }
    }catch(e){}
    return false;
  }
  // 결제창이 떴다가 사라지면(사용자가 닫음/취소) → 이벤트가 없어도 스스로 감지해 원복.
  function startCancelWatch(){
    if(_watchIv){ clearInterval(_watchIv); _watchIv=null; }
    var sawOverlay=false, ticks=0;
    _watchIv=setInterval(function(){
      if(!_payPending){ clearInterval(_watchIv); _watchIv=null; return; }
      ticks++;
      var has=hasPayOverlay();
      if(has) sawOverlay=true;
      if(sawOverlay && !has){ clearInterval(_watchIv); _watchIv=null; cancelRecover(false); return; }
      if(ticks>450){ clearInterval(_watchIv); _watchIv=null; }   // ~3분 후 감시 종료(안전장치)
    }, 400);
  }
  function onChange(fn){ if(typeof fn==='function') _subs.push(fn); }
  function fire(){ _subs.forEach(function(f){ try{ f(); }catch(e){} }); }

  async function token(){ try{var s=await sb().auth.getSession(); return (s&&s.data&&s.data.session)?s.data.session.access_token:'';}catch(e){return '';} }
  async function callEdge(action, payload){
    var url=(window.SB_URL||PROJECT_URL)+'/functions/v1/toss-b2c';
    var tok=await token();
    var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},body:JSON.stringify(Object.assign({action:action}, payload||{}))});
    var d=await r.json().catch(function(){return {};});
    return { httpOk:r.ok, status:r.status, data:d };
  }

  // ── 데이터 API (RPC) ──
  async function add(studentId, productId, qty){
    var r=await sb().rpc('cart_add',{p_student:studentId,p_product:productId,p_qty:qty||1});
    if(r.error) throw new Error(r.error.message); fire(); return r.data;
  }
  async function addByRef(studentId, ref, qty){
    var p=await sb().from('store_products').select('id').eq('ref',ref).eq('active',true).limit(1);
    if(p.error) throw new Error(p.error.message);
    if(!p.data||!p.data[0]) throw new Error('상품을 찾을 수 없어요: '+ref);
    return add(studentId, p.data[0].id, qty);
  }
  async function list(){
    var r=await sb().rpc('cart_list'); if(r.error) throw new Error(r.error.message); return r.data||[];
  }
  async function count(){ try{ return (await list()).length; }catch(e){ return 0; } }
  async function setQty(id, q){ var r=await sb().rpc('cart_set_qty',{p_id:id,p_qty:q}); if(r.error) throw new Error(r.error.message); fire(); }
  async function remove(id){ var r=await sb().rpc('cart_remove',{p_id:id}); if(r.error) throw new Error(r.error.message); fire(); }
  async function clear(){ var r=await sb().rpc('cart_clear'); if(r.error) throw new Error(r.error.message); fire(); }
  async function products(kind){ var q=sb().from('store_products').select('*').eq('active',true).order('sort'); if(kind)q=q.eq('kind',kind); var r=await q; if(r.error)throw new Error(r.error.message); return r.data||[]; }

  // ── 결제 ──
  async function checkout(billingKeyId){
    var r=await callEdge('checkout_cart', billingKeyId?{billing_key_id:billingKeyId}:{});
    return r; // {httpOk,status,data:{ok,results,summary}|{error,summary}}
  }
  // ── 단품 통합단건 결제창(Toss requestPayment) — 구독은 빌링(별도 흐름) ──
  function tossOneTime(amount){
    if(!window.TossPayments) throw new Error('토스 SDK 미로드 — 새로고침 해주세요.');
    var ck=window.TOSS_CLIENT_KEY; if(!ck) throw new Error('결제 설정(config.js) 로드 실패');
    var oid='ptc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
    var base=location.origin+location.pathname;
    // 취소/실패 → 앱으로 클린 복귀(?acart_cancelled=1). 오버레이면 복귀 핸들러가 최상위로 탈출시킴.
    snapBody();
    return TossPayments(ck).requestPayment('카드',{ amount:amount, orderId:oid, orderName:'펜타 단품 결제', customerName:'고객', successUrl:base+'?acart_pay=1', failUrl:base+'?acart_cancelled=1&v=cart' });
  }
  function toast(m){ try{ var d=document.createElement('div'); d.textContent=m; d.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99999;background:#141a29;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-family:Pretendard,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:90%'; document.body.appendChild(d); setTimeout(function(){ d.style.transition='opacity .4s'; d.style.opacity='0'; setTimeout(function(){try{d.remove();}catch(_e){}},420); },3600); }catch(e){ try{alert(m);}catch(_e){} } }
  // ── 상품 한 건 즉시 결제(바로구매) — 장바구니를 거치지 않고 단건 결제창 오픈 ──
  //   서버(confirm_buy_now)가 ref로 store_products 가격을 재검증 후 승인·지급.
  function buyNow(studentId, ref, amount){
    if(!(Number(amount)>0)) throw new Error('가격 정보가 없어 결제할 수 없어요.');
    // ★ 단품은 전용 결제위젯 페이지(/pay/checkout)로 통일 → 카드·계좌이체·휴대폰 등
    //   토스 상점관리자에 노출 설정된 결제수단이 모두 뜬다. (카드 고정 requestPayment 제거)
    location.href = '/pay/checkout?mode=buy&ref=' + encodeURIComponent(ref)
      + '&student=' + encodeURIComponent(studentId||'')
      + '&amount=' + (Number(amount))
      + '&name=' + encodeURIComponent('펜타 단품 결제');
  }

  // ── UI ──
  function won(n){ return (Number(n)||0).toLocaleString('ko-KR')+'원'; }
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  var CSSID='arche-cart-css';
  function injectCSS(){
    if(document.getElementById(CSSID))return;
    var s=document.createElement('style'); s.id=CSSID;
    s.textContent=[
    ".acart{--ink:#191f28;--dim:#4e5968;--mute:#8b95a1;--line:#e5e8eb;--navy:#141a29;--blue:#3182f6;--soft:#f5f6f8;--safe:#12b76a;--gold:#c8a24a;",
      "font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;color:var(--ink);max-width:520px;margin:0 auto}",
    ".acart *{box-sizing:border-box}",
    ".acart h2{font-size:18px;font-weight:800;margin:0 0 14px;display:flex;align-items:center;gap:8px}",
    ".acart .grp{margin-bottom:16px}",
    ".acart .gh{font-size:12px;font-weight:800;color:var(--mute);margin:0 0 8px}",
    ".acart .it{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:11px 13px;margin-bottom:8px;background:#fff}",
    ".acart .it .nm{font-weight:700;font-size:14px}",
    ".acart .it .sub{font-size:11.5px;color:var(--mute);margin-top:2px}",
    ".acart .it .pr{margin-left:auto;font-weight:800;font-size:14px;white-space:nowrap}",
    ".acart .tag{font-size:10px;font-weight:800;border-radius:20px;padding:2px 8px;margin-left:6px}",
    ".acart .tag.sub{background:#eaf2ff;color:#1b64da}.acart .tag.one{background:#fff3e0;color:#9a6a12}",
    ".acart .qty{display:flex;align-items:center;gap:6px;margin-left:8px}",
    ".acart .qty button{width:24px;height:24px;border:1px solid var(--line);background:#fff;border-radius:6px;font-weight:800;cursor:pointer;line-height:1}",
    ".acart .rm{border:0;background:transparent;color:var(--mute);cursor:pointer;font-size:16px;margin-left:4px}",
    ".acart .sumbox{border-top:1px solid var(--line);padding-top:12px;margin-top:6px}",
    ".acart .row{display:flex;justify-content:space-between;font-size:13px;color:var(--dim);margin:5px 0}",
    ".acart .row.tot{font-size:16px;font-weight:800;color:var(--ink);margin-top:8px}",
    ".acart .note{font-size:11.5px;color:var(--mute);margin-top:8px;line-height:1.6}",
    ".acart .btn{display:block;width:100%;border:0;border-radius:12px;font:inherit;font-weight:800;font-size:15px;padding:14px;cursor:pointer;background:linear-gradient(135deg,#141a29,#2a3a58);color:#fff;margin-top:14px}",
    ".acart .btn:disabled{opacity:.5}",
    ".acart .empty{text-align:center;color:var(--mute);font-size:14px;padding:44px 0}",
    ".acart .warn{background:#fff8e6;border:1px solid #f0dca6;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#8a6d1f;line-height:1.6;margin-top:12px}"
    ].join('');
    document.head.appendChild(s);
  }

  function itemRow(it){
    var isPass = it.kind==='pass';
    var tag = it.billing==='subscription'
      ? '<span class="tag sub">월구독</span>'
      : '<span class="tag one">단건</span>';
    var qty = isPass
      ? '<div class="qty"><button data-dec="'+it.id+'">−</button><span>'+it.qty+'</span><button data-inc="'+it.id+'">+</button></div>'
      : '';
    return '<div class="it"><div><div class="nm">'+esc(it.title)+tag+'</div>'
      +(it.subtitle?'<div class="sub">'+esc(it.subtitle)+'</div>':'')
      +'</div>'+qty
      +'<div class="pr">'+won(it.line_total)+'</div>'
      +'<button class="rm" data-rm="'+it.id+'" title="삭제">×</button></div>';
  }

  async function mount(container, ctx){
    injectCSS(); ctx=ctx||{};
    if(typeof container==='string') container=document.getElementById(container)||document.querySelector(container);
    if(!container) return;
    container.classList.add('acart');
    async function draw(){
      var rows;
      try{ rows=await list(); }catch(e){ container.innerHTML='<div class="empty">장바구니를 불러오지 못했어요: '+esc(e.message)+'</div>'; return; }
      if(!rows.length){ container.innerHTML='<h2>🛒 장바구니</h2><div class="empty">담은 상품이 없어요.<br>관심 있는 시즌이나 이용권을 담아보세요.</div>'; if(ctx.onChange)ctx.onChange(0); return; }
      // 자녀별 그룹
      var byStu={}; rows.forEach(function(r){ var k=r.student_name||'자녀'; (byStu[k]=byStu[k]||[]).push(r); });
      var subTotal=0, oneTotal=0;
      rows.forEach(function(r){ if(r.billing==='subscription') subTotal+=r.line_total; else oneTotal+=r.line_total; });
      var html='<h2>🛒 장바구니</h2>';
      Object.keys(byStu).forEach(function(nm){
        html+='<div class="grp"><div class="gh">'+esc(nm)+'</div>'+byStu[nm].map(itemRow).join('')+'</div>';
      });
      html+='<div class="sumbox">'
        +(subTotal?'<div class="row"><span>정기 구독 합계</span><b>'+won(subTotal)+'</b></div>':'')
        +(oneTotal?'<div class="row"><span>단건(시즌·이용권) 합계</span><b>'+won(oneTotal)+'</b></div>':'')
        +'<div class="row tot"><span>결제 예정 금액</span><span>'+won(subTotal+oneTotal)+'</span></div>'
        +(subTotal&&oneTotal?'<div class="note">구독과 단건은 결제 시 자동으로 나뉘어 처리됩니다.</div>':'')
        +'</div>';
      html+='<div style="margin:12px 2px 6px;font-size:11px;color:#8b95a1;line-height:1.75">📄 디지털 학습 구독/이용권 서비스 · <b>실물 배송 없음</b> · <b>결제 즉시 이용 개시</b> · <b>이용(사용)기간: 개별구매·이용권은 결제일로부터 3개월</b>, 구독은 결제 주기 동안 이용. 결제 시 '
        +'<a href="/policy/refund.html" target="_blank" rel="noopener" style="color:#1b64da;text-decoration:underline">청약철회·환불정책</a> · '
        +'<a href="/policy/terms.html" target="_blank" rel="noopener" style="color:#1b64da;text-decoration:underline">이용약관</a> · '
        +'<a href="/policy/privacy.html" target="_blank" rel="noopener" style="color:#1b64da;text-decoration:underline">개인정보처리방침</a>에 동의하게 됩니다.</div>';
      html+='<button class="btn" id="acart-pay">'+won(subTotal+oneTotal)+' 결제하기</button>';
      html+='<div id="acart-msg"></div>';
      html+='<div style="text-align:center;font-size:10.5px;color:#c0c6cf;margin-top:8px">결제모듈 v'+(window.ArcheCart&&ArcheCart.version||'?')+'</div>';
      container.innerHTML=html;
      if(ctx.onChange)ctx.onChange(rows.length);

      container.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=async function(){ try{ await remove(+b.getAttribute('data-rm')); draw(); }catch(e){ alert(e.message); } }; });
      container.querySelectorAll('[data-inc]').forEach(function(b){ b.onclick=async function(){ var id=+b.getAttribute('data-inc'); var r=rows.filter(function(x){return x.id===id;})[0]; try{ await setQty(id,(r?r.qty:1)+1); draw(); }catch(e){ alert(e.message); } }; });
      container.querySelectorAll('[data-dec]').forEach(function(b){ b.onclick=async function(){ var id=+b.getAttribute('data-dec'); var r=rows.filter(function(x){return x.id===id;})[0]; try{ await setQty(id,Math.max(0,(r?r.qty:1)-1)); draw(); }catch(e){ alert(e.message); } }; });

      var payBtn=container.querySelector('#acart-pay'); var msg=container.querySelector('#acart-msg');
      payBtn.onclick=async function(){
        // 단품(시즌·이용권)이 있으면 → 전용 결제위젯 페이지(/pay/checkout)로 이동.
        //   앱과 분리된 페이지에서 결제 → 취소해도 앱이 새로고침/멈춤 없이 그대로 유지된다.
        if(oneTotal>0){
          location.href = '/pay/checkout?mode=cart&amount=' + oneTotal + '&name=' + encodeURIComponent('펜타 장바구니 결제');
          return;
        }
        // 구독(빌링) 경로만 '처리 중…' 표시 — 이건 페이지 이동이 없으므로 안전
        payBtn.disabled=true; payBtn.textContent='처리 중…';
        try{
          var r=await checkout(ctx.billingKeyId);
          if(r.data && r.data.ok){
            msg.innerHTML='<div class="warn" style="background:#ecfdf3;border-color:#a6e6c3;color:#137a44">✅ 결제가 완료됐어요.</div>';
            fire(); setTimeout(draw,900);
          } else if(r.data && (r.data.error==='TOSS_NOT_CONFIGURED'||r.data.error==='KG_NOT_CONFIGURED')){
            var s=r.data.summary||{};
            msg.innerHTML='<div class="warn">🔧 결제 준비 중입니다. (토스 계약·설정 후 활성화)<br>결제 예정: 구독 '+won(s.sub_total)+' + 단건 '+won(s.one_total)+'</div>';
            payBtn.disabled=false; payBtn.textContent=won(subTotal+oneTotal)+' 결제하기';
          } else if(r.data && r.data.error==='NEED_CARD'){
            msg.innerHTML='<div class="warn">💳 결제 카드를 먼저 등록해 주세요.</div>';
            if(ctx.onNeedCard) ctx.onNeedCard();
            payBtn.disabled=false; payBtn.textContent=won(subTotal+oneTotal)+' 결제하기';
          } else {
            msg.innerHTML='<div class="warn">결제 실패: '+esc((r.data&&(r.data.error||JSON.stringify(r.data)))||('오류('+r.status+')'))+'</div>';
            payBtn.disabled=false; payBtn.textContent=won(subTotal+oneTotal)+' 결제하기';
          }
        }catch(e){ msg.innerHTML='<div class="warn">오류: '+esc(e.message)+'</div>'; payBtn.disabled=false; payBtn.textContent='결제하기'; }
      };
    }
    onChange(function(){ /* 외부 담기 시 뱃지 갱신용 훅 */ });
    _cartReload = draw; // 결제 취소 시 '처리 중…' 버튼 원복용
    await draw();
    return { reload: draw };
  }

  // ── 결제 취소 신호 수신 → 앱 DOM에서 토스 결제 오버레이(iframe) 직접 제거 ──
  //   /pay/cancel 페이지가 postMessage로 알려주면, 앱이 자기 문서에서 토스 iframe을
  //   src로 정확히 찾아 컨테이너째 제거한다. (앱 재로딩 없이 이전 화면으로 즉시 복귀)
  function clearTossOverlay(){
    try{
      // (1) 결제 시작 이후 토스가 body에 새로 삽입한 노드(오버레이·백드롭·iframe)만 정확히 제거.
      //     → 클릭을 가로막는 투명 백드롭까지 남김없이 제거되어, 새로고침 없이 바로 조작 가능.
      if(_bodySnap){
        var cur=[].slice.call(document.body.children);
        for(var k=0;k<cur.length;k++){
          var el=cur[k];
          if(_bodySnap.indexOf(el)<0){ try{ el.parentNode&&el.parentNode.removeChild(el); }catch(e){} }
        }
      }
      // (2) 백업: 남아있을 수 있는 토스/취소 iframe을 src로 직접 제거
      var frames=document.getElementsByTagName('iframe');
      for(var i=frames.length-1;i>=0;i--){
        var f=frames[i], src=(f.getAttribute('src')||f.src||'');
        if(!/tosspayments|\/pay\/cancel/i.test(src)) continue;
        var container=f, p=f.parentElement, hops=0;
        while(p && p.tagName && p.tagName.toLowerCase()!=='body' && hops<8){
          var cs=null; try{ cs=window.getComputedStyle(p); }catch(e){}
          if(cs && (cs.position==='fixed' || (parseInt(cs.zIndex,10)||0)>=1000)) container=p;
          p=p.parentElement; hops++;
        }
        if(container && container.parentNode) container.parentNode.removeChild(container);
        else if(f.parentNode) f.parentNode.removeChild(f);
      }
      // (3) 토스가 걸어둔 스크롤/위치 잠금 해제
      try{ document.body.style.overflow=''; document.documentElement.style.overflow=''; document.body.style.position=''; document.body.style.top=''; }catch(e){}
      _bodySnap=null;
      // (4) 카트의 '처리 중…' 버튼 원복 — 마운트된 카트를 다시 그려 상태를 되돌린다.
      if(typeof _cartReload==='function'){ try{ _cartReload(); }catch(e){} }
      else { var pb=document.getElementById('acart-pay'); if(pb){ pb.disabled=false; if(/처리/.test(pb.textContent)) pb.textContent='결제하기'; } }
    }catch(e){}
  }
  // 결제 미완료(취소·닫기)로 앱에 복귀했을 때 상태를 원복. 결제창 표현방식(오버레이/웹뷰)과 무관하게 동작.
  var _wentHidden = false;
  function cancelRecover(showToast){
    if(!_payPending) return;
    _payPending=false; _wentHidden=false;
    if(_watchIv){ clearInterval(_watchIv); _watchIv=null; }
    clearTossOverlay();
    if(showToast) toast('결제를 취소했어요.');
  }
  try{
    // (경로 B) 오버레이 iframe: /pay/cancel 페이지가 보내는 취소 신호 → 즉시 원복
    window.addEventListener('message', function(ev){
      try{ if(ev && ev.origin===location.origin && ev.data && ev.data.type==='arche-pay-cancel'){ cancelRecover(true); } }catch(e){}
    });
    // 결제창이 페이지를 통째로 이동(리다이렉트)시킨 뒤 돌아오면, 브라우저가 '처리 중…' 멈춘 화면을
    // BFCache로 되살려 타이머가 얼어붙는다. → 앱이 다시 보이는 순간 '무조건' 버튼을 원복한다(조건 없음).
    function resetPayBtnOnly(){
      try{
        var pb=document.getElementById('acart-pay');
        if(pb && /처리/.test(pb.textContent||'')){
          pb.disabled=false;
          if(typeof _cartReload==='function'){ try{ _cartReload(); }catch(e){ pb.textContent='결제하기'; } }
          else pb.textContent='결제하기';
        }
      }catch(e){}
    }
    // (경로 A) 별도 창/웹뷰: 결제창이 앱을 가려 'hidden'이 된 뒤 다시 'visible'로 돌아오면 → 취소로 보고 원복.
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState==='hidden'){ if(_payPending) _wentHidden=true; return; }
      if(document.visibilityState==='visible'){
        if(_payPending && _wentHidden){ setTimeout(function(){ cancelRecover(false); }, 250); }
        setTimeout(resetPayBtnOnly, 300); // 버튼은 무조건 원복
      }
    });
    // pageshow: BFCache로 되살아난(뒤로가기) 경우 카트를 통째로 다시 그려 어떤 잔여 상태든 초기화
    window.addEventListener('pageshow', function(e){
      if(e && e.persisted && typeof _cartReload==='function'){ try{ _cartReload(); }catch(_e){} }
      setTimeout(resetPayBtnOnly, 80);
      if(_payPending && _wentHidden) setTimeout(function(){ cancelRecover(false); }, 120);
    });
    window.addEventListener('focus', function(){ setTimeout(resetPayBtnOnly, 200); });
    // (경로 C · 핵심) 같은 문서 오버레이가 닫힌 뒤 '투명 잔여물'이 클릭을 먹는 경우:
    //   결제 시작 이후 생긴 최상위 노드(토스 백드롭/오버레이) 위를 탭하면 → 그 잔여물을 즉시 제거해 클릭막힘 해소.
    //   (결제 iframe 내부 조작은 건드리지 않음. 진짜 결제창의 바깥 여백 탭은 '닫기'로 동작 = 정상)
    function overlayTapCleanup(ev){
      try{
        if(!_payPending || !_bodySnap) return;
        var t=ev.target;
        if(t && t.tagName && t.tagName.toLowerCase()==='iframe') return; // 결제 iframe 내부는 유지
        var top=t;
        while(top && top.parentElement && top.parentElement!==document.body) top=top.parentElement;
        if(top && top.parentElement===document.body && _bodySnap.indexOf(top)<0){
          cancelRecover(false); // 잔여 오버레이 전체 스윕 + 상태 원복
        }
      }catch(e){}
    }
    document.addEventListener('pointerdown', overlayTapCleanup, true);
    document.addEventListener('touchstart', overlayTapCleanup, true);
    document.addEventListener('click', overlayTapCleanup, true);
  }catch(e){}

  // ── 단건 결제창 복귀 처리 ──
  //   장바구니 결제:  successUrl ?acart_pay=1  → confirm_cart_onetime
  //   바로구매:       successUrl ?acart_buy=1  → confirm_buy_now
  //   취소/실패:      failUrl    ?acart_cancelled=1
  (function handleOneTimeReturn(){
    var qs; try{ qs=new URLSearchParams(location.search); }catch(e){ return; }
    var payFlag=qs.get('acart_pay'), buyFlag=qs.get('acart_buy'), cancelFlag=qs.get('acart_cancelled'), reopenFlag=qs.get('acart_reopen');
    if(!payFlag && !buyFlag && !cancelFlag && !reopenFlag) return;
    var base=location.origin+location.pathname;
    function cleanUrl(){ try{ history.replaceState(null,'',base+location.hash); }catch(e){} }

    // ── 취소: 상태 누적(토스 잔여 오버레이) 방지를 위해 '캐시 무시 하드 로드'로 재오픈 URL로 이동.
    //    시작한 화면(상품담기=store / 장바구니=cart)을 v로 넘겨 그 화면으로 되돌린다.
    //    (오버레이 iframe이면 최상위 창을, 정상 리다이렉트면 현재 창을 통째로 새로 로드)
    if(cancelFlag){
      var view = (qs.get('v')==='store') ? 'store' : 'cart';
      var t = base + '?acart_reopen=' + view + '&_=' + (new Date().getTime());
      try{
        var W = (window.top && window.top!==window.self) ? window.top : window;
        W.location.replace(t);
      }catch(e){ try{ location.replace(t); }catch(_e){} }
      return;
    }
    // ── 재오픈: 완전히 새로 로드된 앱에서 시작 화면(상품담기/장바구니)을 다시 열고 URL 정리 ──
    if(reopenFlag){
      cleanUrl();
      var wantStore = (reopenFlag==='store');
      var ct=0, civ=setInterval(function(){
        ct++;
        var opener = wantStore ? window.b2cOpenStore : window.b2cOpenCart;
        if(opener && window.sb){ clearInterval(civ); setTimeout(function(){ try{ opener(); }catch(e){} toast('결제를 취소했어요.'); }, 300); }
        else if(ct>75){ clearInterval(civ); toast('결제를 취소했어요.'); }
      }, 200);
      return;
    }

    // ── 성공: 오버레이면 최상위로 탈출 후 서버 승인 ──
    try{
      if(window.top && window.top!==window.self){ window.top.location.replace(location.href); return; }
    }catch(e){}

    var paymentKey=qs.get('paymentKey'), oid=qs.get('orderId'), amount=Number(qs.get('amount'));
    if(!paymentKey||!oid){ cleanUrl(); return; }
    // 바로구매면 sessionStorage에서 ref/student 복원
    var buyMeta=null;
    if(buyFlag){ try{ buyMeta=JSON.parse(sessionStorage.getItem('acart_buy_'+oid)||'null'); }catch(_e){} }
    var action = buyFlag ? 'confirm_buy_now' : 'confirm_cart_onetime';
    var payload = buyFlag
      ? { paymentKey:paymentKey, orderId:oid, amount:amount, ref:(buyMeta&&buyMeta.ref)||'', student_id:(buyMeta&&buyMeta.student_id)||null }
      : { paymentKey:paymentKey, orderId:oid, amount:amount };
    // window.sb 준비될 때까지 대기(최대 ~10초) 후 서버 승인 호출.
    var waited=0;
    (function waitSb(){
      if(!window.sb){ if((waited+=200)>10000){ toast('세션 준비 실패 — 새로고침 후 다시 시도해주세요.'); return; } return void setTimeout(waitSb,200); }
      toast('결제 승인 중입니다…');
      callEdge(action, payload).then(function(r){
        if(r.data && r.data.ok){ toast('✅ 결제가 완료됐어요. 이용이 개시됩니다.'); try{ sessionStorage.removeItem('acart_buy_'+oid); }catch(_e){} fire(); }
        else { toast('결제 승인 실패: '+((r.data&&(r.data.error||r.data.message))||('오류('+r.status+')'))); }
        cleanUrl();
      }).catch(function(e){ toast('승인 요청 오류: '+((e&&e.message)||e)); cleanUrl(); });
    })();
  })();

  window.ArcheCart = {
    add:add, addByRef:addByRef, list:list, count:count,
    setQty:setQty, remove:remove, clear:clear, products:products,
    checkout:checkout, buyNow:buyNow, mount:mount, onChange:onChange, version:'3.0'
  };
})();
