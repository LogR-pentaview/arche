/* ARCHE · 받은 선물함 (학부모 대시보드) — 드롭인
 * 선물 링크로 담긴(claim) 선물과 사용한 선물을 컨설팅 홈(#v-home)에 카드로 표시.
 * 비회원이 선물 링크로 와서 회원가입해도, 담긴 선물이 이 선물함에 남아 자녀 지정 후 사용 가능.
 * 백엔드: my_gift_inbox() / claim_gift() / redeem_gift()  ·  사용은 ArcheGift.openRedeem(code) 재사용
 * 연결: parent/index.html 에 arche_gift.js·arche_referral.js 뒤로 <script src="/shared/arche_giftbox.js?v=1"></script>
 */
(function(){
  "use strict";
  function sb(){ return window.sb||null; }
  function esc(s){ if(window.esc)return window.esc(s); return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
  var _has=false, _observing=false;

  function injectCSS(){
    if(document.getElementById('agbx-css'))return;
    var st=document.createElement('style'); st.id='agbx-css';
    st.textContent=[
      '#agbx-card{background:#fff;border:1px solid #eef1f4;border-radius:18px;padding:18px 18px 14px;margin:0 0 14px;box-shadow:0 1px 3px rgba(25,31,40,.05);font-family:Pretendard,system-ui,sans-serif}',
      '#agbx-card .hd{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800;color:#191f28}',
      '#agbx-card .hd .cnt{margin-left:auto;font-size:11px;font-weight:800;color:#1b64da;background:#e8f3ff;border-radius:20px;padding:3px 9px}',
      '#agbx-card .sub{font-size:12px;color:#8b95a1;margin:6px 0 12px}',
      '.agbx-item{display:flex;align-items:center;gap:10px;border:1px solid #eef1f4;border-radius:13px;padding:12px 13px;margin-bottom:8px}',
      '.agbx-item .ic{width:38px;height:38px;border-radius:11px;background:#f4f0ff;display:grid;place-items:center;font-size:18px;flex:none}',
      '.agbx-item .bd{min-width:0;flex:1}',
      '.agbx-item .nm{font-size:13.5px;font-weight:700;color:#191f28;line-height:1.35}',
      '.agbx-item .mt{font-size:11px;color:#8b95a1;margin-top:2px;font-family:ui-monospace,monospace}',
      '.agbx-item .st{font-size:10.5px;font-weight:800;border-radius:20px;padding:3px 9px;white-space:nowrap}',
      '.agbx-st-use{background:#eafaf0;color:#12b76a}.agbx-st-done{background:#f2f4f6;color:#8b95a1}.agbx-st-exp{background:#fef3f2;color:#f04452}',
      '.agbx-btn{border:none;border-radius:10px;padding:8px 14px;font-size:12.5px;font-weight:800;cursor:pointer;background:#3182f6;color:#fff;white-space:nowrap;flex:none}',
      '.agbx-btn[disabled]{opacity:.5}'
    ].join('');
    document.head.appendChild(st);
  }

  function stInfo(x){
    if(x.status==='redeemed') return {t:'사용됨',c:'agbx-st-done'};
    if(x.status==='expired') return {t:'만료',c:'agbx-st-exp'};
    return {t:'사용 가능',c:'agbx-st-use'};
  }

  function render(card, rows){
    if(!rows.length){
      card.innerHTML='<div class="hd">🎁 받은 선물함</div>'
        +'<div class="sub" style="margin-bottom:2px">아직 받은 선물이 없어요. 선물 링크를 열면 자동으로 여기에 담겨요.</div>';
      return;
    }
    var usable=rows.filter(function(x){return x.status==='issued';}).length;
    card.innerHTML='<div class="hd">🎁 받은 선물함 <span class="cnt">사용 가능 '+usable+'</span></div>'
      +'<div class="sub">선물 링크로 받은 선물이 여기 담깁니다. 자녀를 선택해 바로 사용하세요.</div>'
      +rows.map(function(x){
        var st=stInfo(x); var ico=(x.kind==='referral')?'🎟️':'🎁';
        var right = x.status==='issued'
          ? '<button class="agbx-btn" data-code="'+esc(x.code)+'">사용하기</button>'
          : '<span class="st '+st.c+'">'+st.t+'</span>';
        return '<div class="agbx-item"><div class="ic">'+ico+'</div>'
          +'<div class="bd"><div class="nm">'+esc(x.summary||x.label||'선물')+'</div>'
          +'<div class="mt">'+esc(x.code)+(x.status==='redeemed'&&x.redeemed_at?(' · '+String(x.redeemed_at).slice(0,10)+' 사용'):'')+'</div></div>'
          +right+'</div>';
      }).join('');
    card.querySelectorAll('button[data-code]').forEach(function(b){
      b.addEventListener('click',function(){
        if(window.ArcheGift && ArcheGift.openRedeem){ ArcheGift.openRedeem(b.getAttribute('data-code')); }
      });
    });
  }

  function load(cb){
    var s=sb(); if(!s){ cb&&cb([]); return; }
    s.rpc('my_gift_inbox').then(function(r){
      var rows=(r&&!r.error&&r.data)?r.data:[];
      cb&&cb(rows);
    }).catch(function(){ cb&&cb([]); });
  }

  function inject(){
    var home=document.getElementById('v-home'); if(!home) return;
    load(function(rows){
      var exist=document.getElementById('agbx-card');
      injectCSS();
      _has=true;
      var card=exist;
      if(!card){ card=document.createElement('div'); card.id='agbx-card'; card.className='card';
        // 친구초대 카드(있으면) 다음, 없으면 홈 최상단
        var ref=document.getElementById('aref-home-card');
        if(ref && ref.parentNode===home){ home.insertBefore(card, ref.nextSibling); }
        else { home.insertBefore(card, home.firstChild); }
      }
      render(card, rows);
    });
  }

  function startObserver(){
    if(_observing) return; _observing=true;
    var home=document.getElementById('v-home');
    try{
      var mo=new MutationObserver(function(){ if(_has && document.getElementById('v-home') && !document.getElementById('agbx-card')) inject(); });
      if(home) mo.observe(home,{childList:true});
    }catch(e){}
    var n=0, iv=setInterval(function(){ inject(); if(++n>15)clearInterval(iv); }, 800);
  }

  function boot(){
    var s=sb();
    if(!s){ var t=0; var w=setInterval(function(){ if(sb()){clearInterval(w);boot();} if(++t>40)clearInterval(w); },200); return; }
    // 로그인 상태에서만 의미
    s.auth.getUser().then(function(res){
      if(res&&res.data&&res.data.user){ inject(); startObserver(); }
    }).catch(function(){});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  window.ArcheGiftbox={ refresh:inject };
})();
