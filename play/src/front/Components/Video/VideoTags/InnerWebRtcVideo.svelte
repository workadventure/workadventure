<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;
    export let loop = false;

    export let stream: MediaStream;
    export let setDimensions: (width: number, height: number) => void;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    let videoElement: HTMLVideoElement;
    let resizeObserver: ResizeObserver | undefined;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    function setupResizeObserver() {
        if (!videoElement) {
            return;
        }

        // Clean up existing observer
        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        const myVideoElement = videoElement;
        // Function to update dimensions
        const updateDimensions = () => {
            const rect = myVideoElement.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);

            if (width > 0 && height > 0) {
                setDimensions(width, height);
            } else {
                console.warn("WebRtcVideo: Invalid video element dimensions", {
                    width,
                    height,
                });
            }
        };

        // Call immediately with current dimensions to adapt to initial display size
        updateDimensions();

        resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(videoElement);
    }

    onMount(() => {
        videoElement.srcObject = stream;

        // Track is the same but detector doesn't exist (shouldn't happen, but safety check)
        noVideoOutputDetector = new NoVideoOutputDetector(
            videoElement,
            () => {
                dispatch("noVideo");
            },
            () => {
                dispatch("video");
            }
        );
        noVideoOutputDetector.expectVideoWithin5Seconds();

        setupResizeObserver();
    });

    onDestroy(() => {
        if (noVideoOutputDetector) {
            noVideoOutputDetector.destroy();
            noVideoOutputDetector = undefined;
        }
        if (videoElement?.srcObject) {
            videoElement.srcObject = null;
        }
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    });
</script>

<video
    {style}
    bind:videoWidth
    bind:videoHeight
    bind:this={videoElement}
    on:loadedmetadata={onLoadVideoElement}
    class={`bg-contrast/80 backdrop-blur ${className}`}
    autoplay
    playsinline
    muted={true}
    {loop}
    data-testid="webrtc-video"
/>
