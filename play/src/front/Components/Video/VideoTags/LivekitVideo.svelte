<svelte:options immutable={true} />

<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { RemoteVideoTrack } from "livekit-client";
    import InnerLivekitVideo from "./InnerLivekitVideo.svelte";

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
        />
    {/key}
{/if}
