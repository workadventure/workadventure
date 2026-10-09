import { derived } from "svelte/store";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { playerMovedInTheLast10Seconds } from "./VideoLayoutStore";

/**
 * True while the highlighted box is folded back into the row of cameras because the player is walking. A whiteboard
 * stays on stage: people walk around its area while they draw, and folding it would take the board from under them.
 */
export const highlightCollapsedStore = derived(
    [playerMovedInTheLast10Seconds, highlightedEmbedScreen],
    ([$playerMovedInTheLast10Seconds, $highlightedEmbedScreen]) =>
        $playerMovedInTheLast10Seconds && !$highlightedEmbedScreen?.uniqueId.startsWith("whiteboard-"),
);
