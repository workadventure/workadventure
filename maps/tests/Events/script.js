/// <reference path="../../front/src/iframe_api.ts" />
WA.onInit().then(() => {

    WA.chat.onChatMessage((message) => {
        WA.event.dispatchEvent("chatMessage", message);
    });

    WA.event.onEventTriggered("chatMessage").subscribe((event) => {
        WA.chat.sendChatMessage(event.value, "Parrot");
    });
});
