WA.onInit().then(() => {
    let message;

    WA.room.onEnterZone("carpet", () => {
        message = WA.ui.triggerMessage("This is a test message. Press space to display a chat message. Walk out to hide the message.", () => {
            WA.chat.sendChatMessage("Hello world!", "The bot");
        });
    });

    WA.room.onLeaveZone("carpet", () => {
        message && message.remove();
    });
});
