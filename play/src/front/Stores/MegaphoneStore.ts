import { derived, Readable, writable } from "svelte/store";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { requestedScreenSharingState } from "./ScreenSharingStore";

export const currentMegaphoneNameStore = writable<string | undefined>();
export const megaphoneCanBeUsedStore = writable<boolean>(false);

export const requestedMegaphoneStore = writable<boolean>(false);

export const megaphoneEnabledStore: Readable<boolean> = derived(
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
            ($isSpeakerStore || $requestedMegaphoneStore) &&
                ($requestedCameraState || $requestedMicrophoneState || $requestedScreenSharingState)
        );
        if (
            ($isSpeakerStore || $requestedMegaphoneStore) &&
            !$requestedCameraState &&
            !$requestedMicrophoneState &&
            !$requestedScreenSharingState
        ) {
            requestedMegaphoneStore.set(false);
        }
    }
);
