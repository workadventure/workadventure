import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import type { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";
import { gameSceneStore } from "./GameSceneStore";
import { simulatedConversationStore } from "./SimulatedConversationStore";

/**
 * Reads a store of the space registry, forced to true during the tutorial's fake conversation, which points at the media
 * buttons.
 */
function liveStreamingStateStore(
    select: (spaceRegistry: SpaceRegistryInterface) => Readable<boolean>,
): Readable<boolean> {
    return derived([gameSceneStore, simulatedConversationStore], ([gameSceneStore, simulatedConversation], set) => {
        if (gameSceneStore == null) {
            set(false);
            return;
        }
        if (simulatedConversation) {
            set(true);
            return;
        }
        // Otherwise, it depends on the spaces we are in
        return select(gameSceneStore.spaceRegistry).subscribe((value) => {
            set(value);
        });
    });
}

/**
 * This store is true if we are expected to speak (live stream, talk in a bubble, ...) in any space.
 */
export const isLiveStreamingStore = liveStreamingStateStore((spaceRegistry) => spaceRegistry.isLiveStreamingStore);

/**
 * This store is true if a screen share would reach someone in any space (never as a megaphone or podium audience).
 */
export const isScreenSharingAvailableStore = liveStreamingStateStore(
    (spaceRegistry) => spaceRegistry.shouldPublishScreenShareStore,
);

/**
 * This store is true if we are expected to speak (live stream, talk in a bubble, ...) in any space.
 */
export const isLiveStreamingAudioStore: Readable<boolean> = derived([gameSceneStore], ([gameSceneStore], set) => {
    if (gameSceneStore == null) {
        set(false);
        return;
    }
    // Otherwise, we are live streaming if we are in a space that is live streaming
    return gameSceneStore.spaceRegistry.isLiveStreamingAudioStore.subscribe((isLive) => {
        set(isLive);
    });
});
