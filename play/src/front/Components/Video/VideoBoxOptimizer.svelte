<script lang="ts">
    import { onMount } from "svelte";
    import MediaBox from "../Video/MediaBox.svelte";
    import type { VideoBox } from "../../Space/VideoBox";
    import { oneLineStreamableCollectionStore } from "../../Stores/OneLineStreamableCollectionStore";
    import type { ObservableElement } from "../../Interfaces/ObservableElement";
    import type { TokenRemovalHandle } from "../../Utils/TokenBucket";
    import type { DocumentPictureInPictureEvent } from "./PictureInPicture/PictureInPictureWindow";
    import { videoBoxVisibilityTokenBucket } from "./VideoBoxVisibilityTokenBucket";

    interface Props {
        videoBox: VideoBox;
        isOnOneLine?: boolean;
        oneLineMode?: "vertical" | "horizontal";
        videoWidth?: number;
        videoHeight?: number;
        intersectionObserver?: IntersectionObserver;
        forceVisible?: boolean;
        fitContainer?: boolean;
    }

    let {
        videoBox,
        isOnOneLine,
        oneLineMode,
        videoWidth,
        videoHeight,
        intersectionObserver,
        forceVisible = false,
        fitContainer = false,
    }: Props = $props();

    let isVisible = $state((() => forceVisible || !intersectionObserver)());
    let videoBoxElement: HTMLDivElement | undefined = $state();

    let orderStore = $derived(videoBox.displayOrder);

    let isFirst = $derived($orderStore === 0);

    let isLast = $derived($orderStore === $oneLineStreamableCollectionStore.length - 1);

    let currentDocumentPictureInPictureWindow: Window | undefined;
    let intersectionObserverRefreshTimeout: number | undefined;

    function refreshIntersectionObserver() {
        if (!videoBoxElement || !intersectionObserver) {
            return;
        }

        intersectionObserver.unobserve(videoBoxElement);
        intersectionObserver.observe(videoBoxElement);
    }

    function scheduleIntersectionObserverRefresh() {
        if (intersectionObserverRefreshTimeout !== undefined) {
            clearTimeout(intersectionObserverRefreshTimeout);
        }

        // PiP enter/pagehide can fire before the DOM node has been moved to its new document.
        // Use setTimeout instead of requestAnimationFrame because the main document can be hidden when PiP closes.
        intersectionObserverRefreshTimeout = window.setTimeout(() => {
            intersectionObserverRefreshTimeout = undefined;
            refreshIntersectionObserver();
        }, 100);
    }

    onMount(() => {
        if (!videoBoxElement) {
            return;
        }

        let tokenRemovalHandle: TokenRemovalHandle | undefined = undefined;

        // Attach the visibility callback to the element
        const observableElement = videoBoxElement as ObservableElement;
        observableElement.visibilityCallback = (visibility: boolean) => {
            // When the visibility changes, we don't set isVisible directly to true when visibility is true.
            // Instead, we request a token from the token bucket to control how many video boxes can be visible at the same time.
            // This is a security to avoid browser crashes. In our experience (Chrome + Ubuntu), requesting too many video elements at the same time
            // can lead to browser crash (if you scroll fast over a lot of video boxes).
            if (visibility === true) {
                tokenRemovalHandle = videoBoxVisibilityTokenBucket.removeToken(() => {
                    isVisible = true;
                    tokenRemovalHandle = undefined;
                });
            } else {
                if (tokenRemovalHandle) {
                    // If we are waiting for visibility to become true, but this is not done yet, cancel it.
                    tokenRemovalHandle.cancel();
                    tokenRemovalHandle = undefined;
                } else {
                    isVisible = false;
                }
            }
        };

        const handleDocumentPictureInPictureLeave = () => {
            // The refresh will trigger only when the page becomes visible again.
            // In case we close the PiP window without switching to the main page, this will not happen right away.
            // In the meantime, we can assume the video is hidden.
            isVisible = false;
            scheduleIntersectionObserverRefresh();
        };

        const handleDocumentPictureInPictureEnter = (event: DocumentPictureInPictureEvent) => {
            currentDocumentPictureInPictureWindow?.removeEventListener("pagehide", handleDocumentPictureInPictureLeave);
            currentDocumentPictureInPictureWindow = event.window;
            currentDocumentPictureInPictureWindow.addEventListener("pagehide", handleDocumentPictureInPictureLeave, {
                once: true,
            });
            scheduleIntersectionObserverRefresh();
        };

        const documentPictureInPicture =
            "documentPictureInPicture" in window ? window.documentPictureInPicture : undefined;

        // When entering / leaving PiP, we noticed the intersection observer is not correctly updated.
        // Here, we are adding some custom PiP tracking to force refreshing the intersection observer each time PiP
        // is triggered.
        documentPictureInPicture?.addEventListener("enter", handleDocumentPictureInPictureEnter);

        return () => {
            documentPictureInPicture?.removeEventListener("enter", handleDocumentPictureInPictureEnter);
            currentDocumentPictureInPictureWindow?.removeEventListener("pagehide", handleDocumentPictureInPictureLeave);
            if (intersectionObserverRefreshTimeout !== undefined) {
                clearTimeout(intersectionObserverRefreshTimeout);
            }
            if (videoBoxElement) {
                intersectionObserver?.unobserve(videoBoxElement);
            }
        };
    });

    let oldIntersectionObserver: IntersectionObserver | undefined = $state(undefined);

    $effect(() => {
        if (forceVisible) {
            isVisible = true;
        } else if (videoBoxElement && oldIntersectionObserver !== intersectionObserver) {
            oldIntersectionObserver?.unobserve(videoBoxElement);
            oldIntersectionObserver = intersectionObserver;
            intersectionObserver?.observe(videoBoxElement);
            if (!intersectionObserver) {
                isVisible = true;
            }
        }
    });
</script>

<div
    bind:this={videoBoxElement}
    style={fitContainer
        ? `order: ${$orderStore}; width: 100%; max-width: 100%; height: 100%; max-height: 100%;`
        : `order: ${$orderStore}; width: ${videoWidth}px; max-width: ${videoWidth}px;${
              videoHeight ? `height: ${videoHeight}px; max-height: ${videoHeight}px;` : ""
          }`}
    class={` overflow-hidden
    ${
        fitContainer
            ? "pointer-events-auto h-full w-full min-h-0 min-w-0 camera-box"
            : isOnOneLine
              ? oneLineMode === "horizontal"
                  ? `pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box ${isFirst ? "ml-auto" : ""} ${
                        isLast ? "mr-auto" : ""
                    }`
                  : "pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
              : "pointer-events-auto shrink-0 camera-box"
    }`}
    class:aspect-video={!fitContainer && videoHeight === undefined}
>
    {#if isVisible}
        <MediaBox {videoBox} />
    {/if}
</div>
