<script lang="ts">
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { fly, fade } from "svelte/transition";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;
</script>

<aside class="cameras-container tw-self-end tw-relative" class:full in:fly={{ x: 200, duration: 100 }} out:fade>
    <div class="other-cameras tw-flex tw-flex-col">
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
                <MediaBox streamable={peer} isClickable={clickable} />
            {/if}
        {/each}
    </div>
</aside>

<style lang="scss">
    .cameras-container {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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
