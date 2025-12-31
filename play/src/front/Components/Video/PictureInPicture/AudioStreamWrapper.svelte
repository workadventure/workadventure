<svelte:options immutable={true} />

<script lang="ts">
    import { writable } from "svelte/store";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../../Stores/MediaStore";
    import { userActivationManager } from "../../../Stores/UserActivationStore";
    import type { VideoBox } from "../../../Space/Space";
    import AudioStream from "./AudioStream.svelte";

    export let videoBox: VideoBox;
    const streamable = videoBox.streamable;

    $: hasAudio = $streamable?.hasAudio ?? writable(false);
</script>

{#if $streamable && ($streamable?.media.type === "webrtc" || $streamable?.media.type === "livekit") && !$streamable.muteAudio && $hasAudio}
    {#await userActivationManager.waitForUserActivation()}
        <!-- waiting for user activation -->
    {:then value}
        {#if $streamable.media.streamStore}
            <AudioStream
                streamStore={$streamable.media.streamStore}
                volume={$streamable.volume}
                outputDeviceId={$speakerSelectedStore}
                isBlocked={$streamable.media.isBlocked}
                on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
            />
        {/if}
    {/await}
{/if}
