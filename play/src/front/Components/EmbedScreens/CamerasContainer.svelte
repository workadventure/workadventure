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
    import type { Writable } from "svelte/store";
    import { myCameraPeerStore, type MyLocalStreamable } from "../../Stores/StreamableCollectionStore";
    import VideoBox from "../Video/VideoBox.svelte";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { MAX_DISPLAYED_VIDEOS } from "../../Enum/EnvironmentVariable";
    import {
        orderedStreamableCollectionStore,
        maxVisibleVideosStore,
    } from "../../Stores/OrderedStreamableCollectionStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { oneLineStreamableCollectionStore } from "../../Stores/OneLineStreamableCollectionStore";
    import type { ObservableElement } from "../../Interfaces/ObservableElement";
    import ResizeHandle from "./ResizeHandle.svelte";

    setContext("inCameraContainer", true);

    export let oneLineMaxHeight: number;
    let gap = 16; // Configurable gap between videos in pixels

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
    let camerasContainer: HTMLDivElement | undefined;

    // The minimum width of a media box in pixels
    const minMediaBoxWidth = 160;

    const gameScene = gameManager.getCurrentGameScene();

    $: myCameraStreamable = $myCameraPeerStore.streamable as Writable<MyLocalStreamable | undefined>;

    // Single IntersectionObserver shared across all VideoBox components
    let intersectionObserver: IntersectionObserver | undefined;

    onMount(() => {
        // Create the IntersectionObserver once camerasContainer is bound
        if (camerasContainer) {
            intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const element = entry.target as ObservableElement;
                        if (element.visibilityCallback) {
                            element.visibilityCallback(entry.isIntersecting);
                        }
                    });
                },
                {
                    root: camerasContainer,
                    threshold: 0,
                }
            );
        }

        // Subscriptions for store changes
        const unsubscriber = orderedStreamableCollectionStore.subscribe((orderedStreamableCollection) => {
            // Each time the order of the videos changes, we update the displayOrder of each videoBox
            for (let i = 0; i < orderedStreamableCollection.length; i++) {
                orderedStreamableCollection[i].displayOrder.set(i);
            }
        });

        const unsubscribePictureInPictureMode = activePictureInPictureStore.subscribe((activePictureInPicture) => {
            // If the picture in picture mode is activated, we update the displayInPictureInPictureMode of the local camera streamable
            // To set true, the local camera streamable will appear like other camera boxes in the picture in picture mode
            $myCameraStreamable?.setDisplayInPictureInPictureMode(
                activePictureInPicture && $highlightedEmbedScreen != undefined
            );
        });

        const unsubscribeHighlightedEmbedScreen = highlightedEmbedScreen.subscribe((highlightedEmbedScreen) => {
            // If the highlighted embed screen is changed, we update the displayInPictureInPictureMode of the local camera streamable
            // To set true, the local camera streamable will appear like other camera boxes in the picture in picture mode
            $myCameraStreamable?.setDisplayInPictureInPictureMode(
                highlightedEmbedScreen != undefined && $activePictureInPictureStore
            );
        });

        return () => {
            unsubscriber();
            unsubscribePictureInPictureMode();
            unsubscribeHighlightedEmbedScreen();
            if (intersectionObserver) {
                intersectionObserver.disconnect();
            }
        };
    });

    onDestroy(() => {
        gameScene.reposition();
    });

    $: maxMediaBoxWidth = (oneLineMaxHeight * 16) / 9;

    $: {
        if (!isOnOneLine) {
            containerHeight = maxContainerHeight * localUserStore.getCameraContainerHeight();
            if (camerasContainer) {
                camerasContainer.style.height = `${containerHeight}px`;
            }
        } else {
            if (camerasContainer) {
                camerasContainer.style.height = "";
            }
        }
    }

    $: {
        if (isOnOneLine) {
            if (oneLineMode === "horizontal") {
                videoWidth = Math.max(
                    Math.min(maxMediaBoxWidth, containerWidth / $oneLineStreamableCollectionStore.length),
                    minMediaBoxWidth
                );
                videoHeight = undefined;
                maxVisibleVideosStore.set(Math.ceil(containerWidth / videoWidth));
            } else {
                videoWidth = containerWidth;
                videoHeight = videoWidth * (9 / 16);
                maxVisibleVideosStore.set(Math.ceil(containerHeight / videoHeight));
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

        // When the user scroll in or out, the canvas is resize and "containerWidth" has a small jitter.
        // When the user is not resizing the container through the resize handle, we don't want to take into account the jitter.
        // Rules: Apply -2 pixels to the gap when the user is not resizing the container.
        // TODO: find a better way to detect this and fix the jitter from the WaScalerManager.
        if (resizeInProgress) {
            gap = 16;
        } else {
            gap = 20;
        }

        // Calculate maximum number of videos that can fit in one row at minimum size
        const maxVideosPerRow = Math.min(
            Math.floor((containerWidth + gap) / (minMediaBoxWidth + gap)),
            $oneLineStreamableCollectionStore.length
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

            // The "maximum" number of videos we want to display. This is either the number of videos we have
            // or the maximumVideosPerPage constant.
            // This is not 100% accurate, as if we are in "solution 2", the maximum number of videos
            // will be maximumVideosPerPage + nbVideos % vpr
            const maxNbVideos = Math.min($oneLineStreamableCollectionStore.length, maximumVideosPerPage);
            // If we need scrolling, calculate the maximum height that would fit
            if (maxVisibleVideos < maxNbVideos) {
                // Calculate total number of rows needed
                const totalRows = Math.ceil(maxNbVideos / vpr);

                // Special case: we are on one row only, and we need to adapt the width / height of the videos to the container height
                if (totalRows === 1) {
                    const adjustedWidth = (containerHeight * 16) / 9;
                    // We put the maximum number of visible videos in a store. This store will be used to show active participants first.
                    maxVisibleVideosStore.set(vpr);

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
                    // We put the maximum number of visible videos in a store. This store will be used to show active participants first.
                    maxVisibleVideosStore.set(vpr * (rowsPerPage + 1));
                } else {
                    // if solution 2 is better, the videos will not occupy all vertical space.
                    // We can fix this by breaking the aspect ratio.
                    adjustedWidth = adjustedWidthWithOneMoreVpr;
                    const adjustedTotalRows = Math.ceil(maxNbVideos / (vpr + 1));
                    adjustedHeight = (containerHeight - gap * (adjustedTotalRows - 1)) / adjustedTotalRows;
                    if (adjustedHeight < adjustedWidth * (9 / 16)) {
                        adjustedHeight = adjustedWidth * (9 / 16);
                    }
                    // We put the maximum number of visible videos in a store. This store will be used to show active participants first.
                    maxVisibleVideosStore.set((vpr + 1) * adjustedTotalRows);
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
        }

        // If we get here, we never needed scrolling, use the last valid config
        return (
            lastValidConfig || {
                videoWidth: minMediaBoxWidth,
            }
        );
    }

    let grabPointerEvents = false;
    const isWebkit = "WebkitAppearance" in document.documentElement.style;
    $: {
        // In Webkit, the scroll event on the cameras-container is not triggered when the user scrolls unless the
        // pointer-events is set to auto. But we want to avoid that unless there is a scroll bar to keep the
        // pointer events to go through to the map.

        // Let's trigger this logic when the number of videos changes or when the container width changes
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        $oneLineStreamableCollectionStore;

        if (isWebkit && isOnOneLine && oneLineMode === "horizontal") {
            setTimeout(() => {
                if (camerasContainer) {
                    if (camerasContainer.scrollWidth > containerWidth) {
                        //eslint-disable-next-line svelte/infinite-reactive-loop
                        grabPointerEvents = true;
                    } else {
                        //eslint-disable-next-line svelte/infinite-reactive-loop
                        grabPointerEvents = false;
                    }
                }
            }, 500);
        } else {
            grabPointerEvents = false;
        }
    }

    let resizeInProgress = false;
    function onResizeHandler(height: number) {
        resizeInProgress = true;
        containerHeight = height;
        const coefCameraContainerHeight = containerHeight / maxContainerHeight;
        localUserStore.setCameraContainerHeight(coefCameraContainerHeight > 0.9 ? 0.9 : coefCameraContainerHeight);
        if (camerasContainer) {
            const oldHeight = camerasContainer.scrollHeight;
            // Move the scroll position to keep the same percentage of position
            const oldScrollPercent = camerasContainer.scrollTop / oldHeight;

            camerasContainer.style.height = `${containerHeight}px`;
            camerasContainer.scrollTop = camerasContainer.scrollHeight * oldScrollPercent;
        }
    }
</script>

<div
    class="w-full"
    bind:clientHeight={maxContainerHeight}
    class:h-full={!isOnOneLine || (isOnOneLine && oneLineMode === "vertical")}
>
    <div
        bind:clientWidth={containerWidth}
        bind:this={camerasContainer}
        class="gap-4 mx-1"
        class:pointer-events-none={!grabPointerEvents}
        class:pointer-events-auto={grabPointerEvents}
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
        class:pb-3={isOnOneLine && !$highlightedEmbedScreen}
        class:m-0={isOnOneLine}
        class:my-0={isOnOneLine}
        class:w-full={!isOnOneLine && oneLineMode !== "horizontal"}
        class:items-start={!isOnOneLine}
        class:not-highlighted={!isOnOneLine}
        class:mt-0={!isOnOneLine}
        class:h-full={isOnOneLine && oneLineMode === "vertical"}
        class:m-2={$activePictureInPictureStore}
        id="cameras-container"
        data-testid="cameras-container"
    >
        {#each $oneLineStreamableCollectionStore as videoBox (videoBox.uniqueId)}
            <VideoBox {videoBox} {isOnOneLine} {oneLineMode} {videoWidth} {videoHeight} {intersectionObserver} />
        {/each}
        <!-- in PictureInPicture, let's finish with our video feedback in small -->
        {#if isOnOneLine && oneLineMode === "vertical" && !($myCameraStreamable?.displayInPictureInPictureMode ?? false)}
            <div class="fixed bottom-20 right-0 z-50">
                <div
                    data-unique-id="my-camera"
                    style={`top: -50px; width: ${videoWidth / 3}px; max-width: ${videoWidth / 3}px;${
                        videoHeight ? `height: ${videoHeight / 3}px; max-height: ${videoHeight / 3}px;` : ""
                    } ${
                        $activePictureInPictureStore ? "min-width: 224px; min-height: 130px; margin-right: 0.5rem;" : ""
                    }`}
                    class="pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
                    class:aspect-video={videoHeight === undefined}
                >
                    <MediaBox videoBox={$myCameraPeerStore} />
                </div>
            </div>
        {/if}
    </div>
    {#if !isOnOneLine}
        <ResizeHandle
            minHeight={maxContainerHeight * 0.1}
            maxHeight={maxContainerHeight * 0.9}
            onResize={onResizeHandler}
            onResizeEnd={() => {
                resizeInProgress = false;
                analyticsClient.resizeCameraLayout();

                // We need to recalculate the layout to take into account the new container width
                const layout = calculateOptimalLayout(containerWidth, containerHeight);
                videoWidth = layout.videoWidth;
                videoHeight = layout.videoHeight;
            }}
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
