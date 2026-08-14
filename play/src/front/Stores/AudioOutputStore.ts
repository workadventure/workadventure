import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import { isIOS, isSafari } from "../WebRtc/DeviceUtils";

/**
 * The audio output selection, kept in its own leaf module on purpose.
 *
 * `AudioOutputManager` needs these stores, and it is reached from `AudioContextManager`, which
 * `MediaStore` itself pulls in through `SoundMeter`. Living in `MediaStore` would therefore close
 * an import cycle and leave stores undefined at evaluation time. Everything here must only depend
 * on leaf modules.
 */

/**
 * Whether this browser lets us pick an audio output device at all.
 *
 * Livekit does not support audio output device selection on Safari
 * Code: https://github.com/livekit/client-sdk-js/blob/dbaf7a9b784114728857a447734bc5d5453345b4/src/room/utils.ts#L144C1-L153C2
 * And it seems there is no plan to support it. Issue: https://github.com/livekit/components-js/issues/1216
 * Because the audio output selector should work in full-mesh WebRTC AND in Livekit, we have to support the same
 * features in both modes. So we disable audio output device selection on Safari here.
 */
export const speakerSelectionSupported = !isSafari() && !isIOS();

export const speakerSelectedStore = writable<string | undefined>(localUserStore.getSpeakerDeviceId() ?? undefined);

/**
 * The output device that was actually applied, as reported by `setSinkId`.
 *
 * Mirrors `usedCameraDeviceIdStore` / `usedMicrophoneDeviceIdStore`. It stays `undefined` until
 * something plays, since nothing routes audio before then; once set, a value differing from
 * `speakerSelectedStore` means the browser refused the selection and fell back.
 */
export const usedSpeakerDeviceIdStore: Writable<string | undefined> = writable();

// A freshly picked device has not been applied to anything yet. Without this reset the previous
// value would linger and read as a mismatch, so the UI would claim the browser refused a device it
// never even tried.
// This is a singleton so no need to unsubscribe
// eslint-disable-next-line svelte/no-ignored-unsubscribe
speakerSelectedStore.subscribe(() => {
    usedSpeakerDeviceIdStore.set(undefined);
});
