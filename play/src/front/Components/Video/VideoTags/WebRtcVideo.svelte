<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { WebRtcStreamable } from "../../../Stores/StreamableCollectionStore";
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
    let noVideoOutputDetector: NoVideoOutputDetector | undefined;

    $: if (videoElement && stream) {
        if (videoElement.srcObject !== stream) {
            videoElement.srcObject = stream;
            noVideoOutputDetector?.expectVideoWithin3Seconds();
        }
    }

    onMount(() => {
        if (!videoElement) {
            throw new Error("WebRtcVideo: videoElement is undefined");
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
    });

    onDestroy(() => {
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
    {loop}
    data-testid="webrtc-video"
/>
