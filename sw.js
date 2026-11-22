/* VERTEX · minimal service worker so every platform can be installed as a web app.
   Network first (always fresh data); falls back to the last copy when offline. Platforms with their own worker (msp-bi, aide) keep theirs. */
const C = 'vertex-shell-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok && r.mode === 'navigate') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)) } return res }).catch(() => caches.match(r)));
});
