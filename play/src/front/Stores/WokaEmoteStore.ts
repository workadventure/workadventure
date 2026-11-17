import { writable } from "svelte/store";
import { z } from "zod";
import type { WokaEmoteId } from "@workadventure/shared-utils";
import { isWokaEmoteId } from "@workadventure/shared-utils";
import { analyticsClient } from "../Administration/AnalyticsClient";

/** Whether the radial emote wheel is on screen. */
export const wokaEmoteWheelVisibleStore = writable(false);

/**
 * Set to request an animated emote. GameScene consumes it, plays it on the current player and
 * broadcasts it, then resets the store — the same handshake the emoji emotes use.
 */
export const wokaEmoteStore = writable<WokaEmoteId | null>(null);

/**
 * The emote the wheel is aiming at, played on the player's own Woka only: GameScene never sends it.
 * You see what you are about to do before anyone else does.
 */
export const wokaEmotePreviewStore = writable<WokaEmoteId | null>(null);

export function playWokaEmote(emoteId: WokaEmoteId): void {
    analyticsClient.trackAdminEvent("emote.launched", { name: emoteId });
    // The preview stops before the real emote starts, or tearing it down would stop the real one too.
    wokaEmotePreviewStore.set(null);
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

/** The emotes pinned in the emoji bar, one click away. */
export const MAX_WOKA_EMOTE_FAVORITES = 5;
const DEFAULT_FAVORITES: WokaEmoteId[] = ["laugh", "love", "celebrate", "dance", "jump"];
const favoritesKey = "wokaEmoteFavorites";

function loadFavorites(): WokaEmoteId[] {
    try {
        const parsed = z.array(z.string()).safeParse(JSON.parse(localStorage.getItem(favoritesKey) ?? "null"));
        // An emote removed from a later version is dropped rather than shown as a blank chip.
        return parsed.success
            ? parsed.data.filter(isWokaEmoteId).slice(0, MAX_WOKA_EMOTE_FAVORITES)
            : DEFAULT_FAVORITES;
    } catch {
        return DEFAULT_FAVORITES;
    }
}

function createFavoritesStore() {
    const { subscribe, update } = writable<WokaEmoteId[]>(loadFavorites());
    return {
        subscribe,
        /** Pins the emote, or unpins it if it already is. Does nothing once the bar is full. */
        toggle(emoteId: WokaEmoteId) {
            update((favorites) => {
                const next = favorites.includes(emoteId)
                    ? favorites.filter((id) => id !== emoteId)
                    : favorites.length < MAX_WOKA_EMOTE_FAVORITES
                      ? [...favorites, emoteId]
                      : favorites;
                localStorage.setItem(favoritesKey, JSON.stringify(next));
                return next;
            });
        },
    };
}

export const wokaEmoteFavoritesStore = createFavoritesStore();
