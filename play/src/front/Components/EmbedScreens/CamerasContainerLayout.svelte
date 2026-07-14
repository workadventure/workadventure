<script lang="ts">
    import { onMount, setContext } from "svelte";
    import type { Snippet } from "svelte";
    import type { VideoBox as VideoBoxModel } from "../../Space/VideoBox";
    import VideoBox from "../Video/VideoBox.svelte";
    import type { ObservableElement } from "../../Interfaces/ObservableElement";
    import ChevronLeftIcon from "../Icons/ChevronLeftIcon.svelte";
    import ChevronRightIcon from "../Icons/ChevronRightIcon.svelte";
    import ChevronUpIcon from "../Icons/ChevronUpIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import {
        computePictureInPictureGridLayout,
        pipGridTemplateColumns,
        pipGridTemplateRows,
        pipTileStyle,
        PIP_GRID_MAX_VIDEOS,
    } from "../Video/PictureInPicture/pictureInPictureGridLayout";
    import ResizeHandle from "./ResizeHandle.svelte";
    import { computeCameraScrollState } from "./cameraScrollState";

    setContext("inCameraContainer", true);

    const maximumVideosPerPage = window.env.MAX_DISPLAYED_VIDEOS;
    const minMediaBoxWidth = 160;
    const LOCAL_CAMERA_VIDEO_BOX_UNIQUE_ID = "-1";

    interface Props {
        oneLineMaxHeight: number;
        isOnOneLine: boolean;
        oneLineMode: "vertical" | "horizontal";
        oneLineStreamableCollection: VideoBoxModel[];
        orderedStreamableCollection: VideoBoxModel[];
        activePictureInPicture: boolean;
        highlightedEmbedScreen: VideoBoxModel | undefined;
        highlightFullScreen: boolean;
        playerMovedInTheLast10Seconds: boolean;
        localCameraVideoBox: VideoBoxModel | undefined;
        cameraContainerHeightRatio: number;
        setMaxVisibleVideos: (value: number) => void;
        onCameraContainerHeightRatioChange: (ratio: number) => void;
        onResizeEnd: () => void;
        mediaRenderer: Snippet<[VideoBoxModel]>;
    }

    let {
        oneLineMaxHeight,
        isOnOneLine,
        oneLineMode = "horizontal",
        oneLineStreamableCollection,
        orderedStreamableCollection,
        activePictureInPicture,
        highlightedEmbedScreen,
        highlightFullScreen,
        playerMovedInTheLast10Seconds,
        localCameraVideoBox,
        cameraContainerHeightRatio,
        setMaxVisibleVideos,
        onCameraContainerHeightRatioChange,
        onResizeEnd,
        mediaRenderer,
    }: Props = $props();

    let gap = 16;
    let containerWidth: number = $state(0);
    let maxContainerHeight: number = $state(0);
    let containerHeight: number = $state(0);
    let camerasContainerHeight: number = $state(0);
    let videoWidth: number = $state(0);
    let videoHeight: number | undefined = $state();
    let camerasContainer: HTMLDivElement | undefined = $state();
    let intersectionObserver: IntersectionObserver | undefined = $state();
    let grabPointerEvents = $state(false);
    let resizeInProgress = $state(false);
    let canScrollLeft = $state(false);
    let canScrollRight = $state(false);
    let canScrollTop = $state(false);
    let canScrollBottom = $state(false);
    let shouldStartAlign = $state(false);

    const isWebkit = "WebkitAppearance" in document.documentElement.style;

    function excludeLocalCamera(videoBoxes: VideoBoxModel[]): VideoBoxModel[] {
        return videoBoxes.filter((box) => box.uniqueId !== LOCAL_CAMERA_VIDEO_BOX_UNIQUE_ID);
    }

    let isPictureInPictureGridMode = $derived(activePictureInPicture && oneLineMode === "vertical");
    let pipDockLocalCamera = $derived(
        isPictureInPictureGridMode &&
            oneLineStreamableCollection.length > PIP_GRID_MAX_VIDEOS &&
            oneLineStreamableCollection.some((box) => box.uniqueId === LOCAL_CAMERA_VIDEO_BOX_UNIQUE_ID),
    );
    let pipRemoteParticipantCount = $derived(excludeLocalCamera(oneLineStreamableCollection).length);
    let maxMediaBoxWidth = $derived((oneLineMaxHeight * 16) / 9);
    let pipVideoBoxes = $derived(
        isPictureInPictureGridMode
            ? pipDockLocalCamera
                ? excludeLocalCamera(orderedStreamableCollection).slice(0, PIP_GRID_MAX_VIDEOS)
                : orderedStreamableCollection.slice(0, PIP_GRID_MAX_VIDEOS)
            : oneLineStreamableCollection,
    );
    let pipLayout = $derived(
        computePictureInPictureGridLayout(
            pipVideoBoxes.length,
            Math.max(1, containerWidth || 0),
            Math.max(1, camerasContainerHeight || 0),
        ),
    );

    onMount(() => {
        if (camerasContainer) {
            intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const element = entry.target as ObservableElement;
                        element.visibilityCallback?.(entry.isIntersecting);
                    });
                },
                {
                    root: camerasContainer,
                    threshold: 0,
                },
            );
        }

        return () => {
            intersectionObserver?.disconnect();
        };
    });

    $effect(() => {
        const sortedCollection = [...orderedStreamableCollection].sort((a, b) => b.priority - a.priority);
        for (let i = 0; i < sortedCollection.length; i++) {
            sortedCollection[i].displayOrder.set(i);
        }
    });

    $effect(() => {
        if (!isOnOneLine) {
            containerHeight = maxContainerHeight * cameraContainerHeightRatio;
            if (camerasContainer) {
                camerasContainer.style.height = `${containerHeight}px`;
            }
        } else if (camerasContainer) {
            camerasContainer.style.height = "";
        }
    });

    $effect(() => {
        if (isOnOneLine) {
            const oneLineCount = Math.max(1, oneLineStreamableCollection.length);
            const pipVerticalGrid = activePictureInPicture && oneLineMode === "vertical" && isOnOneLine;
            const pipSortWindowCount = pipDockLocalCamera ? pipRemoteParticipantCount : oneLineCount;

            if (oneLineMode === "horizontal") {
                const countForTileSizing = pipVerticalGrid
                    ? Math.min(PIP_GRID_MAX_VIDEOS, pipSortWindowCount)
                    : oneLineCount;
                const currentVideoWidth = Math.max(
                    Math.min(maxMediaBoxWidth, containerWidth / countForTileSizing),
                    minMediaBoxWidth,
                );
                videoWidth = currentVideoWidth;
                videoHeight = undefined;
                if (pipVerticalGrid) {
                    setMaxVisibleVideos(Math.min(PIP_GRID_MAX_VIDEOS, pipSortWindowCount));
                } else {
                    setMaxVisibleVideos(Math.ceil(containerWidth / currentVideoWidth));
                }
            } else {
                const currentVideoWidth = containerWidth;
                const currentVideoHeight = currentVideoWidth * (9 / 16);
                videoWidth = currentVideoWidth;
                videoHeight = currentVideoHeight;
                if (pipVerticalGrid) {
                    setMaxVisibleVideos(Math.min(PIP_GRID_MAX_VIDEOS, pipSortWindowCount));
                } else {
                    setMaxVisibleVideos(Math.ceil(containerHeight / currentVideoHeight));
                }
            }
        } else {
            const layout = calculateOptimalLayout(containerWidth, containerHeight);
            videoWidth = layout.videoWidth;
            videoHeight = layout.videoHeight;
        }
    });

    function calculateOptimalLayout(containerWidth: number, containerHeight: number) {
        if (!containerWidth || !containerHeight) {
            return {
                videoWidth: minMediaBoxWidth,
            };
        }

        if (resizeInProgress) {
            gap = 16;
        } else {
            gap = 20;
        }

        const maxVideosPerRow = Math.min(
            Math.floor((containerWidth + gap) / (minMediaBoxWidth + gap)),
            oneLineStreamableCollection.length,
        );

        let lastValidConfig = null;

        for (let vpr = maxVideosPerRow; vpr >= 1; vpr--) {
            const width = (containerWidth - gap * (vpr - 1)) / vpr;
            const height = (width * 9) / 16;
            const rowsPerPage = Math.floor((containerHeight + gap) / (height + gap));
            const maxVisibleVideos = rowsPerPage * vpr;
            const maxNbVideos = Math.min(oneLineStreamableCollection.length, maximumVideosPerPage);

            if (maxVisibleVideos < maxNbVideos) {
                const totalRows = Math.ceil(maxNbVideos / vpr);

                if (totalRows === 1) {
                    const adjustedWidth = (containerHeight * 16) / 9;
                    setMaxVisibleVideos(vpr);

                    return {
                        videoWidth: Math.max(adjustedWidth, minMediaBoxWidth),
                    };
                }

                const maxHeightPerVideo = (containerHeight - gap * (totalRows - 1)) / totalRows;
                const adjustedWidthWithReducedHeight = (maxHeightPerVideo * 16) / 9;
                const adjustedWidthWithOneMoreVpr =
                    maxNbVideos >= vpr + 1 ? (containerWidth - gap * vpr) / (vpr + 1) : 0;

                let adjustedWidth: number;
                let adjustedHeight: number | undefined;
                if (adjustedWidthWithReducedHeight > adjustedWidthWithOneMoreVpr) {
                    const adjustedVpr = Math.floor((containerWidth + gap) / (adjustedWidthWithReducedHeight + gap));
                    if (adjustedVpr !== vpr) {
                        console.warn("problem");
                    }
                    adjustedWidth = adjustedWidthWithReducedHeight;
                    setMaxVisibleVideos(vpr * (rowsPerPage + 1));
                } else {
                    adjustedWidth = adjustedWidthWithOneMoreVpr;
                    const adjustedTotalRows = Math.ceil(maxNbVideos / (vpr + 1));
                    adjustedHeight = (containerHeight - gap * (adjustedTotalRows - 1)) / adjustedTotalRows;
                    if (adjustedHeight < adjustedWidth * (9 / 16)) {
                        adjustedHeight = adjustedWidth * (9 / 16);
                    }
                    setMaxVisibleVideos((vpr + 1) * adjustedTotalRows);
                }

                if (adjustedWidth < minMediaBoxWidth) {
                    return {
                        videoWidth: minMediaBoxWidth,
                    };
                }
                return {
                    videoWidth: adjustedWidth,
                    videoHeight: adjustedHeight,
                };
            }

            lastValidConfig = {
                videoWidth: width,
            };
        }

        return (
            lastValidConfig || {
                videoWidth: minMediaBoxWidth,
            }
        );
    }

    $effect(() => {
        const oneLineStreamableCount = oneLineStreamableCollection.length;

        if (isWebkit && oneLineStreamableCount >= 0 && isOnOneLine && oneLineMode === "horizontal") {
            setTimeout(() => {
                if (camerasContainer) {
                    grabPointerEvents = camerasContainer.scrollWidth > containerWidth;
                }
            }, 500);
        } else {
            grabPointerEvents = false;
        }
    });

    function onResizeHandler(height: number) {
        resizeInProgress = true;
        containerHeight = height;
        const coefCameraContainerHeight = containerHeight / maxContainerHeight;
        onCameraContainerHeightRatioChange(coefCameraContainerHeight > 0.9 ? 0.9 : coefCameraContainerHeight);
        if (camerasContainer) {
            const oldHeight = camerasContainer.scrollHeight;
            const oldScrollPercent = camerasContainer.scrollTop / oldHeight;

            camerasContainer.style.height = `${containerHeight}px`;
            camerasContainer.scrollTop = camerasContainer.scrollHeight * oldScrollPercent;
        }
    }

    function updateScrollIndicators() {
        if (!camerasContainer) return;
        if (isPictureInPictureGridMode) {
            canScrollLeft = false;
            canScrollRight = false;
            canScrollTop = false;
            canScrollBottom = false;
            shouldStartAlign = false;
            return;
        }

        const scrollState = computeCameraScrollState(
            {
                scrollLeft: camerasContainer.scrollLeft,
                scrollTop: camerasContainer.scrollTop,
                scrollWidth: camerasContainer.scrollWidth,
                scrollHeight: camerasContainer.scrollHeight,
                clientWidth: camerasContainer.clientWidth,
                clientHeight: camerasContainer.clientHeight,
            },
            isOnOneLine,
            oneLineMode,
        );

        canScrollLeft = scrollState.canScrollLeft;
        canScrollRight = scrollState.canScrollRight;
        canScrollTop = scrollState.canScrollTop;
        canScrollBottom = scrollState.canScrollBottom;
        shouldStartAlign = scrollState.shouldStartAlign;
    }

    const scrollStepRatio = 0.85;

    function scrollCamerasLeft() {
        if (!camerasContainer) return;
        const step = camerasContainer.clientWidth * scrollStepRatio;
        camerasContainer.scrollBy({ left: -step, behavior: "smooth" });
        setTimeout(updateScrollIndicators, 300);
    }

    function scrollCamerasRight() {
        if (!camerasContainer) return;
        const step = camerasContainer.clientWidth * scrollStepRatio;
        camerasContainer.scrollBy({ left: step, behavior: "smooth" });
        setTimeout(updateScrollIndicators, 300);
    }

    function scrollCamerasUp() {
        if (!camerasContainer) return;
        const step = camerasContainer.clientHeight * scrollStepRatio;
        camerasContainer.scrollBy({ top: -step, behavior: "smooth" });
        setTimeout(updateScrollIndicators, 300);
    }

    function scrollCamerasDown() {
        if (!camerasContainer) return;
        const step = camerasContainer.clientHeight * scrollStepRatio;
        camerasContainer.scrollBy({ top: step, behavior: "smooth" });
        setTimeout(updateScrollIndicators, 300);
    }

    $effect(() => {
        if (camerasContainer) {
            const _exhaustiveCheck = [
                oneLineStreamableCollection,
                containerWidth,
                containerHeight,
                isOnOneLine,
                oneLineMode,
            ];
            updateScrollIndicators();
        }
    });
</script>

<div
    class="group/cameras-container w-full"
    bind:clientHeight={maxContainerHeight}
    class:h-full={!isOnOneLine || (isOnOneLine && oneLineMode === "vertical")}
>
    <div
        bind:clientWidth={containerWidth}
        bind:clientHeight={camerasContainerHeight}
        bind:this={camerasContainer}
        class="no-scroll-bar mx-1 justify-center"
        class:pointer-events-none={!grabPointerEvents}
        class:pointer-events-auto={grabPointerEvents}
        class:hidden={highlightFullScreen && highlightedEmbedScreen && oneLineMode !== "vertical"}
        class:flex={!isPictureInPictureGridMode}
        class:grid={isPictureInPictureGridMode}
        style={isPictureInPictureGridMode
            ? `grid-template-columns: ${pipGridTemplateColumns(pipLayout.columnTracks)}; grid-template-rows: ${pipGridTemplateRows(pipLayout.rowTracks)};`
            : ""}
        class:gap-2={isPictureInPictureGridMode}
        class:p-2={isPictureInPictureGridMode}
        class:gap-4={!isPictureInPictureGridMode}
        class:max-h-full={isOnOneLine && oneLineMode === "horizontal"}
        class:max-w-full={!isOnOneLine || (isOnOneLine && oneLineMode === "horizontal")}
        class:flex-col={isOnOneLine && oneLineMode === "vertical" && !isPictureInPictureGridMode}
        class:flex-wrap={!isOnOneLine}
        class:content-start={!isOnOneLine}
        class:!justify-start={shouldStartAlign}
        class:whitespace-nowrap={isOnOneLine}
        class:relative={true}
        class:overflow-x-auto={isOnOneLine && oneLineMode === "horizontal" && !isPictureInPictureGridMode}
        class:overflow-x-hidden={!isOnOneLine}
        class:overflow-y-auto={!isOnOneLine ||
            (isOnOneLine && oneLineMode === "vertical" && !isPictureInPictureGridMode)}
        class:overflow-hidden={isPictureInPictureGridMode}
        class:overflow-y-hidden={isOnOneLine && oneLineMode === "horizontal"}
        class:pb-3={isOnOneLine && !highlightedEmbedScreen}
        class:m-0={isOnOneLine}
        class:my-0={isOnOneLine}
        class:w-full={!isOnOneLine && oneLineMode !== "horizontal"}
        class:items-start={!isOnOneLine}
        class:not-highlighted={!isOnOneLine}
        class:mt-0={!isOnOneLine}
        class:h-full={isOnOneLine && oneLineMode === "vertical"}
        class:m-2={activePictureInPicture}
        id="cameras-container"
        data-testid="cameras-container"
    >
        {#each pipVideoBoxes as videoBox, i (videoBox.uniqueId)}
            <div
                style={isPictureInPictureGridMode ? pipTileStyle(pipLayout.tiles[i]) : ""}
                class:min-h-0={isPictureInPictureGridMode}
                class:min-w-0={isPictureInPictureGridMode}
            >
                <VideoBox
                    {videoBox}
                    {isOnOneLine}
                    {oneLineMode}
                    {videoWidth}
                    {videoHeight}
                    {playerMovedInTheLast10Seconds}
                    oneLineStreamableCount={pipVideoBoxes.length}
                    intersectionObserver={isPictureInPictureGridMode ? undefined : intersectionObserver}
                    forceDisplay={isPictureInPictureGridMode ||
                        (videoBox.uniqueId === LOCAL_CAMERA_VIDEO_BOX_UNIQUE_ID &&
                            isOnOneLine &&
                            oneLineMode === "vertical" &&
                            !pipDockLocalCamera)}
                    fitContainer={isPictureInPictureGridMode}
                    {mediaRenderer}
                />
            </div>
        {/each}
    </div>
    {#if pipDockLocalCamera && localCameraVideoBox}
        <div
            class="pointer-events-auto fixed bottom-20 right-2 z-30 aspect-video w-40 max-w-[14rem] min-w-[8.75rem] overflow-hidden rounded-lg shadow-xl"
            data-testid="pip-local-camera-overlay"
        >
            {@render mediaRenderer(localCameraVideoBox)}
        </div>
    {/if}
    {#if !isOnOneLine}
        <ResizeHandle
            minHeight={maxContainerHeight * 0.1}
            maxHeight={maxContainerHeight * 0.9}
            onResize={onResizeHandler}
            onResizeEnd={() => {
                resizeInProgress = false;
                onResizeEnd();

                const layout = calculateOptimalLayout(containerWidth, containerHeight);
                videoWidth = layout.videoWidth;
                videoHeight = layout.videoHeight;
            }}
            dataTestid="resize-handle"
        />
    {/if}
    {#if isOnOneLine && oneLineMode === "horizontal"}
        {#if canScrollLeft}
            <button
                type="button"
                class="scroll-indicator scroll-indicator-left scroll-indicator-button opacity-10 group-hover/cameras-container:opacity-100"
                aria-label="Scroll left to see more cameras"
                onclick={scrollCamerasLeft}
            >
                <span class="scroll-indicator-gradient scroll-indicator-gradient-left"></span>
                <span class="scroll-indicator-chevron">
                    <ChevronLeftIcon height="h-8" width="w-8" strokeWidth="2" />
                </span>
            </button>
        {/if}
        {#if canScrollRight}
            <button
                type="button"
                class="scroll-indicator scroll-indicator-right scroll-indicator-button opacity-10 group-hover/cameras-container:opacity-100"
                aria-label="Scroll right to see more cameras"
                onclick={scrollCamerasRight}
            >
                <span class="scroll-indicator-gradient scroll-indicator-gradient-right"></span>
                <span class="scroll-indicator-chevron">
                    <ChevronRightIcon height="h-8" width="w-8" strokeWidth="2" />
                </span>
            </button>
        {/if}
    {:else}
        {#if canScrollTop}
            <button
                type="button"
                class="absolute scroll-indicator scroll-indicator-top scroll-indicator-button opacity-10 group-hover/cameras-container:opacity-100"
                aria-label="Scroll up to see more cameras"
                onclick={scrollCamerasUp}
            >
                <span class="scroll-indicator-gradient scroll-indicator-gradient-top"></span>
                <span class="scroll-indicator-chevron">
                    <ChevronUpIcon height="h-8" width="w-8" strokeWidth="2" />
                </span>
            </button>
        {/if}
        {#if canScrollBottom}
            <button
                type="button"
                class="absolute scroll-indicator scroll-indicator-bottom scroll-indicator-button h-fit w-fit opacity-40 group-hover/cameras-container:opacity-100"
                aria-label="Scroll down to see more cameras"
                onclick={scrollCamerasDown}
            >
                <span class="scroll-indicator-gradient scroll-indicator-gradient-bottom h-full"></span>
                <span class="scroll-indicator-chevron">
                    <ChevronDownIcon height="h-8" width="w-8" strokeWidth="2" />
                </span>
            </button>
        {/if}
    {/if}
</div>

<style>
    .hidden {
        display: none !important;
    }

    .scroll-indicator {
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .scroll-indicator-button {
        pointer-events: auto;
        cursor: pointer;
        border: none;
        margin: 0;
        padding: 0;
        background: transparent;
        font: inherit;
        color: inherit;
        -webkit-tap-highlight-color: transparent;
        width: 100%;
    }

    .scroll-indicator-button:hover .scroll-indicator-chevron,
    .scroll-indicator-button:focus-visible .scroll-indicator-chevron {
        transform: scale(1.1);
        background: rgba(0, 0, 0, 0.75);
    }

    .scroll-indicator-button:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
    }

    .scroll-indicator-left {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 72px;
    }

    .scroll-indicator-right {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 72px;
    }

    .scroll-indicator-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 56px;
    }

    .scroll-indicator-bottom {
        position: relative;
        bottom: 0;
        left: 0;
        right: 0;
        height: 56px;
    }

    .scroll-indicator-gradient {
        position: absolute;
        inset: 0;
        pointer-events: none;
    }

    .scroll-indicator-gradient-left {
        background: linear-gradient(to right, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 70%, transparent 100%);
    }

    .scroll-indicator-gradient-right {
        background: linear-gradient(to left, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 70%, transparent 100%);
    }

    .scroll-indicator-gradient-top {
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 20%, transparent 100%);
    }

    .scroll-indicator-gradient-bottom {
        background: linear-gradient(to top, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 20%, transparent 100%);
    }

    .scroll-indicator-chevron {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.55);
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        transition:
            transform 0.2s ease,
            background 0.2s ease;
    }

    .scroll-indicator-chevron :global(svg) {
        display: block;
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
    .no-scroll-bar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
