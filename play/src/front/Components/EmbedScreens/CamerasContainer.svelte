<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";
    import { onMount } from "svelte";

    let widthWindow: number | undefined;
    let mdScreen = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    let lgScreen = window.matchMedia("(min-width: 1025px) and (max-width: 1366px)");
    let xlScreen = window.matchMedia("(min-width: 1367px) and (max-width: 1919px)");
    let xxlScreen = window.matchMedia("(min-width: 1920px) and (max-width: 2559px)");
    let xxxlScreen = window.matchMedia("(min-width: 2560px)");

    let isHightlighted = false;

    highlightedEmbedScreen.subscribe((value) => {
        console.log("je suis dans le camera container");
        if (value) {
            isHightlighted = true;
            console.log(isHightlighted);
        } else {
            isHightlighted = false;
            console.log(isHightlighted);
        }
    });

    onMount(() => {
        mdScreen.addEventListener("change", stackCameras);
        lgScreen.addEventListener("change", stackCameras);
        xlScreen.addEventListener("change", stackCameras);
        xxlScreen.addEventListener("change", stackCameras);
        xxxlScreen.addEventListener("change", stackCameras);
    });

    function camMountedWidth() {
        adjustCameraDisplay();
        stackCameras();
    }

    function camUnmountedWidth() {
        adjustCameraDisplay();
        stackCameras();
    }

    function adjustCameraDisplay() {
        widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
        let allCams = (document.getElementsByClassName("all-cameras-container")[0] as HTMLElement)?.offsetWidth;
        if (widthWindow !== undefined && allCams > widthWindow) {
            let scale = widthWindow / allCams;
            let cameras = document.querySelectorAll(".all-cameras-container");
            cameras.forEach((camera) => {
                (camera as HTMLElement).style.transform = `scale(${scale})`;
            });
        }
    }

    function stackCameras() {
        console.log("stackCameras");

        // let cameras = document.querySelectorAll(".all-cameras");

        // cameras.forEach((camera) => {
        //     (camera as HTMLElement).style.display = "flex";
        // });

        // let allCamerasTest = document.getElementById("cameras-container");

        // if (xxxlScreen.matches) {
        //     if (cameras.length > 8) {
        //         if (allCamerasTest && !isHightlighted) {
        //             allCamerasTest.classList.remove("grid-layout-template");
        //             allCamerasTest.style.display = "grid";
        //             allCamerasTest.style.gridTemplateColumns = "repeat(8, minmax(350px, 1fr))";
        //             allCamerasTest.style.gap = "10px";
        //         } else if (allCamerasTest && isHightlighted) {
        //             allCamerasTest.classList.add("grid-layout-3");
        //             allCamerasTest.style.display = "flex";
        //             allCamerasTest.style.flexDirection = "row";
        //             adjustCameraDisplay();
        //         }
        //     }
        // } else if (xxlScreen.matches) {
        //     if (cameras.length > 6) {
        //         if (allCamerasTest && !isHightlighted) {
        //             allCamerasTest.classList.remove("grid-layout-template");
        //             allCamerasTest.style.display = "grid";
        //             allCamerasTest.style.gridTemplateColumns = "repeat(6, minmax(350px, 1fr))";
        //             allCamerasTest.style.gap = "10px";
        //         } else if (allCamerasTest && isHightlighted) {
        //             allCamerasTest.classList.add("grid-layout-3");
        //             allCamerasTest.style.display = "flex";
        //             allCamerasTest.style.flexDirection = "row";
        //             adjustCameraDisplay();
        //         }
        //     }
        // } else if (xlScreen.matches) {
        //     if (cameras.length > 5) {
        //         if (allCamerasTest && !isHightlighted) {
        //             allCamerasTest.classList.remove("grid-layout-template");
        //             allCamerasTest.style.display = "grid";
        //             allCamerasTest.style.gridTemplateColumns = "repeat(5, minmax(350px, 1fr))";
        //             allCamerasTest.style.gap = "10px";
        //         } else if (allCamerasTest && isHightlighted) {
        //             allCamerasTest.classList.add("grid-layout-3");
        //             allCamerasTest.style.display = "flex";
        //             allCamerasTest.style.flexDirection = "row";
        //             adjustCameraDisplay();
        //         }
        //     }
        // } else if (lgScreen.matches) {
        //     if (cameras.length > 4) {
        //         if (allCamerasTest && !isHightlighted) {
        //             allCamerasTest.classList.remove("grid-layout-template");
        //             allCamerasTest.style.display = "grid";
        //             allCamerasTest.style.gridTemplateColumns = "repeat(4, minmax(350px, 1fr))";
        //             allCamerasTest.style.gap = "10px";
        //         } else if (allCamerasTest && isHightlighted) {
        //             allCamerasTest.classList.add("grid-layout-3");
        //             allCamerasTest.style.display = "flex";
        //             allCamerasTest.style.flexDirection = "row";
        //             adjustCameraDisplay();
        //         }
        //     }
        // } else if (mdScreen.matches) {
        //     console.log("je suis dans le cas mdScreen");
        //     if (cameras.length > 2) {
        //         if (allCamerasTest && !isHightlighted) {
        //             allCamerasTest.classList.remove("grid-layout-template");
        //             allCamerasTest.style.display = "grid";
        //             allCamerasTest.style.gridTemplateColumns = "repeat(2, minmax(350px, 1fr))";
        //             allCamerasTest.style.gap = "10px";
        //         } else if (allCamerasTest && isHightlighted) {
        //             allCamerasTest.classList.add("grid-layout-3");
        //             allCamerasTest.style.display = "flex";
        //             allCamerasTest.style.flexDirection = "row";
        //             adjustCameraDisplay();
        //         }
        //     }
        // }
    }

    // $: isHightlighted, stackCameras();
</script>

<div
    class={isHightlighted
        ? "flex justify-center gap-x-4 all-cameras-container overflow-visible responsive-layout w-fit m-auto"
        : "grid justify-center align-center gap-4  sm:grid-cols-[repeat(auto-fit,minmax(70px, 140px))] md:grid-cols-[repeat(auto-fit,minmax(110px,320px))]"}
    id="cameras-container"
>
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if !highlightedEmbedScreen || $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div class="all-cameras m-auto {isHightlighted ? 'w-[230px]' : 'w-full'}">
                    <MediaBox streamable={peer} on:camMounted={camMountedWidth} on:camUnmounted={camUnmountedWidth} />
                </div>
            {/key}
        {/if}
    {/each}
    {#if $myCameraStore}
        <div id="unique-mycam" class="all-cameras {isHightlighted ? 'w-[230px]' : 'w-full'} m-auto">
            <MyCamera />
        </div>
    {/if}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style>
    /* .grid-layout-template {
        display: flex;
        justify-content: center;
        gap: 1rem;
    } */

    @container (max-width: 767px) {
        .responsive-layoutå {
            display: flex;
            bottom: 0;
            right: 0;
            flex-direction: column;
            gap: 0.2rem;
            align-items: flex-end;
            scale: 0.7;
            background-color: red;
        }
    }
</style>
