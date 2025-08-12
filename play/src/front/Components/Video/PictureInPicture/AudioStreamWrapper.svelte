<script lang="ts">
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { volumeProximityDiscussionStore } from "../../../Stores/PeerStore";
    import { speakerSelectedStore } from "../../../Stores/MediaStore";
    import AudioStream from "./AudioStream.svelte";

    export let peer: Streamable;
</script>

{#if peer.media.type === "mediaStore" && !peer.muteAudio}
    <AudioStream
        attach={peer.media.attachAudio}
        detach={peer.media.detachAudio}
        volume={$volumeProximityDiscussionStore}
        outputDeviceId={$speakerSelectedStore}
    />
{/if}
