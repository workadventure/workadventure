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
} from "../../Stores/MediaStore";
import {
    activeScreenShareSourceStore,
    requestedScreenSharingState,
    startScreenShareWithSource,
} from "../../Stores/ScreenSharingStore";
import {
    ANNOTATION_TOOLS,
    currentAnnotationColorStore,
    currentAnnotationToolStore,
    localAnnotationActiveStore,
    screenAnnotationEnabledStore,
    screenAnnotationLocallyHiddenStore,
    type AnnotationTool,
} from "../../Stores/ScreenAnnotationStore";
import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";
import { isActivePresenterTool, presenterToolStore } from "../../Stores/PresenterEffectStore";

type WindowWithDesktop = Window & { WAD?: WorkAdventureDesktopApi };

/** Returns the native presenter-HUD API when running inside the Electron desktop shell. */
function getPresenterHudApi(): NonNullable<WorkAdventureDesktopApi["presenterHud"]> | undefined {
    const wad = (window as WindowWithDesktop).WAD;
    if (!wad || !wad.desktop) {
        return undefined;
    }
    return wad.presenterHud;
}

function isAnnotationTool(tool: string): tool is AnnotationTool {
    return (ANNOTATION_TOOLS as readonly string[]).includes(tool);
}

/**
 * Bridges the presenter HUD windows (Zoom-style meeting bar + separate annotation bar, both
 * placed on the SHARED display and excluded from the capture) to the WorkAdventure stores:
 * - opens the meeting bar while a desktop screen share is active, on the shared display;
 * - opens the annotation bar while drawing mode is on;
 * - pushes mic/camera/share/annotation state to the bars, routes their commands back to the
 *   same stores/managers the in-app UI uses (single source of truth stays in this renderer).
 */
class PresenterHudBridge {
    private subscriptions: Unsubscriber[] = [];
    private onCommandUnsub: (() => void) | undefined;
    private meetingBarOpen = false;
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
                    // Share ended: drop the whole HUD, and leave drawing mode.
                    this.closeMeetingBar();
                    localAnnotationActiveStore.set(false);
                }
            }),
        );

        this.subscriptions.push(
            localAnnotationActiveStore.subscribe((active) => {
                if (active) {
                    // Entering draw mode always re-shows annotations locally: drawing on a hidden
                    // canvas would silently broadcast strokes the presenter cannot see. The drawing
                    // toolbar is now a panel of the meeting bar (driven by the pushed annotation
                    // state), so there is no separate window to open/close here.
                    screenAnnotationLocallyHiddenStore.set(false);
                }
            }),
        );

        // Push presenter state to the bars whenever any of its inputs change.
        const pushOnChange = [
            requestedMicrophoneState,
            requestedCameraState,
            requestedScreenSharingState,
            localAnnotationActiveStore,
            currentAnnotationToolStore,
            currentAnnotationColorStore,
            screenAnnotationLocallyHiddenStore,
            screenAnnotationEnabledStore,
            presenterToolStore,
            cameraListStore,
            microphoneListStore,
            requestedCameraDeviceIdStore,
            requestedMicrophoneDeviceIdStore,
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
    }

    private buildState(): DesktopPresenterHudState {
        const target = screenAnnotationManager.localUserId;
        return {
            micEnabled: get(requestedMicrophoneState),
            cameraEnabled: get(requestedCameraState),
            screenSharing: get(requestedScreenSharingState),
            annotation: {
                active: get(localAnnotationActiveStore),
                tool: get(currentAnnotationToolStore),
                color: get(currentAnnotationColorStore),
                othersCanDraw: target ? get(screenAnnotationEnabledStore).get(target) === true : false,
                locallyHidden: get(screenAnnotationLocallyHiddenStore),
            },
            presenterTool: get(presenterToolStore),
            devices: {
                cameras: (get(cameraListStore) ?? []).map((d, i) => ({
                    id: d.deviceId,
                    label: d.label || `Camera ${i + 1}`,
                })),
                microphones: (get(microphoneListStore) ?? []).map((d, i) => ({
                    id: d.deviceId,
                    label: d.label || `Microphone ${i + 1}`,
                })),
                currentCameraId: get(requestedCameraDeviceIdStore),
                currentMicrophoneId: get(requestedMicrophoneDeviceIdStore),
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
        const source = get(activeScreenShareSourceStore);
        api.openMeetingBar({ displayId: source?.display_id, sourceId: source?.id })
            .then((opened) => {
                this.meetingBarOpen = opened;
                if (opened) {
                    this.pushState();
                }
            })
            .catch(() => {});
    }

    private closeMeetingBar(): void {
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
            case "annotation-toggle":
                localAnnotationActiveStore.set(!get(localAnnotationActiveStore));
                break;
            case "annotation-set-tool":
                if (isAnnotationTool(command.tool)) {
                    currentAnnotationToolStore.set(command.tool);
                }
                break;
            case "annotation-set-color":
                currentAnnotationColorStore.set(command.color);
                break;
            case "annotation-undo": {
                const target = screenAnnotationManager.localUserId;
                if (target) {
                    screenAnnotationManager.undoLastLocalElement(target);
                }
                break;
            }
            case "annotation-clear": {
                const target = screenAnnotationManager.localUserId;
                if (target) {
                    screenAnnotationManager.clearAll(target);
                }
                break;
            }
            case "annotation-toggle-local-hide":
                screenAnnotationLocallyHiddenStore.set(!get(screenAnnotationLocallyHiddenStore));
                break;
            case "annotation-toggle-others": {
                const target = screenAnnotationManager.localUserId;
                if (target) {
                    const enabled = get(screenAnnotationEnabledStore).get(target) === true;
                    screenAnnotationManager.setAnnotationEnabled(target, !enabled);
                }
                break;
            }
            case "presenter-set-tool": {
                // Toggle: clicking the active tool turns it off; picking another switches to it.
                const current = get(presenterToolStore);
                if (isActivePresenterTool(command.tool)) {
                    presenterToolStore.set(current === command.tool ? "none" : command.tool);
                } else {
                    presenterToolStore.set("none");
                }
                break;
            }
            case "pick-device": {
                // Same setter the in-app media settings use; the media machine re-acquires the stream.
                if (command.kind === "camera") {
                    requestedCameraDeviceIdStore.set(command.deviceId);
                } else {
                    requestedMicrophoneDeviceIdStore.set(command.deviceId);
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
