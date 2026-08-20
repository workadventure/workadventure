// Matrix authenticated media support (adds its own install/activate/fetch listeners).
// Wrapped so a missing/updated media worker never breaks the base service worker.
try {
    importScripts('/matrix-media-service-worker.js');
} catch (e) {
    // Authenticated media unavailable; the rest of the service worker keeps working.
}

let CACHE_NAME = 'workavdenture-cache-dev';
let urlsToCache = [
    '/'
];

self.addEventListener('install', function(event) {
    // url to cache
    if(event.target && event.target.serviceWorker && event.target.serviceWorker.scriptURL){
        const url = new URL(event.target.serviceWorker.scriptURL);
        const searchParams = new URLSearchParams(url.search);
        const playUri = searchParams.get('playUri');
        urlsToCache = [playUri];
    }

    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', () => {
    //never cache data will be stored in dev mode
});

self.addEventListener('wait', function(event) {
    //TODO wait
});

self.addEventListener('update', function(event) {
    //TODO update
});

self.addEventListener('beforeinstallprompt', (e) => {
    //TODO change prompt
});

