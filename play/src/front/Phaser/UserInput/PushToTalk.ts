import { get } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import { mediaStreamConstraintsStore, temporaryMicrophoneState } from "../../Stores/MediaStore";
import { isLiveStreamingAudioStore } from "../../Stores/IsStreamingStore";

function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

/**
 * Hold the push-to-talk key (T by default, see ShortcutsStore) to unmute while it is down.
 * The release is listened to on the window, not through Phaser: the game ignores keys while a text field has the
 * focus, and a missed keyup would leave the microphone open. Losing the window (which switching tabs does too) or
 * leaving the conversation ends it as well.
 */
export class PushToTalk {
    // The physical key that started it: its keyup ends it, even if modifiers changed in between.
    private heldCode: string | undefined;
    private readonly unsubscribeStreaming: Unsubscriber;

    constructor() {
        this.unsubscribeStreaming = isLiveStreamingAudioStore.subscribe((streaming) => {
            if (!streaming) this.stop();
        });
        window.addEventListener("keyup", this.onKeyUp, true);
        window.addEventListener("blur", this.stop);
    }

    /** Starts push-to-talk if it can be heard. Returns false when the key press should be left alone. */
    public tryStart(event: KeyboardEvent): boolean {
        // keepAudioWarm is exactly "muted by the user, in a conversation, nothing else forcing the microphone off".
        if (event.repeat || isTypingTarget(event.target) || !get(mediaStreamConstraintsStore).keepAudioWarm) {
            return false;
        }
        this.heldCode = event.code;
        temporaryMicrophoneState.set(true);
        event.preventDefault();
        return true;
    }

    public readonly stop = (): void => {
        this.heldCode = undefined;
        temporaryMicrophoneState.set(false);
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        if (event.code === this.heldCode) this.stop();
    };

    public destroy(): void {
        this.unsubscribeStreaming();
        window.removeEventListener("keyup", this.onKeyUp, true);
        window.removeEventListener("blur", this.stop);
        this.stop();
    }
}
