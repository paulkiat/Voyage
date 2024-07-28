const CACHE_NAME = 'voyage-ai-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/web/css/styles.css',
    '/web/core/index.js',
    '/web/core/spa.js',
    '/web/core/pwa.js',
    '/web/core/security-enhance.js',
    '/web/components/planning/trip-planner.js',
    '/web/components/navigation/explorer.js',
    '/web/components/user/profile-editor.js',
    '/web/components/shared/modal.js',
    '/web/components/shared/notifications.js',
    '/web/assets/images/user_avatar.png',
    '/web/assets/images/icon-192x192.png',
    '/web/assets/images/icon-512x512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache assets:', error);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});