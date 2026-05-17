const CACHE_NAME = 'html-game-v4';
const urlsToCache = [
    '/duchon-vs-alcohol/',
    '/duchon-vs-alcohol/index.html',
    '/duchon-vs-alcohol/style.css',
    '/duchon-vs-alcohol/game.js',
    '/duchon-vs-alcohol/manifest.json',
    '/duchon-vs-alcohol/assets/icons/icon-192.png',
    '/duchon-vs-alcohol/assets/icons/icon-512.png',
    '/duchon-vs-alcohol/assets/mainbcg.png',
    '/duchon-vs-alcohol/assets/tutinst1.png',
    '/duchon-vs-alcohol/assets/tutinst2.png',
    '/duchon-vs-alcohol/assets/tutinst3.png'
];

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
                    return response || caches.match('/duchon-vs-alcohol/index.html');
                });
            })
    );
});
