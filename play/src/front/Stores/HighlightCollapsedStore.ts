import { derived } from "svelte/store";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { playerMovedInTheLast10Seconds } from "./VideoLayoutStore";
import { mapEditorModeStore } from "./MapEditorStore";

/**
 * True while the highlighted box is folded back into the row of cameras.
 * - A camera or a screen share folds while the player walks.
 * - A whiteboard stays on stage while the player walks (people walk around its area while they draw), but folds
 *   while the map editor is open, where it would hide the map being edited.
 */
export const highlightCollapsedStore = derived(
    [playerMovedInTheLast10Seconds, highlightedEmbedScreen, mapEditorModeStore],
    ([$playerMovedInTheLast10Seconds, $highlightedEmbedScreen, $mapEditorModeStore]) =>
        $highlightedEmbedScreen?.uniqueId.startsWith("whiteboard-")
            ? $mapEditorModeStore
            : $playerMovedInTheLast10Seconds,
);
