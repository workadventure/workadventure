WA.room.onEnterLayer('myLayer').subscribe(() => {
    WA.chat.sendChatMessage("Hello!", 'Woka');
});

WA.room.onLeaveLayer('myLayer').subscribe(() => {
    WA.chat.sendChatMessage("Goodbye!", 'Woka');
});