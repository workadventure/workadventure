<script lang="ts">
    import { Readable } from "svelte/store";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { volumeProximityDiscussionStore } from "../../../Stores/PeerStore";
    import AudioStream from "./AudioStream.svelte";

    export let peer: Streamable;

    let streamStore: Readable<MediaStream | undefined> | undefined = undefined;
    if (peer.media.type === "mediaStore" && !peer.muteAudio) {
        streamStore = peer.media.streamStore;
    }
</script>

{#if $streamStore}
    <AudioStream stream={$streamStore} volume={$volumeProximityDiscussionStore} />
{/if}
