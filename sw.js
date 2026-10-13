/* Service worker: makes the app open instantly and work offline.
   IMPORTANT: whenever you change any app file, increase the number in CACHE
   (for example study-tracker-v2) so phones and PCs pick up the new files. */
const CACHE = 'study-tracker-v4';
const FILES = [
  './', './index.html', './styles.css', './app.js', './cloud.js',
  './firebase-config.js', './manifest.json', './my-timetable.csv',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const runtime = RUNTIME_HOSTS.includes(url.hostname);
  if (!sameOrigin && !runtime) return; // let Firebase and other calls go straight to the network

  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net; // open from cache first, refresh in the background
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then((l) => (l[0] ? l[0].focus() : clients.openWindow('./'))));
});
