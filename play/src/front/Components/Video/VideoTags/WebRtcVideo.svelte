<svelte:options immutable={true} />

<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { WebRtcStreamable } from "../../../Stores/StreamableCollectionStore";
    import InnerWebRtcVideo from "./InnerWebRtcVideo.svelte";

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

    let streamStore = media.streamStore;
    let setDimensions = media.setDimensions;
</script>

{#if $streamStore}
    {#key $streamStore}
        <InnerWebRtcVideo
            {style}
            {className}
            bind:videoWidth
            bind:videoHeight
            {onLoadVideoElement}
            {loop}
            stream={$streamStore}
            {setDimensions}
            on:video={() => dispatch("video")}
            on:noVideo={() => dispatch("noVideo")}
        />
    {/key}
{/if}
