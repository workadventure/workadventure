<script lang="ts">
    import { onMount } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/EmbedScreensStore";
    import { streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import MediaBox from "../../Video/MediaBox.svelte";
    import MyCamera from "../../MyCamera.svelte";
    import { myCameraStore } from "../../../Stores/MyMediaStore";
    import { isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";

    let layoutDom: HTMLDivElement;
    let displayFullMedias = isMediaBreakpointUp("md");

    const resizeObserver = new ResizeObserver(() => {
        displayFullMedias = isMediaBreakpointUp("md");
    });

    onMount(() => {
        resizeObserver.observe(layoutDom);
        highlightedEmbedScreen.removeHighlight();
    });
</script>

<div id="mozaic-layout" class="flex justify-center lg:pt-9" bind:this={layoutDom}>
    <div
        class="media-container grid mozaic-grid content-start"
        class:grid-cols-1={$streamableCollectionStore.size === 1}
        class:grid-cols-2={$streamableCollectionStore.size >= 2}
    >
        {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
            <MediaBox
                streamable={peer}
                mozaicSolo={$streamableCollectionStore.size === 1}
                mozaicDuo={$streamableCollectionStore.size === 2}
                mozaicQuarter={$streamableCollectionStore.size === 3 || $streamableCollectionStore.size >= 4}
            />
        {/each}
        {#if $myCameraStore && displayFullMedias}
            <MyCamera />
        {/if}
    </div>
    <div class="absolute self-end z-[300] bottom-6 md:bottom-4 right-5 ">
        {#if $myCameraStore && !displayFullMedias}
            <MyCamera />
        {/if}
    </div>
</div>

<style lang="scss">
</style>
