<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import type { LivekitStreamable } from "../../../Space/Streamable";
    import InnerLivekitVideo from "./InnerLivekitVideo.svelte";

    const dispatch = createEventDispatcher<{
        video: undefined;
        noVideo: undefined;
    }>();

    export let style: string;
    export let className: string;
    export let videoWidth: number;
    export let videoHeight: number;
    export let onLoadVideoElement: (event: Event) => void;
    export let media: LivekitStreamable;

    let remoteVideoTrack: LivekitStreamable["remoteVideoTrack"];
    let activeMedia: LivekitStreamable | undefined;

    $: remoteVideoTrack = media.remoteVideoTrack;

    $: {
        if (activeMedia !== media) {
            activeMedia?.setVideoSubscribed(false);
            activeMedia = media;
            media.setVideoSubscribed(true);
        }
    }

    onDestroy(() => {
        activeMedia?.setVideoSubscribed(false);
    });
</script>

{#if $remoteVideoTrack}
    {#key $remoteVideoTrack}
        <InnerLivekitVideo
            {style}
            {className}
            bind:videoWidth
            bind:videoHeight
            {onLoadVideoElement}
            remoteVideoTrack={$remoteVideoTrack}
            on:video={() => dispatch("video")}
            on:noVideo={() => dispatch("noVideo")}
        />
    {/key}
{/if}
