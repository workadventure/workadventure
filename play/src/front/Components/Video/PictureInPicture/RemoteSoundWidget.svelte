<script lang="ts">
    import { onMount } from "svelte";
    import { Readable } from "svelte/store";
    import { Streamable } from "../../../Stores/StreamableCollectionStore";
    import { VideoPeer } from "../../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../../SoundMeterWidget.svelte";
    import MicOffIcon from "../../Icons/MicOffIcon.svelte";

    export let streamable: Streamable;
    export let isMinified = false;

    let volumeStore: Readable<number[] | undefined>;
    let constraintStore: Readable<MediaStreamConstraints | null>;

    onMount(() => {
        if ((streamable as VideoPeer).volumeStore) volumeStore = (streamable as VideoPeer).volumeStore;
        if ((streamable as VideoPeer).constraintsStore) constraintStore = (streamable as VideoPeer).constraintsStore;
    });
</script>

<div class="voice-meter-my-container justify-end z-[251] pr-2 absolute w-full top-0">
    {#if volumeStore && $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget volume={$volumeStore} classcss="" barColor="blue" />
    {:else if isMinified}
        <MicOffIcon width="w-4" height="h-4" />
    {:else}
        <MicOffIcon width="w-8" height="h-8" />
    {/if}
</div>
