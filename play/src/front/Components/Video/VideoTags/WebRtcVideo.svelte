<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import type { WebRtcStreamable } from "../../../Stores/StreamableCollectionStore";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;
    export let loop = false;

    export let media: WebRtcStreamable;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    $: streamStore = media?.streamStore;
    $: stream = $streamStore ? $streamStore : undefined;

    let videoElement: HTMLVideoElement | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    function getVideoTrack(mediaStream: MediaStream | null | undefined): MediaStreamTrack | undefined {
        if (!mediaStream) {
            return undefined;
        }
        const videoTracks = mediaStream.getVideoTracks();
        return videoTracks.length > 0 ? videoTracks[0] : undefined;
    }

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
                media.setDimensions(width, height);
            }
        };

        // Call immediately with current dimensions to adapt to initial display size
        updateDimensions();

        resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(videoElement);
    }

    $: if (videoElement) {
        setupResizeObserver();
    }

    $: if (videoElement) {
        if (stream) {
            const newVideoTrack = getVideoTrack(stream);
            const currentStream = videoElement.srcObject as MediaStream | null;
            const currentTrack = currentStream ? getVideoTrack(currentStream) : undefined;

            // Only recreate detector if the video track actually changed
            const videoTrackChanged = newVideoTrack !== currentTrack;

            if (videoElement.srcObject !== stream) {
                videoElement.srcObject = stream;
            }

            if (videoTrackChanged) {
                // Destroy previous detector to prevent stale callbacks
                if (noVideoOutputDetector) {
                    noVideoOutputDetector.destroy();
                }

                // Create new detector for the new video track
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
            } else if (newVideoTrack && !noVideoOutputDetector) {
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
            }
        } else {
            // Stream is undefined, destroy detector to prevent stale callbacks
            if (noVideoOutputDetector) {
                noVideoOutputDetector.destroy();
                noVideoOutputDetector = undefined;
            }

            if (videoElement.srcObject) {
                videoElement.srcObject = null;
            }
        }
    }

    onMount(() => {
        if (!videoElement) {
            throw new Error("WebRtcVideo: videoElement is undefined");
        }
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
