const CACHE_NAME = 'html-game-v8';
const urlsToCache = [
    './',
    './index.html',
    './style.css?v=8',
    './game.js?v=8',
    './plant-selector.js?v=8',
    './speci-level.js?v=8',
    './lvl1.js?v=8',
    './lvl2.js?v=8',
    './lvl3.js?v=8',
    './lvl4.js?v=8',
    './lvl5.js?v=8',
    './lvl6.js?v=8',
    './manifest.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/mainbcg.png',
    './assets/tutinst1.png',
    './assets/tutinst2.png',
    './assets/tutinst3.png'
];

// Include plain URLs too so stale HTML can still load the latest file cache when
// the page has not yet switched to versioned script references.
urlsToCache.push('./plant-selector.js');
urlsToCache.push('./speci-level.js');
urlsToCache.push('./lvl1.js');
urlsToCache.push('./lvl2.js');
urlsToCache.push('./lvl3.js');
urlsToCache.push('./lvl4.js');
urlsToCache.push('./lvl5.js');
urlsToCache.push('./lvl6.js');
urlsToCache.push('./lvl3.js');
urlsToCache.push('./lvl4.js');
urlsToCache.push('./lvl5.js');
urlsToCache.push('./lvl6.js');

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching app shell');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Network first strategy - try to fetch fresh data first
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If successful, cache it and return it
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                
                console.log('Fetched from network:', event.request.url);
                return response;
            })
            .catch(() => {
                // If network fails, fall back to cache
                console.log('Network failed, using cache:', event.request.url);
                return caches.match(event.request).then((response) => {
                    return response || caches.match('./index.html');
                });
            })
    );
});
