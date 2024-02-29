<script lang="ts">
    import { fly } from "svelte/transition";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;
</script>

<aside
    class="cameras-container tw-overflow-visible"
    style="overflow-y: auto;"
    class:full
    in:fly|local={{ x: 200, duration: 100 }}
>
    <div class="other-cameras tw-overflow-visible tw-flex tw-flex-col tw-content-center tw-gap-2">
        {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
            {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
                {#key uniqueId}
                    <MediaBox streamable={peer} isClickable={clickable} />
                {/key}
            {/if}
        {/each}
    </div>
</aside>

<style lang="scss">
    .cameras-container {
        &:first-child {
            margin-top: 2%;
        }
        &.full {
            flex: 0 0 100%;
        }
    }
</style>
