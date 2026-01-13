import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import { gameSceneStore } from "./GameSceneStore";
import { onboardingStore } from "./OnboardingStore";

/**
 * This store is true if we are expected to speak (live stream, talk in a bubble, ...) in any space.
 */
export const isLiveStreamingStore: Readable<boolean> = derived(
    [gameSceneStore, onboardingStore],
    ([gameSceneStore, onboardingStore], set) => {
        if (gameSceneStore == null) {
            set(false);
            return;
        }
        // If we are in the onboarding process, we are live streaming
        if(onboardingStore === "screenSharing" || onboardingStore === "pictureInPicture" || onboardingStore === "communication" || onboardingStore === "lockBubble") {
            set(true);
            return;
        }
        // Otherwise, we are live streaming if we are in a space that is live streaming
        return gameSceneStore.spaceRegistry.isLiveStreamingStore.subscribe((isLive) => {
            set(isLive);
        });
    }
);
