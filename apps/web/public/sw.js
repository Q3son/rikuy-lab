// Service worker mínimo: guarda la app para abrirla sin internet.
// Las llamadas a /api y /ws siempre van a la red.
const CACHE = 'rikuy-v2';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'display.html', 'control.html', 'panel.html'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/') || url.pathname.endsWith('/ws')) return;
  e.respondWith(
    // Las páginas siempre se revalidan con el servidor: así una versión nueva
    // aparece al abrir la app, sin esperar a que venza la caché del navegador.
    fetch(e.request, e.request.mode === 'navigate' ? { cache: 'no-cache' } : undefined)
      .then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./'))),
  );
});
