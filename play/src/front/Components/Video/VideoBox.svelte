<script lang="ts">
    import type { Snippet } from "svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/VideoBox";
    import VideoBoxOptimizer from "./VideoBoxOptimizer.svelte";

    interface Props {
        videoBox: VideoBox;
        isOnOneLine: boolean;
        oneLineMode: "vertical" | "horizontal";
        videoWidth: number;
        videoHeight?: number;
        playerMovedInTheLast10Seconds: boolean;
        oneLineStreamableCount: number;
        intersectionObserver?: IntersectionObserver;
        forceDisplay: boolean;
        fitContainer: boolean;
        mediaRenderer: Snippet<[VideoBox]>;
    }

    let {
        videoBox,
        isOnOneLine,
        oneLineMode,
        videoWidth,
        videoHeight,
        playerMovedInTheLast10Seconds,
        oneLineStreamableCount,
        intersectionObserver,
        forceDisplay = false,
        fitContainer = false,
        mediaRenderer,
    }: Props = $props();

    let streamable = $derived(videoBox.streamable);
</script>

{#if forceDisplay || (($highlightedEmbedScreen !== videoBox || playerMovedInTheLast10Seconds) && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && ($streamable?.displayInPictureInPictureMode ?? false))}
    <VideoBoxOptimizer
        {videoBox}
        {isOnOneLine}
        {oneLineMode}
        {videoWidth}
        {videoHeight}
        {oneLineStreamableCount}
        {intersectionObserver}
        forceVisible={forceDisplay}
        {fitContainer}
        {mediaRenderer}
    />
{/if}
