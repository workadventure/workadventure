<script lang="ts">
    import { Readable } from "svelte/store";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { volumeProximityDiscussionStore } from "../../../Stores/PeerStore";
    import PictureInPictureAudio from "./PictureInPictureAudio.svelte";

    export let peer: Streamable;

    let streamStore: Readable<MediaStream | undefined> | undefined = undefined;
    if (peer.media.type === "mediaStore") {
        streamStore = peer.media.streamStore;
    }
</script>

{#if $streamStore}
    <PictureInPictureAudio stream={$streamStore} volume={$volumeProximityDiscussionStore} />
{/if}
