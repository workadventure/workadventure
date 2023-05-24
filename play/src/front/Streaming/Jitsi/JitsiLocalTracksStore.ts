// This store is in charge of returning Jitsi local tracks (video, audio, desktop)
// Those tracks should be fetched when:
// - a webcam or microphone is up
// - at least one Jitsi conference requires to be broadcast

import { derived, Readable } from "svelte/store";
// eslint-disable-next-line import/no-unresolved
import { CreateLocalTracksOptions } from "lib-jitsi-meet/types/hand-crafted/JitsiMeetJS";
import { failure, Result, success } from "@workadventure/map-editor";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { jitsiConferencesStore } from "./JitsiConferencesStore";
import { DeviceType } from "./JitsiConferenceWrapper";
import { JitsiLocalTracks } from "./JitsiLocalTracks";

/**
 * This stores is aggregating the broadcastDevicesStore of all Jitsi conferences.
 */
const requestedJitsiDevicesStore = jitsiConferencesStore.getAggregatedStore(
    (jitsiConference) => jitsiConference.broadcastDevicesStore,
    ($broadcastDevicesStores) => {
        const allDevices = new Set<DeviceType>();
        for (const devices of $broadcastDevicesStores) {
            for (const device of devices) {
                allDevices.add(device);
            }
        }
        return allDevices;
    }
);

/**
 * A store containing a list of devices options (to be passed to JitsiMeetJS.createLocalTracks)
 */
export const jitsiDevicesStore = derived(
    [requestedJitsiDevicesStore, requestedCameraState, requestedMicrophoneState],
    ([$requestedJitsiDevicesStore, $requestedCameraState, $requestedMicrophoneState]) => {
        if ($requestedJitsiDevicesStore === undefined) {
            return new Set<DeviceType>();
        }
        const devices = structuredClone($requestedJitsiDevicesStore);
        if (!$requestedCameraState) {
            devices.delete("video");
        }
        if (!$requestedMicrophoneState) {
            devices.delete("audio");
        }

        // TODO: TAKE INTO ACCOUNT CAMERA AND MICROPHONES CHANGING
        // TODO: TAKE INTO ACCOUNT CAMERA AND MICROPHONES CHANGING
        // TODO: TAKE INTO ACCOUNT CAMERA AND MICROPHONES CHANGING
        // TODO: TAKE INTO ACCOUNT CAMERA AND MICROPHONES CHANGING

        return devices;
    }
);

const tracks: JitsiLocalTracks = {
    audio: undefined,
    video: undefined,
    screenSharing: undefined,
};
let oldDevices: Set<DeviceType> = new Set();

export const jitsiLocalTracksStore = derived<Readable<Set<DeviceType>>, Result<JitsiLocalTracks, Error> | undefined>(
    jitsiDevicesStore,
    ($jitsiDevicesStore, set) => {
        const JitsiMeetJS = window.JitsiMeetJS;

        (async (): Promise<JitsiLocalTracks> => {
            const requestedDevices: DeviceType[] = [];

            if (oldDevices.has("audio") && !$jitsiDevicesStore.has("audio")) {
                // await tracks.audio?.dispose();
                tracks.audio = undefined;
            } else if (!oldDevices.has("audio") && $jitsiDevicesStore.has("audio")) {
                requestedDevices.push("audio");
            }

            if (oldDevices.has("video") && !$jitsiDevicesStore.has("video")) {
                await tracks.video?.dispose();
                tracks.video = undefined;
            } else if (!oldDevices.has("video") && $jitsiDevicesStore.has("video")) {
                requestedDevices.push("video");
            }

            if (oldDevices.has("desktop") && !$jitsiDevicesStore.has("desktop")) {
                await tracks.screenSharing?.dispose();
                tracks.screenSharing = undefined;
            } else if (!oldDevices.has("desktop") && $jitsiDevicesStore.has("desktop")) {
                requestedDevices.push("desktop");
            }

            if (requestedDevices.length > 0) {
                const newTracks = await JitsiMeetJS.createLocalTracks({ devices: requestedDevices });
                if (!(newTracks instanceof Array)) {
                    // newTracks is a JitsiConferenceError
                    throw newTracks;
                }

                for (const track of newTracks) {
                    if (track.isAudioTrack()) {
                        tracks.audio = track;
                    } else if (track.isVideoTrack()) {
                        tracks.video = track;
                    } else if (track.isScreenSharing()) {
                        tracks.screenSharing = track;
                    }
                }
            }
            oldDevices = structuredClone($jitsiDevicesStore);
            return tracks;
        })()
            .then((newTracks) => set(success(newTracks)))
            .catch((e) => {
                console.error("jitsiLocalTracksStore", e);
                set(failure(e));
            });
    }
);

export function createJitsiLocalTrackStore(options: CreateLocalTracksOptions, enableStore: Readable<boolean>) {
    return derived([enableStore, requestedJitsiDevicesStore], ([$enableStore, $requestedJitsiDevicesStore]) => {});
}
