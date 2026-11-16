import { get } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import {
    availabilityStatusStore,
    pushToTalkAvailabilityStore,
    temporaryMicrophoneState,
} from "../../Stores/MediaStore";
import { inExternalServiceStore, myMicrophoneStore } from "../../Stores/MyMediaStore";
import { privacyShutdownStore } from "../../Stores/PrivacyShutdownStore";
import { currentRoomStore } from "../../Stores/CurrentRoomStore";
import { mediaHeldByStatus } from "../../Stores/MediaHeldByStatus";

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
 * focus, and a missed keyup would leave the microphone open. Losing the window, hiding the tab or leaving the
 * conversation ends it too.
 */
export class PushToTalk {
    // The physical key that started it: its keyup ends it, even if modifiers changed in between.
    private heldCode: string | undefined;
    private readonly unsubscribeAvailability: Unsubscriber;

    constructor() {
        this.unsubscribeAvailability = pushToTalkAvailabilityStore.subscribe((available) => {
            if (!available) this.stop();
        });
        window.addEventListener("keyup", this.onKeyUp, true);
        window.addEventListener("blur", this.stop);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    /** Starts push-to-talk if it can be heard. Returns false when the key press should be left alone. */
    public tryStart(event: KeyboardEvent): boolean {
        if (event.repeat || isTypingTarget(event.target) || !get(pushToTalkAvailabilityStore)) return false;
        const held = mediaHeldByStatus(get(availabilityStatusStore), get(privacyShutdownStore), get(currentRoomStore));
        if (!get(myMicrophoneStore) || get(inExternalServiceStore) || held.microphone) return false;
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

    private readonly onVisibilityChange = (): void => {
        if (document.hidden) this.stop();
    };

    public destroy(): void {
        this.unsubscribeAvailability();
        window.removeEventListener("keyup", this.onKeyUp, true);
        window.removeEventListener("blur", this.stop);
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        this.stop();
    }
}
