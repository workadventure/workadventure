/// <reference types="@workadventure/iframe-api-typings/iframe_api" />

WA.onInit().then(() => {
    WA.player.proximityMeeting.onJoin().subscribe(() => {
        setTimeout(() => {
            WA.player.proximityMeeting.playSound('../Audience.mp3').catch((e) => {
                console.error('Error while playing sound', e);
            });
        }, 1000);
    });
});
