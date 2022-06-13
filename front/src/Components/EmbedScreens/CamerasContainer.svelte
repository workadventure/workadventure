<script lang="ts">
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;
</script>

<aside class="cameras-container" class:full>
    {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
        {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
            <MediaBox streamable={peer} isClickable={clickable} />
        {/if}
    {/each}
</aside>

<style lang="scss">
    .cameras-container {
        flex: 0 0 25%;
        overflow-y: auto;
        overflow-x: hidden;
        pointer-events: auto;
        max-height: 100%;
        height: max-content;
        z-index: 152;

        &:first-child {
            margin-top: 2%;
        }

        &.full {
            flex: 0 0 100%;
        }
    }
</style>
