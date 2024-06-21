<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";
    import { afterUpdate } from "svelte";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";

    let isHightlighted = false;

    // highlightedEmbedScreen.subscribe((value) => {
    //     console.log("highlightedEmbedScreen VALUE", value);
    //     if (value) {
    //         isHightlighted = true;
    //     } else {
    //         isHightlighted = false;
    //     }
    // });
    // highlightFullScreen.subscribe((value) => {
    //     console.trace("highlightFullScreen VALUE", value);
    //     if (value) {
    //         isHightlighted = true;
    //     } else {
    //         isHightlighted = false;
    //     }
    // });

    afterUpdate(() => {
        checkOverflow();
    });

    function checkOverflow() {
        const camContainer = document.getElementById("cameras-container");
        if (camContainer) {
            if (camContainer.scrollWidth > camContainer.clientWidth) {
                camContainer.style.justifyContent = "flex-start";
            } else {
                camContainer.style.justifyContent = "center";
            }
        }
    }
    window.addEventListener("load", checkOverflow);
    window.addEventListener("resize", checkOverflow);
</script>

<div
    class="{isHightlighted ? 'highlight p-2 ' : 'not-highlighted p-2 '} {$highlightFullScreen && $highlightedEmbedScreen
        ? 'hidden'
        : ''} "
    id="cameras-container"
>
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if !highlightedEmbedScreen || $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div class={isHightlighted ? "w-[230px] all-cameras-highlighted" : "w-full all-cameras m-auto"}>
                    <MediaBox streamable={peer} />
                </div>
            {/key}
        {/if}
    {/each}

    {#if $myCameraStore}
        <div
            id="unique-mycam"
            class={isHightlighted ? "w-[230px] all-cameras-highlighted " : "w-full all-cameras m-auto"}
        >
            <MyCamera />
        </div>
    {/if}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style>
    .highlight {
        display: flex;
        justify-content: center;
        margin: 0;
        gap: 1rem;
        white-space: nowrap;
        position: relative;
        overflow-x: auto;
        overflow-y: hidden;
        margin: 0 auto;
        width: 80%;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
    }

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
        }
    }

    @container (min-width: 640px) and (max-width: 1024px) {
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(80px, 180px));
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
        }

        .highlight {
            display: flex;
            justify-content: center;
            margin: 0;
            gap: 1rem;
            white-space: nowrap;
            position: relative;
            overflow-x: auto;
            overflow-y: hidden;
            margin: 0 auto;
            width: 100%;
            max-width: 100%;
            -webkit-overflow-scrolling: touch;
        }
        .all-cameras-highlighted {
            min-width: 180px;
            max-width: 180px;
            display: block;
            float: none;
        }
    }
</style>
