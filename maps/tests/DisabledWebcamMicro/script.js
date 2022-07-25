WA.onInit().then(() => {
    initListeners();
    WA.controls.disableWebcam();
});

function initListeners() {
    WA.room.onEnterLayer('first_carpet').subscribe(() => {
        WA.controls.disableWebcam();
    });

    WA.room.onLeaveLayer('first_carpet').subscribe(() => {
        WA.controls.restoreWebcam();
    });

    WA.room.onEnterLayer('second_carpet').subscribe(() => {
        WA.controls.disableMicrophone();
    });

    WA.room.onLeaveLayer('second_carpet').subscribe(() => {
        WA.controls.restoreMicrophone();
    });
}
