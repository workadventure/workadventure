import type { Readable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import { localUserStore } from "../Connexion/LocalUserStore";
import { userMovingStore } from "./GameStore";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
import { BrowserTooOldError } from "./Errors/BrowserTooOldError";
import { errorStore } from "./ErrorStore";
import { getNavigatorType, isIOS, NavigatorType } from "../WebRtc/DeviceUtils";
import { WebviewOnOldIOS } from "./Errors/WebviewOnOldIOS";
import { inExternalServiceStore, myCameraStore, myMicrophoneStore, proximityMeetingStore } from "./MyMediaStore";
import { peerStore } from "./PeerStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { MediaStreamConstraintsError } from "./Errors/MediaStreamConstraintsError";
import { SoundMeter } from "../Phaser/Components/SoundMeter";
import { AvailabilityStatus } from "@workadventure/messages";

import deepEqual from "fast-deep-equal";
import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";
import { ObtainedMediaStreamConstraints } from "../WebRtc/P2PMessages/ConstraintMessage";
import { megaphoneEnabledStore } from "./MegaphoneStore";

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
 * A store containing whether the mouse is getting close the bottom right corner.
 */
const mouseInCameraTriggerArea = readable(false, function start(set) {
    let lastInTriggerArea = false;
    const gameDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("game");

    const detectInBottomRight = (event: MouseEvent) => {
        const isSmallScreen = isMediaBreakpointUp("md");
        const rect = gameDiv.getBoundingClientRect();

        if (!isSmallScreen) {
            const inBottomRight =
                event.x - rect.left > (rect.width * 3) / 4 && event.y - rect.top > (rect.height * 3) / 4; //Mouse's x is further than 3/4 of the width and lower than 3/4 starting from top
            if (inBottomRight !== lastInTriggerArea) {
                lastInTriggerArea = inBottomRight;
                set(inBottomRight);
            }
        } else {
            const inTopCenter =
                event.x - rect.left > rect.width / 4 &&
                event.x + rect.left < (rect.width * 3) / 4 &&
                event.y - rect.top < rect.height / 4;
            if (inTopCenter !== lastInTriggerArea) {
                lastInTriggerArea = inTopCenter;
                set(inTopCenter);
            }
        }
    };

    document.addEventListener("mousemove", detectInBottomRight);

    return function stop() {
        document.removeEventListener("mousemove", detectInBottomRight);
    };
});

/**
 * A store that contains "true" if the webcam should be stopped for energy efficiency reason - i.e. we are not moving and not in a conversation.
 */
export const cameraEnergySavingStore = derived(
    [userMoved5SecondsAgoStore, peerStore, enabledWebCam10secondsAgoStore, mouseInCameraTriggerArea],
    ([$userMoved5SecondsAgoStore, $peerStore, $enabledWebCam10secondsAgoStore, $mouseInBottomRight]) => {
        return (
            !$mouseInBottomRight &&
            !$userMoved5SecondsAgoStore &&
            $peerStore.size === 0 &&
            !$enabledWebCam10secondsAgoStore
        );
    }
);

/**
 * A store that contains video constraints.
 */
function createVideoConstraintStore() {
    const { subscribe, update } = writable({
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 400, ideal: 720 },
        frameRate: { ideal: localUserStore.getVideoQualityValue() },
        facingMode: "user",
        resizeMode: "crop-and-scale",
        aspectRatio: 1.777777778,
    } as MediaTrackConstraints);

    return {
        subscribe,
        setDeviceId: (deviceId: string | undefined) =>
            update((constraints) => {
                if (deviceId !== undefined) {
                    constraints.deviceId = {
                        exact: deviceId,
                    };
                } else {
                    delete constraints.deviceId;
                }

                return constraints;
            }),
        setFrameRate: (frameRate: number) =>
            update((constraints) => {
                constraints.frameRate = { ideal: frameRate };
                localUserStore.setVideoQualityValue(frameRate);
                return constraints;
            }),
    };
}

export const inOpenWebsite = writable(false);
export const inJitsiStore = writable(false);
export const inBbbStore = writable(false);

export const inCowebsiteZone = derived(
    [inJitsiStore, inBbbStore, inOpenWebsite],
    ([$inJitsiStore, $inBbbStore, $inOpenWebsite]) => {
        return $inJitsiStore || $inBbbStore || $inOpenWebsite;
    },
    false
);

export const silentStore = writable(false);

export const availabilityStatusStore = derived(
    [inJitsiStore, inBbbStore, silentStore, privacyShutdownStore, proximityMeetingStore],
    ([$inJitsiStore, $inBbbStore, $silentStore, $privacyShutdownStore, $proximityMeetingStore]) => {
        if ($inJitsiStore) return AvailabilityStatus.JITSI;
        if ($inBbbStore) return AvailabilityStatus.BBB;
        if (!$proximityMeetingStore) return AvailabilityStatus.DENY_PROXIMITY_MEETING;
        if ($silentStore) return AvailabilityStatus.SILENT;
        if ($privacyShutdownStore) return AvailabilityStatus.AWAY;
        return AvailabilityStatus.ONLINE;
    },
    AvailabilityStatus.ONLINE
);

export const videoConstraintStore = createVideoConstraintStore();

/**
 * A store that contains video constraints.
 */
function createAudioConstraintStore() {
    const { subscribe, update } = writable({
        //TODO: make these values configurable in the game settings menu and store them in localstorage
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: true,
    } as boolean | MediaTrackConstraints);
    return {
        subscribe,
        setDeviceId: (deviceId: string | undefined) =>
            update((constraints) => {
                if (typeof constraints === "boolean") {
                    constraints = {};
                }
                if (deviceId !== undefined && navigator.mediaDevices.getSupportedConstraints().deviceId === true) {
                    constraints.deviceId = { exact: deviceId };
                } else {
                    delete constraints.deviceId;
                }
                return constraints;
            }),
    };
}

export const audioConstraintStore = createAudioConstraintStore();

let timeout: NodeJS.Timeout;

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
        ],
        set
    ) => {
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
            //this optimization is desactivated because of sound issues on chrome
            //todo: fix this conflicts and reactivate this optimization
            //currentAudioConstraint = false;
        }

        if (
            $availabilityStatusStore === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            $availabilityStatusStore === AvailabilityStatus.SILENT
        ) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Let's make the changes only if the new value is different from the old one.tile
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

            if (timeout) {
                clearTimeout(timeout);
            }

            // Let's wait a little bit to avoid sending too many constraint changes.
            timeout = setTimeout(() => {
                set({
                    video: currentVideoConstraint,
                    audio: currentAudioConstraint,
                });
            }, 100);
        }

        if ($enableCameraSceneVisibilityStore) {
            localUserStore.setCameraSetup(
                JSON.stringify({
                    video: currentVideoConstraint,
                    audio: currentAudioConstraint,
                })
            );
        }
    },
    {
        video: false,
        audio: false,
    } as MediaStreamConstraints
);

export type LocalStreamStoreValue = StreamSuccessValue | StreamErrorValue;

interface StreamSuccessValue {
    type: "success";
    stream: MediaStream | null;
}

interface StreamErrorValue {
    type: "error";
    error: Error;
}

let currentStream: MediaStream | null = null;
let oldConstraints = { video: false, audio: false };
//only firefox correctly implements the 'enabled' track  property, on chrome we have to stop the track then reinstantiate the stream
const implementCorrectTrackBehavior = getNavigatorType() === NavigatorType.firefox;

/**
 * Stops the camera from filming
 */
async function applyCameraConstraints(
    currentStream: MediaStream | null,
    constraints: MediaTrackConstraints | boolean
): Promise<void[]> {
    if (!currentStream) {
        return [];
    }
    return Promise.all(currentStream.getVideoTracks().map((track) => toggleConstraints(track, constraints)));
}

/**
 * Stops the microphone from listening
 */
async function applyMicrophoneConstraints(
    currentStream: MediaStream | null,
    constraints: MediaTrackConstraints | boolean
): Promise<void[]> {
    if (!currentStream) {
        return [];
    }
    return Promise.all(currentStream.getAudioTracks().map((track) => toggleConstraints(track, constraints)));
}

async function toggleConstraints(track: MediaStreamTrack, constraints: MediaTrackConstraints | boolean): Promise<void> {
    if (implementCorrectTrackBehavior) {
        track.enabled = constraints !== false;
    } else if (constraints === false) {
        track.stop();
    }

    if (typeof constraints !== "boolean") {
        return track.applyConstraints(constraints);
    }
}

// This promise is important to queue the calls to "getUserMedia"
// Otherwise, this can happen:
// User requests a start then a stop of the camera quickly
// The promise to start the cam starts. Before the promise is fulfilled, the camera is stopped.
// Then, the MediaStream of the camera start resolves (resulting in the LED being turned on instead of off)
let currentGetUserMediaPromise: Promise<MediaStream | undefined> = Promise.resolve(undefined);

/**
 * A store containing the MediaStream object (or null if nothing requested, or Error if an error occurred)
 */
export const localStreamStore = derived<Readable<MediaStreamConstraints>, LocalStreamStoreValue>(
    mediaStreamConstraintsStore,
    ($mediaStreamConstraintsStore, set) => {
        const constraints = { ...$mediaStreamConstraintsStore };

        function initStream(constraints: MediaStreamConstraints): Promise<MediaStream | undefined> {
            currentGetUserMediaPromise = currentGetUserMediaPromise.then(() => {
                return navigator.mediaDevices
                    .getUserMedia(constraints)
                    .then((stream) => {
                        // Close old stream
                        if (currentStream) {
                            //we need stop all tracks to make sure the old stream will be garbage collected
                            currentStream.getTracks().forEach((t) => t.stop());
                        }

                        currentStream = stream;
                        set({
                            type: "success",
                            stream: currentStream,
                        });
                        return stream;
                    })
                    .catch((e) => {
                        if (constraints.video !== false || constraints.audio !== false) {
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
                            if (constraints.video !== false) {
                                requestedCameraState.disableWebcam();
                            }
                            if (constraints.audio !== false) {
                                requestedMicrophoneState.disableMicrophone();
                            }
                        } else if (!constraints.video && !constraints.audio) {
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
                    });
            });
            return currentGetUserMediaPromise;
        }

        if (navigator.mediaDevices === undefined) {
            if (window.location.protocol === "http:") {
                //throw new Error('Unable to access your camera or microphone. You need to use a HTTPS connection.');
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

        if (currentStream === null) {
            // we need to assign a first value to the stream because getUserMedia is async
            set({
                type: "success",
                stream: null,
            });
        }

        (async () => {
            let applyNewConstraintSuccess = true;
            try {
                await applyMicrophoneConstraints(currentStream, constraints.audio || false);
            } catch (err) {
                console.error("applyMicrophoneConstraints => error :", err);
                applyNewConstraintSuccess = false;
            }
            try {
                await applyCameraConstraints(currentStream, constraints.video || false);
            } catch (err) {
                console.error("applyCameraConstraints => error :", err);
                applyNewConstraintSuccess = false;
            }

            if (implementCorrectTrackBehavior && applyNewConstraintSuccess) {
                //on good navigators like firefox, we can instantiate the stream once and simply disable or enable the tracks as needed
                if (currentStream === null) {
                    initStream(constraints).catch((e) => {
                        set({
                            type: "error",
                            error: e instanceof Error ? e : new Error("An unknown error happened"),
                        });
                    });
                }
            } else {
                //on bad navigators like chrome, we have to stop the tracks when we mute and reinstantiate the stream when we need to unmute
                if (constraints.audio === false && constraints.video === false) {
                    currentGetUserMediaPromise = currentGetUserMediaPromise.then(() => {
                        if (currentStream) {
                            //we need stop all tracks to make sure the old stream will be garbage collected
                            currentStream.getTracks().forEach((t) => t.stop());
                        }

                        currentStream = null;
                        set({
                            type: "success",
                            stream: null,
                        });
                        return undefined;
                    });
                } //we reemit the stream if it was muted just to be sure
                else if (
                    constraints.audio /* && !oldConstraints.audio*/ ||
                    (!oldConstraints.video && constraints.video) ||
                    !deepEqual(oldConstraints.audio, constraints.audio) ||
                    !deepEqual(oldConstraints.video, constraints.video)
                ) {
                    initStream(constraints).catch((e) => {
                        set({
                            type: "error",
                            error: e instanceof Error ? e : new Error("An unknown error happened"),
                        });
                    });
                }
                oldConstraints = {
                    video: !!constraints.video,
                    audio: !!constraints.audio,
                };
            }
        })().catch((e) => console.error(e));
    }
);

let obtainedMediaConstraint: ObtainedMediaStreamConstraints = {
    audio: true,
    video: true,
};
/**
 * A store containing the actual states of audio and video (activated or deactivated)
 */
export const obtainedMediaConstraintStore = derived<Readable<MediaStreamConstraints>, ObtainedMediaStreamConstraints>(
    mediaStreamConstraintsStore,
    ($mediaStreamConstraintsStore, set) => {
        const newObtainedMediaConstraint = {
            video: !!$mediaStreamConstraintsStore.video,
            audio: !!$mediaStreamConstraintsStore.audio,
        };
        if (newObtainedMediaConstraint !== obtainedMediaConstraint) {
            obtainedMediaConstraint = newObtainedMediaConstraint;
            set(obtainedMediaConstraint);
        }
    }
);

export const localVolumeStore = readable<number[] | undefined>(undefined, (set) => {
    let timeout: ReturnType<typeof setTimeout>;
    let soundMeter: SoundMeter;
    const unsubscribe = localStreamStore.subscribe((localStreamStoreValue) => {
        clearInterval(timeout);
        if (soundMeter) {
            soundMeter.stop();
        }
        if (localStreamStoreValue.type === "error") {
            set(undefined);
            return;
        }
        const mediaStream = localStreamStoreValue.stream;

        if (mediaStream === null || mediaStream.getAudioTracks().length <= 0) {
            set(undefined);
            return;
        }
        soundMeter = new SoundMeter(mediaStream);
        let error = false;

        timeout = setInterval(() => {
            try {
                set(soundMeter.getVolume());
            } catch (err) {
                if (!error) {
                    console.error(err);
                    error = true;
                }
            }
        }, 100);
    });

    return () => {
        unsubscribe();
        clearInterval(timeout);
        if (soundMeter) {
            soundMeter.stop();
        }
    };
});

/**
 * Device list
 */
export const deviceListStore = readable<MediaDeviceInfo[]>([], function start(set) {
    let deviceListCanBeQueried = false;

    const queryDeviceList = () => {
        // Note: so far, we are ignoring any failures.
        navigator.mediaDevices
            .enumerateDevices()
            .then((mediaDeviceInfos) => {
                set(mediaDeviceInfos);
            })
            .catch((e) => {
                console.error(e);
                throw e;
            });
    };

    const unsubscribe = localStreamStore.subscribe((streamResult) => {
        if (streamResult.type === "success" && streamResult.stream !== null) {
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
    return $deviceListStore.filter((device) => device.kind === "videoinput");
});

export const microphoneListStore = derived(deviceListStore, ($deviceListStore) => {
    return $deviceListStore.filter((device) => device.kind === "audioinput");
});

export const speakerListStore = derived(deviceListStore, ($deviceListStore) => {
    const audiooutput = $deviceListStore.filter((device) => device.kind === "audiooutput");
    // if the previous speaker used isn`t defined in the list, apply default speaker
    const value = audiooutput.find((device) => device.deviceId === get(speakerSelectedStore));
    if (value == undefined && audiooutput.length > 0) {
        speakerSelectedStore.set(audiooutput[0].deviceId);
    } else {
        speakerSelectedStore.set(undefined);
    }
    return audiooutput;
});
export const speakerSelectedStore = writable<string | undefined>();

function isConstrainDOMStringParameters(param: ConstrainDOMString): param is ConstrainDOMStringParameters {
    return (
        typeof param === "object" &&
        ((param as ConstrainDOMStringParameters).ideal !== undefined ||
            (param as ConstrainDOMStringParameters).exact !== undefined)
    );
}

// TODO: detect the new webcam and automatically switch on it.
cameraListStore.subscribe((devices) => {
    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(videoConstraintStore);
    const deviceId = constraints.deviceId;
    if (!deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    if (isConstrainDOMStringParameters(deviceId)) {
        if (!devices.find((device) => device.deviceId === deviceId.exact)) {
            videoConstraintStore.setDeviceId(undefined);
        }
    }
});

microphoneListStore.subscribe((devices) => {
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
            audioConstraintStore.setDeviceId(undefined);
        }
    }
});

localStreamStore.subscribe((streamResult) => {
    if (streamResult.type === "error") {
        if (streamResult.error.name === BrowserTooOldError.NAME || streamResult.error.name === WebviewOnOldIOS.NAME) {
            errorStore.addErrorMessage(streamResult.error);
        }
    }
});

// When the stream is initialized, the new sound constraint is recreated and the first speaker is set.
// If the user did not select the new speaker, the first new speaker cannot be selected automatically.
speakerSelectedStore.subscribe((value) => {
    const oldValue = localUserStore.getSpeakerDeviceId();
    const currentValue = value;
    const oldDevice = oldValue
        ? get(speakerListStore).find((mediaDeviceInfo) => mediaDeviceInfo.deviceId == oldValue)
        : null;
    if (
        oldDevice != undefined &&
        currentValue !== oldDevice.deviceId &&
        get(speakerListStore).find((value) => value.deviceId == oldValue)
    )
        speakerSelectedStore.set(oldDevice.deviceId);
});

requestedCameraState.subscribe((requestedCameraState) => {
    if (!requestedCameraState && !get(requestedMicrophoneState)) {
        megaphoneEnabledStore.set(false);
    }
});

requestedMicrophoneState.subscribe((requestedMicrophoneState) => {
    if (!requestedMicrophoneState && !get(requestedCameraState)) {
        megaphoneEnabledStore.set(false);
    }
});
