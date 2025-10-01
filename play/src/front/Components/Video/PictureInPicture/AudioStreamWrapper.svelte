<script lang="ts">
    import { volumeProximityDiscussionStore } from "../../../Stores/PeerStore";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../../Stores/MediaStore";
    import { userActivationManager } from "../../../Stores/UserActivationStore";
    import { VideoBox } from "../../../Space/Space";
    import AudioStream from "./AudioStream.svelte";

    export let videoBox: VideoBox;
    const streamable = videoBox.streamable;
</script>

{#if $streamable && ($streamable?.media.type === "webrtc" || $streamable?.media.type === "livekit") && !$streamable.muteAudio}
    {#await userActivationManager.waitForUserActivation()}
        <!-- waiting for user activation -->
    {:then value}
        {#if $streamable.media.streamStore}
            <AudioStream
                streamStore={$streamable.media.streamStore}
                volume={$volumeProximityDiscussionStore}
                outputDeviceId={$speakerSelectedStore}
                isBlocked={$streamable.media.isBlocked}
                on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
            />
        {/if}
    {/await}
{/if}
