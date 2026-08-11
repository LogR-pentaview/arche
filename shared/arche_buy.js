/* ARCHE · 구독 구매 시 '자녀 선택' 모달 (드롭인) */
(function(){
  "use strict";
  function esc(s){ if(window.esc)return window.esc(s); return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
  function isTier(ref){ return /^(vision|track|allinone):(monthly|annual)$/.test(String(ref||'')); }
  function tierLabel(ref){ return ({'vision:monthly':'펜타 비전','track:monthly':'펜타 트랙','allinone:monthly':'펜타 올인원(비전+트랙+아르케)'})[ref] || String(ref||''); }
  function children(){
    var pre=[].concat(window._students||[], window._gstudents||[]);
    var seen={}, out=[];
    pre.forEach(function(k){ if(k&&k.id&&!seen[k.id]){ seen[k.id]=1; out.push(k); } });
    if(out.length) return Promise.resolve(out);
    if(window.sb){ return window.sb.from('students').select('id,name,grade').order('created_at',{ascending:true}).then(function(r){ return (r&&r.data)||[]; }); }
    return Promise.resolve([]);
  }
  function injectCSS(){
    if(document.getElementById('abuy-css'))return;
    var st=document.createElement('style'); st.id='abuy-css';
    st.textContent=[
      '.abuy-ov{position:fixed;inset:0;z-index:1300;background:rgba(10,14,20,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Pretendard,system-ui,sans-serif}',
      '.abuy-c{background:#fff;color:#191f28;width:100%;max-width:400px;border-radius:18px;padding:22px 20px 20px;box-shadow:0 24px 70px rgba(0,0,0,.4)}',
      '.abuy-c h3{margin:0 0 3px;font-size:18px;font-weight:800;color:#1A237E}',
      '.abuy-c .sub{font-size:12.5px;color:#8b95a1;line-height:1.6;margin-bottom:14px}',
      '.abuy-item{background:#f4f7fb;border-radius:12px;padding:11px 13px;margin-bottom:14px;font-size:13.5px;font-weight:800;color:#141a29}',
      '.abuy-kids{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}',
      '.abuy-kid{display:flex;align-items:center;gap:10px;border:1.5px solid #e5e8eb;border-radius:11px;padding:11px 13px;cursor:pointer;font-size:14px}',
      '.abuy-kid.on{border-color:#3182f6;background:#eaf3ff}',
      '.abuy-kid .rd{width:18px;height:18px;border-radius:50%;border:2px solid #c5cad3;flex:none}',
      '.abuy-kid.on .rd{border-color:#3182f6;background:#3182f6;box-shadow:inset 0 0 0 3px #fff}',
      '.abuy-kid b{font-weight:700}.abuy-kid small{color:#8b95a1;margin-left:auto}',
      '.abuy-hint{font-size:11.5px;color:#1b64da;background:#eef4ff;border-radius:10px;padding:9px 11px;margin-bottom:14px;line-height:1.5}',
      '.abuy-btn{width:100%;padding:13px;border:none;border-radius:11px;font-size:14px;font-weight:800;cursor:pointer;background:#141a29;color:#fff}',
      '.abuy-btn[disabled]{opacity:.5;cursor:default}',
      '.abuy-btn.g{background:#fff;color:#4e5968;border:1px solid #e5e8eb;font-weight:700;margin-top:8px}',
      '.abuy-msg{font-size:12.5px;margin-top:10px;min-height:16px}'
    ].join('');
    document.head.appendChild(st);
  }
  function pickChildAndAdd(ref, qty){
    injectCSS();
    children().then(function(kids){
      var ov=document.createElement('div'); ov.className='abuy-ov';
      var kidsHTML = kids.length
        ? kids.map(function(k){ return '<div class="abuy-kid" data-id="'+esc(k.id)+'"><span class="rd"></span><b>'+esc(k.name||'-')+'</b><small>'+esc(k.grade||'')+'</small></div>'; }).join('')
        : '<div class="sub">등록된 자녀가 없어요. 먼저 자녀를 등록해 주세요.</div>';
      ov.innerHTML='<div class="abuy-c"><h3>어느 자녀가 사용하나요?</h3>'
        +'<div class="sub">이 구독을 사용할 자녀를 선택하세요. 선택한 자녀 계정에서 이용이 열립니다.</div>'
        +'<div class="abuy-item">🧾 '+esc(tierLabel(ref))+'</div>'
        +'<div class="abuy-kids">'+kidsHTML+'</div>'
        +'<div class="abuy-hint">👨‍👩‍👧 자녀가 여럿이면 <b>각 자녀별로 담아주세요.</b> <b>둘째 자녀부터 30% 자동 할인</b> (런칭 기간엔 첫 3개월 50%).</div>'
        +'<button class="abuy-btn" id="abuy-ok"'+(kids.length?'':' disabled')+'>이 자녀로 담기</button>'
        +'<button class="abuy-btn g" id="abuy-cancel">취소</button>'
        +'<div class="abuy-msg" id="abuy-msg"></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click',function(e){ if(e.target===ov) ov.remove(); });
      var c=ov.querySelector('.abuy-c'), sel=null;
      c.querySelectorAll('.abuy-kid').forEach(function(el){ el.addEventListener('click',function(){ c.querySelectorAll('.abuy-kid').forEach(function(x){x.classList.remove('on');}); el.classList.add('on'); sel=el.getAttribute('data-id'); }); });
      c.querySelector('#abuy-cancel').addEventListener('click',function(){ ov.remove(); });
      var ok=c.querySelector('#abuy-ok'), msg=c.querySelector('#abuy-msg');
      ok.addEventListener('click',function(){
        if(!sel){ msg.style.color='#f04452'; msg.textContent='자녀를 선택해 주세요.'; return; }
        if(!window.ArcheCart){ msg.style.color='#f04452'; msg.textContent='장바구니 모듈 미로드(/shared/arche_cart.js).'; return; }
        ok.disabled=true; msg.style.color='#8b95a1'; msg.textContent='담는 중…';
        window.ArcheCart.addByRef(sel, ref, qty||1).then(function(){
          try{ if(window.b2cCartBadge) window.b2cCartBadge(); }catch(e){}
          ov.remove();
          var t=document.getElementById('b2c-store-msg'); if(t){ t.textContent='✅ 선택한 자녀로 장바구니에 담았어요.'; setTimeout(function(){ if(t)t.textContent=''; },2200); }
        }).catch(function(e){ msg.style.color='#f04452'; msg.textContent='담기 실패: '+((e&&e.message)||e); ok.disabled=false; });
      });
    });
  }
  function patch(){
    var orig = window.b2cAddToCart;
    window.b2cAddToCart = function(ref, qty){
      if(isTier(ref)){ return pickChildAndAdd(ref, qty); }
      if(typeof orig === 'function') return orig(ref, qty);
      var s=window._activeStudent;
      if(!s||!s.id){ alert('먼저 홈에서 자녀를 선택/등록해 주세요.'); return; }
      if(window.ArcheCart) window.ArcheCart.addByRef(s.id, ref, qty||1).then(function(){ if(window.b2cCartBadge)window.b2cCartBadge(); });
    };
    window.__abuyPatched = true;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',patch);
  else patch();
  window.ArcheBuy = { pickChildAndAdd: pickChildAndAdd, isTier: isTier };
})();
