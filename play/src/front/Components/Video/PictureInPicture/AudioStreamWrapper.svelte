<script lang="ts">
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { volumeProximityDiscussionStore } from "../../../Stores/PeerStore";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../../Stores/MediaStore";
    import { userActivationManager } from "../../../Stores/UserActivationStore";
    import AudioStream from "./AudioStream.svelte";

    export let peer: Streamable;
</script>

{#if peer.media.type === "mediaStore" && !peer.muteAudio}
    {#await userActivationManager.waitForUserActivation()}
        <!-- waiting for user activation -->
    {:then value}
        <AudioStream
            attach={peer.media.attachAudio}
            detach={peer.media.detachAudio}
            volume={$volumeProximityDiscussionStore}
            outputDeviceId={$speakerSelectedStore}
            on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
        />
    {/await}
{/if}
