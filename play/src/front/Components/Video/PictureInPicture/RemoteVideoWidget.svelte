<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../../WebRtc/VideoPeer";
    import { srcObject } from "../utils";

    const dispatch = createEventDispatcher();

    export let streamable: Streamable;
    let streamStore = (streamable as VideoPeer).streamStore;
</script>

{#if $streamStore != undefined}
    <video
        id={`video-${streamable.uniqueId}`}
        class="tw-w-full tw-h-auto tw-max-h-full tw-object-cover tw-rounded-lg tw-absolute tw-top-0 tw-left-0 tw-right-0 tw-bottom-0 tw-bg-gray-800 tw-z-40 tw-cursor-pointer"
        style={`aspect-ratio: ${$streamStore?.getVideoTracks()[0]?.getSettings().aspectRatio};`}
        use:srcObject={$streamStore}
        autoplay
        muted
        playsinline
        on:click={() => dispatch("click", { streamable })}
    />
{/if}
