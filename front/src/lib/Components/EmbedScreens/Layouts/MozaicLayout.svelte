<!-- <script lang="ts">
    import { onMount } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import MediaBox from "../../Video/MediaBox.svelte";
    import MyCamera from "../../MyCamera.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";

    export let cardHeight = 196;
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

<div id="mozaic-layout" class="flex justify-center content-center items-center lg:pt-9 pb-16" bind:this={layoutDom}>
    <div
    id="mozaic-layout"
    class="flex justify-center content-center items-center w-full lg:pt-9 pb-16"
    bind:this={layoutDom}
>
    <div
        class="media-container grid mozaic-grid content-start backdrop-blur-sm bg-black/20 pointer-events-auto w-full max-h-full overflow-y-auto"
        class:grid-cols-1={$streamableCollectionStore.size === 1}
        class:grid-cols-2={$streamableCollectionStore.size >= 2}
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
        {#if $myJitsiCameraStore}
            <MediaBox
                streamable={$myJitsiCameraStore}
                isClickable={false}
                mozaicSolo={$streamableCollectionStore.size === 1}
                mozaicDuo={$streamableCollectionStore.size === 2}
                mozaicQuarter={$streamableCollectionStore.size === 3 || $streamableCollectionStore.size >= 4}
            />
        {/if}
    </div>
    <div class="absolute self-end z-[300] bottom-6 md:bottom-4 right-5">
        {#if $myCameraStore && !displayFullMedias}
            <MyCamera />
        {/if}
    </div>
</div>

<style lang="scss">
</style> -->
