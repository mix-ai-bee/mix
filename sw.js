/* Mix: работа как приложение и без интернета.
   Страницы берём сначала из сети (чтобы обновления Mix приходили сразу), а если сети нет — из сохранённой копии.
   Запросы к нейросетям и другим сайтам не трогаем. */
const CACHE = 'mix-app-v1';
const SHELL = ['./mix.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;               // нейросети, шрифты, CDN — напрямую
  if (url.pathname.includes('/downloads/')) return;          // большие файлы для скачивания не кэшируем
  const page = r.mode === 'navigate' || /\.html?$/.test(url.pathname);
  if (page) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname.endsWith('mix.html') ? './mix.html' : url.pathname, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./mix.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
    if (res.ok && /\/(icons|versions\/media)\//.test(url.pathname)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  })));
});
