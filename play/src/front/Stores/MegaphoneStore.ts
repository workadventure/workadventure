import { derived, Readable, writable } from "svelte/store";
import { requestedCameraState, requestedMicrophoneState } from "./MediaStore";
export const megaphoneCanBeUsedStore = writable<boolean>(false);

export const requestedMegaphoneStore = writable<boolean>(false);

export const streamingMegaphoneStore = writable<boolean>(false);

export const megaphoneEnabledStore: Readable<boolean> = derived(
    [requestedMegaphoneStore, requestedCameraState, requestedMicrophoneState],
    ([$requestedMegaphoneStore, $requestedCameraState, $requestedMicrophoneState], set) => {
        set($requestedMegaphoneStore && ($requestedCameraState || $requestedMicrophoneState));
    }
);
