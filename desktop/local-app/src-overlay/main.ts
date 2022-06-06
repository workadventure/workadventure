import "virtual:windi.css";
import {WorkAdventureOverlayDesktopApi} from "../../electron/src/preload-overlay/types";

/*const app = new App({
    target: document.getElementById("app"),
});

export default app;*/

declare global {
    interface Window {
        WAD: WorkAdventureOverlayDesktopApi
    }
}

window.WAD.onWebRtcReceived((message: any) => {
    console.log("I REALLY GOT IT! YEAH!", message);
});

window.WAD.onEventReceivedFromApp((message) => {
    console.log("GOT A MESSAGE THROUGH THE PORT!")
})

export {};
