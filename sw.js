// dooing 서비스워커 — 앱 껍데기만 오프라인 캐시. 데이터(Supabase)는 항상 네트워크.
const VER = 'dooing-v1';
const SHELL = ['./', 'index.html', 'privacy.html', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 로그인/DB 호출은 건드리지 않음
  if (url.hostname.endsWith('supabase.co')) return;
  // 페이지 이동: 네트워크 우선, 실패하면 캐시 (OAuth 돌아올 때 ?code=, #access_token 붙어도 OK)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok && url.origin === location.origin) { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  // 같은 출처 파일 + CDN(supabase-js, 폰트): 캐시 먼저, 뒤에서 갱신
  if (url.origin === location.origin || CDN.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});
