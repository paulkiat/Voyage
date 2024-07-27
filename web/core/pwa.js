export function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('PWA is installed');
    }
}