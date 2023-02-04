// This store is in charge of returning Jitsi local tracks (video, audio, desktop)
// Those tracks should be fetched when:
// - a webcam or microphone is up
// - at least one Jitsi conference requires to be broadcast

import { derived, Readable } from "svelte/store";
import { jitsiConferencesStore } from "./JitsiConferencesStore";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { DeviceType } from "./JitsiConferenceWrapper";
import { failure, Result, success } from "@workadventure/map-editor";
import { CreateLocalTracksOptions } from "lib-jitsi-meet/types/hand-crafted/JitsiMeetJS";
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
export const jitsiDeviceOptionsStore = derived(
    [requestedJitsiDevicesStore, requestedCameraState, requestedMicrophoneState],
    ([$requestedJitsiDevicesStore, $requestedCameraState, $requestedMicrophoneState]) => {
        if ($requestedJitsiDevicesStore === undefined) {
            return undefined;
        }
        const devices = structuredClone($requestedJitsiDevicesStore) ;
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

        return {
            devices: Array.from(devices.values()),
        };
    }
);

const tracks = new JitsiLocalTracks([]);

export const jitsiLocalTracksStore = derived<
    Readable<CreateLocalTracksOptions | undefined>,
    Result<JitsiLocalTracks, Error> | undefined
>(jitsiDeviceOptionsStore, ($jitsiDeviceOptionsStore, set) => {
    const JitsiMeetJS = window.JitsiMeetJS;

    if ($jitsiDeviceOptionsStore === undefined) {
        tracks.audio?.dispose().catch((e) => console.error("Could not dispose track: ", e));
        tracks.video?.dispose().catch((e) => console.error("Could not dispose track: ", e));
        tracks.screenSharing?.dispose().catch((e) => console.error("Could not dispose track: ", e));

        set(success(new JitsiLocalTracks([])));
        return;
    }

    JitsiMeetJS.createLocalTracks($jitsiDeviceOptionsStore)
        .then((newTracks) => {
            if (!(newTracks instanceof Array)) {
                // newTracks is a JitsiConferenceError
                throw newTracks;
            }

            const newTracksObj = new JitsiLocalTracks(newTracks);

            if (newTracksObj.audio !== tracks.audio) {
                tracks.audio?.dispose().catch((e) => console.error("Could not dispose track: ", e));
            }
            if (newTracksObj.video !== tracks.video) {
                tracks.video?.dispose().catch((e) => console.error("Could not dispose track: ", e));
            }
            if (newTracksObj.screenSharing !== tracks.screenSharing) {
                tracks.screenSharing?.dispose().catch((e) => console.error("Could not dispose track: ", e));
            }

            set(success(newTracksObj));
        })
        .catch((e) => set(failure(e)));
});
