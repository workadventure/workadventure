<script lang="ts">
    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import Loading from "../../Video/Loading.svelte";
    import { jitsiLoadingStore } from "../../../Streaming/BroadcastService";
    import { highlightFullScreen, setHeight, setHeightScreenShare, setWidth } from "../../../Stores/ActionsCamStore";

    let camContainer: HTMLDivElement;
    let highlightScreen: HTMLDivElement;
    let unsubscribeHighlightEmbedScreen: Unsubscriber;

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

    $: window.innerHeight, resizeHeight();
    $: window.innerWidth, resizeHeight();

    function resizeHeight() {
        let availableHeight = window.innerHeight - (camContainer?.offsetHeight || 0) - 72;
        let availableWidth = window.innerWidth;
        if (availableHeight < 0) {
            availableHeight = 0;
        }
        setHeight.set(availableHeight);
        setWidth.set(availableWidth);
        setHeightScreenShare.set(availableHeight);
    }

    $: if ($highlightedEmbedScreen) modifySizeCamIfScreenShare();
    $: if ($highlightFullScreen) modifySizeCamIfScreenShare();

    function modifySizeCamIfScreenShare() {
        let containerCam = document.getElementById("container-media") as HTMLDivElement;
        if (containerCam) {
            if ($highlightedEmbedScreen !== undefined && !$highlightFullScreen) {
                containerCam.style.transform = "scale(0.7)";
                containerCam.style.marginTop = "-24px";
                containerCam.style.marginBottom = "-8px";
            } else {
                containerCam.style.transform = "scale(1)";
                containerCam.style.marginTop = "0px";
                containerCam.style.marginBottom = "0px";
            }
        }
    }

    onDestroy(() => {
        if (unsubscribeHighlightEmbedScreen) unsubscribeHighlightEmbedScreen();
    });

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
</script>

<div class="presentation-layout flex flex-col-reverse md:flex-col">
    {#if $streamableCollectionStore.size > 0 || $myCameraStore}
        <div class="justify-end md:justify-center" id="container-media" bind:this={camContainer}>
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
        <div
            id="video-container-receive"
            class="mb-8 md:mb-0{$highlightedEmbedScreen ? 'block' : 'hidden'}"
            bind:this={highlightScreen}
        >
            {#key $highlightedEmbedScreen.uniqueId}
                <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
            {/key}
        </div>
    {/if}
</div>

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
</style>
