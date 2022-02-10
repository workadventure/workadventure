import { derived, get, Readable, readable, writable } from "svelte/store";
import { localUserStore } from "../Connexion/LocalUserStore";
import { userMovingStore } from "./GameStore";
import { HtmlUtils } from "../WebRtc/HtmlUtils";
import { BrowserTooOldError } from "./Errors/BrowserTooOldError";
import { errorStore } from "./ErrorStore";
import { getNavigatorType, isIOS, NavigatorType } from "../WebRtc/DeviceUtils";
import { WebviewOnOldIOS } from "./Errors/WebviewOnOldIOS";
import { myCameraVisibilityStore } from "./MyCameraStoreVisibility";
import { peerStore } from "./PeerStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { MediaStreamConstraintsError } from "./Errors/MediaStreamConstraintsError";

/**
 * A store that contains the camera state requested by the user (on or off).
 */
function createRequestedCameraState() {
    const { subscribe, set, update } = writable(true);

    return {
        subscribe,
        enableWebcam: () => set(true),
        disableWebcam: () => set(false),
    };
}

/**
 * A store that contains the microphone state requested by the user (on or off).
 */
function createRequestedMicrophoneState() {
    const { subscribe, set, update } = writable(true);

    return {
        subscribe,
        enableMicrophone: () => set(true),
        disableMicrophone: () => set(false),
    };
}

/**
 * A store that contains whether the EnableCameraScene is shown or not.
 */
function createEnableCameraSceneVisibilityStore() {
    const { subscribe, set, update } = writable(false);

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
const mouseInBottomRight = readable(false, function start(set) {
    let lastInBottomRight = false;
    const gameDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("game");

    const detectInBottomRight = (event: MouseEvent) => {
        const rect = gameDiv.getBoundingClientRect();
        const inBottomRight = event.x - rect.left > (rect.width * 3) / 4 && event.y - rect.top > (rect.height * 3) / 4;
        if (inBottomRight !== lastInBottomRight) {
            lastInBottomRight = inBottomRight;
            set(inBottomRight);
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
    [userMoved5SecondsAgoStore, peerStore, enabledWebCam10secondsAgoStore, mouseInBottomRight],
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
    const { subscribe, set, update } = writable({
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

/**
 * A store containing if user is silent, so if he is in silent zone. This permit to show et hide camera of user
 */
export const isSilentStore = writable(false);

export const videoConstraintStore = createVideoConstraintStore();

/**
 * A store that contains video constraints.
 */
function createAudioConstraintStore() {
    const { subscribe, set, update } = writable({
        //TODO: make these values configurable in the game settings menu and store them in localstorage
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: true,
    } as boolean | MediaTrackConstraints);

    let selectedDeviceId = null;

    return {
        subscribe,
        setDeviceId: (deviceId: string | undefined) =>
            update((constraints) => {
                selectedDeviceId = deviceId;

                if (typeof constraints === "boolean") {
                    constraints = {};
                }
                if (deviceId !== undefined) {
                    constraints.deviceId = {
                        exact: selectedDeviceId,
                    };
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
        myCameraVisibilityStore,
        enableCameraSceneVisibilityStore,
        videoConstraintStore,
        audioConstraintStore,
        privacyShutdownStore,
        cameraEnergySavingStore,
        isSilentStore,
    ],
    (
        [
            $requestedCameraState,
            $requestedMicrophoneState,
            $myCameraVisibilityStore,
            $enableCameraSceneVisibilityStore,
            $videoConstraintStore,
            $audioConstraintStore,
            $privacyShutdownStore,
            $cameraEnergySavingStore,
            $isSilentStore,
        ],
        set
    ) => {
        let currentVideoConstraint: boolean | MediaTrackConstraints = $videoConstraintStore;
        let currentAudioConstraint: boolean | MediaTrackConstraints = $audioConstraintStore;

        if ($enableCameraSceneVisibilityStore) {
            set({
                video: currentVideoConstraint,
                audio: currentAudioConstraint,
            });
            localUserStore.setCameraSetup(
                JSON.stringify({
                    video: currentVideoConstraint,
                    audio: currentAudioConstraint,
                })
            );
            return;
        }

        // Disable webcam if the user requested so
        if ($requestedCameraState === false) {
            currentVideoConstraint = false;
        }

        // Disable microphone if the user requested so
        if ($requestedMicrophoneState === false) {
            currentAudioConstraint = false;
        }

        // Disable webcam and microphone when in a Jitsi
        if ($myCameraVisibilityStore === false) {
            currentVideoConstraint = false;
            currentAudioConstraint = false;
        }

        // Disable webcam for privacy reasons (the game is not visible and we were talking to no one)
        if ($privacyShutdownStore === true) {
            currentVideoConstraint = false;
        }

        // Disable webcam for energy reasons (the user is not moving and we are talking to no one)
        if ($cameraEnergySavingStore === true) {
            currentVideoConstraint = false;
            //this optimization is desactivated because of sound issues on chrome
            //todo: fix this conflicts and reactivate this optimization
            //currentAudioConstraint = false;
        }

        if ($isSilentStore === true) {
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

    if (typeof constraints !== "boolean" && constraints !== true) {
        return track.applyConstraints(constraints);
    }
}

/**
 * A store containing the MediaStream object (or null if nothing requested, or Error if an error occurred)
 */
export const localStreamStore = derived<Readable<MediaStreamConstraints>, LocalStreamStoreValue>(
    mediaStreamConstraintsStore,
    ($mediaStreamConstraintsStore, set) => {
        const constraints = { ...$mediaStreamConstraintsStore };

        async function initStream(constraints: MediaStreamConstraints) {
            try {
                if (currentStream) {
                    //we need stop all tracks to make sure the old stream will be garbage collected
                    //currentStream.getTracks().forEach((t) => t.stop());
                }
                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                set({
                    type: "success",
                    stream: currentStream,
                });
                return;
            } catch (e) {
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
            }
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

        applyMicrophoneConstraints(currentStream, constraints.audio || false).catch((e) => console.error(e));
        applyCameraConstraints(currentStream, constraints.video || false).catch((e) => console.error(e));

        if (implementCorrectTrackBehavior) {
            //on good navigators like firefox, we can instantiate the stream once and simply disable or enable the tracks as needed
            if (currentStream === null) {
                // we need to assign a first value to the stream because getUserMedia is async
                set({
                    type: "success",
                    stream: null,
                });
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
                currentStream = null;
                set({
                    type: "success",
                    stream: null,
                });
            } //we reemit the stream if it was muted just to be sure
            else if (constraints.audio /* && !oldConstraints.audio*/ || (!oldConstraints.video && constraints.video)) {
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
    }
);

export interface ObtainedMediaStreamConstraints {
    video: boolean;
    audio: boolean;
}

let obtainedMediaConstraint: ObtainedMediaStreamConstraints = {
    audio: false,
    video: false,
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

// TODO: detect the new webcam and automatically switch on it.
cameraListStore.subscribe((devices) => {
    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(videoConstraintStore);
    if (!constraints.deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    // @ts-ignore
    if (!devices.find((device) => device.deviceId === constraints.deviceId.exact)) {
        videoConstraintStore.setDeviceId(undefined);
    }
});

microphoneListStore.subscribe((devices) => {
    // If the selected camera is unplugged, let's remove the constraint on deviceId
    const constraints = get(audioConstraintStore);
    if (typeof constraints === "boolean") {
        return;
    }
    if (!constraints.deviceId) {
        return;
    }

    // If we cannot find the device ID, let's remove it.
    // @ts-ignore
    if (!devices.find((device) => device.deviceId === constraints.deviceId.exact)) {
        audioConstraintStore.setDeviceId(undefined);
    }
});

localStreamStore.subscribe((streamResult) => {
    if (streamResult.type === "error") {
        if (streamResult.error.name === BrowserTooOldError.NAME || streamResult.error.name === WebviewOnOldIOS.NAME) {
            errorStore.addErrorMessage(streamResult.error);
        }
    }
});
