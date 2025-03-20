<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import { writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import { highlightFullScreen, setHeightScreenShare } from "../../../Stores/ActionsCamStore";

    let camContainer: HTMLDivElement;
    let highlightScreen: HTMLDivElement;

    const windowSize = writable({
        height: window.innerHeight,
        width: window.innerWidth,
        camHeight: 0,
        screenShareHeight: 0,
    });

    const handleResize = () => {
        windowSize.set({
            height: window.innerHeight,
            width: window.innerWidth,
            camHeight: camContainer?.offsetHeight || 0,
            screenShareHeight: highlightScreen?.offsetHeight || 0,
        });
        resizeHeight();
    };

    afterUpdate(() => {
        modifySizeCamIfScreenShare();
    });

    onMount(() => {
        resizeHeight();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    });

    function resizeHeight() {
        let availableHeight = window.innerHeight - (camContainer?.offsetHeight || 0) - 72;
        if (availableHeight < 0) {
            availableHeight = 0;
        }
        setHeightScreenShare.set(availableHeight);
    }

    $: if ($highlightedEmbedScreen) modifySizeCamIfScreenShare();
    $: if ($highlightFullScreen) modifySizeCamIfScreenShare();

    function modifySizeCamIfScreenShare() {
        /*if (camContainer) {
            if ($highlightedEmbedScreen !== undefined && !$highlightFullScreen) {
                camContainer.style.transform = "scale(0.7)";
                camContainer.style.marginTop = "-24px";
                camContainer.style.marginBottom = "-8px";
            } else {
                camContainer.style.transform = "scale(1)";
                camContainer.style.marginTop = "0px";
                camContainer.style.marginBottom = "0px";
            }
        }*/
    }

    // $: $rightMode, setRightMode();

    // function setRightMode() {
    //     if ($rightMode && !isVertical) {
    //         let containerLayoutCam = document.getElementById("right-mode");
    //         containerLayoutCam?.classList.add("right-mode-on");
    //         // Cette div est nul mais dans l'idéé je veux faire qqch comme cela
    //     } else {
    //         let containerLayoutCam = document.getElementById("right-mode");
    //         containerLayoutCam?.classList.remove("right-mode-on");
    //     }
    // }

    // $: if ($hideMode && $highlightedEmbedScreen) setHideMode();

    // function setHideMode() {
    //     // ATTENTION NE PLUS RENDRE CLICKABLE LE SCREENSHARE CAR SINON PLUS RIEN

    //     if ($hideMode && !isVertical) {
    //         camContainer?.classList.add("hidden");

    //         if (highlightScreen) {
    //             highlightScreen.classList.add("fullscreen");
    //         }
    //     } else if (!$hideMode && !isVertical) {
    //         if (highlightScreen) {
    //             highlightScreen.style.transform = "scale(1)";
    //         }
    //     }
    // }
    let containerHeight: number;

    $: isOnOneLine =
        ($streamableCollectionStore.size > 0 && $highlightedEmbedScreen !== undefined) ||
        $streamableCollectionStore.size === 1;

    $: oneLineMaxHeight = containerHeight * 0.25;
</script>

{#if $proximityMeetingStore === true}
    <div
        class="presentation-layout flex flex-col pointer-events-none h-full w-full absolute mobile:mt-3"
        bind:clientHeight={containerHeight}
    >
        {#if $streamableCollectionStore.size > 0}
            <div
                class="justify-end md:justify-center w-full {!isOnOneLine ? 'h-3/4' : ''}"
                class:max-height-quarter={isOnOneLine}
                bind:this={camContainer}
            >
                {#if $streamableCollectionStore.size > 0}
                    <CamerasContainer {oneLineMaxHeight} {isOnOneLine} />
                {/if}
            </div>
        {/if}

        {#if $streamableCollectionStore.size > 0 && $highlightedEmbedScreen}
            <div id="video-container-receive" class="mb-8 md:mb-0 flex-1" bind:this={highlightScreen}>
                {#key $highlightedEmbedScreen.uniqueId}
                    <MediaBox isHighlighted={true} streamable={$highlightedEmbedScreen} />
                {/key}
            </div>
        {/if}
    </div>
{/if}

<style>
    .max-height-quarter {
        max-height: 25%;
    }
    /*@container (min-width: 576px) {*/
    /*    .presentation-layout {*/
    /*        position: fixed;*/
    /*        left: 0;*/
    /*        width: 100%;*/
    /*        z-index: 9999;*/
    /*    }*/
    /*}*/

    /*@container (max-width: 767px) {*/
    /*    .video-container-receive {*/
    /*        margin-top: 0;*/
    /*    }*/

    /*    .container-media {*/
    /*        margin-top: -70px;*/
    /*    }*/
    /*}*/
</style>
