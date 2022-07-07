WA.onInit().then(() => {
    initListeners();
});

function initListeners() {

    WA.room.onEnterLayer('blue_carpet').subscribe(async () => {
        WA.chat.open();
    });

    WA.room.onEnterLayer('white_carpet').subscribe(async () => {
        WA.chat.close();
    });
}
