import { readable, derived } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { gameManager } from "../Phaser/Game/GameManager";
import { hasMovedEventName } from "../Phaser/Player/Player";
import { isInRemoteConversation } from "./StreamableCollectionStore";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { activePictureInPictureStore } from "./PeerStore";
// Time in milliseconds before switching to multi-line mode
export const SWITCH_TO_MULTILINE_DELAY = 3500;

// Store to track the last player movement timestamp
export const lastPlayerMovement = readable(Date.now(), function start(set) {
    const currentPlayer = gameManager.getCurrentGameScene()?.CurrentPlayer;

    if (!currentPlayer) {
        console.error("No current player found when initializing lastPlayerMovement");
        Sentry.captureException("No current player found when initializing lastPlayerMovement");
    }

    const handler = () => {
        set(Date.now());
    };
    currentPlayer?.on(hasMovedEventName, handler);
    return function stop() {
        currentPlayer?.off(hasMovedEventName, handler);
    };
});

// Store to track if player has moved in the last 10 seconds
export const playerMovedInTheLast10Seconds = readable(true, function start(set) {
    let timeout: NodeJS.Timeout | null = null;

    const unsubscribe = lastPlayerMovement.subscribe(() => {
        if (timeout) {
            clearTimeout(timeout);
        }
        set(true);
        timeout = setTimeout(() => {
            set(false);
        }, SWITCH_TO_MULTILINE_DELAY);
    });

    return function stop() {
        unsubscribe();
        if (timeout) {
            clearTimeout(timeout);
        }
    };
});

// Store for the layout mode (derived from playerMovedInTheLast10Seconds and isInRemoteConversation and pictureInPictureStore)
export const isOnOneLine = derived(
    [playerMovedInTheLast10Seconds, isInRemoteConversation, highlightedEmbedScreen, activePictureInPictureStore],
    ([
        $playerMovedInTheLast10Seconds,
        $isInRemoteConversation,
        $highlightedEmbedScreen,
        $activePictureInPictureStore,
    ]) => {
        // Show one line if we are NOT in a conversation ot the player has moved recently
        return (
            $playerMovedInTheLast10Seconds ||
            !$isInRemoteConversation ||
            $highlightedEmbedScreen !== undefined ||
            $activePictureInPictureStore
        );
    }
);
