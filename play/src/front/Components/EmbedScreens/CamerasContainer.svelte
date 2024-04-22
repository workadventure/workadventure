<script lang="ts">
    import { fly } from "svelte/transition";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { focusMode, rightMode, hideMode } from "../../Stores/ActionsCamStore";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;
</script>

<aside class:full in:fly|local={{ x: 200, duration: 100 }}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- grid-flow-col grid-flow-col -->
    <div class="other-cameras overflow-visible content-center flex gap-x-4 justify-center">
        {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
            {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
                {#key uniqueId}
                    <MediaBox streamable={peer} />
                {/key}
            {/if}
        {/each}
    </div>
</aside>

<!-- isClickable={clickable} -->
<style>
</style>
