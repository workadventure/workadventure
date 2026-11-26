<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { VideoBox } from "../../Space/VideoBox";
    import { playerMovedInTheLast10Seconds } from "../../Stores/VideoLayoutStore";
    import VideoBoxOptimizer from "./VideoBoxOptimizer.svelte";
    import type { VideoBoxLayout } from "./VideoBoxLayout";

    interface Props {
        videoBox: VideoBox;
        layout: VideoBoxLayout;
        // Without an observer, the video is always loaded.
        intersectionObserver?: IntersectionObserver;
    }

    let { videoBox, layout, intersectionObserver }: Props = $props();
</script>

<!--
    The picture-in-picture grid shows every box. Elsewhere, the highlighted box is displayed in the highlight area
    instead, except when the player just moved (the highlight area is then hidden).
-->
{#if layout.kind === "pipGrid" || $highlightedEmbedScreen !== videoBox || $playerMovedInTheLast10Seconds}
    <VideoBoxOptimizer {videoBox} {layout} {intersectionObserver} />
{/if}
