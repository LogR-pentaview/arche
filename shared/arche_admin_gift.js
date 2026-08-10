/* ARCHE 관리자 · 상품별 선물 발급 탭 (드롭인)
 * 관리자용index.html 에 <script src="/shared/arche_admin_gift.js?v=1"></script> 한 줄만 추가하면
 * 사이드바에 "선물 발급" 탭이 생기고, store_products 상품별로 무료 선물코드를 발급(QR·링크)할 수 있다.
 * 의존: 전역 sb(Supabase). ArcheGift 없으면 /shared/arche_gift.js 를 자동 로드.
 * 무료발급은 issue_gift 게이트(운영자: is_admin/b2b/academy_users/service_role)를 통과하는 계정만 가능.
 */
(function(){
  "use strict";
  function sb(){ return window.sb||null; }
  function esc(s){ if(window.esc)return window.esc(s); return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }
  function won(n){ return '₩'+Number(n||0).toLocaleString('ko-KR'); }

  function ensureGiftLib(cb){
    if(window.ArcheGift){ cb(); return; }
    var ex=document.querySelector('script[data-arche-gift]');
    if(ex){ ex.addEventListener('load',cb); return; }
    var s=document.createElement('script'); s.src='/shared/arche_gift.js?v=2'; s.setAttribute('data-arche-gift','1');
    s.onload=cb; s.onerror=function(){ alert('선물 모듈(arche_gift.js) 로드 실패'); };
    document.head.appendChild(s);
  }

  // 사이드바에 "선물 발급" 탭 추가 (운영 그룹 · 결제 다음)
  function injectNav(){
    if(document.querySelector('.nav[data-t="gift"]'))return;
    var side=document.querySelector('.side'); if(!side)return;
    var nav=document.createElement('div');
    nav.className='nav'; nav.setAttribute('data-t','gift');
    nav.innerHTML='<i class="ti ti-gift"></i>선물 발급';
    nav.addEventListener('click',function(){ if(window.go)window.go('gift'); else renderGift(); });
    var after=document.querySelector('.nav[data-t="billing"]');
    if(after && after.parentNode){ after.parentNode.insertBefore(nav, after.nextSibling); }
    else { var foot=side.querySelector('.foot'); side.insertBefore(nav, foot||null); }
  }

  // 기존 라우터 go() 를 감싸 'gift' 처리
  function patchGo(){
    if(window.__giftGoPatched)return;
    var orig=window.go;
    if(typeof orig!=='function'){ return; }
    window.go=function(t){
      if(t==='gift'){
        try{ if(window.innerWidth<=720){ var _s=document.querySelector('.side'); var _b=document.getElementById('mnav-backdrop'); if(_s)_s.classList.remove('open'); if(_b)_b.classList.remove('open'); } }catch(e){}
        document.querySelectorAll('.nav').forEach(function(n){ n.classList.toggle('on', n.dataset.t==='gift'); });
        return renderGift();
      }
      return orig.apply(this, arguments);
    };
    window.__giftGoPatched=true;
  }

  function panel(){ return document.getElementById('panel'); }

  async function renderGift(){
    var p=panel(); if(!p)return;
    p.innerHTML='<div class="h1">선물 발급</div><div class="sub">상품별 무료 선물코드 발급 · 발급 후 QR·링크를 전달하면 받는 분이 자녀에게 등록합니다</div>'
      +'<div id="gift-prod"><div class="muted">불러오는 중…</div></div>'
      +'<div id="gift-recent" style="margin-top:14px"></div>';
    var s=sb();
    if(!s){ document.getElementById('gift-prod').innerHTML='<div class="muted">DB 미연결</div>'; return; }
    // 상품(시즌) — 구독 티어·회권 제외
    var r=await s.from('store_products').select('*').eq('active',true).order('sort',{ascending:true});
    var box=document.getElementById('gift-prod');
    if(r.error){ box.innerHTML='<div class="muted">상품 불러오기 오류: '+esc(r.error.message)+'</div>'; return; }
    var rows=(r.data||[]).filter(function(x){ return x.kind==='season'; });
    if(!rows.length){ box.innerHTML='<div class="soon">발급 가능한 시즌 상품이 없습니다.</div>'; }
    else {
      // 코스별 그룹
      var groups={}; rows.forEach(function(x){ var g=String(x.ref||'').split(':')[0]||'기타'; (groups[g]=groups[g]||[]).push(x); });
      var GL={vision:'펜타 비전',track:'펜타 트랙',allinone:'올인원',arche:'아르케'};
      var html='';
      Object.keys(groups).forEach(function(g){
        html+='<div class="card"><h3>'+esc(GL[g]||g)+'</h3>'
          +groups[g].map(function(x){
            return '<div class="row"><div><div class="nm">'+esc(x.title||x.ref)+'</div>'
              +'<div class="meta">'+esc(x.ref||'')+' · '+won(x.price)+'</div></div>'
              +'<button class="btn g" data-ref="'+esc(x.ref)+'" data-title="'+esc(x.title||'')+'" data-price="'+Number(x.price||0)+'">🎁 선물코드 발급</button></div>';
          }).join('')+'</div>';
      });
      box.innerHTML=html;
      box.querySelectorAll('button[data-ref]').forEach(function(b){
        b.addEventListener('click',function(){
          ensureGiftLib(function(){
            window.ArcheGift.issueFree({ ref:b.getAttribute('data-ref'), label:b.getAttribute('data-title')||null, price:Number(b.getAttribute('data-price'))||null });
          });
        });
      });
    }
    loadRecent();
  }

  async function loadRecent(){
    var el=document.getElementById('gift-recent'); if(!el)return;
    var s=sb(); if(!s)return;
    var r=await s.from('gift_coupons').select('code,stage,level,season,label,price,status,order_ref,created_at').order('created_at',{ascending:false}).limit(20);
    if(r.error){ el.innerHTML=''; return; } // RLS 등으로 막히면 숨김
    var rows=r.data||[];
    if(!rows.length){ el.innerHTML='<div class="card"><h3>최근 발급 선물</h3><div class="muted">아직 발급 내역이 없습니다.</div></div>'; return; }
    var SL={issued:'<span class="badge b-approved">발급됨</span>',redeemed:'<span class="badge b-trial">사용됨</span>',expired:'<span class="badge b-rejected">만료</span>'};
    el.innerHTML='<div class="card"><h3>최근 발급 선물 <span class="meta" style="font-weight:400">· 최대 20건</span></h3>'
      +rows.map(function(x){
        var tt=(x.label&&String(x.label).trim())?x.label:((x.stage||'')+' 시즌'+x.season);
        var src=x.order_ref?'결제':'무료';
        return '<div class="row"><div><div class="nm" style="font-size:13px">'+esc(tt)+' '+(SL[x.status]||esc(x.status))+'</div>'
          +'<div class="meta" style="font-family:monospace">'+esc(x.code)+' · '+src+' · '+won(x.price)+' · '+String(x.created_at||'').slice(0,10)+'</div></div>'
          +'<button class="btn o" data-copy="'+esc((location.origin||'https://arche.penta-view.com')+'/parent?gift='+encodeURIComponent(x.code))+'">링크 복사</button></div>';
      }).join('')+'</div>';
    el.querySelectorAll('button[data-copy]').forEach(function(b){
      b.addEventListener('click',function(){ try{ navigator.clipboard.writeText(b.getAttribute('data-copy')); b.textContent='복사됨'; setTimeout(function(){b.textContent='링크 복사';},1200);}catch(e){} });
    });
  }

  function boot(){
    injectNav();
    // go 가 아직 정의 전이면 잠깐 뒤 재시도
    if(typeof window.go==='function') patchGo();
    else { var n=0; var iv=setInterval(function(){ if(typeof window.go==='function'){ patchGo(); clearInterval(iv);} if(++n>40)clearInterval(iv); },100); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  window.ArcheAdminGift={ render:renderGift };
})();
