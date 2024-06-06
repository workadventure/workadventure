<script lang="ts">
    import { afterUpdate, onMount } from "svelte";
    import { highlightedEmbedScreen } from "../../../Stores/HighlightedEmbedScreenStore";
    import CamerasContainer from "../CamerasContainer.svelte";
    import MediaBox from "../../Video/MediaBox.svelte";
    import { myCameraStore, proximityMeetingStore } from "../../../Stores/MyMediaStore";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../../Stores/StreamableCollectionStore";
    import Loading from "../../Video/Loading.svelte";
    import { jitsiLoadingStore } from "../../../Streaming/BroadcastService";

    const isMobile = window.matchMedia("(max-width: 767px)");
    let isVertical: boolean;

    onMount(() => {
        isMobile.addEventListener("change", (e: any) => handleTabletChange(e));
        handleTabletChange(isMobile);
        calculateHeight();
    });

    function handleTabletChange(e: MediaQueryList) {
        if (e.matches) {
            isVertical = true;
            console.log("isVertical", isVertical);
            reduceSizeIfScreenShare();
        } else {
            isVertical = false;
            console.log("isVertical", isVertical);
            reduceSizeIfScreenShare();
        }
    }

    afterUpdate(() => {
        reduceSizeIfScreenShare();
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

    $: if ($highlightedEmbedScreen) reduceSizeIfScreenShare();
    console.log($highlightedEmbedScreen, ": HOLLLLLLLLAAAAAAAAAAAA");

    function reduceSizeIfScreenShare() {
        console.log("fonction reduceSizeIfScreenShare");
        let containerCam = document.getElementById("container-media") as HTMLDivElement;
        console.log("containerCam", containerCam);
        if (containerCam) {
            if ($highlightedEmbedScreen && isVertical === false) {
                console.log("je suis dans le higlight reduceSizeIfScreenShare");
                containerCam.style.transform = "scale(0.7)";
                containerCam.style.marginTop = "-35px";
            } else {
                console.log("je suis PAS reduceSizeIfScreenShare");
                containerCam.style.transform = "scale(1)";
                containerCam.style.marginTop = "0px";
            }
        }
    }

    let onresize = function () {
        calculateHeight();
    };
    window.addEventListener("resize", onresize);

    function calculateHeight() {
        let screenShareHeight = (document.getElementById("video-container-receive") as HTMLElement)?.offsetHeight;
        // console.log("screenShareHeight", screenShareHeight);
        let heightWindow = window.innerHeight;
        // console.log("heightWindow", heightWindow);
        let blankHeight = heightWindow - screenShareHeight;
        // console.log("blankHeight", blankHeight);
        let finalHeight = heightWindow - blankHeight;
        if (screenShareHeight > finalHeight) {
            let scale = heightWindow / screenShareHeight;
            let screenShare = document.querySelector(".screen-sharing");
            if (screenShare instanceof HTMLElement) {
                screenShare.style.transform = `scale(${scale})`;
            }
        }
    }

    // A voir pour le resize en hauteur

    // window.addEventListener("resize", function () {
    //     let myDiv = document.getElementById("video-container-receive");
    //     let newWidth = window.innerHeight * 0.8;
    //     if (myDiv) {
    //         myDiv.style.scale = "0.5";
    //     }
    // });

    // window.dispatchEvent(new Event("resize"));
</script>

<!-- class:full-medias={displayFullMedias} -->

<div id="presentation-layout" bind:this={layoutDom}>
    <!-- Div pour l'affichage de toutes les caméras (other cam : cameContainer / my cam : MyCamera) -->
    {#if isVertical}
        <div class="vertical">
            <div id="video-container-receive" class={$highlightedEmbedScreen ? "block" : "hidden"}>
                {#if $highlightedEmbedScreen}
                    {#key $highlightedEmbedScreen.uniqueId}
                        <MediaBox isHightlighted={true} isClickable={true} streamable={$highlightedEmbedScreen} />
                    {/key}
                {/if}
            </div>
            <!-- Le isMobile ne marche pas pour le moment -->

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
            <!-- Div pour la personne qui reçoit le partage d'écran -->
            {#if $streamableCollectionStore.size > 0 || $myCameraStore}
                <div class="grid grid-flow-col gap-x-4 justify-center vertical" id="container-media">
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

<!-- Props du composant camera container highlightedEmbedScreen={$highlightedEmbedScreen} -->
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
            /* scale: 0.5; */
            margin-top: 0;
        }

        .container-media {
            margin-top: -70px;
        }
    }
</style>
