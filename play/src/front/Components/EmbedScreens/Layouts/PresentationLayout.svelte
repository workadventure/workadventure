<script lang="ts">
    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import { highlightFullScreen, setHeightScreenShare } from "../../../Stores/ActionsCamStore";

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
        if (camContainer) {
            if ($highlightedEmbedScreen !== undefined && !$highlightFullScreen) {
                camContainer.style.transform = "scale(0.7)";
                camContainer.style.marginTop = "-24px";
                camContainer.style.marginBottom = "-8px";
            } else {
                camContainer.style.transform = "scale(1)";
                camContainer.style.marginTop = "0px";
                camContainer.style.marginBottom = "0px";
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

<div class="presentation-layout  flex mobile:flex-col-reverse flex-col pointer-events-none h-full w-full absolute">
    {#if $streamableCollectionStore.size > 0 || $myCameraStore || $myJitsiCameraStore}
        <div class="justify-end md:justify-center" bind:this={camContainer}>
            {#if ($streamableCollectionStore.size > 0 && $proximityMeetingStore === true) || $myCameraStore || $myJitsiCameraStore}
                <CamerasContainer />
            {/if}
        </div>
    {/if}

    {#if $streamableCollectionStore.size > 0 && $proximityMeetingStore === true && $highlightedEmbedScreen}
        <div id="video-container-receive" class="mb-8 md:mb-0 flex-1" bind:this={highlightScreen}>
            {#key $highlightedEmbedScreen.uniqueId}
                <MediaBox isHighlighted={true} streamable={$highlightedEmbedScreen} />
            {/key}
        </div>
    {/if}
</div>

<style>
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
