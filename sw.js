/* Arche PWA Service Worker — KILL SWITCH (v8.5)
 * 기존 서비스워커·캐시를 완전히 제거하고, 모든 요청을 네트워크 직통으로 돌립니다.
 * 캐시로 인한 "예전 화면이 계속 뜨는" 문제를 원천 차단합니다.
 * (fetch 핸들러 없음 → 캐시 개입 0 · 재접속 시 항상 서버 최신본) */
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    try{
      // 1) 저장된 모든 캐시 삭제
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }catch(_){}
    try{
      // 2) 서비스워커 자신을 등록 해제 (이후 페이지는 SW 없이 네트워크로만 동작)
      await self.registration.unregister();
    }catch(_){}
    // ※ 의도적으로 clients.claim()·navigate()를 호출하지 않습니다
    //    (페이지가 /sw.js를 재등록하는 구조라 reload 루프를 방지)
  })());
});
/* fetch 이벤트 미처리 → 브라우저 기본 네트워크 요청 그대로 통과 */
