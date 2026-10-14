let CACHE_NAME = 'workavdenture-cache';
let urlsToCache = [
    '/'
];

self.addEventListener('install', function(event) {
    // Replace an older worker right away, or tabs left open keep a worker without the notificationclick handler.
    self.skipWaiting();

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
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    //TODO mamnage fetch data and cache management
    /*event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                return fetch(event.request).then(
                    function(response) {
                        // Check if we received a valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        var responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );*/
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

// Notifications are shown through this registration (see MessageNotification.ts), so the click lands here.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Get the chat room data from notification
    const {chatRoomId,tabUrl} = event.notification.data;

    // Focus the WorkAdventure window and navigate to chat
    event.waitUntil(
        // This worker never claims clients, so a tab opened before it activated is uncontrolled.
        clients.matchAll({type: 'window', includeUncontrolled: true}).then((clientList) => {
            if (clientList.length > 0) {
                // Focus existing window
                const waClient = clientList.find(client => client.url === tabUrl);

                if (waClient) {
                    waClient.focus();
                } else {
                    clientList[0].focus();
                }
            }

            // Send message to open chat if room data exists
            if (chatRoomId) {
                const messageChannel = new BroadcastChannel("message");
                messageChannel.postMessage({
                    type: 'openChat',
                    data: {
                        chatRoomId,
                    }
                });
            }
        })
    );
});
