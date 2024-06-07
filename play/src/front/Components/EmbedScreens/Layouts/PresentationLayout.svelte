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

    let layoutDom: HTMLDivElement;
    const isMobile = window.matchMedia("(max-width: 767px)");
    let isVertical: boolean;
    let currentHighlightedEmbedScreen: Streamable | undefined;

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
</script>

<!-- class:full-medias={displayFullMedias} -->

<div id="presentation-layout" bind:this={layoutDom}>
    {#if isVertical}
        <div class="vertical">
            <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"}>
                {#if $highlightedEmbedScreen}
                    {#key $highlightedEmbedScreen.uniqueId}
                        <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
                    {/key}
                {/if}
            </div>

            {#if $streamableCollectionStore.size > 0 || $myCameraStore}
                <div
                    class="grid grid-flow-col gap-x-4 {$highlightedEmbedScreen
                        ? 'justify-end'
                        : 'justify-center'} vertical"
                    id="container-media"
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
        </div>
    {:else}
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
    {/if}

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
</div>

<style>
    #presentation-layout {
        overflow-y: auto;
        overflow-x: hidden;
    }

    #presentation-layout {
        display: flex;
        flex-direction: column;
    }

    @media (min-width: 576px) {
        #presentation-layout {
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
