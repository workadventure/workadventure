import { writable } from "svelte/store";
import type { WokaEmoteId } from "@workadventure/shared-utils";
import { analyticsClient } from "../Administration/AnalyticsClient";

/** Whether the radial emote wheel is on screen. */
export const wokaEmoteWheelVisibleStore = writable(false);

/**
 * Set to request an animated emote. GameScene consumes it, plays it on the current player and
 * broadcasts it, then resets the store — the same handshake the emoji emotes use.
 */
export const wokaEmoteStore = writable<WokaEmoteId | null>(null);

export function playWokaEmote(emoteId: WokaEmoteId): void {
    analyticsClient.launchWokaEmote(emoteId);
    // The wheel closes first: while it is open the game inputs are off, and GameScene refuses to
    // play an emote it believes the player cannot have asked for.
    wokaEmoteWheelVisibleStore.set(false);
    wokaEmoteStore.set(emoteId);
}

/**
 * The wheel places itself around the Woka and animates its slices outwards, and it owns that setup:
 * callers only ask for it to be on screen.
 */
export function openWokaEmoteWheel(): void {
    wokaEmoteWheelVisibleStore.set(true);
}
