WA.room.onEnterLayer('myLayer').subscribe(() => {
    WA.chat.sendChatMessage("Hello!", 'Wooka');
});

WA.room.onLeaveLayer('myLayer').subscribe(() => {
    WA.chat.sendChatMessage("Goodbye!", 'Wooka');
});