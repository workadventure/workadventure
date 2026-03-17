import type { Writable } from "svelte/store";
import { writable } from "svelte/store";

/**
 * Device ID for which the microphone is considered working (validated).
 * Set when sound is detected from the mic or when the user dismisses the "no sound" warning.
 * Reset when switching between WebRTC and LiveKit so the new path must reconfirm the mic works.
 * When set and matching usedMicrophoneDeviceIdStore, the "no microphone sound" toast is not shown.
 */
export const microphoneValidatedForDeviceIdStore: Writable<string | undefined> = writable(undefined);
