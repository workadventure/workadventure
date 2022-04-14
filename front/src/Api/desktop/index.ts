import { availabilityStatusStore, requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { get } from "svelte/store";
import { WorkAdventureDesktopApi } from "@wa-preload-app";
import { AvailabilityStatus } from "../../Messages/ts-proto-generated/protos/messages";

declare global {
    interface Window {
        WAD: WorkAdventureDesktopApi;
    }
}

class DesktopApi {
    isSilent: boolean = false;

    init() {
        if (!window?.WAD?.desktop) {
            return;
        }

        console.log("Yipee you are using the desktop app ;)");

        window.WAD.onMuteToggle(() => {
            if (this.isSilent) return;
            if (get(requestedMicrophoneState) === true) {
                requestedMicrophoneState.disableMicrophone();
            } else {
                requestedMicrophoneState.enableMicrophone();
            }
        });

        window.WAD.onCameraToggle(() => {
            if (this.isSilent) return;
            if (get(requestedCameraState) === true) {
                requestedCameraState.disableWebcam();
            } else {
                requestedCameraState.enableWebcam();
            }
        });

        availabilityStatusStore.subscribe((status) => {
            this.isSilent = status === AvailabilityStatus.SILENT;
        });
    }
}

export const desktopApi = new DesktopApi();
