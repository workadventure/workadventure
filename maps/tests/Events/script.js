/// <reference path="../../front/src/iframe_api.ts" />
WA.onInit().then(() => {

    WA.chat.onChatMessage((message) => {
        WA.event.broadcast("chatMessage", message);
    });

    WA.event.on("chatMessage").subscribe((event) => {
        WA.chat.sendChatMessage(event.value, "Parrot");
    });
});
