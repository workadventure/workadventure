<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/Space";
    import { playerMovedInTheLast10Seconds } from "../../Stores/VideoLayoutStore";
    import VideoBoxOptimizer from "./VideoBoxOptimizer.svelte";

    export let videoBox: VideoBox;
    export let isOnOneLine: boolean;
    export let oneLineMode: "vertical" | "horizontal";
    export let videoWidth: number;
    export let videoHeight: number | undefined;
    export let intersectionObserver: IntersectionObserver | undefined;

    const streamable = videoBox.streamable;
</script>

{#if (($highlightedEmbedScreen !== videoBox || $playerMovedInTheLast10Seconds) && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && ($streamable?.displayInPictureInPictureMode ?? false))}
    <VideoBoxOptimizer {videoBox} {isOnOneLine} {oneLineMode} {videoWidth} {videoHeight} {intersectionObserver} />
{/if}
