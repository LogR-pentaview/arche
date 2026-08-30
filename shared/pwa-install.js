/* =========================================================
   아르케/펜타 · 범용 PWA 설치 도우미  (shared/pwa-install.js)
   진입 페이지(홍보홈·랜딩·로그인)에 <script defer>로 넣으면:
     - manifest 링크 없으면 자동 주입 (기본 /manifest-penta.json)
     - /sw.js 미등록 시 자동 등록
     - Android/Chrome/Edge: beforeinstallprompt 잡아 '앱 설치' 버튼
     - iOS Safari: '홈 화면에 추가' 수동안내 시트
     - 이미 설치(standalone)면 아무것도 안 함
   자체 #pwa-install 버튼을 가진 앱(parent/academy)엔 넣지 말 것.
   ========================================================= */
(function(){
  if (window.__archePWA) return;
  window.__archePWA = true;

  var BRAND = '#3182f6';
  var DISMISS_KEY = 'arche_pwa_dismiss';
  var DISMISS_DAYS = 5;

  function isStandalone(){
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
  }
  function isiOS(){
    var ua = navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isSafari(){
    var ua = navigator.userAgent || '';
    return /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
  }
  function dismissed(){
    try{
      var t = parseInt(localStorage.getItem(DISMISS_KEY)||'0',10);
      return t && (Date.now() - t) < DISMISS_DAYS*864e5;
    }catch(e){ return false; }
  }
  function remember(){ try{ localStorage.setItem(DISMISS_KEY, String(Date.now())); }catch(e){} }

  (function ensureManifest(){
    if (document.querySelector('link[rel="manifest"]')) return;
    var cur = document.currentScript;
    var href = (cur && cur.getAttribute('data-manifest')) || '/manifest-penta.json';
    var l = document.createElement('link'); l.rel='manifest'; l.href=href;
    document.head.appendChild(l);
    if (!document.querySelector('link[rel="apple-touch-icon"]')){
      var a=document.createElement('link'); a.rel='apple-touch-icon'; a.href='/icon-180.png';
      document.head.appendChild(a);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
      var m=document.createElement('meta'); m.name='apple-mobile-web-app-capable'; m.content='yes';
      document.head.appendChild(m);
    }
  })();

  if ('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.getRegistration().then(function(reg){
        if(!reg) navigator.serviceWorker.register('/sw.js').catch(function(){});
      }).catch(function(){});
    });
  }

  if (isStandalone()) return;

  var css = document.createElement('style');
  css.textContent =
    '.pwa-btn{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483000;'
    +'display:none;align-items:center;gap:9px;background:'+BRAND+';color:#fff;border:none;'
    +'border-radius:999px;padding:13px 22px;font-size:15px;font-weight:800;cursor:pointer;'
    +'font-family:inherit;box-shadow:0 10px 30px rgba(49,130,246,.42);animation:pwaUp .35s ease}'
    +'.pwa-btn:active{transform:translateX(-50%) scale(.97)}'
    +'.pwa-btn .x{margin-left:4px;opacity:.8;font-weight:700;font-size:17px;line-height:1}'
    +'@keyframes pwaUp{from{opacity:0;transform:translate(-50%,14px)}to{opacity:1;transform:translate(-50%,0)}}'
    +'.pwa-mask{position:fixed;inset:0;z-index:2147483001;background:rgba(10,14,30,.55);display:none;align-items:flex-end}'
    +'.pwa-sheet{background:#fff;color:#0f1533;width:100%;border-radius:20px 20px 0 0;padding:22px 22px calc(22px + env(safe-area-inset-bottom));'
    +'box-shadow:0 -10px 40px rgba(0,0,0,.25);animation:pwaUp .3s ease;font-family:inherit}'
    +'.pwa-sheet h3{margin:0 0 6px;font-size:18px;font-weight:800}'
    +'.pwa-sheet p{margin:0 0 16px;font-size:13.5px;color:#5b6180;line-height:1.5}'
    +'.pwa-step{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid #eef1f7}'
    +'.pwa-step:first-of-type{border-top:none}'
    +'.pwa-num{flex:0 0 26px;height:26px;border-radius:8px;background:'+BRAND+';color:#fff;'
    +'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}'
    +'.pwa-step b{font-size:14.5px}'
    +'.pwa-close{margin-top:16px;width:100%;background:#eef1f7;color:#1a237e;border:none;border-radius:12px;'
    +'padding:13px;font-size:14.5px;font-weight:800;cursor:pointer;font-family:inherit}';
  document.head.appendChild(css);

  var deferred = null, btn = null;

  function makeBtn(label){
    if (btn) return btn;
    btn = document.createElement('button');
    btn.className = 'pwa-btn';
    btn.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>'
      + '<span>'+(label||'앱 설치')+'</span><span class="x" title="닫기">×</span>';
    document.body.appendChild(btn);
    btn.querySelector('.x').addEventListener('click', function(ev){
      ev.stopPropagation(); btn.style.display='none'; remember();
    });
    return btn;
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferred = e;
    if (dismissed()) return;
    var b = makeBtn('앱 설치');
    b.style.display = 'inline-flex';
    b.onclick = function(){
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function(){ deferred=null; b.style.display='none'; });
    };
  });

  window.addEventListener('appinstalled', function(){
    if (btn) btn.style.display='none';
    remember();
  });

  function showIOSGuide(){
    if (document.querySelector('.pwa-mask')) return;
    var mask = document.createElement('div'); mask.className='pwa-mask';
    mask.innerHTML =
      '<div class="pwa-sheet" role="dialog" aria-modal="true">'
      +'<h3>홈 화면에 앱으로 추가</h3>'
      +'<p>Safari에서 아래 순서대로 누르면 앱처럼 전체화면으로 실행돼요.</p>'
      +'<div class="pwa-step"><span class="pwa-num">1</span><div>화면 아래 <b>공유 버튼</b> '
      +'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="'+BRAND+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 16V4"/><path d="M8 8l4-4 4 4"/><path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7"/></svg>'
      +' 을 누르세요</div></div>'
      +'<div class="pwa-step"><span class="pwa-num">2</span><div>메뉴에서 <b>‘홈 화면에 추가’</b>를 선택</div></div>'
      +'<div class="pwa-step"><span class="pwa-num">3</span><div>오른쪽 위 <b>‘추가’</b>를 누르면 끝!</div></div>'
      +'<button class="pwa-close">알겠어요</button>'
      +'</div>';
    document.body.appendChild(mask);
    mask.style.display='flex';
    function close(){ mask.style.display='none'; mask.remove(); remember(); }
    mask.querySelector('.pwa-close').addEventListener('click', close);
    mask.addEventListener('click', function(e){ if(e.target===mask) close(); });
  }

  if (isiOS() && isSafari() && !dismissed()){
    window.addEventListener('load', function(){
      var b = makeBtn('홈 화면에 추가');
      b.style.display='inline-flex';
      b.onclick = showIOSGuide;
    });
  }

  window.archePWAInstall = function(){
    if (deferred){ deferred.prompt(); deferred.userChoice.then(function(){deferred=null;}); }
    else if (isiOS()){ showIOSGuide(); }
    else { alert('브라우저 메뉴(⋮)의 "앱 설치 / 홈 화면에 추가"를 눌러 설치할 수 있어요.'); }
  };
})();
