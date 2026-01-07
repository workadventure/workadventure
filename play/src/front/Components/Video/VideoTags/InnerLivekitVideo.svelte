<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import type { RemoteVideoTrack } from "livekit-client";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;

    export let remoteVideoTrack: RemoteVideoTrack;
    let videoElement: HTMLVideoElement;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    onMount(() => {
        remoteVideoTrack.attach(videoElement);

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

        noVideoOutputDetector.expectVideoWithin5Seconds();
    });

    onDestroy(() => {
        remoteVideoTrack.detach(videoElement);

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
