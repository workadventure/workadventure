<!--
    CamerasContainer.svelte

    This component displays a collection of WebRTC video streams in a responsive layout.
    It supports two display modes controlled by the isOnOneLine prop:

    1. Single-line mode (isOnOneLine = true):
       - Videos are displayed in a single horizontal line
       - Video sizes are automatically adjusted to fit the container width
       - If container is too narrow, videos will maintain minimum width (120px) and overflow horizontally
       - Videos are centered in the container with equal spacing
       - No vertical scrolling

    2. Multi-line mode (isOnOneLine = false):
       - Videos wrap to multiple lines to maximize available space
       - Uses an optimal layout algorithm that:
         a) Calculates maximum possible videos per row at minimum size
         b) Works backwards to find the largest video size that fits without scrolling
         c) Maintains 16:9 aspect ratio for all videos
         d) Ensures videos never go below minimum width (120px)
       - Videos are aligned to the top of the container
       - Vertical scrolling is enabled if needed
       - Maintains consistent gap between videos

    The component automatically adjusts its layout when:
    - Container dimensions change
    - Number of videos changes
    - Display mode changes

    Props:
    - oneLineMaxHeight: Maximum height for videos in single-line mode
    - isOnOneLine: Toggle between single-line and multi-line modes

-->
<script lang="ts">
    import { onDestroy } from "svelte";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { gameManager } from "../../Phaser/Game/GameManager";

    export let oneLineMaxHeight: number;
    // Note: the correct gap should be 16px (gap-4 in Tailwind). But if we put 16px, it leads to instabilities.
    // Those are likely due to negative margins in the MediaBox component.
    // To prevent this, we use a slightly wider gap for our computations.
    const gap = 22; // Configurable gap between videos

    export let isOnOneLine: boolean;
    let containerWidth: number;
    let containerHeight: number;
    let videoWidth: number;

    // The minimum width of a media box in pixels
    const minMediaBoxWidth = 120;

    $: maxMediaBoxWidth = (oneLineMaxHeight * 16) / 9;

    $: {
        videoWidth = isOnOneLine
            ? Math.max(Math.min(maxMediaBoxWidth, containerWidth / $streamableCollectionStore.size), minMediaBoxWidth)
            : calculateOptimalLayout(containerWidth, containerHeight).videoWidth;

        gameManager.getCurrentGameScene().reposition();
    }

    function calculateOptimalLayout(containerWidth: number, containerHeight: number) {
        console.log("calculateOptimalLayout");
        console.log("containerWidth", containerWidth);
        console.log("containerHeight", containerHeight);
        if (!containerWidth || !containerHeight) {
            return {
                videoWidth: minMediaBoxWidth,
            };
        }

        // Calculate maximum number of videos that can fit in one row at minimum size
        const maxVideosPerRow = Math.floor((containerWidth + gap) / (minMediaBoxWidth + gap));

        let lastValidConfig = null;

        // Start with maximum possible videos per row and work backwards
        for (let vpr = maxVideosPerRow; vpr >= 1; vpr--) {
            //console.log('Attempting to fit', vpr, 'videos per row');
            // Calculate video width based on container width and gap
            const width = (containerWidth - gap * (vpr - 1)) / vpr;
            //console.log("width", width);

            // Calculate video height maintaining aspect ratio
            const height = (width * 9) / 16;

            // Check if this height would fit in the container
            if (height <= containerHeight) {
                // Calculate how many complete rows we can fit
                const rowsPerPage = Math.floor(containerHeight / (height + gap));
                const visibleVideos = rowsPerPage * vpr;

                //console.log("visibleVideos", visibleVideos);

                const config = {
                    videoWidth: width,
                };

                // If we need scrolling, return the last valid config (if we have one)
                if (visibleVideos < $streamableCollectionStore.size) {
                    //console.log("Found config needing scrolling, returning last valid config", lastValidConfig);
                    return lastValidConfig || config;
                }

                // Keep this as our last valid config that doesn't need scrolling
                lastValidConfig = config;
            }
        }

        // If we get here, we never needed scrolling, use the last valid config
        return (
            lastValidConfig || {
                videoWidth: minMediaBoxWidth,
            }
        );
    }

    onDestroy(() => {
        gameManager.getCurrentGameScene().reposition();
    });
</script>

<div
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
    class={"pointer-events-none gap-4 " + (isOnOneLine ? "max-h-full" : "")}
    class:hidden={$highlightFullScreen && $highlightedEmbedScreen}
    class:flex={true}
    class:flex-wrap={!isOnOneLine}
    class:h-full={!isOnOneLine}
    class:content-start={!isOnOneLine}
    class:justify-start={isOnOneLine}
    class:whitespace-nowrap={isOnOneLine}
    class:relative={true}
    class:overflow-x-auto={isOnOneLine}
    class:overflow-x-hidden={!isOnOneLine}
    class:overflow-y-auto={!isOnOneLine}
    class:overflow-y-hidden={isOnOneLine}
    class:pb-3={isOnOneLine}
    class:m-0={isOnOneLine}
    class:my-0={isOnOneLine}
    class:w-full={true}
    class:max-w-full={true}
    class:not-highlighted={!isOnOneLine}
    class:mt-0={!isOnOneLine}
    id="cameras-container"
>
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div
                    style="width: {videoWidth}px; max-width: {videoWidth}px;"
                    class={isOnOneLine
                        ? "pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box aspect-video first-of-type:ml-auto last-of-type:mr-auto"
                        : "pointer-events-auto shrink-0 camera-box aspect-video"}
                >
                    <MediaBox streamable={peer} />
                </div>
            {/key}
        {/if}
    {/each}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style lang="scss">
    .hidden {
        display: none !important;
    }

    .not-highlighted {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: flex-start;
    }

    @container (min-width: 1024) and (max-width: 1279px) {
        .not-highlighted {
            gap: 1rem;
        }
    }

    @container (min-width: 640px) and (max-width: 1024px) {
        .not-highlighted {
            gap: 0.75rem;
        }
    }

    @container (max-width: 640px) {
        .not-highlighted {
            gap: 0.5rem;
        }
    }
</style>
