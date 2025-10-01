<script lang="ts">
    import { volumeProximityDiscussionStore } from "../../../Stores/PeerStore";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../../Stores/MediaStore";
    import { userActivationManager } from "../../../Stores/UserActivationStore";
    import { VideoBox } from "../../../Space/Space";
    import AudioStream from "./AudioStream.svelte";

    export let videoBox: VideoBox;
    const streamable = videoBox.streamable;
</script>

{#if $streamable && $streamable?.media.type === "mediaStore" && !$streamable.muteAudio}
    {#await userActivationManager.waitForUserActivation()}
        <!-- waiting for user activation -->
    {:then value}
        <AudioStream
            attach={$streamable.media.attachAudio}
            detach={$streamable.media.detachAudio}
            volume={$volumeProximityDiscussionStore}
            outputDeviceId={$speakerSelectedStore}
            on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
        />
    {/await}
{/if}
