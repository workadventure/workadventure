import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import { gameSceneStore } from "./GameSceneStore";

/**
 * This store is true if we are expected to speak (live stream, talk in a bubble, ...) in any space.
 */
export const isLiveStreamingStore: Readable<boolean> = derived(gameSceneStore, ($gameSceneStore, set) => {
    if ($gameSceneStore == null) {
        set(false);
        return;
    }
    return $gameSceneStore.spaceRegistry.isLiveStreamingStore.subscribe((isLive) => {
        set(isLive);
    });
});
