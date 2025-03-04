<script lang="ts">
    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";

    let isHighlighted = false;
    let isMobile: boolean;
    let unsubscribeHighlightEmbedScreen: Unsubscriber;

    function updateScreenSize() {
        if (window.innerWidth <= 768) {
            isMobile = true;
        } else {
            isMobile = false;
        }
    }

    unsubscribeHighlightEmbedScreen = highlightedEmbedScreen.subscribe((value) => {
        checkOverflow();
        if (value) {
            isHighlighted = true;
        } else {
            isHighlighted = false;
        }
    });

    afterUpdate(() => {
        checkOverflow();
    });

    function checkOverflow() {
        const camContainer = document.getElementById("cameras-container");
        if (camContainer) {
            if (isMobile && $highlightedEmbedScreen) {
                if (camContainer.scrollWidth < camContainer.clientWidth) {
                    camContainer.style.justifyContent = "center";
                } else {
                    camContainer.style.justifyContent = "flex-start";
                }
            } else {
                if (camContainer.scrollWidth < camContainer.clientWidth) {
                    camContainer.style.justifyContent = "flex-start";
                } else {
                    camContainer.style.justifyContent = "center";
                }
            }
        }
    }

    onMount(() => {
        window.addEventListener("resize", updateScreenSize);
        window.addEventListener("load", checkOverflow);
        window.addEventListener("resize", checkOverflow);
    });

    onDestroy(() => {
        if (unsubscribeHighlightEmbedScreen) unsubscribeHighlightEmbedScreen();
        window.removeEventListener("load", checkOverflow);
        window.removeEventListener("resize", checkOverflow);
        window.removeEventListener("resize", updateScreenSize);
    });
</script>

<div
    class:hidden={$highlightFullScreen && $highlightedEmbedScreen}
    class:flex={isHighlighted}
    class:justify-center={isHighlighted}
    class:gap-4={isHighlighted}
    class:whitespace-nowrap={isHighlighted}
    class:relative={isHighlighted}
    class:overflow-x-auto={isHighlighted}
    class:overflow-y-hidden={isHighlighted}
    class:m-0={isHighlighted}
    class:mx-auto={isHighlighted}
    class:my-0={isHighlighted}
    class:w-full={isHighlighted}
    class:max-w-full={isHighlighted}
    class:not-highlighted={!isHighlighted}
    class:mt-0={!isHighlighted}
    class="pointer-events-none"
    id="cameras-container"
>
    {#if $myCameraStore && !$myJitsiCameraStore}
        <div
            id="unique-mycam"
            class={isHighlighted
                ? "w-[230px] all-cameras-highlighted pointer-events-auto"
                : "w-full h-full all-cameras m-auto pointer-event-auto"}
        >
            <MyCamera />
        </div>
    {/if}
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div
                    class={isHighlighted
                        ? " pointer-events-auto w-[230px] all-cameras-highlighted camera-box"
                        : "w-full h-full all-cameras m-auto camera-box"}
                >
                    <MediaBox streamable={peer} />
                </div>
            {/key}
        {/if}
    {/each}

    {#if $myJitsiCameraStore}
        <MediaBox streamable={$myJitsiCameraStore} flipX={true} muted={true} />
    {/if}
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
