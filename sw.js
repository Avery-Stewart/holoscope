// HoloScope service worker: makes the app installable and quick to open.
// App files: network first (so updates show up right away), cache as backup.
// Card images, fonts and the card reader: cached after the first download.
const SHELL = 'holoscope-shell-v1';
const ASSETS = 'holoscope-assets-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, ASSETS].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CACHE_FIRST = ['assets.tcgdex.net', 'cdn.jsdelivr.net', 'fonts.gstatic.com', 'fonts.googleapis.com'];

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  if (CACHE_FIRST.includes(url.hostname)) {
    e.respondWith(
      caches.open(ASSETS).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })
    );
  }
  // everything else (price APIs, GitHub) goes straight to the network
});
