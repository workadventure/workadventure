import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import deepEqual from "fast-deep-equal";
import { AvailabilityStatus } from "@workadventure/messages";
import * as Sentry from "@sentry/svelte";
import { localUserStore } from "../Connection/LocalUserStore";
import { isIOS, isSafari } from "../WebRtc/DeviceUtils";
import type { ObtainedMediaStreamConstraints } from "../WebRtc/P2PMessages/ConstraintMessage";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import type { RequestedStatus } from "../Rules/StatusRules/statusRules";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import {
    createBackgroundTransformer,
    type BackgroundTransformer,
    type BackgroundConfig,
} from "../WebRtc/BackgroundProcessor/createBackgroundTransformer";
import { LL } from "../../i18n/i18n-svelte";
import { MediaStreamConstraintsError } from "./Errors/MediaStreamConstraintsError";
import { BrowserTooOldError } from "./Errors/BrowserTooOldError";
import { errorStore, warningMessageStore } from "./ErrorStore";
import { WebviewOnOldIOS } from "./Errors/WebviewOnOldIOS";

import { createSilentStore } from "./SilentStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { inExternalServiceStore, myCameraStore, myMicrophoneStore, proximityMeetingStore } from "./MyMediaStore";
import { userMovingStore } from "./GameStore";
import { hideHelpCameraSettings } from "./HelpSettingsStore";
import { isLiveStreamingStore } from "./IsStreamingStore";

import { backgroundConfigStore, backgroundProcessingEnabledStore } from "./BackgroundTransformStore";

/**
 * A store that contains the camera state requested by the user (on or off).
 */
function createRequestedCameraState() {
    const { subscribe, set } = writable(localUserStore.getRequestedCameraState());

    return {
        subscribe,
        enableWebcam: () => {
            set(true);
            localUserStore.setRequestedCameraState(true);
        },
        disableWebcam: () => {
            set(false);
            localUserStore.setRequestedCameraState(false);
        },
    };
}

/**
 * A store that contains the microphone state requested by the user (on or off).
 */
function createRequestedMicrophoneState() {
    const { subscribe, set } = writable(localUserStore.getRequestedMicrophoneState());

    return {
        subscribe,
        enableMicrophone: () => {
            set(true);
            localUserStore.setRequestedMicrophoneState(true);
        },
        disableMicrophone: () => {
            set(false);
            localUserStore.setRequestedMicrophoneState(false);
        },
    };
}

/**
 * A store that contains whether the EnableCameraScene is shown or not.
 */
function createEnableCameraSceneVisibilityStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        showEnableCameraScene: () => set(true),
        hideEnableCameraScene: () => set(false),
    };
}

export const requestedCameraState = createRequestedCameraState();
export const requestedMicrophoneState = createRequestedMicrophoneState();
export const enableCameraSceneVisibilityStore = createEnableCameraSceneVisibilityStore();

/**
 * A store that is true when the megaphone screen is displayed.
 */
export const displayedMegaphoneScreenStore = writable<boolean>(false);

/**
 * GetUserMedia is impacted by a number of stores (proximityMeetingStore, myCameraStore, myMicrophoneStore, inExternalServiceStore, privacyShutdownStore...).
 * Each time a change is done to one of these store, we will make a new GetUserMedia call.
 * If we plan to do many changes at once, we want to call GetUserMedia only once.
 *
 * To do this, you can use this store.
 * Use startBatch() to start a batch of changes (this will disable changes to GetUserMedia), and commitChanges() after the final change to call GetUserMedia.
 */
function createBatchGetUserMediaStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        startBatch: () => set(true),
        commitChanges: () => set(false),
    };
}

export const batchGetUserMediaStore = createBatchGetUserMediaStore();

/**
 * A store containing whether the webcam was enabled in the last 10 seconds
 */
const enabledWebCam10secondsAgoStore = readable(false, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribe = requestedCameraState.subscribe((enabled) => {
        if (enabled === true) {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                set(false);
            }, 10000);
            set(true);
        } else {
            set(false);
        }
    });

    return function stop() {
        if (timeout) {
            clearTimeout(timeout);
        }
        unsubscribe();
    };
});

/**
 * A store containing whether the webcam was enabled in the last 5 seconds
 */
const userMoved5SecondsAgoStore = readable(false, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribe = userMovingStore.subscribe((moving) => {
        if (moving === true) {
            if (timeout) {
                clearTimeout(timeout);
            }
            set(true);
        } else {
            timeout = setTimeout(() => {
                set(false);
            }, 5000);
        }
    });

    return function stop() {
        unsubscribe();
    };
});

/**
 * A store awaiting the loading of devices information.
 */
const devicesNotLoaded = writable(true);

const deviceChanged10SecondsAgoStore = readable(false, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribeCamera = videoConstraintStore.subscribe((constraints) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        set(true);
        timeout = setTimeout(() => {
            set(false);
        }, 10000);
    });

    const unsubscribeAudio = audioConstraintStore.subscribe((constraints) => {
        if (timeout) {
            clearTimeout(timeout);
        }
        set(true);
        timeout = setTimeout(() => {
            set(false);
        }, 10000);
    });

    return function stop() {
        unsubscribeCamera();
        unsubscribeAudio();
    };
});

/**
 * A store containing if the mouse is over the camera button
 */
export const mouseIsHoveringCameraButton = writable(false);

export const cameraNoEnergySavingStore = writable<boolean>(false);

export const streamingMegaphoneStore = writable<boolean>(false);

export const requestedCameraDeviceIdStore: Writable<string | undefined> = writable(
    localUserStore.getPreferredVideoInputDevice() ? localUserStore.getPreferredVideoInputDevice() : undefined
);

export const frameRateStore: Writable<number | undefined> = writable();
export const requestedMicrophoneDeviceIdStore: Writable<string | undefined> = writable(
    localUserStore.getPreferredAudioInputDevice() ? localUserStore.getPreferredAudioInputDevice() : undefined
);

export const usedCameraDeviceIdStore: Writable<string | undefined> = writable();
export const usedMicrophoneDeviceIdStore: Writable<string | undefined> = writable();

export const inOpenWebsite = writable(false);

/**
 * A store that contains video constraints.
 */
export const videoConstraintStore = derived(
    [requestedCameraDeviceIdStore, frameRateStore],
    ([$cameraDeviceIdStore, $frameRateStore]) => {
        const constraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: "user",
            resizeMode: "crop-and-scale",
            aspectRatio: 1.777777778,

            // Uncomment the lines below to simulate a mobile device
            //height: { min: 640, ideal: 1280, max: 1920 },
            //width: { min: 400, ideal: 720, max: 1080 },
            //resizeMode: "none",
        } as MediaTrackConstraints;

        if ($cameraDeviceIdStore !== undefined) {
            constraints.deviceId = {
                exact: $cameraDeviceIdStore,
            };
        }
        if ($frameRateStore !== undefined) {
            constraints.frameRate = { ideal: $frameRateStore };
        }

        return constraints;
    }
);

/**
 * A store that contains video constraints.
 */
export const audioConstraintStore = derived(requestedMicrophoneDeviceIdStore, ($microphoneDeviceIdStore) => {
    let constraints = {
        //TODO: make these values configurable in the game settings menu and store them in localstorage
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
    } as boolean | MediaTrackConstraints;

    if (typeof constraints === "boolean") {
        constraints = {};
    }
    if (
        $microphoneDeviceIdStore !== undefined &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getSupportedConstraints().deviceId === true
    ) {
        constraints.deviceId = { exact: $microphoneDeviceIdStore };
    }
    return constraints;
});

/**
 * A store that contains "true" if the webcam should be stopped for energy efficiency reason - i.e. we are not moving and not in a conversation.
 */
export const cameraEnergySavingStore = derived(
    [
        deviceChanged10SecondsAgoStore,
        userMoved5SecondsAgoStore,
        enabledWebCam10secondsAgoStore,
        mouseIsHoveringCameraButton,
        cameraNoEnergySavingStore,
        devicesNotLoaded,
        isLiveStreamingStore,
        displayedMegaphoneScreenStore,
    ],
    ([
        $deviceChanged10SecondsAgoStore,
        $userMoved5SecondsAgoStore,
        $enabledWebCam10secondsAgoStore,
        $mouseInBottomRight,
        $cameraNoEnergySavingStore,
        $devicesNotLoaded,
        $isLiveStreamingStore,
        $displayedMegaphoneScreenStore,
    ]) => {
        return (
            !$mouseInBottomRight &&
            !$userMoved5SecondsAgoStore &&
            !$deviceChanged10SecondsAgoStore &&
            !$enabledWebCam10secondsAgoStore &&
            !$cameraNoEnergySavingStore &&
            !$devicesNotLoaded &&
            !$isLiveStreamingStore &&
            !$displayedMegaphoneScreenStore
        );
    }
);

export const inJitsiStore = writable(false);
export const inBbbStore = writable(false);
export const isSpeakerStore = writable(false);
export const inLivekitStore = writable(false);
export const isListenerStore = writable(false);
export const listenerWaitingMediaStore = writable<string | undefined>(undefined);

export const requestedStatusStore: Writable<RequestedStatus | null> = writable(localUserStore.getRequestedStatus());

export const inCowebsiteZone = derived(
    [inJitsiStore, inBbbStore, inOpenWebsite],
    ([$inJitsiStore, $inBbbStore, $inOpenWebsite]) => {
        return $inJitsiStore || $inBbbStore || $inOpenWebsite;
    },
    false
);

export const silentStore = createSilentStore();

export const availabilityStatusStore = derived(
    [
        inJitsiStore,
        inBbbStore,
        silentStore,
        privacyShutdownStore,
        proximityMeetingStore,
        isSpeakerStore,
        requestedStatusStore,
        inLivekitStore,
        isListenerStore,
    ],
    ([
        $inJitsiStore,
        $inBbbStore,
        $silentStore,
        $privacyShutdownStore,
        $proximityMeetingStore,
        $isSpeakerStore,
        $requestedStatusStore,
        $inLivekitStore,
        $isListenerStore,
    ]) => {
        // Important: Statuses that should not switch to BUSY
        // must be checked BEFORE privacyShutdownStore to prevent switching to BUSY when privacy is enabled.
        if ($inJitsiStore) return AvailabilityStatus.JITSI;
        if ($inBbbStore) return AvailabilityStatus.BBB;
        if (!$proximityMeetingStore) return AvailabilityStatus.DENY_PROXIMITY_MEETING;
        if ($isSpeakerStore) return AvailabilityStatus.SPEAKER;
        if ($silentStore) return AvailabilityStatus.SILENT;
        if ($inLivekitStore) return AvailabilityStatus.LIVEKIT;
        if ($isListenerStore) return AvailabilityStatus.LISTENER;
        if ($requestedStatusStore) return $requestedStatusStore;
        if ($privacyShutdownStore) return AvailabilityStatus.AWAY;

        return AvailabilityStatus.ONLINE;
    },
    AvailabilityStatus.ONLINE
);

// This is a singleton so we can safely not ever unsubscribe from it.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
availabilityStatusStore.subscribe((newStatus: AvailabilityStatus) => {
    try {
        statusChanger.changeStatusTo(newStatus);
    } catch (e) {
        console.error("Error while changing status", e);
        Sentry.captureException(e);
    }
});

let previousComputedVideoConstraint: boolean | MediaTrackConstraints = false;
let previousComputedAudioConstraint: boolean | MediaTrackConstraints = false;

/**
 * A store containing the media constraints we want to apply.
 */
export const mediaStreamConstraintsStore = derived(
    [
        requestedCameraState,
        requestedMicrophoneState,
        myCameraStore,
        myMicrophoneStore,
        inExternalServiceStore,
        enableCameraSceneVisibilityStore,
        videoConstraintStore,
        audioConstraintStore,
        privacyShutdownStore,
        cameraEnergySavingStore,
        availabilityStatusStore,
        batchGetUserMediaStore,
    ],
    (
        [
            $requestedCameraState,
            $requestedMicrophoneState,
            $myCameraStore,
            $myMicrophoneStore,
            $inExternalServiceStore,
            $enableCameraSceneVisibilityStore,
            $videoConstraintStore,
            $audioConstraintStore,
            $privacyShutdownStore,
            $cameraEnergySavingStore,
            $availabilityStatusStore,
            $batchGetUserMediaStore,
        ],
        set
    ) => {
        // If a batch is in process, don't do anything.
        if ($batchGetUserMediaStore) {
            return;
        }

        let currentVideoConstraint: boolean | MediaTrackConstraints = $videoConstraintStore;
        let currentAudioConstraint: boolean | MediaTrackConstraints = $audioConstraintStore;

        // Disable webcam if the user requested so
        if ($requestedCameraState === false) {
            currentVideoConstraint = false;
        }

        // Disable microphone if the user requested so
        if ($requestedMicrophoneState === false) {
            currentAudioConstraint = false;
        }

        // Disable webcam when in a Jitsi
        if ($myCameraStore === false) {
            currentVideoConstraint = false;
        }

        // Disable microphone when in a Jitsi
        if ($myMicrophoneStore === false) {
            currentAudioConstraint = false;
        }

        if ($inExternalServiceStore === true) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Disable webcam for privacy reasons (the game is not visible and we were talking to no one)
        if ($privacyShutdownStore === true) {
            const userMicrophonePrivacySetting = localUserStore.getMicrophonePrivacySettings();
            const userCameraPrivacySetting = localUserStore.getCameraPrivacySettings();
            if (!userMicrophonePrivacySetting) {
                currentAudioConstraint = false;
            }
            if (!userCameraPrivacySetting) {
                currentVideoConstraint = false;
            }
        }

        // Disable webcam for energy reasons (the user is not moving and we are talking to no one)
        if ($cameraEnergySavingStore === true && $enableCameraSceneVisibilityStore === false) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        if (
            $availabilityStatusStore === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            $availabilityStatusStore === AvailabilityStatus.SILENT ||
            //$availabilityStatusStore === AvailabilityStatus.SPEAKER ||
            $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
            $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
            $availabilityStatusStore === AvailabilityStatus.BUSY
        ) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Let's make the changes only if the new value is different from the old one.
        if (
            !deepEqual(previousComputedVideoConstraint, currentVideoConstraint) ||
            !deepEqual(previousComputedAudioConstraint, currentAudioConstraint)
        ) {
            previousComputedVideoConstraint = currentVideoConstraint;
            previousComputedAudioConstraint = currentAudioConstraint;
            // Let's copy the objects.
            if (typeof previousComputedVideoConstraint !== "boolean") {
                previousComputedVideoConstraint = { ...previousComputedVideoConstraint };
            }
            if (typeof previousComputedAudioConstraint !== "boolean") {
                previousComputedAudioConstraint = { ...previousComputedAudioConstraint };
            }

            set({
                video: currentVideoConstraint,
                audio: currentAudioConstraint,
            });
        }
    },
    {
        video: false,
        audio: false,
    } as {
        video: false | MediaTrackConstraints;
        audio: false | MediaTrackConstraints;
    }
);

export type LocalStreamStoreValue = StreamSuccessValue | StreamErrorValue;

interface StreamSuccessValue {
    type: "success";
    stream: MediaStream | undefined;
}

interface StreamErrorValue {
    type: "error";
    error: Error;
}

let currentStream: MediaStream | undefined = undefined;
let oldConstraints: { video: MediaTrackConstraints | false; audio: MediaTrackConstraints | false } = {
    video: false,
    audio: false,
};
// Use the factory to create the appropriate transformer
let backgroundTransformer: BackgroundTransformer | undefined = undefined;
// Track the last background config to detect if we need to recreate or just update
let lastBackgroundConfig: BackgroundConfig | undefined = undefined;

/**
 * Update background processor configuration without recreating the transformer
 */
export function updateBackgroundProcessor(config: {
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
    mode?: string;
    segmenterOptions?: unknown;
}) {
    if (backgroundTransformer && backgroundTransformer.updateConfig) {
        try {
            backgroundTransformer
                .updateConfig({
                    mode: config.mode as "none" | "blur" | "image" | "video",
                    blurAmount: config.blurAmount,
                    backgroundImage: config.backgroundImage,
                    backgroundVideo: config.backgroundVideo,
                })
                .catch((error) => {
                    console.warn("[MediaStore] Failed to update background transformer configuration:", error);
                });

            // Update the tracked config
            if (lastBackgroundConfig && config.mode) {
                lastBackgroundConfig.mode = config.mode as "none" | "blur" | "image" | "video";
            }
            if (lastBackgroundConfig && config.blurAmount !== undefined) {
                lastBackgroundConfig.blurAmount = config.blurAmount;
            }
            if (lastBackgroundConfig && config.backgroundImage !== undefined) {
                lastBackgroundConfig.backgroundImage = config.backgroundImage;
            }
            if (lastBackgroundConfig && config.backgroundVideo !== undefined) {
                lastBackgroundConfig.backgroundVideo = config.backgroundVideo;
            }
        } catch (error) {
            console.warn("[MediaStore] Failed to update background transformer configuration:", error);
        }
    }
}

// This promise is important to queue the calls to "getUserMedia"
// Otherwise, this can happen:
// User requests a start then a stop of the camera quickly
// The promise to start the cam starts. Before the promise is fulfilled, the camera is stopped.
// Then, the MediaStream of the camera start resolves (resulting in the LED being turned on instead of off)
let currentGetUserMediaPromise: Promise<MediaStream | undefined> = Promise.resolve(undefined);

/**
 * A store containing the MediaStream object (or undefined if nothing requested, or Error if an error occurred)
 * This stream includes background transformations when enabled
 *
 * NOTE: We depend on forceTransformerRecreationStore to detect when mode changes require recreation.
 * Parameter changes (blurAmount, etc.) are handled by a separate subscriber to avoid recreating
 * the transformer on every change (which causes WebGL context leaks).
 */

export const rawLocalStreamStore = derived<[typeof mediaStreamConstraintsStore], LocalStreamStoreValue>(
    [mediaStreamConstraintsStore],
    ([$mediaStreamConstraintsStore], set) => {
        const constraints = { ...$mediaStreamConstraintsStore };

        function initStream(constraints: MediaStreamConstraints): Promise<MediaStream | undefined> {
            currentGetUserMediaPromise = currentGetUserMediaPromise
                .then(async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia(constraints);
                        // If there is an old video track or audio track in the current stream, we need to reuse it in the new stream
                        if (currentStream) {
                            const oldStream = currentStream;
                            // Reuse old video track
                            if (oldStream.getVideoTracks().length > 0) {
                                if (stream.getVideoTracks().length > 0) {
                                    console.error(
                                        "[MediaStore] New stream already has a video track, cannot reuse old one"
                                    );
                                    oldStream.getVideoTracks().forEach((t) => {
                                        t.stop();
                                    });
                                } else {
                                    const oldVideoTracks = currentStream.getVideoTracks();
                                    oldVideoTracks.forEach((t) => {
                                        if (t.readyState !== "ended") {
                                            stream.addTrack(t);
                                        }
                                        currentStream?.removeTrack(t);
                                    });
                                }
                            }

                            // Reuse old audio track
                            if (oldStream.getAudioTracks().length > 0) {
                                if (stream.getAudioTracks().length > 0) {
                                    console.error(
                                        "[MediaStore] New stream already has an audio track, cannot reuse old one"
                                    );
                                    oldStream.getAudioTracks().forEach((t) => {
                                        t.stop();
                                    });
                                } else {
                                    const oldAudioTracks = currentStream.getAudioTracks();
                                    oldAudioTracks.forEach((t) => {
                                        if (t.readyState !== "ended") {
                                            stream.addTrack(t);
                                        }
                                        currentStream?.removeTrack(t);
                                    });
                                }
                            }
                        }

                        currentStream = stream;
                        set({
                            type: "success",
                            stream: currentStream,
                        });
                        batchGetUserMediaStore.startBatch();
                        if (currentStream.getVideoTracks().length > 0) {
                            usedCameraDeviceIdStore.set(currentStream.getVideoTracks()[0]?.getSettings().deviceId);
                            obtainedMediaConstraintStore.update((c) => {
                                c.video = true;
                                return c;
                            });
                            // Also, let's switch the webcam back on if it was off (because some code or the user might have turned it off while we were waiting for getUserMedia,
                            // but we need to show the user that the webcam is on because we just got a stream)
                            requestedCameraState.enableWebcam();
                        }
                        if (currentStream.getAudioTracks().length > 0) {
                            usedMicrophoneDeviceIdStore.set(currentStream.getAudioTracks()[0]?.getSettings().deviceId);
                            obtainedMediaConstraintStore.update((c) => {
                                c.audio = true;
                                return c;
                            });
                            // Also, let's switch the microphone back on if it was off (because some code or the user might have turned it off while we were waiting for getUserMedia,
                            // but we need to show the user that the microphone is on because we just got a stream)
                            requestedMicrophoneState.enableMicrophone();
                        }
                        batchGetUserMediaStore.commitChanges();
                        hideHelpCameraSettings();
                        return stream;
                    } catch (e) {
                        if (isOverConstrainedError(e) && e.constraint === "deviceId") {
                            console.info(
                                "Could not access the requested microphone or webcam. Falling back to default microphone and webcam",
                                constraints,
                                e
                            );
                            batchGetUserMediaStore.startBatch();
                            requestedCameraDeviceIdStore.set(undefined);
                            requestedMicrophoneDeviceIdStore.set(undefined);
                            batchGetUserMediaStore.commitChanges();
                        } else if (constraints.video !== false /* || constraints.audio !== false*/) {
                            console.info(
                                "Error. Unable to get microphone and/or camera access. Trying audio only.",
                                constraints,
                                e
                            );
                            // TODO: does it make sense to pop this error when retrying?
                            set({
                                type: "error",
                                error: e instanceof Error ? e : new Error("An unknown error happened"),
                            });
                            // Let's try without video constraints
                            //if (constraints.video !== false) {
                            requestedCameraState.disableWebcam();
                        } else if (!constraints.video && !constraints.audio) {
                            console.error("Error. getUserMedia called with no audio and no video.");
                            set({
                                type: "error",
                                error: new MediaStreamConstraintsError(),
                            });
                        } else {
                            console.info("Error. Unable to get microphone and/or camera access.", constraints, e);
                            set({
                                type: "error",
                                error: e instanceof Error ? e : new Error("An unknown error happened"),
                            });
                        }
                        return undefined;
                    }
                })
                .catch((e) => {
                    console.error("Error in getUserMedia promise chain", e);
                    set({
                        type: "error",
                        error: e instanceof Error ? e : new Error("An unknown error happened"),
                    });
                    return undefined;
                });
            return currentGetUserMediaPromise;
        }

        if (navigator.mediaDevices === undefined) {
            if (window.location.protocol === "http:") {
                set({
                    type: "error",
                    error: new Error("Unable to access your camera or microphone. You need to use a HTTPS connection."),
                });
                return;
            } else if (isIOS()) {
                set({
                    type: "error",
                    error: new WebviewOnOldIOS(),
                });
                return;
            } else {
                set({
                    type: "error",
                    error: new BrowserTooOldError(),
                });
                return;
            }
        }

        if (currentStream === undefined) {
            // we need to assign a first value to the stream because getUserMedia is async
            set({
                type: "success",
                stream: undefined,
            });
        }

        // Let's see what has changed compared to old constraints
        const mustRequestNewVideo =
            (constraints.video && !deepEqual(oldConstraints.video, constraints.video)) ||
            (!currentStream && constraints.video);
        const mustRequestNewAudio =
            (constraints.audio && !deepEqual(oldConstraints.audio, constraints.audio)) ||
            (!currentStream && constraints.audio);

        if (currentStream) {
            const oldStream = currentStream;
            const mustStopVideo = oldConstraints.video !== false && constraints.video === false;
            const mustStopAudio = oldConstraints.audio !== false && constraints.audio === false;

            if (mustStopVideo) {
                oldStream.getVideoTracks().forEach((t) => {
                    t.stop();
                    oldStream.removeTrack(t);
                });
                obtainedMediaConstraintStore.update((c) => {
                    c.video = false;
                    return c;
                });
            }
            if (mustStopAudio) {
                oldStream.getAudioTracks().forEach((t) => {
                    t.stop();
                    oldStream.removeTrack(t);
                });
                obtainedMediaConstraintStore.update((c) => {
                    c.audio = false;
                    return c;
                });
            }
            if (mustStopVideo || mustStopAudio) {
                set({
                    type: "success",
                    stream: oldStream,
                });
            }
        }

        if (mustRequestNewVideo || mustRequestNewAudio) {
            const newConstraints: MediaStreamConstraints = {};
            if (mustRequestNewVideo) {
                newConstraints.video = constraints.video;
            } else {
                newConstraints.video = false;
            }
            if (mustRequestNewAudio) {
                newConstraints.audio = constraints.audio;
            } else {
                newConstraints.audio = false;
            }
            initStream(newConstraints).catch((e) => {
                set({
                    type: "error",
                    error: e instanceof Error ? e : new Error("An unknown error happened"),
                });
            });
        }

        oldConstraints = {
            video: constraints.video ?? false,
            audio: constraints.audio ?? false,
        };
    }
);

export const localStreamStore = derived<
    [typeof rawLocalStreamStore, typeof backgroundProcessingEnabledStore],
    LocalStreamStoreValue
>(
    [rawLocalStreamStore, backgroundProcessingEnabledStore],
    ([$rawLocalStreamStore, $backgroundProcessingEnabled], set) => {
        if (
            $rawLocalStreamStore.type === "error" ||
            $rawLocalStreamStore.stream === undefined ||
            $rawLocalStreamStore.stream.getVideoTracks().length === 0 ||
            !$backgroundProcessingEnabled
        ) {
            if (backgroundTransformer) {
                backgroundTransformer.stop();
            }

            set($rawLocalStreamStore);
            return;
        }

        let finalStream;

        if (!backgroundTransformer) {
            // Get current config from the store
            const currentConfig = get(backgroundConfigStore);

            backgroundTransformer = createBackgroundTransformer(currentConfig);
        }

        (async () => {
            // Only create if we don't have a transformer yet
            if ($rawLocalStreamStore.stream && backgroundTransformer) {
                // Transform the stream using the new approach if available
                finalStream = await backgroundTransformer.transform($rawLocalStreamStore.stream);
                // Store config for next comparison
                lastBackgroundConfig = { ...get(backgroundConfigStore) };

                set({
                    type: "success",
                    stream: finalStream,
                });
            }
        })().catch((error) => {
            console.warn("[MediaStore] Failed to transform stream:", error);
            Sentry.captureException(error);
            warningMessageStore.addWarningMessage(get(LL).warning.backgroundProcessing.failedToApply());
            backgroundConfigStore.reset();
        });
    }
);

/**
 * Firefox does not support the OverconstrainedError class.
 * Instead, it throw an error whose name is "OverconstrainedError"
 */
interface OverconstrainedErrorInterface {
    constraint: string;
}
function isOverConstrainedError(e: unknown): e is OverconstrainedErrorInterface {
    return e instanceof Error && e.name === "OverconstrainedError";
}

/**
 * A store containing the actual states of audio and video (activated or deactivated)
 */
export const obtainedMediaConstraintStore = writable<ObtainedMediaStreamConstraints>({
    audio: false,
    video: false,
});

export const localVolumeStore = derived<typeof localStreamStore, number[] | undefined>(
    localStreamStore,
    ($localStreamStoreValue, set) => {
        if ($localStreamStoreValue.type === "error") {
            set(undefined);
            return;
        }
        const mediaStream = $localStreamStoreValue.stream;

        if (mediaStream === undefined || mediaStream.getAudioTracks().length <= 0) {
            set(undefined);
            return;
        }

        const soundMeter = new SoundMeter(mediaStream);
        let error = false;

        const timeout = setInterval(() => {
            try {
                set(soundMeter.getVolume());
            } catch (err) {
                if (!error) {
                    console.error(err);
                    error = true;
                }
            }
        }, 100);

        return () => {
            clearInterval(timeout);
            soundMeter.stop();
        };
    },
    undefined
);

const talkIconVolumeThreshold = 10;

export const localVoiceIndicatorStore = derived<Readable<number[] | undefined>, boolean>(
    localVolumeStore,
    ($localVolumeStore) => {
        if ($localVolumeStore === undefined) {
            return false;
        }
        const volume = $localVolumeStore;
        if (volume === undefined) {
            return false;
        }
        const averageVolume = volume.reduce((a, b) => a + b, 0);
        return averageVolume > talkIconVolumeThreshold;
    },
    false
);

/**
 * Device list
 */
export const deviceListStore = readable<MediaDeviceInfo[] | undefined>(undefined, function start(set) {
    let deviceListCanBeQueried = false;

    const queryDeviceList = () => {
        // Note: so far, we are ignoring any failures.
        navigator.mediaDevices
            .enumerateDevices()
            .then((mediaDeviceInfos) => {
                // check if the new list has the preferred device
                const preferredVideoInputDevice = localUserStore.getPreferredVideoInputDevice();
                const preferredAudioInputDevice = localUserStore.getPreferredAudioInputDevice();
                const preferredSpeakerDevice = localUserStore.getSpeakerDeviceId();

                if (
                    preferredVideoInputDevice &&
                    mediaDeviceInfos.find((device) => device.deviceId === preferredVideoInputDevice)
                ) {
                    requestedCameraDeviceIdStore.set(preferredVideoInputDevice);
                }
                if (
                    preferredAudioInputDevice &&
                    mediaDeviceInfos.find((device) => device.deviceId === preferredAudioInputDevice)
                ) {
                    requestedMicrophoneDeviceIdStore.set(preferredAudioInputDevice);
                }
                if (
                    preferredSpeakerDevice &&
                    mediaDeviceInfos.find((device) => device.deviceId === preferredSpeakerDevice)
                ) {
                    speakerSelectedStore.set(preferredSpeakerDevice);
                }

                const actualsMediaDevices = get(deviceListStore);
                // get all media that not exist in the list
                if (actualsMediaDevices != undefined) {
                    // set the last new media devices detected
                    const newDevices = mediaDeviceInfos.filter(
                        (device) => actualsMediaDevices.find((d) => d.deviceId === device.deviceId) == undefined
                    );
                    lastNewMediaDeviceDetectedStore.set(newDevices);
                }

                set(mediaDeviceInfos);
                devicesNotLoaded.set(false);
            })
            .catch((e) => {
                console.error(e);
                devicesNotLoaded.set(false);
                throw e;
            });
    };

    const unsubscribe = localStreamStore.subscribe((streamResult) => {
        if (streamResult.type === "success" && streamResult.stream !== undefined) {
            if (deviceListCanBeQueried === false) {
                queryDeviceList();
                deviceListCanBeQueried = true;
            }
        }
    });

    if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener("devicechange", queryDeviceList);
    }

    return function stop() {
        unsubscribe();
        if (navigator.mediaDevices) {
            navigator.mediaDevices.removeEventListener("devicechange", queryDeviceList);
        }
    };
});

export const cameraListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "videoinput"));
});

export const microphoneListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "audioinput"));
});

export const speakerListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    // Livekit does not support audio output device selection on Safari
    // Code: https://github.com/livekit/client-sdk-js/blob/dbaf7a9b784114728857a447734bc5d5453345b4/src/room/utils.ts#L144C1-L153C2
    // And it seems there is no plan to support it. Issue: https://github.com/livekit/components-js/issues/1216
    // Because the audio output selector should work in full-mesh WebRTC AND in Livekit, we have to support the same
    // features in both modes. So we disable audio output device selection on Safari here.
    if (isSafari() || isIOS()) {
        return;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "audiooutput"));
});

export const selectDefaultSpeaker = () => {
    const devices = get(speakerListStore);
    if (devices !== undefined && devices.length > 0) {
        speakerSelectedStore.set(devices[0].deviceId);
    } else {
        speakerSelectedStore.set("");
    }
};

// This is a singleton so no need to unsubscribe
//eslint-disable-next-line svelte/no-ignored-unsubscribe
speakerListStore.subscribe((devices) => {
    if (devices === undefined) {
        return;
    }
    // if the previous speaker used isn`t defined in the list, apply default speaker
    const previousSpeakerId = get(speakerSelectedStore);
    const previousAudioOutputDevice = devices.find((device) => device.deviceId === previousSpeakerId);
    if (previousAudioOutputDevice === undefined) {
        selectDefaultSpeaker();
    }
});

export const speakerSelectedStore = writable<string | undefined>(localUserStore.getSpeakerDeviceId() ?? undefined);

function removeDuplicateDevices(devices: MediaDeviceInfo[]) {
    const uniqueDevices = new Map<string, MediaDeviceInfo>();
    devices.forEach((device) => {
        uniqueDevices.set(device.deviceId, device);
    });
    return Array.from(uniqueDevices.values());
}

function isConstrainDOMStringParameters(param: ConstrainDOMString): param is ConstrainDOMStringParameters {
    return (
        typeof param === "object" &&
        ((param as ConstrainDOMStringParameters).ideal !== undefined ||
            (param as ConstrainDOMStringParameters).exact !== undefined)
    );
}

// TODO: detect the new webcam and automatically switch on it.
// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
cameraListStore.subscribe((devices) => {
    // Store not initialized yet
    if (devices === undefined) {
        return;
    }
    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(videoConstraintStore);
    const deviceId = constraints.deviceId;
    if (!deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    if (isConstrainDOMStringParameters(deviceId)) {
        if (!devices.find((device) => device.deviceId === deviceId.exact)) {
            requestedCameraDeviceIdStore.set(undefined);
        }
    }
});

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
microphoneListStore.subscribe((devices) => {
    // Store not initialized yet
    if (devices === undefined) {
        return;
    }

    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(audioConstraintStore);
    if (typeof constraints === "boolean") {
        return;
    }
    const deviceId = constraints.deviceId;
    if (!deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    if (isConstrainDOMStringParameters(deviceId)) {
        if (!devices.find((device) => device.deviceId === deviceId.exact)) {
            requestedMicrophoneDeviceIdStore.set(undefined);
        }
    }
});

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
localStreamStore.subscribe((streamResult) => {
    if (streamResult.type === "error") {
        if (streamResult.error.name === BrowserTooOldError.NAME || streamResult.error.name === WebviewOnOldIOS.NAME) {
            errorStore.addErrorMessage(streamResult.error);
        }
    }
});

// When the stream is initialized, the new sound constraint is recreated and the first speaker is set.
// If the user did not select the new speaker, the first new speaker cannot be selected automatically.
// It is ok to not unsubscribe to this store because it is a singleton.
// // eslint-disable-next-line svelte/no-ignored-unsubscribe
/*speakerSelectedStore.subscribe((speaker) => {
    const oldValue = localUserStore.getSpeakerDeviceId();
    const currentValue = speaker;
    const speakerList = get(speakerListStore);
    const oldDevice =
        oldValue && speakerList
            ? speakerList.find((mediaDeviceInfo) => mediaDeviceInfo.deviceId == oldValue)
            : undefined;
    if (
        oldDevice !== undefined &&
        speakerList !== undefined &&
        currentValue !== oldDevice.deviceId &&
        speakerList.find((value) => value.deviceId == oldValue)
    ) {
        console.warn("speakerSelectedStore.subscribe", oldValue, currentValue, oldDevice.deviceId);
        speakerSelectedStore.set(oldDevice.deviceId);
    }
});*/

function createVideoBandwidthStore() {
    const { subscribe, set } = writable<number | "unlimited">(localUserStore.getVideoBandwidth());

    return {
        subscribe,
        setBandwidth: (bandwidth: number | "unlimited") => {
            set(bandwidth);
            localUserStore.setVideoBandwidth(bandwidth);
        },
    };
}

export const videoBandwidthStore = createVideoBandwidthStore();

export const lastNewMediaDeviceDetectedStore = writable<MediaDeviceInfo[]>([]);

/**
 * Subscribe to background config changes to update the transformer
 * This avoids recreating the entire stream when only parameters change
 */
const backgroundConfigStoreSubscription = backgroundConfigStore.subscribe(($config) => {
    // Skip if no transformer exists yet
    if (!backgroundTransformer || !lastBackgroundConfig) {
        return;
    }

    updateBackgroundProcessor({
        mode: $config.mode,
        blurAmount: $config.blurAmount,
        backgroundImage: $config.backgroundImage,
        backgroundVideo: $config.backgroundVideo,
    });
});
export const unsubscribeBackgroundConfigStoreSubscription = () => {
    backgroundConfigStoreSubscription();
};
