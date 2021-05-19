import {derived, get, Readable, readable, writable, Writable} from "svelte/store";
import {peerStore} from "./PeerStore";
import {localUserStore} from "../Connexion/LocalUserStore";
import {ITiledMapGroupLayer, ITiledMapObjectLayer, ITiledMapTileLayer} from "../Phaser/Map/ITiledMap";

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
 * A store containing whether the current page is visible or not.
 */
export const visibilityStore = readable(document.visibilityState === 'visible', function start(set) {
    const onVisibilityChange = () => {
        set(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return function stop() {
        document.removeEventListener('visibilitychange', onVisibilityChange);
    };
});

/**
 * A store that contains whether the game overlay is shown or not.
 * Typically, the overlay is hidden when entering Jitsi meet.
 */
function createGameOverlayVisibilityStore() {
    const { subscribe, set, update } = writable(false);

    return {
        subscribe,
        showGameOverlay: () => set(true),
        hideGameOverlay: () => set(false),
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
export const gameOverlayVisibilityStore = createGameOverlayVisibilityStore();
export const enableCameraSceneVisibilityStore = createEnableCameraSceneVisibilityStore();

/**
 * A store that contains "true" if the webcam should be stopped for privacy reasons - i.e. if the the user left the the page while not in a discussion.
 */
function createPrivacyShutdownStore() {
    let privacyEnabled = false;

    const { subscribe, set, update } = writable(privacyEnabled);

    visibilityStore.subscribe((isVisible) => {
        if (!isVisible && get(peerStore).size === 0) {
            privacyEnabled = true;
            set(true);
        }
        if (isVisible) {
            privacyEnabled = false;
            set(false);
        }
    });

    peerStore.subscribe((peers) => {
        if (peers.size === 0 && get(visibilityStore) === false) {
            privacyEnabled = true;
            set(true);
        }
    });


    return {
        subscribe,
    };
}

export const privacyShutdownStore = createPrivacyShutdownStore();

/**
 * A store that contains video constraints.
 */
function createVideoConstraintStore() {
    const { subscribe, set, update } = writable({
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 400, ideal: 720 },
        frameRate: { ideal: localUserStore.getVideoQualityValue() },
        facingMode: "user",
        resizeMode: 'crop-and-scale',
        aspectRatio: 1.777777778
    } as MediaTrackConstraints);

    return {
        subscribe,
        setDeviceId: (deviceId: string) => update((constraints) => {
            constraints.deviceId = {
                exact: deviceId
            };

            return constraints;
        }),
        setFrameRate: (frameRate: number) => update((constraints) => {
            constraints.frameRate = { ideal: frameRate };

            return constraints;
        })
    };
}

export const videoConstraintStore = createVideoConstraintStore();

/**
 * A store that contains video constraints.
 */
function createAudioConstraintStore() {
    const { subscribe, set, update } = writable({
        //TODO: make these values configurable in the game settings menu and store them in localstorage
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: true
    } as boolean|MediaTrackConstraints);

    let selectedDeviceId = null;

    return {
        subscribe,
        setDeviceId: (deviceId: string) => update((constraints) => {
            selectedDeviceId = deviceId;

            if (typeof(constraints) === 'boolean') {
                constraints = {}
            }
            constraints.deviceId = {
                exact: selectedDeviceId
            };

            return constraints;
        })
    };
}

export const audioConstraintStore = createAudioConstraintStore();


let timeout: NodeJS.Timeout;

let previousComputedVideoConstraint: boolean|MediaTrackConstraints = false;
let previousComputedAudioConstraint: boolean|MediaTrackConstraints = false;

/**
 * A store containing the media constraints we want to apply.
 */
export const mediaStreamConstraintsStore = derived(
    [
        requestedCameraState,
        requestedMicrophoneState,
        gameOverlayVisibilityStore,
        enableCameraSceneVisibilityStore,
        videoConstraintStore,
        audioConstraintStore,
        privacyShutdownStore,
    ], (
        [
            $requestedCameraState,
            $requestedMicrophoneState,
            $gameOverlayVisibilityStore,
            $enableCameraSceneVisibilityStore,
            $videoConstraintStore,
            $audioConstraintStore,
            $privacyShutdownStore,
        ], set
    ) => {

    let currentVideoConstraint: boolean|MediaTrackConstraints = $videoConstraintStore;
    let currentAudioConstraint: boolean|MediaTrackConstraints = $audioConstraintStore;

    if ($enableCameraSceneVisibilityStore) {
        set({
            video: currentVideoConstraint,
            audio: currentAudioConstraint,
        });
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
    if ($gameOverlayVisibilityStore === false) {
        currentVideoConstraint = false;
        currentAudioConstraint = false;
    }

    // Disable webcam for privacy reasons (the game is not visible and we were talking to noone)
    if ($privacyShutdownStore === true) {
        currentVideoConstraint = false;
    }

    // Let's make the changes only if the new value is different from the old one.
    if (previousComputedVideoConstraint != currentVideoConstraint || previousComputedAudioConstraint != currentAudioConstraint) {
        previousComputedVideoConstraint = currentVideoConstraint;
        previousComputedAudioConstraint = currentAudioConstraint;
        // Let's copy the objects.
        if (typeof previousComputedVideoConstraint !== 'boolean') {
            previousComputedVideoConstraint = {...previousComputedVideoConstraint};
        }
        if (typeof previousComputedAudioConstraint !== 'boolean') {
            previousComputedAudioConstraint = {...previousComputedAudioConstraint};
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
}, {
    video: false,
    audio: false
} as MediaStreamConstraints);

export type LocalStreamStoreValue = StreamSuccessValue | StreamErrorValue;

interface StreamSuccessValue {
    type: "success",
    stream: MediaStream|null,
    // The constraints that we got (and not the one that have been requested)
    constraints: MediaStreamConstraints
}

interface StreamErrorValue {
    type: "error",
    error: Error,
    constraints: MediaStreamConstraints
}

let currentStream : MediaStream|null = null;

/**
 * Stops the camera from filming
 */
function stopCamera(): void {
    if (currentStream) {
        for (const track of currentStream.getVideoTracks()) {
            track.stop();
        }
    }
}

/**
 * Stops the microphone from listening
 */
function stopMicrophone(): void {
    if (currentStream) {
        for (const track of currentStream.getAudioTracks()) {
            track.stop();
        }
    }
}

/**
 * A store containing the MediaStream object (or null if nothing requested, or Error if an error occurred)
 */
export const localStreamStore = derived<Readable<MediaStreamConstraints>, LocalStreamStoreValue>(mediaStreamConstraintsStore, ($mediaStreamConstraintsStore, set) => {
    const constraints = { ...$mediaStreamConstraintsStore };

    if (navigator.mediaDevices === undefined) {
        if (window.location.protocol === 'http:') {
            //throw new Error('Unable to access your camera or microphone. You need to use a HTTPS connection.');
            set({
                type: 'error',
                error: new Error('Unable to access your camera or microphone. You need to use a HTTPS connection.'),
                constraints
            });
        } else {
            //throw new Error('Unable to access your camera or microphone. Your browser is too old.');
            set({
                type: 'error',
                error: new Error('Unable to access your camera or microphone. Your browser is too old.'),
                constraints
            });
        }
    }

    if (constraints.audio === false) {
        stopMicrophone();
    }
    if (constraints.video === false) {
        stopCamera();
    }

    if (constraints.audio === false && constraints.video === false) {
        currentStream = null;
        set({
            type: 'success',
            stream: null,
            constraints
        });
        return;
    }

    (async () => {
        try {
            stopMicrophone();
            stopCamera();
            currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            set({
                type: 'success',
                stream: currentStream,
                constraints
            });
            return;
        } catch (e) {
            if (constraints.video !== false) {
                console.info("Error. Unable to get microphone and/or camera access. Trying audio only.", $mediaStreamConstraintsStore, e);
                // TODO: does it make sense to pop this error when retrying?
                set({
                    type: 'error',
                    error: e,
                    constraints
                });
                // Let's try without video constraints
                requestedCameraState.disableWebcam();
            } else {
                console.info("Error. Unable to get microphone and/or camera access.", $mediaStreamConstraintsStore, e);
                set({
                    type: 'error',
                    error: e,
                    constraints
                });
            }

            /*constraints.video = false;
            if (constraints.audio === false) {
                console.info("Error. Unable to get microphone and/or camera access.", $mediaStreamConstraintsStore, e);
                set({
                    type: 'error',
                    error: e,
                    constraints
                });
                // Let's make as if the user did not ask.
                requestedCameraState.disableWebcam();
            } else {
                console.info("Error. Unable to get microphone and/or camera access. Trying audio only.", $mediaStreamConstraintsStore, e);
                try {
                    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                    set({
                        type: 'success',
                        stream: currentStream,
                        constraints
                    });
                    return;
                } catch (e2) {
                    console.info("Error. Unable to get microphone fallback access.", $mediaStreamConstraintsStore, e2);
                    set({
                        type: 'error',
                        error: e,
                        constraints
                    });
                }
            }*/
        }
    })();
});

/**
 * A store containing the real active media constrained (not the one requested by the user, but the one we got from the system)
 */
export const obtainedMediaConstraintStore = derived(localStreamStore, ($localStreamStore) => {
    return $localStreamStore.constraints;
});
