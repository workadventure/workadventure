<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";

    export let oneLineMaxHeight: number;

    let isOnOneLine = true;

    let containerWidth: number;

    $: maxMediaBoxWidth = (oneLineMaxHeight * 16) / 9;

    // The minimum width of a media box in pixels
    const minMediaBoxWidth = 120;

    $: videoWidth = Math.max(
        Math.min(maxMediaBoxWidth, containerWidth / $streamableCollectionStore.size),
        minMediaBoxWidth
    );
</script>

<div
    bind:clientWidth={containerWidth}
    class={"pointer-events-none " + isOnOneLine ? "max-h-full" : ""}
    class:hidden={$highlightFullScreen && $highlightedEmbedScreen}
    class:flex={isOnOneLine}
    class:justify-start={isOnOneLine}
    class:gap-4={isOnOneLine}
    class:whitespace-nowrap={isOnOneLine}
    class:relative={isOnOneLine}
    class:overflow-x-auto={isOnOneLine}
    class:overflow-y-hidden={isOnOneLine}
    class:pb-3={isOnOneLine}
    class:m-0={isOnOneLine}
    class:my-0={isOnOneLine}
    class:w-full={isOnOneLine}
    class:max-w-full={isOnOneLine}
    class:not-highlighted={!isOnOneLine}
    class:mt-0={!isOnOneLine}
    id="cameras-container"
>
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div
                    style="width: {videoWidth}px; max-width: {videoWidth}px;"
                    class={isOnOneLine
                        ? " pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box aspect-video first-of-type:ml-auto last-of-type:mr-auto"
                        : "w-full h-full all-cameras m-auto camera-box"}
                >
                    <MediaBox streamable={peer} />
                </div>
            {/key}
        {/if}
    {/each}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style lang="scss">
    .hidden {
        display: none !important;
    }

    .all-cameras-highlighted {
        min-width: 230px;
        max-width: 230px;
        float: none;
        display: inline-block;
        zoom: 1;
    }

    .not-highlighted {
        display: grid;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(120px, 280px));
        grid-template-rows: repeat(auto-fit, 158px);
    }

    @container (min-width: 1024) and (max-width: 1279px) {
        .all-cameras-highlighted {
            min-width: 200px;
            max-width: 200px;
            float: none;
            display: inline-block;
            zoom: 1;
        }
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(90px, 220px));
            grid-template-rows: repeat(auto-fit, 124px);
        }
    }

    @container (min-width: 640px) and (max-width: 1024px) {
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(80px, 180px));
            grid-template-rows: repeat(auto-fit, 101px);
        }

        .all-cameras-highlighted {
            min-width: 180px;
            max-width: 180px;
            display: inline-block;
            float: none;
        }
    }

    @container (max-width: 640px) {
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(70px, 140px));
            grid-template-rows: repeat(auto-fit, 79px);
        }

        .all-cameras-highlighted {
            min-width: 180px;
            max-width: 180px;
            display: block;
            float: none;
        }
    }
</style>
