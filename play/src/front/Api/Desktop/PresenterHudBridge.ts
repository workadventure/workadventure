import { get, type Unsubscriber } from "svelte/store";
import type {
    DesktopPipCommand,
    DesktopPresenterHudState,
    WorkAdventureDesktopApi,
} from "../../Interfaces/DesktopAppInterfaces";
import {
    cameraListStore,
    microphoneListStore,
    requestedCameraDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
    usedCameraDeviceIdStore,
    usedMicrophoneDeviceIdStore,
} from "../../Stores/MediaStore";
import { localUserStore } from "../../Connection/LocalUserStore";
import { requestedScreenSharingState, startScreenShareWithSource } from "../../Stores/ScreenSharingStore";

type WindowWithDesktop = Window & { WAD?: WorkAdventureDesktopApi };

/** Returns the native presenter-HUD API when running inside the Electron desktop shell. */
function getPresenterHudApi(): NonNullable<WorkAdventureDesktopApi["presenterHud"]> | undefined {
    const wad = (window as WindowWithDesktop).WAD;
    if (!wad || !wad.desktop) {
        return undefined;
    }
    return wad.presenterHud;
}

/**
 * Bridges the presenter HUD window (Zoom-style meeting bar, excluded from the capture) to the
 * WorkAdventure stores: pushes mic/camera/share state to the bar, and routes its commands back to the
 * same stores the in-app UI uses. The desktop app decides when the bar shows and where, from the
 * share source this world reports (setScreenShareSource).
 */
class PresenterHudBridge {
    private subscriptions: Unsubscriber[] = [];
    private onCommandUnsub: (() => void) | undefined;

    public start(): void {
        const api = getPresenterHudApi();
        if (!api) {
            return;
        }

        this.onCommandUnsub = api.onCommand((command) => this.handleCommand(command));

        // Push presenter state to the bar whenever any of its inputs change.
        const pushOnChange = [
            requestedMicrophoneState,
            requestedCameraState,
            requestedScreenSharingState,
            cameraListStore,
            microphoneListStore,
            requestedCameraDeviceIdStore,
            requestedMicrophoneDeviceIdStore,
            usedCameraDeviceIdStore,
            usedMicrophoneDeviceIdStore,
        ] as const;
        for (const store of pushOnChange) {
            this.subscriptions.push(store.subscribe(() => this.pushState()));
        }
    }

    public stop(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        this.subscriptions = [];
        this.onCommandUnsub?.();
        this.onCommandUnsub = undefined;
    }

    private buildState(): DesktopPresenterHudState {
        return {
            micEnabled: get(requestedMicrophoneState),
            cameraEnabled: get(requestedCameraState),
            screenSharing: get(requestedScreenSharingState),
            devices: {
                cameras: (get(cameraListStore) ?? []).map((d, i) => ({
                    id: d.deviceId,
                    label: d.label || `Camera ${i + 1}`,
                })),
                microphones: (get(microphoneListStore) ?? []).map((d, i) => ({
                    id: d.deviceId,
                    label: d.label || `Microphone ${i + 1}`,
                })),
                currentCameraId: get(usedCameraDeviceIdStore),
                currentMicrophoneId: get(usedMicrophoneDeviceIdStore),
            },
        };
    }

    private pushState(): void {
        getPresenterHudApi()?.pushState(this.buildState());
    }

    private handleCommand(command: DesktopPipCommand): void {
        switch (command.type) {
            case "toggle-mic":
                if (get(requestedMicrophoneState)) {
                    requestedMicrophoneState.disableMicrophone();
                } else {
                    requestedMicrophoneState.enableMicrophone();
                }
                break;
            case "toggle-camera":
                if (get(requestedCameraState)) {
                    requestedCameraState.disableWebcam();
                } else {
                    requestedCameraState.enableWebcam();
                }
                break;
            case "toggle-screenshare":
                if (get(requestedScreenSharingState)) {
                    requestedScreenSharingState.disableScreenSharing();
                } else {
                    requestedScreenSharingState.enableScreenSharing();
                }
                break;
            case "pick-source":
                // Direct screen switch from the meeting bar: restart the share with the new
                // source without ever going through the in-app picker.
                startScreenShareWithSource({
                    id: command.sourceId,
                    name: command.sourceName,
                    thumbnailURL: "",
                    display_id: command.displayId,
                });
                break;
            case "pick-device": {
                // Same as the in-app media settings: set the requested device (the media machine
                // re-acquires the stream) AND persist it as the preferred device.
                if (command.kind === "camera") {
                    requestedCameraDeviceIdStore.set(command.deviceId);
                    localUserStore.setPreferredVideoInputDevice(command.deviceId);
                } else {
                    requestedMicrophoneDeviceIdStore.set(command.deviceId);
                    localUserStore.setPreferredAudioInputDevice(command.deviceId);
                }
                break;
            }
            default:
                // focus-main is handled in the Electron main process; other PiP-only commands
                // (close, chat, reactions) are not raised by the HUD bars.
                break;
        }
    }
}

export const presenterHudBridge = new PresenterHudBridge();
