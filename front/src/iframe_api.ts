interface WorkAdventureApi {
    sendChatMessage(message: string, author: string): void;
}

// eslint-disable-next-line no-var
declare var WA: WorkAdventureApi;

window.WA = {
    /**
     * Sends a message in the chat.
     * Only the local user will receive this message.
     */
    sendChatMessage(message: string, author: string) {
        window.parent.postMessage({
            'type': 'chat',
            'data': {
                'message': message,
                'author': author
            }
        }, '*');
    }
}
