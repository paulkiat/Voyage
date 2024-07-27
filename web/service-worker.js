self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('my-cache').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/css/styles.css',
                '/core/main.js',
                '/core/security-enhance.js',
                '/core/pwa.js',
                '/assets/images/icon-192x192.png',
                '/assets/images/icon-512x512.png',
                '/assets/images/user_avatar.png'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});