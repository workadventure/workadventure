<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
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
    import { hideMode, rightMode } from "../../../Stores/ActionsCamStore";

    const isMobile = window.matchMedia("(max-width: 767px)");
    let isVertical: boolean;
    let currentHighlightedEmbedScreen: Streamable | undefined;
    let isHightlighted = false;

    onMount(() => {
        isMobile.addEventListener("change", (e: any) => handleTabletChange(e));
        handleTabletChange(isMobile);
    });

    highlightedEmbedScreen.subscribe((value) => {
        currentHighlightedEmbedScreen = value;
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

    function modifySizeCamIfScreenShare() {
        let containerCam = document.querySelector(".container-media") as HTMLDivElement;
        if (containerCam && currentHighlightedEmbedScreen !== undefined) {
            containerCam.style.transform = "scale(0.7)";
            containerCam.style.marginTop = "-25px";
            containerCam.style.marginBottom = "-25px";
        } else if (containerCam && currentHighlightedEmbedScreen === undefined) {
            containerCam.style.transform = "scale(1)";
            containerCam.style.marginTop = "0px";
            containerCam.style.marginBottom = "0px";
        }
    }

    $: $rightMode, setRightMode();

    function setRightMode() {
        console.log($rightMode);
        console.log(isVertical);
        console.log("je suis dans le right mode");
        if ($rightMode && !isVertical) {
            console.log("je suis dans le if du right mode");
            let containerLayoutCam = document.getElementById("right-mode");
            console.log(containerLayoutCam);
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

    highlightedEmbedScreen.subscribe((value) => {
        console.log("je suis dans le presentation layout");
        if (value) {
            isHightlighted = true;
            console.log(isHightlighted);
        } else {
            isHightlighted = false;
            console.log(isHightlighted);
        }
    });
</script>

<!-- class:full-medias={displayFullMedias} -->

<div class={isHightlighted ? "presentation-layout md:flex flex-col" : ""}>
    {#if $streamableCollectionStore.size > 0 || $myCameraStore}
        <div class="justify-end md:justify-center {isHightlighted ? 'mb-2' : ''}" id="container-media">
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

    <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"}>
        {#if $highlightedEmbedScreen}
            {#key $highlightedEmbedScreen.uniqueId}
                <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
            {/key}
        {/if}
    </div>
</div>
<!-- {#if isVertical}{:else}
        <div class="horizontal">
            {#if $streamableCollectionStore.size > 0 || $myCameraStore}
                <div class="grid grid-flow-col gap-x-4 justify-center container-media" id="container-media">
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
            <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"}>
                {#if $highlightedEmbedScreen}
                    {#key $highlightedEmbedScreen.uniqueId}
                        <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
                    {/key}
                {/if}
            </div>
        </div>
    {/if} -->

<!-- TODO HUGO Commented Why ?
        {#if $streamableCollectionStore.size > 0 || $myCameraStore}
            <div
                class="relative self-end z-[300] bottom-6 md:bottom-4 max-w-[25%] w-full"
                class:w-[10%]={$highlightedEmbedScreen != undefined}
            >
                {#if $jitsiLoadingStore}
                    <Loading />
                {/if}
                {#if $streamableCollectionStore.size > 0}
                    <CamerasContainer highlightedEmbedScreen={$highlightedEmbedScreen} />
                {/if}
                {#if $myCameraStore && !$liveStreamingEnabledStore}
                    <MyCamera />
                {/if}
                {#if $myJitsiCameraStore}
                    <MediaBox streamable={$myJitsiCameraStore} isClickable={false} />
                {/if}
            </div>
        {/if}
    -->
<style>
    /* .right-mode-on {
        display: flex;
        flex-direction: column;
        background-color: red;
    } */

    .fullscreen {
        scale: 1.4;
    }
    .presentation-layout {
        overflow-y: auto;
        overflow-x: hidden;
    }

    .presentation-layout {
        display: flex;
        flex-direction: column;
    }

    @media (min-width: 576px) {
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
