<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";

    // export let highlightedEmbedScreen: EmbedScreen | undefined;
    // export let full = false;
    // $: clickable = !full;

    let widthWindow: number | undefined;

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
</script>

<!-- svelte-ignore missing-declaration -->
<!-- <aside class:full in:fly|local={{ x: 200, duration: 100 }} class="mobile-height"> -->
<!-- grid-flow-col grid-flow-col -->
<!-- {#if $streamableCollectionStore.size < 3} -->

<div class="all-cameras overflow-visible content-center flex gap-x-4 justify-center">
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if !highlightedEmbedScreen || $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div id="unique-cam-other">
                    <MediaBox streamable={peer} on:camMounted={camMountedWidth} on:camUnmounted={camUnmountedWidth} />
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
<!-- </aside> -->

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
</style>
