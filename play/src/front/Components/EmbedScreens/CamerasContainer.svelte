<script lang="ts">
    import { fly } from "svelte/transition";
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";
    import { onDestroy, onMount } from "svelte";

    export let highlightedEmbedScreen: EmbedScreen | undefined;
    export let full = false;
    $: clickable = !full;

    let totalCamWidth = 0;
    let camWidthOther = 350;
    let camWidth = 350;
    let widthWindow: number | undefined;
    let myCam;
    let otherCam;

    onMount(() => {
        // getWidth();
        // handleCamMounted();
    });

    onDestroy(() => {
        // handleCamDestroy();
    });

    function camMountedWidth() {
        console.log("camMountedWidth !!!!!!!!!!!!!!!!!!!!!!!!!");
        widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
        let allCams = (document.getElementsByClassName("all-cameras")[0] as HTMLElement)?.offsetWidth;
        console.log("WIDTH ALL CAM = ", allCams);
        if (widthWindow !== undefined && allCams > widthWindow) {
            let scale = widthWindow / allCams;
            let cameras = document.querySelectorAll(".all-cameras");
            cameras.forEach((camera) => {
                (camera as HTMLElement).style.transform = `scale(${scale})`;
            });
        }
    }

    function camUnmountedWidth() {
        widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
        let allCams = (document.getElementsByClassName("all-cameras")[0] as HTMLElement)?.offsetWidth;
        if (widthWindow !== undefined && allCams > widthWindow) {
            let scale = widthWindow / allCams;
            let cameras = document.querySelectorAll(".all-cameras");
            cameras.forEach((camera) => {
                (camera as HTMLElement).style.transform = `scale(${scale})`;
            });
        }
    }

    // function getWidthofCam() {
    //     myCam = document.getElementById("unique-mycam")?.offsetWidth;
    //     console.log("MA CAMERA WIDTH", myCam);
    //     otherCam = document.getElementById("unique-cam-other");
    //     console.log(otherCam);
    //     console.log(otherCam?.offsetWidth);
    //     console.log("OTHER CAMERA WIDTH", otherCam);
    //     let allCams = (document.getElementsByClassName("all-cameras")[0] as HTMLElement)?.offsetWidth;
    //     console.log("WIDTH ALL CAM = ", allCams, typeof allCams);
    // }

    // function getWidthScreen() {
    //     widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
    //     console.log("GET WIDTH OF PRESENTATION LAYOUT", widthWindow);
    // }

    // function handleCamMounted() {
    //     totalCamWidth += camWidth;
    //     totalCamWidth += camWidthOther;
    //     console.log("totalCamWidth", totalCamWidth);
    // }

    // function handleCamDestroy() {
    //     totalCamWidth -= camWidth;
    //     console.log("totalCamWidth", totalCamWidth);
    // }
</script>

<!-- svelte-ignore missing-declaration -->
<aside class:full in:fly|local={{ x: 200, duration: 100 }} class="mobile-height">
    <!-- grid-flow-col grid-flow-col -->
    <!-- {#if $streamableCollectionStore.size < 3} -->

    <div class="all-cameras overflow-visible content-center flex gap-x-4 justify-center">
        {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
            {#if !highlightedEmbedScreen || highlightedEmbedScreen.type !== "streamable" || (highlightedEmbedScreen.type === "streamable" && highlightedEmbedScreen.embed !== peer)}
                {#key uniqueId}
                    <div id="unique-cam-other">
                        <MediaBox
                            streamable={peer}
                            on:camMounted={camMountedWidth}
                            on:camUnmounted={camUnmountedWidth}
                        />
                    </div>
                {/key}
            {/if}
        {/each}
        <div id="unique-mycam ">
            {#if $myCameraStore}
                <MyCamera />
            {/if}
        </div>
    </div>

    <!-- && !$megaphoneEnabledStore TODO HUGO -->
</aside>

<!-- {$mediaStreamConstraintsStore.audio
    ? 'border-8 border-solid bg-indigo-400 rounded-lg'
    : ''} -->

<!-- isClickable={clickable} -->
<style>
    #unique-cam-other {
        width: 350px;
        height: 200px;
    }

    @container (max-width: 767px) {
        .mobile-height {
            height: 300px;
        }
        .all-cameras {
            scale: 0.5;
            bottom: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        #unique-cam-other,
        #unique-mycam {
            align-self: flex-end;
            margin-top: auto;
        }
    }

    @container (min-width: 768px) and (max-width: 1023px) {
        .all-cameras {
            scale: 0.6;
        }
    }

    @container (min-width: 1024px) and (max-width: 1279px) {
        .all-cameras {
            scale: 0.7;
        }
    }

    @container (min-width: 1280px) and (max-width: 1439px) {
        .all-cameras {
            scale: 0.9;
        }
    }

    @container (min-width: 1440px) and (max-width: 1919px) {
        .all-cameras {
            scale: 1;
        }
    }

    @container (min-width: 1920px) {
        .all-cameras {
            scale: 1;
        }
    }
</style>
