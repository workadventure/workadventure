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
    wokaEmoteStore.set(emoteId);
    wokaEmoteWheelVisibleStore.set(false);
}

export function toggleWokaEmoteWheel(): void {
    wokaEmoteWheelVisibleStore.update((visible) => !visible);
}
