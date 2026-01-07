import type { Readable } from "svelte/store";
import { get, derived, readable, writable } from "svelte/store";
import type { DesktopCapturerSource } from "../Interfaces/DesktopAppInterfaces";
import { localUserStore } from "../Connection/LocalUserStore";
import LL from "../../i18n/i18n-svelte";
import { isSpeakerStore, type LocalStreamStoreValue } from "./MediaStore";
import { inExternalServiceStore, myCameraStore, myMicrophoneStore } from "./MyMediaStore";
import type {} from "../Api/Desktop";
import type { Streamable, WebRtcStreamable } from "./StreamableCollectionStore";
import { screenShareStreamElementsStore } from "./PeerStore";
import { muteMediaStreamStore } from "./MuteMediaStreamStore";
import { isLiveStreamingStore } from "./IsStreamingStore";

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
 * Stops the screen sharing (both video and audio tracks)
 */
function stopScreenSharing(): void {
    if (currentStream) {
        // Stop all tracks (video and audio)
        for (const track of currentStream.getTracks()) {
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
 * A store containing whether the screen sharing button should be displayed or hidden.
 */
export const screenSharingAvailableStore = isLiveStreamingStore;

/**
 * A store containing the media constraints we want to apply.
 */
export const screenSharingConstraintsStore = derived(
    [
        requestedScreenSharingState,
        myCameraStore,
        myMicrophoneStore,
        inExternalServiceStore,
        screenSharingAvailableStore,
        screenShareStreamElementsStore,
        isSpeakerStore,
    ],
    (
        [
            $requestedScreenSharingState,
            $myCameraStore,
            $myMicrophoneStore,
            $inExternalServiceStore,
            $screenSharingAvailableStore,
            $screenShareStreamElementsStore,
            $isSpeakerStore,
        ],
        set
    ) => {
        let currentVideoConstraint: boolean | MediaTrackConstraints = true;
        //TODO : passer a true si on veut que le son soit activé par défaut dans le screen sharing
        let currentAudioConstraint: boolean | MediaTrackConstraints = true;

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

        // Disable screen sharing if not in a live streaming context and no active screen shares or speaker status
        if (!$screenSharingAvailableStore && $screenShareStreamElementsStore.length === 0 && !$isSpeakerStore) {
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
    // Note: getUserMedia with chromeMediaSource does not support audio capture.
    // Audio is only available with getDisplayMedia when sharing a browser tab.
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
        // Prefer getDisplayMedia over getDesktopCapturerSources to support audio capture
        // According to MDN: audio is optional, default is false
        // Audio is only available for certain display surfaces (mainly browser tabs)
        // See: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            // Build constraints according to MDN specification
            // video can be boolean or MediaTrackConstraints, default is true
            // audio can be boolean or MediaTrackConstraints, default is false
            const displayMediaConstraints: {
                video: boolean | MediaTrackConstraints;
                audio: boolean | MediaTrackConstraints;
            } = {
                video: !!constraints.video,
                audio: !!constraints.audio,
            };
            currentStreamPromise = navigator.mediaDevices.getDisplayMedia(displayMediaConstraints);
        } else if (window.WAD?.getDesktopCapturerSources) {
            currentStreamPromise = getDesktopCapturerSources();
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
    const mutedLocalMediaStreamStore = muteMediaStreamStore(localMediaStreamStore);

    const hasAudio = derived(
        localMediaStreamStore,
        ($localMediaStreamStore) => ($localMediaStreamStore?.getAudioTracks().length ?? 0) > 0
    );
    const isMediaMuted = derived(
        localMediaStreamStore,
        ($localMediaStreamStore) => ($localMediaStreamStore?.getAudioTracks().length ?? 0) === 0
    );

    const localMedia = {
        uniqueId: "localScreenSharingStream",
        media: {
            type: "webrtc" as const,
            streamStore: mutedLocalMediaStreamStore,
            isBlocked: writable(false),
        } satisfies WebRtcStreamable,
        spaceUserId: undefined,
        hasAudio: hasAudio,
        hasVideo: writable(true),
        isMuted: isMediaMuted,
        name: writable(""),
        showVoiceIndicator: writable(false),
        statusStore: writable("connected"),
        volumeStore: writable(undefined),
        flipX: false,
        muteAudio: true,
        displayMode: "fit" as const,
        displayInPictureInPictureMode: true,
        usePresentationMode: true,
        closeStreamable: () => {},
        volume: writable(1),
        videoType: "local_screenSharing",
        webrtcStats: undefined,
    } satisfies Streamable;

    const unsubscribe = screenSharingLocalStreamStore.subscribe((screenSharingLocalStream) => {
        localMedia.name = writable(get(LL).camera.my.nameTag());
        if (screenSharingLocalStream.type === "success") {
            localMediaStreamStore.set(screenSharingLocalStream.stream);
            if (screenSharingLocalStream.stream === undefined) {
                set(undefined);
            } else {
                set(localMedia);
            }
        } else {
            localMediaStreamStore.set(undefined);
            set(undefined);
        }
    });

    return function stop() {
        unsubscribe();
    };
});

export const showDesktopCapturerSourcePicker = writable(false);

export let desktopCapturerSourcePromiseResolve: ((source: DesktopCapturerSource | null) => void) | undefined;
