<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import { writable } from "svelte/store";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import ListenerBox from "../../Video/ListenerBox.svelte";
    import { inExternalServiceStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import { highlightFullScreen } from "../../../Stores/ActionsCamStore";
    import { isOnOneLine, playerMovedInTheLast10Seconds } from "../../../Stores/VideoLayoutStore";
    import PictureInPictureActionBar from "../../ActionBar/PictureInPictureActionBar.svelte";
    import { activePictureInPictureStore } from "../../../Stores/PeerStore";
    import { isListenerStore } from "../../../Stores/MediaStore";

    export let inPictureInPicture: boolean;

    let camContainer: HTMLDivElement;
    let highlightScreen: HTMLDivElement;
    let containerHeight = 0;

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

    $: oneLineMaxHeight = containerHeight * 0.2;
</script>

{#if $proximityMeetingStore === true && !$inExternalServiceStore}
    <div
        class="presentation-layout flex pointer-events-none h-full w-full absolute mobile:mt-3"
        class:flex-col={!inPictureInPicture || $highlightedEmbedScreen == undefined}
        class:flex-row-reverse={inPictureInPicture && $highlightedEmbedScreen != undefined}
        style={inPictureInPicture && $highlightedEmbedScreen != undefined ? "height: calc(100vh - 80px);" : ""}
        bind:clientHeight={containerHeight}
    >
        {#if $streamableCollectionStore.size > 0}
            <div
                class="justify-end md:justify-center w-full relative"
                class:max-height-quarter={$isOnOneLine && !inPictureInPicture}
                class:h-full={!$isOnOneLine || inPictureInPicture}
                class:overflow-y-auto={inPictureInPicture}
                class:flex-1={inPictureInPicture && $highlightedEmbedScreen != undefined}
                bind:this={camContainer}
            >
                <CamerasContainer
                    {oneLineMaxHeight}
                    isOnOneLine={$isOnOneLine}
                    oneLineMode={inPictureInPicture ? "vertical" : "horizontal"}
                />
            </div>
        {/if}

        {#if $streamableCollectionStore.size > 0 && $highlightedEmbedScreen && !$playerMovedInTheLast10Seconds}
            <div
                id="highlighted-media"
                class="md:mb-0"
                class:flex-1={!inPictureInPicture || $highlightedEmbedScreen == undefined}
                class:flex-[4]={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:mb-8={!inPictureInPicture || $highlightedEmbedScreen == undefined}
                class:mb-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                bind:this={highlightScreen}
            >
                {#key $highlightedEmbedScreen.uniqueId}
                    <MediaBox isHighlighted={true} videoBox={$highlightedEmbedScreen} />
                {/key}
            </div>
        {/if}

        {#if $activePictureInPictureStore}
            <div
                class="flex-none"
                class:fixed={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:bottom-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:left-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:right-0={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:w-full={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:transition-all={inPictureInPicture && $highlightedEmbedScreen != undefined}
                class:pointer-events-none={inPictureInPicture && $highlightedEmbedScreen != undefined}
                style="z-index: 20;"
            >
                <PictureInPictureActionBar />
            </div>
        {/if}

        {#if $streamableCollectionStore.size === 0 && $isListenerStore}
            <ListenerBox />
        {/if}
    </div>
{/if}

<style>
    .max-height-quarter {
        max-height: 25%;
    }
</style>
