<script lang="ts">
    import { onMount } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/EmbedScreensStore";
    import { streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import MediaBox from "../../Video/MediaBox.svelte";

    let layoutDom: HTMLDivElement;

    const resizeObserver = new ResizeObserver(() => {});

    onMount(() => {
        resizeObserver.observe(layoutDom);
        highlightedEmbedScreen.removeHighlight();
    });
</script>

<div id="mozaic-layout" class="tw-flex tw-justify-center lg:tw-pt-9" bind:this={layoutDom}>
    <div
        class="media-container tw-grid mozaic-grid tw-content-start"
        class:tw-grid-cols-1={$streamableCollectionStore.size === 1}
        class:tw-grid-cols-2={$streamableCollectionStore.size >= 2}
    >
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            <MediaBox
                streamable={peer}
                mozaicSolo={$streamableCollectionStore.size === 1}
                mozaicDuo={$streamableCollectionStore.size === 2}
                mozaicQuarter={$streamableCollectionStore.size === 3 || $streamableCollectionStore.size >= 4}
            />
        {/each}
    </div>
</div>

<style lang="scss">
</style>
