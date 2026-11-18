/* Amin : cache hors ligne et clic sur les notifications. */
const CACHE = 'mawqut-v25';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'css/coran.css', 'css/apprendre.css', 'css/print.css', 'css/reciter.css', 'css/hadiths.css', 'css/tafsir.css', 'css/suivi.css',
  'js/engine.js', 'js/cities.js', 'js/mosques.js', 'js/app.js', 'js/pageflip.js', 'css/motion.css', 'js/motion.js', 'css/telecharger.css', 'js/telecharger.js', 'js/quran.js', 'js/fiches.js', 'js/learn.js', 'js/priere-audio.js', 'js/moments.js', 'js/hadiths.js', 'js/tafsir.js', 'js/suivi.js', 'quran/plan-data.js', 'hadith/meta.js',
  'quran/meta.js', 'quran/s001.js', 'quran/s002.js', 'quran/s112.js',
  'audio/page-turn.mp3', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-72.png',
  'fonts/amiri-arabic-400-normal.woff2', 'fonts/amiri-arabic-700-normal.woff2',
  'fonts/amiri-latin-400-normal.woff2', 'fonts/amiri-latin-400-italic.woff2',
  'fonts/amiri-quran-arabic-400-normal.woff2',
  'fonts/jost-latin-wght-normal.woff2', 'fonts/jost-latin-ext-wght-normal.woff2'
];
// Les autres sourates et les adhans sont mis en cache au fil de la lecture et de l'écoute.

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.includes('/downloads/')) return; // les installateurs sont lourds : jamais dans le cache
  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
