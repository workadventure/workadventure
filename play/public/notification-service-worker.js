self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Get the chat room data from notification
    const {chatRoomId,tabUrl} = event.notification.data;
    
    // Focus or open window and navigate to chat
    event.waitUntil(
        clients.matchAll({type: 'window'}).then((clientList) => {
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