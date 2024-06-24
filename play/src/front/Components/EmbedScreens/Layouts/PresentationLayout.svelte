<script lang="ts">
    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import {
        Streamable,
        myJitsiCameraStore,
        streamableCollectionStore,
    } from "../../../Stores/StreamableCollectionStore";
    import Loading from "../../Video/Loading.svelte";
    import { jitsiLoadingStore } from "../../../Streaming/BroadcastService";
    import { rightMode, hideMode, highlightFullScreen } from "../../../Stores/ActionsCamStore";

    const isMobile = window.matchMedia("(max-width: 767px)");
    let isVertical: boolean;
    let currentHighlightedEmbedScreen: Streamable | undefined;
    let isHightlighted = false;
    let camContainer: HTMLDivElement;
    let highlightScreen: any;

    const windowSize = writable({
        height: window.innerHeight,
        camHeight: 0,
        screenShareHeight: 0,
    });

    const handleResize = () => {
        windowSize.set({
            height: window.innerHeight,
            camHeight: camContainer?.offsetHeight || 0,
            screenShareHeight: highlightScreen?.offsetHeight || 0,
        });
        resizeHeight();
    };

    onMount(() => {
        isMobile.addEventListener("change", (e: any) => handleTabletChange(e));
        handleTabletChange(isMobile);

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    });

    function resizeHeight() {
        console.log("FENETRE", window.innerHeight);
        let totalElementsHeight = camContainer.offsetHeight + highlightScreen.offsetHeight + 72;
        if (totalElementsHeight > window.innerHeight) {
            console.log("je suis dans le if");
            let containerCam = document.getElementById("container-media") as HTMLDivElement;
            containerCam.style.height = `${window.innerHeight - 72}px`;
        }
    }

    highlightedEmbedScreen.subscribe((value) => {
        currentHighlightedEmbedScreen = value;
        if (value) {
            isHightlighted = true;
        } else {
            isHightlighted = false;
        }
    });

    function handleTabletChange(e: MediaQueryList) {
        if (e.matches) {
            isVertical = true;
        } else {
            isVertical = false;
        }
    }

    afterUpdate(() => {
        modifySizeCamIfScreenShare();
    });

    $: if ($highlightedEmbedScreen) modifySizeCamIfScreenShare();
    $: if ($highlightFullScreen) modifySizeCamIfScreenShare();

    function modifySizeCamIfScreenShare() {
        let containerCam = document.getElementById("container-media") as HTMLDivElement;
        if (containerCam && currentHighlightedEmbedScreen !== undefined && !$highlightFullScreen) {
            containerCam.style.transform = "scale(0.7)";
            containerCam.style.marginTop = "-25px";
            containerCam.style.marginBottom = "-10px";
        } else {
            containerCam.style.transform = "scale(1)";
            containerCam.style.marginTop = "0px";
            containerCam.style.marginBottom = "0px";
        }
    }

    $: $rightMode, setRightMode();

    function setRightMode() {
        if ($rightMode && !isVertical) {
            let containerLayoutCam = document.getElementById("right-mode");
            containerLayoutCam?.classList.add("right-mode-on");
            // Cette div est nul mais dans l'idéé je veux faire qqch comme cela
        } else {
            let containerLayoutCam = document.getElementById("right-mode");
            containerLayoutCam?.classList.remove("right-mode-on");
        }
    }

    $: if ($hideMode && $highlightedEmbedScreen) setHideMode();

    function setHideMode() {
        // ATTENTION NE PLUS RENDRE CLICKABLE LE SCREENSHARE CAR SINON PLUS RIEN
        let containerLayoutCam = document.getElementById("container-media");
        let containerScreenShare = document.getElementById("video-container-receive");

        if ($hideMode && !isVertical) {
            containerLayoutCam?.classList.add("hidden");

            if (containerScreenShare) {
                containerScreenShare.classList.add("fullscreen");
            }
        } else if (!$hideMode && !isVertical) {
            containerLayoutCam?.classList.remove("hidden");

            if (containerScreenShare) {
                containerScreenShare.style.transform = "scale(1)";
            }
        }
    }

    onDestroy(() => {
        isMobile.removeEventListener("change", (e: any) => handleTabletChange(e));
    });

    // function calcHeight() {
    //     console.log("je suis dans le calc height");
    //     let containerCam = document.getElementById("container-media") as HTMLDivElement;
    //     console.log("container cam", containerCam);
    //     if (containerCam) {
    //         let height = containerCam.clientHeight;
    //         console.log("height de container cam :", height);
    //         let windowHeight = window.innerHeight;
    //         console.log("window height :", windowHeight);
    //     }
    // }
</script>

<!-- class:full-medias={displayFullMedias} -->

<!-- <div class={isHightlighted ? "presentation-layout flex flex-col-reverse md:flex-col" : ""}> -->
{#if $streamableCollectionStore.size > 0 || $myCameraStore}
    <div
        class="justify-end md:justify-center gc -m {isHightlighted ? 'mb-2' : ''}"
        id="container-media"
        bind:this={camContainer}
    >
        {#if $jitsiLoadingStore}
            <Loading />
        {/if}
        {#if $streamableCollectionStore.size > 0 && $proximityMeetingStore === true && $myCameraStore}
            <CamerasContainer />
        {/if}
        {#if $myJitsiCameraStore}
            <MediaBox streamable={$myJitsiCameraStore} isClickable={false} />
        {/if}
    </div>
{/if}

{#if $streamableCollectionStore.size > 0 && $proximityMeetingStore === true && $highlightedEmbedScreen}
    <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"} bind:this={highlightScreen}>
        {#key $highlightedEmbedScreen.uniqueId}
            <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
        {/key}
    </div>
{/if}

<style>
    @container (min-width: 576px) {
        .presentation-layout {
            position: fixed;
            left: 0;
            width: 100%;
            z-index: 9999;
        }
    }

    @container (max-width: 767px) {
        .video-container-receive {
            margin-top: 0;
        }

        .container-media {
            margin-top: -70px;
        }
    }
    /*
    @container {

    } */

    /* .right-mode-on {
        display: flex;
        flex-direction: column;
        background-color: red;
    } */
</style>
