<script lang="ts">
    import { onMount } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import { streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import MediaBox from "../../Video/MediaBox.svelte";
    import MyCamera from "../../MyCamera.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
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

<div id="mozaic-layout" class="tw-flex tw-justify-center lg:tw-pt-9" bind:this={layoutDom}>
    <div
        class="media-container tw-grid mozaic-grid tw-content-start"
        class:tw-grid-cols-1={$streamableCollectionStore.size === 1}
        class:tw-grid-cols-2={$streamableCollectionStore.size >= 2}
    >
        {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
            <MediaBox
                streamable={peer}
                mozaicSolo={$streamableCollectionStore.size === 1}
                mozaicDuo={$streamableCollectionStore.size === 2}
                mozaicQuarter={$streamableCollectionStore.size === 3 || $streamableCollectionStore.size >= 4}
            />
        {/each}
        {#if $myCameraStore && displayFullMedias && $proximityMeetingStore === true}
            <MyCamera />
        {/if}
    </div>
    <div class="tw-absolute tw-self-end tw-z-[300] tw-bottom-6 md:tw-bottom-4 tw-right-5 ">
        {#if $myCameraStore && !displayFullMedias}
            <MyCamera />
        {/if}
    </div>
</div>

<style lang="scss">
</style>
