<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { RemoteVideoTrack } from "livekit-client";
    import { LivekitStreamable } from "../../../Stores/StreamableCollectionStore";
    import { NoVideoOutputDetector } from "./NoVideoOutputDetector";

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;

    export let media: LivekitStreamable & { remoteVideoTrack: RemoteVideoTrack };
    let videoElement: HTMLVideoElement;
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    onMount(() => {
        media.remoteVideoTrack.attach(videoElement);
        noVideoOutputDetector = new NoVideoOutputDetector(
            videoElement,
            () => {
                dispatch("noVideo");
            },
            () => {
                dispatch("video");
            }
        );
    });

    onDestroy(() => {
        media.remoteVideoTrack.detach(videoElement);
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
