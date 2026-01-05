<svelte:options immutable={true} />

<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { RemoteVideoTrack } from "livekit-client";
    import { createEventDispatcher } from "svelte";
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

    export let remoteVideoTrack: Readable<RemoteVideoTrack | undefined>;
</script>

{#if $remoteVideoTrack}
    {#key $remoteVideoTrack}
        <InnerLivekitVideo
            {style}
            {className}
            {videoWidth}
            {videoHeight}
            {onLoadVideoElement}
            remoteVideoTrack={$remoteVideoTrack}
            on:video={() => dispatch("video")}
            on:noVideo={() => dispatch("noVideo")}
        />
    {/key}
{/if}
