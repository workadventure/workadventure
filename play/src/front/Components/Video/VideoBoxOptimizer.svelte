<script lang="ts">
    import { onMount } from "svelte";
    import MediaBox from "../Video/MediaBox.svelte";
    import type { VideoBox } from "../../Space/VideoBox";
    import type { ObservableElement } from "../../Interfaces/ObservableElement";
    import type { TokenRemovalHandle } from "../../Utils/TokenBucket";
    import type { DocumentPictureInPictureEvent } from "./PictureInPicture/PictureInPictureWindow";
    import { videoBoxVisibilityTokenBucket } from "./VideoBoxVisibilityTokenBucket";
    import { pipTileStyle } from "./PictureInPicture/pictureInPictureGridLayout";
    import type { VideoBoxLayout } from "./VideoBoxLayout";

    interface Props {
        videoBox: VideoBox;
        layout: VideoBoxLayout;
        // Only loads the video while the box intersects the observer's root. Without an observer, it is always loaded.
        intersectionObserver?: IntersectionObserver;
    }

    let { videoBox, layout, intersectionObserver }: Props = $props();

    let isVisible = $state((() => !intersectionObserver)());
    let videoBoxElement: HTMLDivElement | undefined = $state();

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
        if (videoBoxElement && oldIntersectionObserver !== intersectionObserver) {
            oldIntersectionObserver?.unobserve(videoBoxElement);
            oldIntersectionObserver = intersectionObserver;
            intersectionObserver?.observe(videoBoxElement);
            if (!intersectionObserver) {
                isVisible = true;
            }
        }
    });

    let layoutStyle = $derived.by(() => {
        switch (layout.kind) {
            case "pipGrid":
                return `width: 100%; max-width: 100%; height: 100%; max-height: 100%; ${pipTileStyle(layout.tile)}`;
            case "row":
                return `order: ${layout.order}; width: ${layout.width}px; max-width: ${layout.width}px;`;
            case "grid":
                return `order: ${layout.order}; width: ${layout.width}px; max-width: ${layout.width}px;${
                    layout.height !== undefined ? ` height: ${layout.height}px; max-height: ${layout.height}px;` : ""
                }`;
        }
    });

    let layoutClass = $derived.by(() => {
        switch (layout.kind) {
            case "pipGrid":
                return "h-full w-full min-h-0 min-w-0";
            case "row":
                return `aspect-video basis-40 shrink-0 min-w-40 grow ${layout.isFirst ? "ml-auto" : ""} ${
                    layout.isLast ? "mr-auto" : ""
                }`;
            case "grid":
                return `shrink-0 ${layout.height === undefined ? "aspect-video" : ""}`;
        }
    });
</script>

<!--
    This element must be a direct child of the cameras container (no wrapper in between): it carries all the
    flex/grid item styles ("order", flex basis/grow/shrink, ml-auto / mr-auto,
    grid placement in picture-in-picture). On a nested element, the parent layout would ignore them.
-->
<div
    bind:this={videoBoxElement}
    style={layoutStyle}
    class={`pointer-events-auto overflow-hidden camera-box ${layoutClass}`}
>
    {#if isVisible}
        <MediaBox {videoBox} />
    {/if}
</div>
