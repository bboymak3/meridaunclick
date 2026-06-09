const CACHE_NAME = 'unclick-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/search.html',
  '/map.html',
  '/business.html',
  '/new-business.html',
  '/login.html',
  '/dashboard.html',
  '/empleo.html',
  '/entretenimiento.html',
  '/cupones.html',
  '/eventos.html',
  '/reservas.html',
  '/marketplace.html',
  '/emergencia.html',
  '/admin.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/business-detail.js',
  '/js/chat.js',
  '/js/review-widget.js',
  '/js/ai-chatbot.js',
  '/js/home-map.js',
  '/js/map.js',
  '/js/dashboard.js',
  '/js/admin.js',
  '/js/auth.js',
  '/js/business-form.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML pages: network first (always serve fresh pages)
  if (request.headers.get('accept')?.includes('text/html') ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/' ||
      url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (CSS, JS, images): stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
