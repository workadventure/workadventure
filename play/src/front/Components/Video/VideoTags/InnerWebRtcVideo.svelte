<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { activePictureInPictureStore } from "../../../Stores/PeerStore";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    interface Props {
        style: string;
        className: string;
        videoWidth: number;
        videoHeight: number;
        onloadvideoelement?: (event: Event) => void;
        onvideo?: () => void;
        onnovideo?: () => void;
        loop: boolean;
        stream: MediaStream;
        setDimensions: (width: number, height: number) => void;
    }

    let {
        style,
        className,
        videoWidth = $bindable(),
        videoHeight = $bindable(),
        onloadvideoelement,
        onvideo,
        onnovideo,
        loop = false,
        stream,
        setDimensions,
    }: Props = $props();

    let videoElement: HTMLVideoElement;
    let resizeObserver: ResizeObserver | undefined;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;
    let lastWidth: number | undefined;
    let lastHeight: number | undefined;

    function setupResizeObserver() {
        if (!videoElement) {
            return;
        }

        // Clean up existing observer
        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        // Function to update dimensions
        const updateDimensions = () => {
            if (!videoElement) {
                console.warn("WebRtcVideo: videoElement is not defined while updating dimensions");
                return;
            }
            const rect = videoElement.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);
            if (width > 0 && height > 0) {
                // Skip if dimensions are within 1 pixel of the last call
                if (
                    lastWidth !== undefined &&
                    lastHeight !== undefined &&
                    Math.abs(width - lastWidth) <= 1 &&
                    Math.abs(height - lastHeight) <= 1
                ) {
                    return;
                }
                lastWidth = width;
                lastHeight = height;
                setDimensions(width, height);
            } else {
                // On startup, there is a small moment where width and height of the video element are 0
                // (because the container is collapsed)
                /*console.warn("WebRtcVideo: Invalid video element dimensions", {
                    width,
                    height,
                });*/
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
                onnovideo?.();
            },
            () => {
                onvideo?.();
            },
        );
        noVideoOutputDetector.expectVideoWithin5Seconds();

        setupResizeObserver();

        // The lines below solve a very weird bug at least happening in Chrome / Ubuntu
        // The issue: when exiting Picture-in-Picture mode, if the video was never displayed while in PiP mode (because it was hidden behind other windows),
        // the video rendering becomes broken (no rendering). Forcing the srcObject to the same stream again fixes the issue.
        const activePictureInPictureStoreUnsubscribe = activePictureInPictureStore.subscribe((isInPip) => {
            if (!isInPip) {
                // Force re-setup the video element when exiting PiP to fix some rendering issues
                videoElement.srcObject = stream;
            }
        });

        return () => {
            activePictureInPictureStoreUnsubscribe();
        };
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
    onloadedmetadata={onloadvideoelement}
    class={`bg-contrast/80 backdrop-blur ${className}`}
    autoplay
    playsinline
    muted={true}
    {loop}
    data-testid="webrtc-video"
></video>
