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
    import { onDestroy, onMount, setContext } from "svelte";
    import { myCameraPeerStore, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { MAX_DISPLAYED_VIDEOS } from "../../Enum/EnvironmentVariable";
    import ResizeHandle from "./ResizeHandle.svelte";

    setContext("inCameraContainer", true);

    export let oneLineMaxHeight: number;
    const gap = 16; // Configurable gap between videos in pixels

    // The "maximum" number of videos we want to display.
    // This is not 100% accurate, as if we are in "solution 2", the maximum number of videos
    // will be maximumVideosPerPage + nbVideos % vpr
    const maximumVideosPerPage = MAX_DISPLAYED_VIDEOS;

    export let isOnOneLine: boolean;
    export let oneLineMode: "vertical" | "horizontal" = "horizontal";
    let containerWidth: number;
    let maxContainerHeight: number;
    let containerHeight: number;
    let videoWidth: number;
    let videoHeight: number | undefined;

    // The minimum width of a media box in pixels
    const minMediaBoxWidth = 160;

    const gameScene = gameManager.getCurrentGameScene();

    onMount(() => {});

    onDestroy(() => {
        gameScene.reposition();
    });

    $: maxMediaBoxWidth = (oneLineMaxHeight * 16) / 9;

    $: {
        if (!isOnOneLine) {
            containerHeight = maxContainerHeight * localUserStore.getCameraContainerHeight();
        }
    }

    $: {
        if (isOnOneLine) {
            if (oneLineMode === "horizontal") {
                videoWidth = Math.max(
                    Math.min(maxMediaBoxWidth, containerWidth / $streamableCollectionStore.size),
                    minMediaBoxWidth
                );
                videoHeight = undefined;
            } else {
                videoWidth = containerWidth;
                videoHeight = videoWidth * (9 / 16);
            }
        } else {
            const layout = calculateOptimalLayout(containerWidth, containerHeight);
            videoWidth = layout.videoWidth;
            videoHeight = layout.videoHeight;
        }
        gameScene.reposition();
    }

    function calculateOptimalLayout(containerWidth: number, containerHeight: number) {
        if (!containerWidth || !containerHeight) {
            return {
                videoWidth: minMediaBoxWidth,
            };
        }

        // Calculate maximum number of videos that can fit in one row at minimum size
        const maxVideosPerRow = Math.min(
            Math.floor((containerWidth + gap) / (minMediaBoxWidth + gap)),
            $streamableCollectionStore.size
        );

        let lastValidConfig = null;

        // Start with maximum possible videos per row and work backwards
        for (let vpr = maxVideosPerRow; vpr >= 1; vpr--) {
            // Calculate video width based on container width and gap
            const width = (containerWidth - gap * (vpr - 1)) / vpr;

            // Calculate video height maintaining aspect ratio
            const height = (width * 9) / 16;

            // Check if this height would fit in the container
            //if (height <= containerHeight) {
            // Calculate how many complete rows we can fit
            const rowsPerPage = Math.floor((containerHeight + gap) / (height + gap));
            const maxVisibleVideos = rowsPerPage * vpr;

            //console.log("maxVisibleVideos", maxVisibleVideos);
            //console.log('vpr', vpr, 'rowsPerPage', rowsPerPage, 'maxVisibleVideos', maxVisibleVideos);

            // The "maximum" number of videos we want to display. This is either the number of videos we have
            // or the maximumVideosPerPage constant.
            // This is not 100% accurate, as if we are in "solution 2", the maximum number of videos
            // will be maximumVideosPerPage + nbVideos % vpr
            const maxNbVideos = Math.min($streamableCollectionStore.size, maximumVideosPerPage);

            // If we need scrolling, calculate the maximum height that would fit
            if (maxVisibleVideos < maxNbVideos) {
                //console.log("max width for vpr", width);
                //console.log('vpr', vpr);
                // Calculate total number of rows needed
                const totalRows = Math.ceil(maxNbVideos / vpr);
                //console.log('totalRows', totalRows);

                // Special case: we are on one row only, and we need to adapt the width / height of the videos to the container height
                if (totalRows === 1) {
                    const adjustedWidth = (containerHeight * 16) / 9;
                    return {
                        videoWidth: Math.max(adjustedWidth, minMediaBoxWidth),
                    };
                }

                // There are 2 possible optimal solutions here. Either we can reduce the height of the videos
                // to fit in the container OR we can take the previous solution with one more video per row
                // Let's check which one is better (i.e. which one has the largest video size)

                // Solution 1: let's reduce video size:

                // Calculate maximum height per video that would fit
                const maxHeightPerVideo = (containerHeight - gap * (totalRows - 1)) / totalRows;

                // Calculate corresponding width based on aspect ratio
                const adjustedWidthWithReducedHeight = (maxHeightPerVideo * 16) / 9;

                // Solution 2: let's increase the number of videos per row (only possible if we have enough videos)
                const adjustedWidthWithOneMoreVpr =
                    maxNbVideos >= vpr + 1 ? (containerWidth - gap * vpr) / (vpr + 1) : 0;

                // Check which solution is better
                let adjustedWidth: number;
                let adjustedHeight: number | undefined;
                if (adjustedWidthWithReducedHeight > adjustedWidthWithOneMoreVpr) {
                    const adjustedVpr = Math.floor((containerWidth + gap) / (adjustedWidthWithReducedHeight + gap));
                    if (adjustedVpr !== vpr) {
                        console.warn("problem");
                    }
                    // if solution 1 is better
                    adjustedWidth = adjustedWidthWithReducedHeight;
                    //console.log("Solution 1, total row", totalRows, "vpr", vpr, "adjustedVpr", adjustedVpr, "adjustedWidth", adjustedWidth, "maxHeightPerVideo", maxHeightPerVideo, "containerHeight", containerHeight, "totalRows", totalRows, "containerWidth", containerWidth);
                } else {
                    //console.log("Solution 2, vpr", vpr+1);
                    // if solution 2 is better, the videos will not occupy all vertical space.
                    // We can fix this by breaking the aspect ratio.
                    adjustedWidth = adjustedWidthWithOneMoreVpr;
                    const adjustedTotalRows = Math.ceil(maxNbVideos / (vpr + 1));
                    adjustedHeight = (containerHeight - gap * (adjustedTotalRows - 1)) / adjustedTotalRows;
                    if (adjustedHeight < adjustedWidth * (9 / 16)) {
                        adjustedHeight = adjustedWidth * (9 / 16);
                    }
                }

                if (adjustedWidth < minMediaBoxWidth) {
                    return {
                        videoWidth: minMediaBoxWidth,
                    };
                }
                //const adjustedWidth = Math.max(adjustedWidthWithReducedHeight, adjustedWidthWithOneMoreVpr);
                return {
                    videoWidth: adjustedWidth,
                    videoHeight: adjustedHeight,
                };
            }

            // Keep this as our last valid config that doesn't need scrolling
            lastValidConfig = {
                videoWidth: width,
            };
            //}
        }

        // If we get here, we never needed scrolling, use the last valid config
        return (
            lastValidConfig || {
                videoWidth: minMediaBoxWidth,
            }
        );
    }

    onDestroy(() => {
        gameScene.reposition();
    });

    function onResizeHandler(height: number) {
        containerHeight = height;
        localUserStore.setCameraContainerHeight(containerHeight / maxContainerHeight);
    }
</script>

<div
    class="w-full"
    bind:clientHeight={maxContainerHeight}
    class:h-full={!isOnOneLine || (isOnOneLine && oneLineMode === "vertical")}
>
    <div
        bind:clientWidth={containerWidth}
        class="pointer-events-auto"
        style={`gap: ${gap}px; ` +
            (!isOnOneLine || (isOnOneLine && oneLineMode === "vertical") ? "height: " + containerHeight + "px;" : "")}
        class:hidden={$highlightFullScreen && $highlightedEmbedScreen && oneLineMode !== "vertical"}
        class:flex={true}
        class:max-h-full={isOnOneLine && oneLineMode === "horizontal"}
        class:max-w-full={!isOnOneLine || (isOnOneLine && oneLineMode === "horizontal")}
        class:flex-col={isOnOneLine && oneLineMode === "vertical"}
        class:flex-wrap={!isOnOneLine}
        class:content-start={!isOnOneLine}
        class:justify-start={isOnOneLine}
        class:justify-center={!isOnOneLine}
        class:whitespace-nowrap={isOnOneLine}
        class:relative={true}
        class:overflow-x-auto={isOnOneLine && oneLineMode === "horizontal"}
        class:overflow-x-hidden={!isOnOneLine}
        class:overflow-y-auto={!isOnOneLine || (isOnOneLine && oneLineMode === "vertical")}
        class:overflow-y-hidden={isOnOneLine && oneLineMode === "horizontal"}
        class:pb-3={isOnOneLine}
        class:m-0={isOnOneLine}
        class:my-0={isOnOneLine}
        class:w-full={true}
        class:items-start={!isOnOneLine}
        class:not-highlighted={!isOnOneLine}
        class:mt-0={!isOnOneLine}
        class:h-full={isOnOneLine && oneLineMode === "vertical"}
        id="cameras-container"
        data-testid="cameras-container"
    >
        {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
            {#if ($highlightedEmbedScreen !== peer && (!isOnOneLine || oneLineMode === "horizontal")) || (isOnOneLine && oneLineMode === "vertical" && peer.displayInPictureInPictureMode)}
                {#key uniqueId}
                    <div
                        style={`width: ${videoWidth}px; max-width: ${videoWidth}px;${
                            videoHeight ? `height: ${videoHeight}px; max-height: ${videoHeight}px;` : ""
                        }`}
                        class={isOnOneLine
                            ? oneLineMode === "horizontal"
                                ? "pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box first-of-type:ml-auto last-of-type:mr-auto"
                                : "pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
                            : "pointer-events-auto shrink-0 camera-box"}
                        class:aspect-video={videoHeight === undefined}
                    >
                        <MediaBox streamable={peer} />
                    </div>
                {/key}
            {/if}
        {/each}
        <!-- in PictureInPicture, let's finish with our video feedback in small -->
        {#if isOnOneLine && oneLineMode === "vertical"}
            <div class="fixed bottom-20 right-0 z-50">
                <div
                    data-unique-id="my-camera"
                    style={`top: -50px; width: ${videoWidth / 3}px; max-width: ${videoWidth / 3}px;${
                        videoHeight ? `height: ${videoHeight / 3}px; max-height: ${videoHeight / 3}px;` : ""
                    }`}
                    class="pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box first-of-type:mt-auto last-of-type:mb-auto "
                    class:aspect-video={videoHeight === undefined}
                >
                    <MediaBox streamable={$myCameraPeerStore} />
                </div>
            </div>
        {/if}
    </div>
    {#if !isOnOneLine}
        <ResizeHandle
            minHeight={maxContainerHeight * 0.1}
            maxHeight={maxContainerHeight * 0.9}
            currentHeight={containerHeight}
            onResize={onResizeHandler}
            onResizeEnd={() => analyticsClient.resizeCameraLayout()}
            dataTestid="resize-handle"
        />
    {/if}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style lang="scss">
    .hidden {
        display: none !important;
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
