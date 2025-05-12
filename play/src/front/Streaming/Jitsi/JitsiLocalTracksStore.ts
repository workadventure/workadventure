// This store is in charge of returning Jitsi local tracks (video, audio, desktop)
// Those tracks should be fetched when:
// - a webcam or microphone is up
// - at least one Jitsi conference requires to be broadcast

import { derived, Readable } from "svelte/store";

import { CreateLocalTracksOptions } from "lib-jitsi-meet/types/hand-crafted/JitsiMeetJS";
import { failure, Result, success } from "@workadventure/map-editor";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { DeviceBroadcastable } from "../Common/ConferenceWrapper";
import { jitsiConferencesStore } from "./JitsiConferencesStore";
import { JitsiLocalTracks } from "./JitsiLocalTracks";

/**
 * This stores is aggregating the broadcastDevicesStore of all Jitsi conferences.
 */
const requestedJitsiDevicesStore = jitsiConferencesStore.getAggregatedStore(
    (jitsiConference) => jitsiConference.broadcastDevicesStore,
    ($broadcastDevicesStores) => {
        const allDevices = new Set<DeviceBroadcastable>();
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
            return new Set<DeviceBroadcastable>();
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
let oldDevicesPromise: Promise<Set<DeviceBroadcastable>> = Promise.resolve(new Set());

export const jitsiLocalTracksStore = derived<
    Readable<Set<DeviceBroadcastable>>,
    Result<JitsiLocalTracks, Error> | undefined
>(jitsiDevicesStore, ($jitsiDevicesStore, set) => {
    const JitsiMeetJS = window.JitsiMeetJS;

    oldDevicesPromise = oldDevicesPromise.then(async (oldDevices) => {
        const requestedDevices: DeviceBroadcastable[] = [];

        if (oldDevices.has("audio") && !$jitsiDevicesStore.has("audio")) {
            // await tracks.audio?.dispose();
            tracks.audio = undefined;
        } else if (!oldDevices.has("audio") && $jitsiDevicesStore.has("audio")) {
            requestedDevices.push("audio");
        }

        if (oldDevices.has("video") && !$jitsiDevicesStore.has("video")) {
            const oldVideoTrack = tracks.video;
            await tracks.video?.dispose();
            // Because of "await", we need to check again if the track is still the same
            if (oldVideoTrack === tracks.video) {
                tracks.video = undefined;
            }
        } else if (!oldDevices.has("video") && $jitsiDevicesStore.has("video")) {
            requestedDevices.push("video");
        }

        if (oldDevices.has("desktop") && !$jitsiDevicesStore.has("desktop")) {
            const oldScreenSharingTrack = tracks.screenSharing;
            await tracks.screenSharing?.dispose();

            // Because of "await", we need to check again if the track is still the same
            if (oldScreenSharingTrack === tracks.screenSharing) {
                tracks.screenSharing = undefined;
            }
        } else if (!oldDevices.has("desktop") && $jitsiDevicesStore.has("desktop")) {
            requestedDevices.push("desktop");
        }

        if (requestedDevices.length > 0) {
            const newTracks = await JitsiMeetJS.createLocalTracks({ devices: requestedDevices });
            if (!(newTracks instanceof Array)) {
                // newTracks is a JitsiConferenceError
                //   console.error("jitsiLocalTracksStore", newTracks);
                set(failure(new Error("Error when creating Jitsi local track: " + newTracks)));
                oldDevices = structuredClone($jitsiDevicesStore);
                return oldDevices;
            }

            for (const track of newTracks) {
                if (track.isAudioTrack()) {
                    tracks.audio = track;
                } else if (track.isVideoTrack()) {
                    if (track.getVideoType() === "desktop") {
                        tracks.screenSharing = track;
                    } else {
                        tracks.video = track;
                    }
                }
            }
        }
        oldDevices = structuredClone($jitsiDevicesStore);
        set(success(tracks));
        return oldDevices;
    });
});

export function createJitsiLocalTrackStore(options: CreateLocalTracksOptions, enableStore: Readable<boolean>) {
    return derived([enableStore, requestedJitsiDevicesStore], ([$enableStore, $requestedJitsiDevicesStore]) => {});
}
