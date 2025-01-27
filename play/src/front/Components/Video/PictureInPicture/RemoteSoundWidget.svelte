<script lang="ts">
    import { onMount } from "svelte";
    import { Readable } from "svelte/store";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../../SoundMeterWidget.svelte";
    import microphoneOffImg from "../../images/microphone-off.png";

    export let streamable: Streamable;
    export let isMinified = false;

    let volumeStore: Readable<number[] | undefined>;
    let constraintStore: Readable<MediaStreamConstraints | null>;

    onMount(() => {
        if ((streamable as VideoPeer).volumeStore) volumeStore = (streamable as VideoPeer).volumeStore;
        if ((streamable as VideoPeer).constraintsStore) constraintStore = (streamable as VideoPeer).constraintsStore;
    });
</script>

<div class="voice-meter-my-container tw-justify-end tw-z-[251] tw-pr-2 tw-absolute tw-w-full tw-top-0">
    {#if volumeStore && $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget volume={$volumeStore} classcss="" barColor="blue" />
    {:else if isMinified}
        <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-4 tw-w-4" alt="Mute" />
    {:else}
        <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
    {/if}
</div>
