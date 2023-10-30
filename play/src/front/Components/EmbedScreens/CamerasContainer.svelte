<script lang="ts">
    import { fly } from "svelte/transition";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;
</script>


{#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
    {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
        {#key uniqueId}
            <MediaBox streamable={peer} isClickable={clickable} />
        {/key}
    {/if}
{/each}

<style lang="scss">
</style>
