import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { requestedScreenSharingState } from "./ScreenSharingStore";

export const currentLiveStreamingSpaceStore = writable<SpaceInterface | undefined>();
export const megaphoneCanBeUsedStore = writable<boolean>(false);

export const requestedMegaphoneStore = writable<boolean>(false);

/**
 * The space in which the local user was given the floor after raising their hand.
 * When set, the local user has been promoted to speaker by a host and the "give back the floor" control is
 * shown so they can hand the floor back themselves. Cleared when they give it back, when a host revokes it,
 * or when they leave the space.
 */
export const givenFloorSpaceStore = writable<SpaceInterface | undefined>(undefined);

export interface MegaphoneSpaceSettings {
    spaceName: string;
    audienceVideoFeedbackActivated: boolean;
    canRecord: boolean;
}

// A store that contains everything needed to connect to the megaphone space.
export const megaphoneSpaceSettingsStore = writable<MegaphoneSpaceSettings | undefined>(undefined);
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
        set,
    ) => {
        set(
            $isSpeakerStore ||
                ($requestedMegaphoneStore &&
                    ($requestedCameraState || $requestedMicrophoneState || $requestedScreenSharingState)),
        );
        if (
            $requestedMegaphoneStore &&
            !$requestedCameraState &&
            !$requestedMicrophoneState &&
            !$requestedScreenSharingState
        ) {
            requestedMegaphoneStore.set(false);
        }
    },
);
