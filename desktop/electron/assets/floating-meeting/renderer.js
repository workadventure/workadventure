// Floating meeting toolbar renderer (sandboxed, vanilla JS).
//
// A compact Mute / Camera / Back-to-app pill shown by the main process when the user is in a call
// but has tabbed away from WorkAdventure. Stateless: the main process pushes mic/camera state and
// every click goes back as a command (mic/camera are toggled in main via the same path as the
// global shortcuts; back focuses the main window).
(function () {
    "use strict";

    var api = window.WAHud;
    if (!api) {
        console.error("Floating meeting toolbar: WAHud not exposed");
        return;
    }

    var btnMic = document.getElementById("fm-mic");
    var btnCam = document.getElementById("fm-cam");
    var btnBack = document.getElementById("fm-back");

    function setBtnState(btn, isOn) {
        btn.dataset.state = isOn ? "on" : "off";
    }

    api.onState(function (state) {
        if (!state || typeof state !== "object") return;
        setBtnState(btnMic, state.micEnabled === true);
        setBtnState(btnCam, state.cameraEnabled === true);
    });

    btnMic.addEventListener("click", function () {
        api.sendCommand({ type: "toggle-mic" });
    });
    btnCam.addEventListener("click", function () {
        api.sendCommand({ type: "toggle-camera" });
    });
    btnBack.addEventListener("click", function () {
        api.sendCommand({ type: "focus-main" });
    });

    api.ready();
})();
