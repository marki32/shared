const CACHE_NAME = 'lanshare-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/design.css',
    '/app.js',
    '/manifest.json'
];

// Install Event: Cache App Shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Network First for API, Cache First for Assets
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // API Requests: Network First, Fallback to Cache
    if (url.pathname.startsWith('/api/')) {
        e.respondWith(
            fetch(e.request)
                .then((res) => {
                    // Clone and cache successful responses
                    if (res.ok) {
                        const resClone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(e.request, resClone);
                        });
                    }
                    return res;
                })
                .catch(() => {
                    // If offline, return cached response
                    return caches.match(e.request);
                })
        );
        return;
    }

    // Standard Requests: Cache First, Network Fallback
    e.respondWith(
        caches.match(e.request).then((cachedRes) => {
            return cachedRes || fetch(e.request);
        })
    );
});
