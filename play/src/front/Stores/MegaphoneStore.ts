import { derived, Readable, writable } from "svelte/store";
import { SpaceInterface } from "../Space/SpaceInterface";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { requestedScreenSharingState } from "./ScreenSharingStore";

export const currentLiveStreamingSpaceStore = writable<SpaceInterface | undefined>();
export const megaphoneCanBeUsedStore = writable<boolean>(false);

export const requestedMegaphoneStore = writable<boolean>(false);

export const megaphoneSpaceStore = writable<SpaceInterface | undefined>(undefined);
/**
 * This store is true if the user is livestreaming, i.e. if the user is a speaker or (if the user has requested the megaphone and is enabling its camera or microphone or screen)
 */
export const liveStreamingEnabledStore: Readable<boolean> = derived(
    [
        isSpeakerStore,
        requestedMegaphoneStore,
        requestedCameraState,
        requestedMicrophoneState,
        requestedScreenSharingState,
    ],
    (
        [
            $isSpeakerStore,
            $requestedMegaphoneStore,
            $requestedCameraState,
            $requestedMicrophoneState,
            $requestedScreenSharingState,
        ],
        set
    ) => {
        set(
            $isSpeakerStore ||
                ($requestedMegaphoneStore &&
                    ($requestedCameraState || $requestedMicrophoneState || $requestedScreenSharingState))
        );
        if (
            $requestedMegaphoneStore &&
            !$requestedCameraState &&
            !$requestedMicrophoneState &&
            !$requestedScreenSharingState
        ) {
            requestedMegaphoneStore.set(false);
        }
    }
);
