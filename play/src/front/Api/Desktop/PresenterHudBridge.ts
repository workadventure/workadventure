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
import {
    activeScreenShareSourceStore,
    requestedScreenSharingState,
    startScreenShareWithSource,
} from "../../Stores/ScreenSharingStore";

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
 * Bridges the presenter HUD window (Zoom-style meeting bar, placed on the SHARED display and
 * excluded from the capture) to the WorkAdventure stores:
 * - opens the meeting bar while a desktop screen share is active, on the shared display;
 * - pushes mic/camera/share state to the bar, routes its commands back to the same stores the
 *   in-app UI uses (single source of truth stays in this renderer).
 */
class PresenterHudBridge {
    private subscriptions: Unsubscriber[] = [];
    private onCommandUnsub: (() => void) | undefined;
    private meetingBarOpen = false;
    // Whether the bar should be open: a close during a pending open closes the late window.
    private meetingBarWanted = false;
    private lastSourceId: string | undefined;

    public start(): void {
        const api = getPresenterHudApi();
        if (!api) {
            return;
        }

        this.onCommandUnsub = api.onCommand((command) => this.handleCommand(command));

        // The meeting bar tracks the ACTIVE desktop capture source: set when a share starts (or
        // switches source), cleared when sharing stops. This is more reliable than the requested
        // state because it carries the display the bar must be placed on.
        this.subscriptions.push(
            activeScreenShareSourceStore.subscribe((source) => {
                if (source) {
                    if (source.id !== this.lastSourceId) {
                        this.lastSourceId = source.id;
                        this.openMeetingBar();
                    }
                } else {
                    this.lastSourceId = undefined;
                    // Share ended: drop the HUD.
                    this.closeMeetingBar();
                }
            }),
        );

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
        this.closeMeetingBar();
        // Otherwise a restart during the same share (the component remounts when a video goes full
        // screen) sees an unchanged source and never reopens the meeting bar.
        this.lastSourceId = undefined;
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

    private openMeetingBar(): void {
        const api = getPresenterHudApi();
        if (!api) {
            return;
        }
        this.meetingBarWanted = true;
        const source = get(activeScreenShareSourceStore);
        api.openMeetingBar({ displayId: source?.display_id, sourceId: source?.id })
            .then((opened) => {
                if (!this.meetingBarWanted) {
                    if (opened) {
                        api.closeMeetingBar().catch(() => {});
                    }
                    return;
                }
                this.meetingBarOpen = opened;
                if (opened) {
                    this.pushState();
                }
            })
            .catch(() => {});
    }

    private closeMeetingBar(): void {
        this.meetingBarWanted = false;
        const api = getPresenterHudApi();
        if (this.meetingBarOpen && api) {
            api.closeMeetingBar().catch(() => {});
        }
        this.meetingBarOpen = false;
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
