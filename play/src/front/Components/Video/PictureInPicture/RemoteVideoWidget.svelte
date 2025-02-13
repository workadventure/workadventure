<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../../WebRtc/VideoPeer";
    import { srcObject } from "../utils";
    import { activePictureInPictureStore } from "../../../Stores/PeerStore";

    // Extend the HTMLVideoElement interface to add the setSinkId method.
    // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
    interface HTMLVideoElementExt extends HTMLVideoElement {
        setSinkId?(deviceId: string): Promise<void>;
        requestVideoFrameCallback(callback: VideoFrameRequestCallback, options?: IdleRequestOptions): number;
    }

    export let streamable: Streamable;
    let streamStore = (streamable as VideoPeer).streamStore;
    let videoElement: HTMLVideoElementExt;

    let activePictureInPictureStoreUnsubscriber: Unsubscriber | undefined;

    onMount(() => {
        activePictureInPictureStoreUnsubscriber = activePictureInPictureStore.subscribe((value) => {
            if (!videoElement) return;
            if (value) {
                videoElement.muted = false;
            }
        });
    });

    onDestroy(() => {
        if (activePictureInPictureStoreUnsubscriber) activePictureInPictureStoreUnsubscriber();
    });
</script>

{#if $streamStore != undefined}
    <video
        id={`video-${streamable.uniqueId}`}
        bind:this={videoElement}
        use:srcObject={$streamStore}
        class="w-full h-auto max-h-full object-cover rounded-lg absolute top-0 left-0 right-0 bottom-0 bg-gray-800 z-40 cursor-pointer"
        style={`aspect-ratio: ${$streamStore?.getVideoTracks()[0]?.getSettings().aspectRatio};`}
        autoplay
        muted
        playsinline
    />
{/if}
