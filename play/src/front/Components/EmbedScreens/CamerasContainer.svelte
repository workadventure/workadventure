<script lang="ts">
    import { fly } from "svelte/transition";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    let rightMode = false;
    $: clickable = !full;
</script>

<aside class:full in:fly|local={{ x: 200, duration: 100 }}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="other-cameras overflow-visible flex content-center gap-4">
        {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
            {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
                {#key uniqueId}
                    <MediaBox streamable={peer} isClickable={clickable} />
                {/key}
            {/if}
        {/each}
    </div>
</aside>
