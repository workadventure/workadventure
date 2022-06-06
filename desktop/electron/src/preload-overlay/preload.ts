import { contextBridge, ipcRenderer } from "electron";
import {WorkAdventureOverlayDesktopApi} from "./types";
import {Subject} from "rxjs";

const messagesSubscriber = new Subject();

ipcRenderer.on('connectToOverlay', (event, msg) => {
    console.log("Connect request received in OVERLAY window", event, msg);
    const messagePort = event.ports[0];

    messagePort.addEventListener('message', (event) => {
        messagesSubscriber.next(event.data);
    });
});

const api: WorkAdventureOverlayDesktopApi = {
    onWebRtcReceived(callback: (message: any) => void): void {
        ipcRenderer.on('webRtcReceived', (event, msg) => {
            console.log("Message received in OVERLAY window", event, msg);
            callback(msg);
        })
    },
    onEventReceivedFromApp(callback: (message: any) => void): void {
        messagesSubscriber.subscribe(callback);
    },
};

contextBridge.exposeInMainWorld("WAD", api);
