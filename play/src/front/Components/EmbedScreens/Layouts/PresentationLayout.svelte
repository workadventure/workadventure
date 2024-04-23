<script lang="ts">
    import { afterUpdate, onDestroy, onMount } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { coWebsiteManager } from "../../../WebRtc/CoWebsiteManager";
    import { isMediaBreakpointDown, isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import MyCamera from "../../MyCamera.svelte";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import Loading from "../../Video/Loading.svelte";
    import { jitsiLoadingStore } from "../../../Streaming/BroadcastService";

    let widthWindow: number;
    let totalCamWidth = 0;
    let camWidthOther = 350;
    let camWidth = 350;
    let divWith;

    function closeCoWebsite() {
        if ($highlightedEmbedScreen?.type === "cowebsite") {
            /* if the co-website is closable, would like we to close it instead of unloading it?
            if ($highlightedEmbedScreen.embed.isClosable()) {
                coWebsiteManager.closeCoWebsite($highlightedEmbedScreen.embed);
            }*/
            coWebsiteManager.unloadCoWebsite($highlightedEmbedScreen.embed).catch((err) => {
                console.error("Cannot unload co-website", err);
            });
        }
    }

    afterUpdate(() => {
        if ($highlightedEmbedScreen) {
            coWebsiteManager.resizeAllIframes();
        }
    });

    let layoutDom: HTMLDivElement;

    let displayCoWebsiteContainer = isMediaBreakpointDown("lg");
    let displayFullMedias = isMediaBreakpointUp("md");

    const resizeObserver = new ResizeObserver(() => {
        displayCoWebsiteContainer = isMediaBreakpointDown("lg");
        displayFullMedias = isMediaBreakpointUp("md");

        if (!displayCoWebsiteContainer && $highlightedEmbedScreen && $highlightedEmbedScreen.type === "cowebsite") {
            highlightedEmbedScreen.removeHighlight();
        }

        if (displayFullMedias) {
            highlightedEmbedScreen.removeHighlight();
        }
    });

    onMount(() => {
        resizeObserver.observe(layoutDom);
        widthWindow = window.innerWidth;
        console.log("width", widthWindow);
        handleCamMounted();
        getWidth();
    });

    onDestroy(() => {
        handleCamDestroy();
    });

    // Idée pour le responsive de cams

    // Calculer la taille de la div de toutes les cam donc de grid flow col
    // Si cette taille est supérieur a celle de l'écran alors on stack la camera en dessous
    //

    function getWidth() {
        divWith = document.getElementById("presentation-layout")?.offsetWidth;
        console.log("GET WIDTH OF PRESENTATION LAYOUT", divWith);
    }

    function handleCamMounted() {
        totalCamWidth += camWidth;
        totalCamWidth += camWidthOther;
        console.log("totalCamWidth", totalCamWidth);
    }

    function handleCamDestroy() {
        totalCamWidth -= camWidth;
        console.log("totalCamWidth", totalCamWidth);
    }

    // function stackCam() {
    //     if (totalCamWidth > widthWindow) {
    //         return true;
    //     }
    //     return false;
    // }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div id="presentation-layout" bind:this={layoutDom} class:full-medias={displayFullMedias}>
    {#if displayFullMedias}
        {#if $streamableCollectionStore.size > 0 || $myCameraStore}
            <div id="full-medias" class="z-[300] relative mx-auto top-8 h-1/2 overflow-y-auto h-full">
                {#if $jitsiLoadingStore}
                    <Loading />
                {/if}
                {#if $streamableCollectionStore.size > 0}
                    <CamerasContainer full={true} highlightedEmbedScreen={$highlightedEmbedScreen} />
                {/if}
                {#if $myCameraStore && $proximityMeetingStore === true}
                    <MyCamera />
                {/if}
                {#if $myJitsiCameraStore}
                    <MediaBox streamable={$myJitsiCameraStore} isClickable={false} />
                {/if}
            </div>
        {/if}
    {:else}
        {#if $streamableCollectionStore.size > 0 || $myCameraStore}
            <div class="grid grid-flow-col gap-x-4 justify-center container-cam">
                {#if $jitsiLoadingStore}
                    <Loading />
                {/if}
                {#if $streamableCollectionStore.size > 0}
                    <CamerasContainer full={true} highlightedEmbedScreen={$highlightedEmbedScreen} />
                {/if}
                {#if $myCameraStore}
                    <!-- && !$megaphoneEnabledStore TODO HUGO -->
                    <MyCamera />
                {/if}
                {#if $myJitsiCameraStore}
                    <MediaBox streamable={$myJitsiCameraStore} isClickable={false} />
                {/if}
            </div>
        {/if}

        <!-- Div pour la personne qui reçoit le partage d'écran -->

        <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"}>
            <div id="">
                {#if $highlightedEmbedScreen}
                    {#if $highlightedEmbedScreen.type === "streamable"}
                        {#key $highlightedEmbedScreen.embed.uniqueId}
                            <MediaBox
                                isHightlighted={true}
                                isClickable={true}
                                streamable={$highlightedEmbedScreen.embed}
                            />
                        {/key}
                    {:else if $highlightedEmbedScreen.type === "cowebsite"}
                        {#key $highlightedEmbedScreen.embed.getId()}
                            <div class="highlighted-cowebsite-container">
                                <div
                                    id={"cowebsite-slot-" + $highlightedEmbedScreen.embed.getId()}
                                    class="highlighted-cowebsite"
                                />
                                <div class="actions">
                                    {#if $highlightedEmbedScreen.embed.isClosable()}
                                        <button
                                            type="button"
                                            class="close-window top-right-btn"
                                            on:click={closeCoWebsite}
                                        />
                                    {/if}
                                </div>
                            </div>
                        {/key}
                    {/if}
                {/if}
            </div>
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
    {/if}
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    #video-container-receive {
        height: 55vh;
        margin-top: 3vh;
    }
    #presentation-layout {
        &.full-medias {
            overflow-y: auto;
            overflow-x: hidden;
        }
    }

    #embed-left-block {
        flex-direction: column;
        // flex: 0 0 75%;
        height: 100%;
        width: 75%;
        padding-bottom: 4rem;
    }

    #main-embed-screen {
        .highlighted-cowebsite {
            height: 100% !important;
            width: 100% !important;
            position: relative;

            &-container {
                height: 100% !important;
                width: 96%;
                background-color: rgba(#000000, 0.6);
                margin: 0 !important;
                padding: 0 !important;

                .actions {
                    z-index: 151;
                    position: absolute;
                    width: 100%;
                    top: 5px;
                    right: 5px;
                    display: flex;
                    flex-direction: row;
                    justify-content: flex-end;
                    gap: 2%;

                    button {
                        pointer-events: all;
                    }
                }
            }
        }
    }

    @include media-breakpoint-only(md) {
        #embed-left-block {
            flex: 0 0 65%;
        }
    }
</style>
