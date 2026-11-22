/* Halaman muka AlvisyaLabs: jaringan dulu, salinan simpanan bila luring. */
const C = 'alvisya-muka-8';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(['./', 'index.html', 'ikon/alvisya-simbol.svg', 'ikon/ccare-plus.svg', 'ikon/alvisya-192.png', 'ccareplus/', 'ccareplus/mesin.js', 'kunci.js']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // relay sinkron & situs lain tidak disimpan
  // cache 'no-cache': selalu tanya server (304 bila sama) — tanpa ini peramban/APK memakai salinan HTTP lama sampai 10 menit
  e.respondWith(fetch(new Request(u.href, { cache: 'no-cache', credentials: 'same-origin' })).then((r) => {
    if (r.redirected) return Response.redirect(r.url, 302);   // mis. /ccareplus → /ccareplus/ (navigasi tak boleh menerima respons hasil redirect)
    const s = r.clone(); caches.open(C).then((c) => c.put(e.request, s)); return r;
  }).catch(() => caches.match(e.request)));
});
