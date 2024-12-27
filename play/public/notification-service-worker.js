self.addEventListener('install', function(event) {
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



self.addEventListener('notificationclick', function(event) {
    const messageChannel = new BroadcastChannel('messageChannel');
    console.log("notificationclick", event);
    if (event.action === 'reply') {
        messageChannel.postMessage({
            type: 'reply',
            data: event.notification.data
        });
    }
    
    event.notification.close();
});