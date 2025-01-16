self.addEventListener('install', (event) => {
    console.log("install");
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log("activate"); 
    event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    console.log("notificationclick", event);
    
    event.notification.close();

    // Get the chat room data from notification
    const {chatRoomId, chatRoomName, tabUrl} = event.notification.data;
    
    // Focus or open window and navigate to chat
    event.waitUntil(
        clients.matchAll({type: 'window'}).then((clientList) => {
            if (clientList.length > 0) {
                // Focus existing window
                const waClient = clientList.find(client => client.url === tabUrl);
                console.log("waClient", waClient, tabUrl);

                if (waClient) {
                    waClient.focus();
                } else {
                    console.log("no waClient", tabUrl);
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