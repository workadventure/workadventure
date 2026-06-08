import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState, temporaryMicrophoneState } from "./MediaStore";
import { requestedScreenSharingState } from "./ScreenSharingStore";
import { shouldKeepMegaphoneStreaming } from "./PushToTalkStore";

export const currentLiveStreamingSpaceStore = writable<SpaceInterface | undefined>();
export const megaphoneCanBeUsedStore = writable<boolean>(false);

export const requestedMegaphoneStore = writable<boolean>(false);

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
        temporaryMicrophoneState,
        requestedScreenSharingState,
    ],
    (
        [
            $isSpeakerStore,
            $requestedMegaphoneStore,
            $requestedCameraState,
            $requestedMicrophoneState,
            $temporaryMicrophoneState,
            $requestedScreenSharingState,
        ],
        set,
    ) => {
        const hasMegaphoneMedia = shouldKeepMegaphoneStreaming({
            requestedCameraState: $requestedCameraState,
            requestedMicrophoneState: $requestedMicrophoneState,
            temporaryMicrophoneState: $temporaryMicrophoneState,
            requestedScreenSharingState: $requestedScreenSharingState,
        });

        set($isSpeakerStore || ($requestedMegaphoneStore && hasMegaphoneMedia));
        if ($requestedMegaphoneStore && !hasMegaphoneMedia) {
            requestedMegaphoneStore.set(false);
        }
    },
);
