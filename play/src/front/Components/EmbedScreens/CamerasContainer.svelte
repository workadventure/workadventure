<script lang="ts">
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { fly, fade } from "svelte/transition";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;
</script>

<aside class="cameras-container" class:full in:fly={{ x: 200, duration: 100 }} out:fade>
    <div class="other-cameras">
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
                <MediaBox streamable={peer} isClickable={clickable} />
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
