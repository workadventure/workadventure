/**
 * Microphone state, split in two:
 *  - `requestedMicrophoneState`: the on/off choice the user latches with the microphone button.
 *    Persisted to localStorage, so it survives reloads.
 *  - `temporaryMicrophoneState`: a push-to-talk unmute, active only while Space is held
 *    (see GameSceneUserInputHandler). Never persisted.
 *
 * `effectiveMicrophoneState` is the OR of the two. Keeping them apart is what restores the user's
 * real choice once the temporary unmute ends (releasing Space must NOT latch the mic on).
 */
import { AvailabilityStatus } from "@workadventure/messages";
import type { Readable, Unsubscriber } from "svelte/store";
import { derived, writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

const requestedMicrophoneWritable = writable(localUserStore.getRequestedMicrophoneState());

export const requestedMicrophoneState = {
    subscribe: requestedMicrophoneWritable.subscribe,
    enableMicrophone: () => {
        requestedMicrophoneWritable.set(true);
        localUserStore.setRequestedMicrophoneState(true);
    },
    disableMicrophone: () => {
        requestedMicrophoneWritable.set(false);
        localUserStore.setRequestedMicrophoneState(false);
    },
};

export const temporaryMicrophoneState = writable(false);

export const effectiveMicrophoneState: Readable<boolean> = derived(
    [requestedMicrophoneWritable, temporaryMicrophoneState],
    ([$requested, $temporary]) => $requested || $temporary,
);

/**
 * Hard mute used when a moderator or the space forces the microphone off: clears BOTH states so
 * neither a lingering push-to-talk nor the persisted choice can bring the mic back on by itself.
 */
export function forceMuteMicrophone(): void {
    temporaryMicrophoneState.set(false);
    requestedMicrophoneState.disableMicrophone();
}

/**
 * Safety net that ends a push-to-talk unmute when the "release Space" keyup could be missed:
 * push-to-talk stops being available (left the bubble/room, mic latched on), the window loses
 * focus (Alt+Tab while holding Space), or the tab becomes hidden.
 * The returned `destroy()` must be called to unsubscribe and remove the listeners.
 */
export function createTemporaryUnmuteReleaseController({
    pushToTalkAvailabilityStore,
    stopTemporaryUnmute,
}: {
    pushToTalkAvailabilityStore: Readable<boolean>;
    stopTemporaryUnmute: () => void;
}): { destroy: () => void } {
    // visibilitychange fires for both hide and show; only release when actually hidden.
    const releaseOnHiddenDocument = () => {
        if (document.hidden) {
            stopTemporaryUnmute();
        }
    };

    const unsubscribeAvailability: Unsubscriber = pushToTalkAvailabilityStore.subscribe((isAvailable) => {
        if (!isAvailable) {
            stopTemporaryUnmute();
        }
    });

    window.addEventListener("blur", stopTemporaryUnmute);
    document.addEventListener("visibilitychange", releaseOnHiddenDocument);

    return {
        destroy: () => {
            unsubscribeAvailability();
            window.removeEventListener("blur", stopTemporaryUnmute);
            document.removeEventListener("visibilitychange", releaseOnHiddenDocument);
        },
    };
}

/**
 * Availability statuses that forbid the microphone entirely (do-not-disturb, busy, silent zone,
 * etc.). Used both to keep the audio constraint off and to block starting a push-to-talk unmute.
 */
export function isUnavailableForMicrophone(availabilityStatus: AvailabilityStatus): boolean {
    return (
        availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
        availabilityStatus === AvailabilityStatus.SILENT ||
        availabilityStatus === AvailabilityStatus.DO_NOT_DISTURB ||
        availabilityStatus === AvailabilityStatus.BACK_IN_A_MOMENT ||
        availabilityStatus === AvailabilityStatus.SOUND_BLOCKED ||
        availabilityStatus === AvailabilityStatus.BUSY
    );
}

/**
 * Guard so a game shortcut does not fire while the user is typing: the key must keep its normal
 * text-input behaviour in text fields and contenteditable elements. Used by push-to-talk (Space)
 * and by the interact key (see INTERACT_KEY).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        // isContentEditable covers nested nodes; the attribute check is the jsdom fallback (jsdom does
        // not implement isContentEditable).
        (target instanceof HTMLElement && (target.isContentEditable || target.contentEditable === "true"))
    );
}
