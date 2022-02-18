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

<div id="mozaic-layout" bind:this={layoutDom}>
    <div
        class="media-container"
        class:full-width={$streamableCollectionStore.size === 1 || $streamableCollectionStore.size === 2}
        class:quarter={$streamableCollectionStore.size === 3 || $streamableCollectionStore.size === 4}
    >
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            <MediaBox
                streamable={peer}
                mozaicSolo={$streamableCollectionStore.size === 1}
                mozaicFullWidth={$streamableCollectionStore.size === 1 || $streamableCollectionStore.size === 2}
                mozaicQuarter={$streamableCollectionStore.size === 3 || $streamableCollectionStore.size >= 4}
            />
        {/each}
    </div>
</div>

<style lang="scss">
    #mozaic-layout {
        height: 100%;
        width: 100%;
        overflow-y: auto;
        overflow-x: hidden;

        .media-container {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: 33.3% 33.3% 33.3%;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            overflow-x: hidden;

            &.full-width {
                grid-template-columns: 100%;
                grid-template-rows: 50% 50%;
            }

            &.quarter {
                grid-template-columns: 50% 50%;
                grid-template-rows: 50% 50%;
            }
        }
    }
</style>
