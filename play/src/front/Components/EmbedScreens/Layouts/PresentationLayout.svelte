<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import { ArrowRightCircleIcon } from "svelte-feather-icons";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { coWebsiteManager } from "../../../WebRtc/CoWebsiteManager";
    import { isMediaBreakpointDown, isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import MyCamera from "../../MyCamera.svelte";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import { liveStreamingEnabledStore } from "../../../Stores/MegaphoneStore";
    import Loading from "../../Video/Loading.svelte";
    import { jitsiLoadingStore } from "../../../Streaming/BroadcastService";
    import { JitsiTrackExt, JitsiTrackStreamWrapper } from "../../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import { jitsiConferencesStore } from "../../../Streaming/Jitsi/JitsiConferencesStore";

    function closeCoWebsite() {
        if ($highlightedEmbedScreen?.type === "cowebsite") {
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
    });

    let presentationIsHidden = false;
    function toggleCameraPresentation() {
        presentationIsHidden = !presentationIsHidden;
        // Mute camera if presentation is hidden
        if (presentationIsHidden) {
            ($myJitsiCameraStore?.getVideoTrack() as JitsiTrackExt | undefined)?.mute();
        } else {
            ($myJitsiCameraStore?.getVideoTrack() as JitsiTrackExt | undefined)?.unmute();
        }

        for (const [, peer] of $streamableCollectionStore.entries()) {
            const videoTrack = (peer as JitsiTrackStreamWrapper).getVideoTrack();
            const mediaStreamTrack = videoTrack?.getTrack() as MediaStreamTrack;

            if (!mediaStreamTrack) continue;

            if (presentationIsHidden) {
                mediaStreamTrack.enabled = false;
            } else {
                mediaStreamTrack.enabled = true;
            }
        }
    }
</script>

<div id="presentation-layout" bind:this={layoutDom} class:full-medias={displayFullMedias}>
    {#if displayFullMedias}
        {#if $streamableCollectionStore.size > 0 || $myCameraStore}
            <div id="full-medias" class="tw-z-[300] tw-relative tw-mx-auto tw-top-8 tw-h-1/3 tw-overflow-y-auto">
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
        <div id="embed-left-block" class:highlighted-cowebsite={$highlightedEmbedScreen != undefined}>
            <div id="main-embed-screen">
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
                            <div class="highlighted-cowebsite-container nes-container is-rounded screen-blocker">
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
                                        >
                                            &times;
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        {/key}
                    {/if}
                {/if}
            </div>
        </div>
        {#if $streamableCollectionStore.size > 0 || $myCameraStore}
            <div
                class="tw-flex tw-flex-col tw-relative tw-self-end tw-z-[300] tw-bottom-6 md:tw-bottom-4 tw-max-w-[25%] 2xl:tw-max-w-[420px] tw-w-full tw-max-h-full tw-transition-all"
                class:tw-translate-x-full={presentationIsHidden}
                class:tw-w-[10%]={$highlightedEmbedScreen != undefined}
            >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                {#if $jitsiConferencesStore.size > 0}
                    <div
                        class="tw-absolute -tw-left-10 tw-top-0 tw-w-fit tw-h-fit tw-pointer-events-auto tw-cursor-pointer tw-opacity-10 hover:tw-opacity-80 tw-transition-all"
                        class:tw-rotate-180={presentationIsHidden}
                        on:click={toggleCameraPresentation}
                    >
                        <ArrowRightCircleIcon size="40" class="tw-fill-white tw-pointer-events-none" />
                    </div>
                {/if}

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
    {/if}
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    #presentation-layout {
        height: 100%;
        width: 100%;
        display: flex;

        #full-medias {
            overflow-y: auto;
            overflow-x: hidden;
            width: 43%;
        }
    }

    #embed-left-block {
        display: flex;
        flex-direction: column;
        flex: 0 0 75%;
        height: 100%;
        width: 90%;
        padding-bottom: 4rem;
        &.highlighted-cowebsite {
            min-width: 90%;
        }
        @media (min-width: 1536px) {
            min-width: calc(100% - 420px);
        }
    }

    #main-embed-screen {
        height: 100%;
        margin-bottom: 3%;

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
