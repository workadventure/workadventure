import { writable } from "svelte/store";
import { supportsAudioOutputSelection } from "livekit-client";
import { localUserStore } from "../Connection/LocalUserStore";

/**
 * Whether we choose the audio output at all.
 *
 * Not on WebKit (Safari, every iOS browser): it rejects HTMLMediaElement.setSinkId outside a user gesture
 * (SpeakerSelectionRequiresUserGesture), so every voice joining later would fail to apply the choice and play on the
 * system output anyway. There, voices and interface sounds both follow the system output. livekit-client draws the
 * same line, and also rules out browsers without setSinkId. Unlike isSafari(), it never throws on an unknown user agent.
 */
export const speakerSelectionSupported = supportsAudioOutputSelection();

function createSpeakerSelectedStore() {
    const { subscribe, set } = writable<string | undefined>(
        speakerSelectionSupported ? (localUserStore.getSpeakerDeviceId() ?? undefined) : undefined,
    );
    return {
        subscribe,
        // The single guard every writer goes through: device list, "new device" bubble, menus, error fallback
        set(deviceId: string | undefined) {
            if (speakerSelectionSupported) {
                set(deviceId);
            }
        },
    };
}

/**
 * The output voices play on. Always undefined where speaker selection is not supported, so that nothing calls setSinkId.
 *
 * Kept out of MediaStore so that it can be loaded on its own, without MediaStore's import cycles.
 */
export const speakerSelectedStore = createSpeakerSelectedStore();
