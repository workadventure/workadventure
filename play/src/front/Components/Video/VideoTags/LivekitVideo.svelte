<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import type { Readable } from "svelte/store";
    import type { RemoteVideoTrack } from "livekit-client";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";
    import { decrementVisibleCounter, incrementVisibleCounter } from "./visibleCounter";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;

    export let remoteVideoTrack: Readable<RemoteVideoTrack | undefined>;
    let videoElement: HTMLVideoElement;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    let attachedVideoTrack: RemoteVideoTrack | undefined;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    let isVisible = false;
    const visibilityCallback = (visible: boolean) => {
        console.log("Video visibility changed:", visible);
        if (visible && !isVisible) {
            incrementVisibleCounter();
        } else if (!visible && isVisible) {
            decrementVisibleCounter();
        }
        isVisible = visible;
    };

    $: {
        if ($remoteVideoTrack) {
            if ($remoteVideoTrack !== attachedVideoTrack) {
                if (attachedVideoTrack) {
                    attachedVideoTrack.detach(videoElement);
                }
            }
            if (attachedVideoTrack) {
                attachedVideoTrack.off("visibilityChanged", visibilityCallback);
            }
            attachedVideoTrack = $remoteVideoTrack;
            attachedVideoTrack.on("visibilityChanged", visibilityCallback);

            attachedVideoTrack.attach(videoElement);

            if (noVideoOutputDetector) {
                noVideoOutputDetector.destroy();
            }

            noVideoOutputDetector = new NoVideoOutputDetector(
                videoElement,
                () => {
                    dispatch("noVideo");
                },
                () => {
                    dispatch("video");
                }
            );
        }
    }

    onDestroy(() => {
        if (attachedVideoTrack) {
            attachedVideoTrack.detach(videoElement);
            attachedVideoTrack.off("visibilityChanged", visibilityCallback);
        }
        if (isVisible) {
            decrementVisibleCounter();
        }
        noVideoOutputDetector?.destroy();
    });
</script>

<video
    {style}
    bind:videoWidth
    bind:videoHeight
    bind:this={videoElement}
    on:loadedmetadata={onLoadVideoElement}
    class={className}
    autoplay
    playsinline
    muted={true}
/>
