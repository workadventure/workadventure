import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import deepEqual from "fast-deep-equal";
import { AvailabilityStatus } from "@workadventure/messages";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import * as Sentry from "@sentry/svelte";
import type { VideoQualitySetting } from "../Connection/LocalUserStore";
import { localUserStore } from "../Connection/LocalUserStore";
import { isIOS, isSafari } from "../WebRtc/DeviceUtils";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import type { RequestedStatus } from "../Rules/StatusRules/statusRules";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import {
    type BackgroundConfig,
    type BackgroundTransformer,
    createBackgroundTransformer,
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
import { currentPlayerGroupIdStore } from "./CurrentPlayerGroupStore";

import { backgroundConfigStore, backgroundProcessingEnabledStore } from "./BackgroundTransformStore";
import {
    browserNoiseSuppressionSupportedStore,
    customNoiseSuppressionActiveStore,
    effectiveNoiseSuppressionProviderStore,
    microphoneAutoGainControlStore,
    microphoneEchoCancellationStore,
    noiseSuppressionEnabledStore,
    noiseSuppressionStateStore,
    voiceIsolationSupportedStore,
} from "./NoiseSuppressionStore";
import {
    composeLocalStreamValue,
    getLocalTrackFromStreamValue,
    type LocalStreamStoreValue,
    type LocalTrackStoreValue,
} from "./LocalStreamTypes";
import { NoiseSuppressionController } from "./NoiseSuppressionController";
import { buildMicrophoneAudioConstraints } from "./MicrophoneSettings";

export const inBackgroundSettingsStore = writable<boolean>(false);

export type MediaAccessIssue = "permission_denied" | "no_device";

/**
 * Last camera access failure, or no videoinput reported by the browser.
 * Cleared when the user turns the camera off manually, when a video track is obtained, or when a camera appears.
 */
export const cameraAccessIssueStore = writable<MediaAccessIssue | null>(null);

/**
 * Last microphone access failure, or no audioinput reported by the browser.
 * Cleared when the user turns the microphone off manually, when an audio track is obtained, or when a microphone appears.
 */
export const microphoneAccessIssueStore = writable<MediaAccessIssue | null>(null);

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
export const devicesNotLoaded = writable(true);

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
export const inJitsiStore = writable(false);
export const inBbbStore = writable(false);
export const isSpeakerStore = writable(false);
export const inLivekitStore = writable(false);
export const isListenerStore = writable(false);
export const listenerWaitingMediaStore = writable<string | undefined>(undefined);
/**
 * When true, the listener has consented to share their camera with the speaker (seeAttendees feature).
 * This store is set to true when the listener accepts the camera sharing popup.
 */
export const listenerSharingCameraStore = writable(false);

export const requestedCameraDeviceIdStore: Writable<string | undefined> = writable(
    localUserStore.getPreferredVideoInputDevice() ? localUserStore.getPreferredVideoInputDevice() : undefined,
);

export const frameRateStore: Writable<number | undefined> = writable();
export const requestedMicrophoneDeviceIdStore: Writable<string | undefined> = writable(
    localUserStore.getPreferredAudioInputDevice() ? localUserStore.getPreferredAudioInputDevice() : undefined,
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
    },
);

/**
 * A store that contains audio constraints.
 */
export const audioConstraintStore = derived(
    [
        requestedMicrophoneDeviceIdStore,
        microphoneAutoGainControlStore,
        microphoneEchoCancellationStore,
        noiseSuppressionEnabledStore,
        effectiveNoiseSuppressionProviderStore,
        browserNoiseSuppressionSupportedStore,
        customNoiseSuppressionActiveStore,
        noiseSuppressionStateStore,
    ],
    ([
        $microphoneDeviceIdStore,
        $microphoneAutoGainControlStore,
        $microphoneEchoCancellationStore,
        $noiseSuppressionEnabledStore,
        $effectiveNoiseSuppressionProviderStore,
        $browserNoiseSuppressionSupportedStore,
        $customNoiseSuppressionActiveStore,
        $noiseSuppressionStateStore,
    ]) => {
        const supportedConstraints = navigator.mediaDevices?.getSupportedConstraints();
        let constraints: boolean | MediaTrackConstraints = buildMicrophoneAudioConstraints({
            microphoneDeviceId: $microphoneDeviceIdStore,
            autoGainControl: $microphoneAutoGainControlStore,
            echoCancellation: $microphoneEchoCancellationStore,
            noiseSuppressionEnabled: $noiseSuppressionEnabledStore,
            effectiveNoiseSuppressionProvider: $effectiveNoiseSuppressionProviderStore,
            browserNoiseSuppressionSupported: $browserNoiseSuppressionSupportedStore,
            workAdventureNoiseSuppressionFailed:
                $noiseSuppressionStateStore.status === "error" || $noiseSuppressionStateStore.status === "unsupported",
            customNoiseSuppressionActive: $customNoiseSuppressionActiveStore,
            voiceIsolationAdvertised: supportedConstraints?.voiceIsolation === true,
            deviceIdSupported: supportedConstraints?.deviceId === true,
            sampleRateSupported: supportedConstraints?.sampleRate === true,
        });

        if (typeof constraints === "boolean") {
            constraints = {};
        }
        return constraints;
    },
);

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
        currentPlayerGroupIdStore,
        inLivekitStore,
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
        $currentPlayerGroupIdStore,
        $inLivekitStore,
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
            $currentPlayerGroupIdStore === undefined &&
            !$inLivekitStore &&
            !$displayedMegaphoneScreenStore
        );
    },
);

export const requestedStatusStore: Writable<RequestedStatus | null> = writable(localUserStore.getRequestedStatus());

export const inCowebsiteZone = derived(
    [inJitsiStore, inBbbStore, inOpenWebsite],
    ([$inJitsiStore, $inBbbStore, $inOpenWebsite]) => {
        return $inJitsiStore || $inBbbStore || $inOpenWebsite;
    },
    false,
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
    AvailabilityStatus.ONLINE,
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
        inBackgroundSettingsStore,
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
            $inBackgroundSettingsStore,
        ],
        set,
    ) => {
        // If a batch is in process, don't do anything.
        if ($batchGetUserMediaStore) {
            return;
        }

        let currentVideoConstraint: boolean | MediaTrackConstraints = $videoConstraintStore;
        let currentAudioConstraint: boolean | MediaTrackConstraints = $audioConstraintStore;

        // Shared conditions for disabling media
        const isInExternalService = $inExternalServiceStore === true;
        const isEnergySaving = $cameraEnergySavingStore === true && $enableCameraSceneVisibilityStore === false;
        const isUnavailableStatus =
            $availabilityStatusStore === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            $availabilityStatusStore === AvailabilityStatus.SILENT ||
            $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
            $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
            $availabilityStatusStore === AvailabilityStatus.BUSY;
        const shouldDisableMicrophoneForPrivacy =
            $privacyShutdownStore === true && !localUserStore.getMicrophonePrivacySettings();
        const shouldDisableCameraForPrivacy =
            $privacyShutdownStore === true && !localUserStore.getCameraPrivacySettings();

        // Audio constraints always apply
        if (
            $requestedMicrophoneState === false ||
            $myMicrophoneStore === false ||
            isInExternalService ||
            shouldDisableMicrophoneForPrivacy ||
            isEnergySaving ||
            isUnavailableStatus
        ) {
            currentAudioConstraint = false;
        }

        // Video constraints only apply when NOT in background settings (to allow camera preview)
        if (!$inBackgroundSettingsStore) {
            if (
                $requestedCameraState === false ||
                $myCameraStore === false ||
                isInExternalService ||
                shouldDisableCameraForPrivacy ||
                isEnergySaving ||
                isUnavailableStatus
            ) {
                currentVideoConstraint = false;
            }
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
    },
);

export type { LocalStreamStoreValue } from "./LocalStreamTypes";

let currentStream: MediaStream | undefined = undefined;
let oldConstraints: { video: MediaTrackConstraints | false; audio: MediaTrackConstraints | false } = {
    video: false,
    audio: false,
};
// Use the factory to create the appropriate transformer
let backgroundTransformer: BackgroundTransformer | undefined = undefined;
// Track the last background config to detect if we need to recreate or just update
let lastBackgroundConfig: BackgroundConfig | undefined = undefined;
// AbortController for the in-flight transform; aborted when a new run is scheduled
let currentTransformAbortController: AbortController | null = null;
// AbortController for the in-flight noise suppression transform; aborted when a new run is scheduled
let currentAudioProcessedTransformAbortController: AbortController | null = null;
const noiseSuppressionController = new NoiseSuppressionController();

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

/**
 * Serializes raw local stream updates so that only one getUserMedia flow runs at a time
 * and the last enqueued update wins (stale completions do not overwrite the store).
 */
let rawStreamGeneration = 0;
let rawStreamUpdateQueue: Promise<void> = Promise.resolve();

type SetRawStreamIfCurrent = (value: LocalStreamStoreValue) => void;

function hasLiveTrack(tracks: MediaStreamTrack[]): boolean {
    return tracks.some((track) => track.readyState === "live");
}

function classifyMediaAccessError(error: unknown): MediaAccessIssue | null {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        return "permission_denied";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        return "no_device";
    }
    return null;
}

function emitCurrentStreamOrError(setIfCurrent: SetRawStreamIfCurrent, error: unknown) {
    if (currentStream) {
        setIfCurrent({
            type: "success",
            stream: currentStream,
        });
        return;
    }

    setIfCurrent({
        type: "error",
        error: error instanceof Error ? error : new Error("An unknown error happened"),
    });
}

async function runRawStreamUpdate(
    constraints: { video: false | MediaTrackConstraints; audio: false | MediaTrackConstraints },
    setIfCurrent: SetRawStreamIfCurrent,
    generation: number,
): Promise<{ video: false | MediaTrackConstraints; audio: false | MediaTrackConstraints }> {
    if (navigator.mediaDevices === undefined) {
        if (window.location.protocol === "http:") {
            setIfCurrent({
                type: "error",
                error: new Error("Unable to access your camera or microphone. You need to use a HTTPS connection."),
            });
            return constraints;
        }
        if (isIOS()) {
            setIfCurrent({
                type: "error",
                error: new WebviewOnOldIOS(),
            });
            return constraints;
        }
        setIfCurrent({
            type: "error",
            error: new BrowserTooOldError(),
        });
        return constraints;
    }

    if (currentStream === undefined) {
        setIfCurrent({
            type: "success",
            stream: undefined,
        });
    }

    cameraAccessIssueStore.set(null);
    microphoneAccessIssueStore.set(null);

    const nextConstraints = {
        video: constraints.video ?? false,
        audio: constraints.audio ?? false,
    };

    const hasLiveVideoTrack = currentStream ? hasLiveTrack(currentStream.getVideoTracks()) : false;
    const hasLiveAudioTrack = currentStream ? hasLiveTrack(currentStream.getAudioTracks()) : false;
    const mustRequestNewVideo =
        constraints.video !== false && (!deepEqual(oldConstraints.video, constraints.video) || !hasLiveVideoTrack);
    const mustRequestNewAudio =
        constraints.audio !== false && (!deepEqual(oldConstraints.audio, constraints.audio) || !hasLiveAudioTrack);

    if (currentStream) {
        const oldStream = currentStream;
        const mustStopVideo = oldConstraints.video !== false && constraints.video === false;
        const mustStopAudio = oldConstraints.audio !== false && constraints.audio === false;

        if (mustStopVideo) {
            oldStream.getVideoTracks().forEach((t) => {
                t.stop();
                oldStream.removeTrack(t);
            });
        }
        if (mustStopAudio) {
            oldStream.getAudioTracks().forEach((t) => {
                t.stop();
                oldStream.removeTrack(t);
            });
        }
        if (mustStopVideo || mustStopAudio) {
            setIfCurrent({
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

        // Note: we need to stop the tracks BEFORE calling getUserMedia and not after because of a Chromium issue:
        // If some settings are modified (like autoGainControl), they can be ignored if a track already exists
        // for the same microphone, but with different settings.
        if (currentStream) {
            if (mustRequestNewVideo) {
                currentStream.getVideoTracks().forEach((track) => {
                    track.stop();
                });
            }
            if (mustRequestNewAudio) {
                currentStream.getAudioTracks().forEach((track) => {
                    track.stop();
                });
            }
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
            if (generation !== rawStreamGeneration) {
                // A newer update is queued/running: discard this stale stream so devices are released immediately.
                // The returned constraints are ignored by caller for stale generations.
                stream.getTracks().forEach((track) => track.stop());
                return nextConstraints;
            }
            const oldStream = currentStream;
            currentStream =
                oldStream === undefined
                    ? stream
                    : new MediaStream([
                          ...(!mustRequestNewVideo
                              ? oldStream.getVideoTracks().filter((track) => track.readyState !== "ended")
                              : []),
                          ...(!mustRequestNewAudio
                              ? oldStream.getAudioTracks().filter((track) => track.readyState !== "ended")
                              : []),
                          ...stream.getTracks(),
                      ]);
            setIfCurrent({
                type: "success",
                stream: currentStream,
            });
            batchGetUserMediaStore.startBatch();
            if (currentStream.getVideoTracks().length > 0) {
                usedCameraDeviceIdStore.set(currentStream.getVideoTracks()[0]?.getSettings().deviceId);
            }
            if (currentStream.getAudioTracks().length > 0) {
                const audioTrackSettings = currentStream.getAudioTracks()[0]?.getSettings();
                usedMicrophoneDeviceIdStore.set(audioTrackSettings?.deviceId);
                voiceIsolationSupportedStore.setSupported(
                    navigator.mediaDevices?.getSupportedConstraints().voiceIsolation === true &&
                        audioTrackSettings?.voiceIsolation !== undefined,
                );
            } else {
                voiceIsolationSupportedStore.setSupported(false);
            }
            batchGetUserMediaStore.commitChanges();
            hideHelpCameraSettings();
        } catch (e) {
            if (isOverConstrainedError(e) && e.constraint === "deviceId") {
                console.info(
                    "Could not access the requested microphone or webcam. Falling back to default microphone and webcam",
                    newConstraints,
                    e,
                );
                batchGetUserMediaStore.startBatch();
                requestedCameraDeviceIdStore.set(undefined);
                requestedMicrophoneDeviceIdStore.set(undefined);
                batchGetUserMediaStore.commitChanges();
            } else if (mustRequestNewVideo) {
                console.info(
                    "Error. Unable to get microphone and/or camera access. Trying audio only.",
                    newConstraints,
                    e,
                );
                emitCurrentStreamOrError(setIfCurrent, e);
                const classified = classifyMediaAccessError(e);
                requestedCameraState.disableWebcam();
                cameraAccessIssueStore.set(classified);
                if (mustRequestNewAudio) {
                    requestedMicrophoneState.disableMicrophone();
                    microphoneAccessIssueStore.set(classified);
                }
            } else if (!constraints.video && !constraints.audio) {
                console.error("Error. getUserMedia called with no audio and no video.");
                setIfCurrent({
                    type: "error",
                    error: new MediaStreamConstraintsError(),
                });
            } else {
                console.info("Error. Unable to get microphone and/or camera access.", newConstraints, e);
                emitCurrentStreamOrError(setIfCurrent, e);
                if (mustRequestNewAudio) {
                    requestedMicrophoneState.disableMicrophone();
                    microphoneAccessIssueStore.set(classifyMediaAccessError(e));
                }
            }
        }
    }

    return nextConstraints;
}

/**
 * In case a device is removed, we need to retry the getUserMedia call to get another device if available.
 */
const userMediaRetryCountStore = writable(0);

/**
 * Triggers a new call to getUserMedia to refresh the stream.
 * Useful when a default device has been removed.
 */
function retryGetUserMedia(retryVideo: boolean, retryAudio: boolean) {
    if (retryVideo) {
        oldConstraints.video = false;
    }
    if (retryAudio) {
        oldConstraints.audio = false;
    }
    userMediaRetryCountStore.update((count) => count + 1);
}

/**
 * A store containing the raw MediaStream object (or undefined if nothing requested, or Error if an error occurred)
 *
 * NOTE: We depend on forceTransformerRecreationStore to detect when mode changes require recreation.
 * Parameter changes (blurAmount, etc.) are handled by a separate subscriber to avoid recreating
 * the transformer on every change (which causes WebGL context leaks).
 */
export const rawLocalStreamStore = derived<
    [typeof mediaStreamConstraintsStore, typeof userMediaRetryCountStore],
    LocalStreamStoreValue
>(
    [mediaStreamConstraintsStore, userMediaRetryCountStore],
    ([$mediaStreamConstraintsStore, $userMediaRetryCountStore], set) => {
        const constraints = { ...$mediaStreamConstraintsStore };
        const myGen = ++rawStreamGeneration;
        const setIfCurrent: SetRawStreamIfCurrent = (value) => {
            if (myGen === rawStreamGeneration) {
                set(value);
            }
        };

        rawStreamUpdateQueue = rawStreamUpdateQueue
            .then(async () => {
                const result = await runRawStreamUpdate(constraints, setIfCurrent, myGen);
                if (myGen === rawStreamGeneration) {
                    oldConstraints = result;
                }
            })
            .catch((e) => {
                console.error("Error in raw local stream update queue", e);
                setIfCurrent({
                    type: "error",
                    error: e instanceof Error ? e : new Error("An unknown error happened"),
                });
            });
    },
    {
        type: "success",
        stream: undefined,
    },
);

export const rawLocalAudioTrackStore = derived<typeof rawLocalStreamStore, LocalTrackStoreValue>(
    rawLocalStreamStore,
    ($rawLocalStreamStore) => getLocalTrackFromStreamValue($rawLocalStreamStore, "audio"),
);

export const rawLocalVideoTrackStore = derived<typeof rawLocalStreamStore, LocalTrackStoreValue>(
    rawLocalStreamStore,
    ($rawLocalStreamStore) => getLocalTrackFromStreamValue($rawLocalStreamStore, "video"),
);

/**
 * A store containing the audio track after optional noise suppression has been applied.
 * Updates are serialized so that the last enqueued update wins.
 */
let audioProcessedStreamGeneration = 0;
let audioProcessedStreamUpdateQueue: Promise<void> = Promise.resolve();

type SetAudioProcessedTrackIfCurrent = (value: LocalTrackStoreValue) => void;

export const audioProcessedLocalAudioTrackStore = derived<
    [typeof rawLocalAudioTrackStore, typeof customNoiseSuppressionActiveStore],
    LocalTrackStoreValue
>(
    [rawLocalAudioTrackStore, customNoiseSuppressionActiveStore],
    ([$rawLocalAudioTrackStore, $customNoiseSuppressionActiveStore], set) => {
        const myGen = ++audioProcessedStreamGeneration;
        const setIfCurrent: SetAudioProcessedTrackIfCurrent = (value) => {
            if (myGen === audioProcessedStreamGeneration) {
                set(value);
            }
        };

        currentAudioProcessedTransformAbortController?.abort(
            new AbortError("Noise suppression transform cancelled: new stream update"),
        );
        const controller = new AbortController();
        currentAudioProcessedTransformAbortController = controller;

        audioProcessedStreamUpdateQueue = audioProcessedStreamUpdateQueue
            .then(async () => {
                if ($rawLocalAudioTrackStore.type === "error") {
                    noiseSuppressionController.stop();
                    setIfCurrent($rawLocalAudioTrackStore);
                    return;
                }

                setIfCurrent({
                    type: "success",
                    track: await noiseSuppressionController.transform(
                        $rawLocalAudioTrackStore.track,
                        $customNoiseSuppressionActiveStore,
                        controller.signal,
                    ),
                });
            })
            .catch((e) => {
                const isAbort = e instanceof AbortError || (e instanceof DOMException && e.name === "AbortError");
                if (isAbort) {
                    return;
                }
                console.error("Error in audio processed stream update queue", e);
                setIfCurrent({
                    type: "error",
                    error: e instanceof Error ? e : new Error("An unknown error happened"),
                });
            });
    },
    {
        type: "success",
        track: undefined,
    },
);

/**
 * Serializes local video track (background-transformed) updates so that the last enqueued update wins.
 */
let localStreamGeneration = 0;
let localStreamUpdateQueue: Promise<void> = Promise.resolve();

type SetLocalVideoTrackIfCurrent = (value: LocalTrackStoreValue) => void;

async function runLocalVideoTrackUpdate(
    videoTrackValue: LocalTrackStoreValue,
    backgroundProcessingEnabled: boolean,
    setIfCurrent: SetLocalVideoTrackIfCurrent,
    signal: AbortSignal,
): Promise<void> {
    if (videoTrackValue.type === "error") {
        if (backgroundTransformer) {
            backgroundTransformer.stop();
        }
        setIfCurrent(videoTrackValue);
        return;
    }

    if (videoTrackValue.track === undefined || !backgroundProcessingEnabled) {
        if (backgroundTransformer) {
            backgroundTransformer.stop();
        }
        setIfCurrent(videoTrackValue);
        return;
    }

    if (!backgroundTransformer) {
        const currentConfig = get(backgroundConfigStore);
        backgroundTransformer = createBackgroundTransformer(currentConfig);
    }

    if (!backgroundTransformer) {
        setIfCurrent(videoTrackValue);
        return;
    }

    try {
        const finalStream = await backgroundTransformer.transform(new MediaStream([videoTrackValue.track]), signal);
        lastBackgroundConfig = { ...get(backgroundConfigStore) };
        setIfCurrent({
            type: "success",
            track: finalStream.getVideoTracks()[0],
        });
    } catch (error) {
        const isAbort = error instanceof AbortError || (error instanceof DOMException && error.name === "AbortError");
        if (isAbort) {
            return;
        }
        console.warn("[MediaStore] Failed to transform stream:", error);
        Sentry.captureException(error);
        warningMessageStore.addWarningMessage(get(LL).warning.backgroundProcessing.failedToApply());
        backgroundConfigStore.reset();
        setIfCurrent({
            type: "error",
            error: error instanceof Error ? error : new Error("Background transform failed"),
        });
    }
}

export const backgroundProcessedLocalVideoTrackStore = derived<
    [typeof rawLocalVideoTrackStore, typeof backgroundProcessingEnabledStore],
    LocalTrackStoreValue
>(
    [rawLocalVideoTrackStore, backgroundProcessingEnabledStore],
    ([$rawLocalVideoTrackStore, $backgroundProcessingEnabled], set) => {
        const myGen = ++localStreamGeneration;
        const setIfCurrent: SetLocalVideoTrackIfCurrent = (value) => {
            if (myGen === localStreamGeneration) {
                set(value);
            }
        };

        currentTransformAbortController?.abort(new AbortError("Background transform cancelled: new stream update"));
        const controller = new AbortController();
        currentTransformAbortController = controller;

        localStreamUpdateQueue = localStreamUpdateQueue
            .catch((e) => {
                const isAbort = e instanceof AbortError || (e instanceof DOMException && e.name === "AbortError");
                if (isAbort) {
                    return;
                }
                console.error("Error in local stream update queue", e);
                setIfCurrent({
                    type: "error",
                    error: e instanceof Error ? e : new Error("An unknown error happened"),
                });
            })
            .then(() =>
                runLocalVideoTrackUpdate(
                    $rawLocalVideoTrackStore,
                    $backgroundProcessingEnabled,
                    setIfCurrent,
                    controller.signal,
                ),
            );
    },
    {
        type: "success",
        track: undefined,
    },
);

export const localStreamStore = derived<
    [
        typeof audioProcessedLocalAudioTrackStore,
        typeof backgroundProcessedLocalVideoTrackStore,
        typeof rawLocalStreamStore,
    ],
    LocalStreamStoreValue
>(
    [audioProcessedLocalAudioTrackStore, backgroundProcessedLocalVideoTrackStore, rawLocalStreamStore],
    ([$audioProcessedLocalAudioTrackStore, $backgroundProcessedLocalVideoTrackStore, $rawLocalStreamStore]) =>
        composeLocalStreamValue(
            $audioProcessedLocalAudioTrackStore,
            $backgroundProcessedLocalVideoTrackStore,
            $rawLocalStreamStore.type === "success" && $rawLocalStreamStore.stream !== undefined,
        ),
);

/**
 * When (unavailable status + in background settings), we expose the local stream without video tracks
 * so that LiveKit/WebRTC do not publish camera; preview in BackgroundSettingsPanel still uses localStreamStore.
 */
export const localStreamStoreForPublishing = derived<
    [typeof localStreamStore, typeof availabilityStatusStore, typeof inBackgroundSettingsStore],
    LocalStreamStoreValue
>(
    [localStreamStore, availabilityStatusStore, inBackgroundSettingsStore],
    ([$localStreamStore, $availabilityStatusStore, $inBackgroundSettingsStore], set) => {
        const isUnavailableStatus =
            $availabilityStatusStore === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            $availabilityStatusStore === AvailabilityStatus.SILENT ||
            $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB ||
            $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
            $availabilityStatusStore === AvailabilityStatus.BUSY;
        const shouldMaskVideoForPublishing = isUnavailableStatus && $inBackgroundSettingsStore;

        if (
            shouldMaskVideoForPublishing &&
            $localStreamStore.type === "success" &&
            $localStreamStore.stream &&
            $localStreamStore.stream.getVideoTracks().length > 0
        ) {
            const audioOnlyStream = new MediaStream($localStreamStore.stream.getAudioTracks());
            set({ type: "success", stream: audioOnlyStream });
            return;
        }
        set($localStreamStore);
    },
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
    undefined,
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
    false,
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
        if (streamResult && streamResult.type === "success" && streamResult.stream !== undefined) {
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

/**
 * Context for the camera action-bar tooltip when the camera is off: permission denied vs no usable device.
 */
export const cameraButtonHelpContextStore = derived(
    [cameraAccessIssueStore, cameraListStore, devicesNotLoaded],
    ([issue, cameras, notLoaded]) => {
        if (issue === "permission_denied") {
            return "permission" as const;
        }
        if (issue === "no_device") {
            return "no_device" as const;
        }
        if (!notLoaded && cameras !== undefined && cameras.length === 0) {
            return "no_device" as const;
        }
        return null;
    },
);

export const microphoneListStore = derived(deviceListStore, ($deviceListStore) => {
    if ($deviceListStore === undefined) {
        return undefined;
    }

    return removeDuplicateDevices($deviceListStore.filter((device) => device.kind === "audioinput"));
});

/**
 * Context for the microphone action-bar tooltip when the mic is off: permission denied vs no usable device.
 */
export const microphoneButtonHelpContextStore = derived(
    [microphoneAccessIssueStore, microphoneListStore, devicesNotLoaded],
    ([issue, mics, notLoaded]) => {
        if (issue === "permission_denied") {
            return "permission" as const;
        }
        if (issue === "no_device") {
            return "no_device" as const;
        }
        if (mics !== undefined && mics.length === 0) {
            return "no_device" as const;
        }
        return null;
    },
);

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

let previousMediaDevices: MediaDeviceInfo[] | undefined = undefined;

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
deviceListStore.subscribe((mediaDeviceInfos) => {
    if (mediaDeviceInfos === undefined) {
        return;
    }

    // check if the new list has the preferred device
    const preferredVideoInputDevice = localUserStore.getPreferredVideoInputDevice();
    const preferredAudioInputDevice = localUserStore.getPreferredAudioInputDevice();
    const preferredSpeakerDevice = localUserStore.getSpeakerDeviceId();

    if (preferredVideoInputDevice && mediaDeviceInfos.find((device) => device.deviceId === preferredVideoInputDevice)) {
        requestedCameraDeviceIdStore.set(preferredVideoInputDevice);
    }
    if (preferredAudioInputDevice && mediaDeviceInfos.find((device) => device.deviceId === preferredAudioInputDevice)) {
        requestedMicrophoneDeviceIdStore.set(preferredAudioInputDevice);
    }
    if (preferredSpeakerDevice && mediaDeviceInfos.find((device) => device.deviceId === preferredSpeakerDevice)) {
        speakerSelectedStore.set(preferredSpeakerDevice);
    }

    const thePreviousMediaDevices = previousMediaDevices;
    // get all media that not exist in the list
    if (thePreviousMediaDevices !== undefined) {
        // set the last new media devices detected (new devices detection)
        const newDevices = mediaDeviceInfos.filter(
            (device) => thePreviousMediaDevices.find((d) => d.deviceId === device.deviceId) === undefined,
        );
        lastNewMediaDeviceDetectedStore.set(newDevices);

        // Detect removed devices
        const removedDevices = thePreviousMediaDevices.filter(
            (device) => mediaDeviceInfos.find((d) => d.deviceId === device.deviceId) === undefined,
        );

        for (const removedDevice of removedDevices) {
            if (
                removedDevice.kind === "videoinput" &&
                currentStream?.getVideoTracks()[0]?.getSettings().deviceId === removedDevice.deviceId
            ) {
                if (get(requestedCameraDeviceIdStore) === undefined) {
                    // If we removed the default camera device, we retry (and ask for the new default camera that the OS will pick)
                    retryGetUserMedia(true, false);
                } else {
                    // If we removed a camera specifically requested, we retry without passing a device id.
                    requestedCameraDeviceIdStore.set(undefined);
                }
            } else if (
                removedDevice.kind === "audioinput" &&
                currentStream?.getAudioTracks()[0]?.getSettings().deviceId === removedDevice.deviceId
            ) {
                if (get(requestedMicrophoneDeviceIdStore) === undefined) {
                    // If we removed the default microphone device, we retry (and ask for the new default microphone that the OS will pick)
                    retryGetUserMedia(false, true);
                } else {
                    // If we removed a microphone specifically requested, we retry without passing a device id.
                    requestedMicrophoneDeviceIdStore.set(undefined);
                }
            }
        }
    }

    previousMediaDevices = [...mediaDeviceInfos];
});

function removeDuplicateDevices(devices: MediaDeviceInfo[]) {
    const uniqueDevices = new Map<string, MediaDeviceInfo>();
    devices.forEach((device) => {
        uniqueDevices.set(device.deviceId, device);
    });
    return Array.from(uniqueDevices.values());
}

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
localStreamStore.subscribe((streamResult) => {
    if (streamResult && streamResult.type === "error") {
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

function createVideoQualityStore() {
    const { subscribe, set } = writable<VideoQualitySetting>(localUserStore.getVideoQuality());

    return {
        subscribe,
        setQuality: (quality: VideoQualitySetting) => {
            set(quality);
            localUserStore.setVideoQuality(quality);
        },
    };
}

/**
 * A store containing the video quality setting.
 */
export const videoQualityStore = createVideoQualityStore();

export const lastNewMediaDeviceDetectedStore = writable<MediaDeviceInfo[]>([]);

/**
 * Subscribe to background config changes to update the transformer
 * This avoids recreating the entire stream when only parameters change
 */
// It is ok to not unsubscribe to this store because this module is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
backgroundConfigStore.subscribe(($config) => {
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
