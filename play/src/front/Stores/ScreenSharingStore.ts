import { get, Readable, derived, readable, writable } from "svelte/store";
import type { DesktopCapturerSource } from "../Interfaces/DesktopAppInterfaces";
import { localUserStore } from "../Connection/LocalUserStore";
import LL from "../../i18n/i18n-svelte";
import { SpaceUserExtended } from "../Space/SpaceInterface";
import type { LocalStreamStoreValue } from "./MediaStore";
import { inExternalServiceStore, myCameraStore, myMicrophoneStore } from "./MyMediaStore";
import type {} from "../Api/Desktop";
import { Streamable } from "./StreamableCollectionStore";
import { currentPlayerWokaStore } from "./CurrentPlayerWokaStore";
import { screenShareStreamElementsStore, videoStreamElementsStore } from "./PeerStore";

declare const navigator: any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * A store that contains the camera state requested by the user (on or off).
 */
function createRequestedScreenSharingState() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        enableScreenSharing: () => set(true),
        disableScreenSharing: () => set(false),
    };
}

export const requestedScreenSharingState = createRequestedScreenSharingState();

let currentStream: MediaStream | undefined = undefined;

/**
 * Stops the camera from filming
 */
function stopScreenSharing(): void {
    if (currentStream) {
        for (const track of currentStream.getVideoTracks()) {
            track.stop();
        }
    }
    currentStream = undefined;
}

let previousComputedVideoConstraint: boolean | MediaTrackConstraints = false;
let previousComputedAudioConstraint: boolean | MediaTrackConstraints = false;

function createScreenShareBandwidthStore() {
    const { subscribe, set } = writable<number | "unlimited">(localUserStore.getScreenShareBandwidth());

    return {
        subscribe,
        setBandwidth: (bandwidth: number | "unlimited") => {
            set(bandwidth);
            localUserStore.setScreenShareBandwidth(bandwidth);
        },
    };
}

export const screenShareBandwidthStore = createScreenShareBandwidthStore();

/**
 * A store containing the media constraints we want to apply.
 */
export const screenSharingConstraintsStore = derived(
    [
        requestedScreenSharingState,
        myCameraStore,
        myMicrophoneStore,
        inExternalServiceStore,
        videoStreamElementsStore,
        screenShareStreamElementsStore,
    ],
    (
        [
            $requestedScreenSharingState,
            $myCameraStore,
            $myMicrophoneStore,
            $inExternalServiceStore,
            $videoStreamElementsStore,
            $screenShareStreamElementsStore,
        ],
        set
    ) => {
        let currentVideoConstraint: boolean | MediaTrackConstraints = true;
        let currentAudioConstraint: boolean | MediaTrackConstraints = false;

        // Disable screen sharing if the user requested so
        if (!$requestedScreenSharingState) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Disable screen sharing if is in a external video/audio service.
        if ($inExternalServiceStore) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Disable screen sharing if no peers
        if ($videoStreamElementsStore.length === 0 && $screenShareStreamElementsStore.length === 0) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Let's make the changes only if the new value is different from the old one.
        if (
            previousComputedVideoConstraint != currentVideoConstraint ||
            previousComputedAudioConstraint != currentAudioConstraint
        ) {
            previousComputedVideoConstraint = currentVideoConstraint;
            previousComputedAudioConstraint = currentAudioConstraint;
            // Let's copy the objects.
            /*if (typeof previousComputedVideoConstraint !== 'boolean') {
                previousComputedVideoConstraint = {...previousComputedVideoConstraint};
            }
            if (typeof previousComputedAudioConstraint !== 'boolean') {
                previousComputedAudioConstraint = {...previousComputedAudioConstraint};
            }*/

            set({
                video: currentVideoConstraint,
                audio: currentAudioConstraint,
            });
        }
    },
    {
        video: false,
        audio: false,
    } as MediaStreamConstraints
);

export function isScreenSharingSupported(): boolean {
    if (window.WAD?.getDesktopCapturerSources) {
        return true;
    }

    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

async function getDesktopCapturerSources() {
    showDesktopCapturerSourcePicker.set(true);
    const source = await new Promise<DesktopCapturerSource | null>((resolve) => {
        desktopCapturerSourcePromiseResolve = resolve;
    });
    if (source === null) {
        return;
    }
    return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: source.id,
            },
        },
    });
}

/**
 * A store containing the MediaStream object for ScreenSharing (or undefined if nothing requested, or Error if an error occurred)
 */
export const screenSharingLocalStreamStore = derived<Readable<MediaStreamConstraints>, LocalStreamStoreValue>(
    screenSharingConstraintsStore,
    ($screenSharingConstraintsStore, set) => {
        const constraints = $screenSharingConstraintsStore;

        if ($screenSharingConstraintsStore.video === false && $screenSharingConstraintsStore.audio === false) {
            stopScreenSharing();
            requestedScreenSharingState.disableScreenSharing();
            set({
                type: "success",
                stream: undefined,
            });
            return;
        }

        let currentStreamPromise: Promise<MediaStream>;
        if (window.WAD?.getDesktopCapturerSources) {
            currentStreamPromise = getDesktopCapturerSources();
        } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            currentStreamPromise = navigator.mediaDevices.getDisplayMedia({ constraints });
        } else {
            stopScreenSharing();
            set({
                type: "error",
                error: new Error("Your browser does not support sharing screen"),
            });
            return;
        }

        (async () => {
            try {
                stopScreenSharing();
                currentStream = await currentStreamPromise;

                // If stream ends (for instance if user clicks the stop screen sharing button in the browser), let's close the view
                for (const track of currentStream.getTracks()) {
                    track.onended = () => {
                        stopScreenSharing();
                        requestedScreenSharingState.disableScreenSharing();
                        previousComputedVideoConstraint = false;
                        previousComputedAudioConstraint = false;
                        set({
                            type: "success",
                            stream: undefined,
                        });
                    };
                }

                set({
                    type: "success",
                    stream: currentStream,
                });
                return;
            } catch (e) {
                currentStream = undefined;
                requestedScreenSharingState.disableScreenSharing();
                console.info("Error. Unable to share screen.", e);
                set({
                    type: "error",
                    error: e instanceof Error ? e : new Error("An unknown error happened"),
                });
            }
        })().catch((e) => console.error(e));
    }
);

/**
 * A store containing whether the screen sharing button should be displayed or hidden.
 */
export const screenSharingAvailableStore = derived(videoStreamElementsStore, ($videoStreamElementsStore, set) => {
    if (!navigator.getDisplayMedia && (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia)) {
        set(false);
        return;
    }

    set($videoStreamElementsStore.length !== 0);
});

export interface ScreenSharingLocalMedia {
    uniqueId: string;
    stream: MediaStream | undefined;
    userId?: undefined;
}

/**
 * The representation of the screen sharing stream.
 */
export const screenSharingLocalMedia = readable<Streamable | undefined>(undefined, function start(set) {
    const localMediaStreamStore = writable<MediaStream | undefined>(undefined);
    const media = {
        type: "mediaStore" as const,
        streamStore: localMediaStreamStore,
        videoElementUnsubscribers: new Map<HTMLVideoElement, () => void>(),
        attach: (container: HTMLVideoElement) => {
            const unsubscribe = localMediaStreamStore.subscribe((stream) => {
                if (stream) {
                    container.srcObject = stream;
                }
            });
            // Store the unsubscribe function in our Map
            media.videoElementUnsubscribers.set(container, unsubscribe);
        },
        detach: (container: HTMLVideoElement) => {
            // Clean up the stream
            container.srcObject = null;
            // Call the unsubscribe function if it exists and remove it from the Map
            const unsubscribe = media.videoElementUnsubscribers.get(container);
            if (unsubscribe) {
                unsubscribe();
                media.videoElementUnsubscribers.delete(container);
            }
        },
    };

    const localMedia = {
        uniqueId: "localScreenSharingStream",
        media,
        getExtendedSpaceUser(): Promise<SpaceUserExtended> | undefined {
            return undefined;
        },
        hasAudio: writable(false),
        hasVideo: writable(true),
        isMuted: writable(true),
        name: writable(""),
        pictureStore: currentPlayerWokaStore,
        showVoiceIndicator: writable(false),
        statusStore: writable("connected"),
        volumeStore: writable(undefined),
        flipX: false,
        muteAudio: true,
        displayMode: "fit" as const,
        displayInPictureInPictureMode: true,
        usePresentationMode: true,
        once: (event: string, callback: (...args: unknown[]) => void) => {
            callback();
        },
    } satisfies Streamable;

    const unsubscribe = screenSharingLocalStreamStore.subscribe((screenSharingLocalStream) => {
        localMedia.name = writable(get(LL).camera.my.nameTag());
        if (screenSharingLocalStream.type === "success") {
            localMediaStreamStore.set(screenSharingLocalStream.stream);
        } else {
            localMediaStreamStore.set(undefined);
        }
        set(localMedia);
    });

    return function stop() {
        unsubscribe();
    };
});

export const showDesktopCapturerSourcePicker = writable(false);

export let desktopCapturerSourcePromiseResolve: ((source: DesktopCapturerSource | null) => void) | undefined;
