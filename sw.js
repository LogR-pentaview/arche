/* Arche PWA Service Worker — index는 network-first(배포 즉시 반영), 아이콘 등 정적만 캐시 */
const CACHE = 'arche-v2.6';
const STATIC = ['/manifest.json','/icon-192.png','/icon-512.png','/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API·외부 도메인은 서비스워커 개입 없이 통과
  if (url.origin !== location.origin) return;
  // 페이지 이동: network-first, 오프라인 시 캐시 폴백
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('/', cp)); return r; })
        .catch(() => caches.match('/'))
    );
    return;
  }
  // 정적 리소스: cache-first
  if (STATIC.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
