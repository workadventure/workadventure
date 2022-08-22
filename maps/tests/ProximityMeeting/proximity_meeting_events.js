WA.onInit().then(() => {
    initListeners();
});

function initListeners() {
    WA.player.proximityMeeting.onJoin().subscribe(async (players) => {
        console.log(players);
        WA.chat.sendChatMessage("You joined a proximity chat", "System");
    });

    WA.player.proximityMeeting.onParticipantJoin().subscribe(async (player) => {
        console.log(player);
        WA.chat.sendChatMessage("A participant joined the proximity chat", "System");
    });

    WA.player.proximityMeeting.onParticipantLeave().subscribe(async (player) => {
        console.log(player);
        WA.chat.sendChatMessage("A participant left the proximity chat", "System");
    });

    WA.player.proximityMeeting.onLeave().subscribe(async () => {
        WA.chat.sendChatMessage("You left the proximity chat", "System");
    });
}
