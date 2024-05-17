<script lang="ts">
    import { afterUpdate } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import Loading from "../../Video/Loading.svelte";
    import { jitsiLoadingStore } from "../../../Streaming/BroadcastService";

    // function closeCoWebsite() {
    //     if ($highlightedEmbedScreen?.type === "cowebsite") {
    //         /* if the co-website is closable, would like we to close it instead of unloading it?
    //         if ($highlightedEmbedScreen.embed.isClosable()) {
    //             coWebsiteManager.closeCoWebsite($highlightedEmbedScreen.embed);
    //         }*/
    //         coWebsiteManager.unloadCoWebsite($highlightedEmbedScreen.embed).catch((err) => {
    //             console.error("Cannot unload co-website", err);
    //         });
    //     }
    // }

    afterUpdate(() => {
        if ($highlightedEmbedScreen) {
            // coWebsiteManager.resizeAllIframes();
        }
    });

    let layoutDom: HTMLDivElement;

    // let displayCoWebsiteContainer = isMediaBreakpointDown("lg");
    // let displayFullMedias = isMediaBreakpointUp("md");

    // const resizeObserver = new ResizeObserver(() => {
    //     displayCoWebsiteContainer = isMediaBreakpointDown("lg");
    //     displayFullMedias = isMediaBreakpointUp("md");

    //     if (!displayCoWebsiteContainer && $highlightedEmbedScreen && $highlightedEmbedScreen.type === "cowebsite") {
    //         highlightedEmbedScreen.removeHighlight();
    //     }

    //     if (displayFullMedias) {
    //         highlightedEmbedScreen.removeHighlight();
    //     }
    // });

    $: $highlightedEmbedScreen, reduceSizeIfScreenShare();

    function reduceSizeIfScreenShare() {
        let containerCam = document.getElementsByClassName("test-media")[0] as HTMLElement;
        if (containerCam) {
            if ($highlightedEmbedScreen) {
                containerCam.style.transform = "scale(0.7)";
                containerCam.style.marginTop = "-35px";
            } else {
                containerCam.style.transform = "scale(1)";
                containerCam.style.marginTop = "0px";
            }
        }
    }
</script>

<!-- class:full-medias={displayFullMedias} -->

<div id="presentation-layout" bind:this={layoutDom}>
    <!-- Div pour l'affichage de toutes les camera (other cam : cameContainer / my cam : MyCamera'-->

    {#if $streamableCollectionStore.size > 0 || $myCameraStore}
        <div class="grid grid-flow-col gap-x-4 justify-center test-media">
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

    <!-- Div pour la personne qui reçoit le partage d'écran -->

    <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"}>
        {#if $highlightedEmbedScreen}
            {#key $highlightedEmbedScreen.uniqueId}
                <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
            {/key}
        {/if}
    </div>

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
    <!-- {/if} -->
</div>

<!-- Props du composant camera container highlightedEmbedScreen={$highlightedEmbedScreen} -->
<style>
    #video-container-receive {
    }

    #presentation-layout.full-medias {
        overflow-y: auto;
        overflow-x: hidden;
    }

    #presentation-layout {
        display: flex;
        flex-direction: column;
    }

    .test-media {
        margin-bottom: -25px;
    }

    #embed-left-block {
        flex-direction: column;
        /* flex: 0 0 75%; */
        height: 100%;
        width: 75%;
        padding-bottom: 4rem;
    }

    #main-embed-screen .highlighted-cowebsite {
        height: 100% !important;
        width: 100% !important;
        position: relative;
    }

    #main-embed-screen .highlighted-cowebsite-container {
        height: 100% !important;
        width: 96%;
        background-color: rgba(0, 0, 0, 0.6);
        margin: 0 !important;
        padding: 0 !important;
    }

    #main-embed-screen .highlighted-cowebsite-container .actions {
        z-index: 151;
        position: absolute;
        width: 100%;
        top: 5px;
        right: 5px;
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        gap: 2%;
    }

    #main-embed-screen .highlighted-cowebsite-container .actions button {
        pointer-events: all;
    }

    @media (min-width: 768px) {
        #embed-left-block {
            flex: 0 0 65%;
        }
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
            scale: 0.5;
            margin-top: 0;
        }
    }
</style>
