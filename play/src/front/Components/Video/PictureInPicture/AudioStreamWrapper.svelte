<svelte:options immutable={true} />

<script lang="ts">
    import { writable } from "svelte/store";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../../Stores/MediaStore";
    import type { VideoBox } from "../../../Space/VideoBox";
    import AudioStream from "./AudioStream.svelte";

    export let videoBox: VideoBox;
    const streamable = videoBox.streamable;

    $: muteAudioStore = $streamable?.muteAudio;
    $: muteAudio = $muteAudioStore ?? false;

    $: hasAudio = $streamable?.hasAudio ?? writable(false);
</script>

{#if $streamable && ($streamable?.media.type === "webrtc" || $streamable?.media.type === "livekit") && !muteAudio && $hasAudio}
    <AudioStream
        streamStore={$streamable.media.streamStore}
        volume={$streamable.volume}
        outputDeviceId={$speakerSelectedStore}
        isBlocked={$streamable.media.isBlocked}
        on:selectOutputAudioDeviceError={() => selectDefaultSpeaker()}
    />
{/if}
