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
        if (value) {
            isHightlighted = true;
        } else {
            isHightlighted = false;
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
        let cameras = document.querySelectorAll(".all-cameras");

        cameras.forEach((camera) => {
            (camera as HTMLElement).style.display = "flex";
        });

        let allCamerasTest = document.getElementById("cameras-container");

        if (xxxlScreen.matches) {
            if (cameras.length > 8) {
                if (allCamerasTest && !isHightlighted) {
                    allCamerasTest.classList.remove("grid-layout-template");
                    allCamerasTest.style.display = "grid";
                    allCamerasTest.style.gridTemplateColumns = "repeat(8, minmax(350px, 1fr))";
                    allCamerasTest.style.gap = "10px";
                } else if (allCamerasTest && isHightlighted) {
                    allCamerasTest.classList.add("grid-layout-3");
                    allCamerasTest.style.display = "flex";
                    allCamerasTest.style.flexDirection = "row";
                    adjustCameraDisplay();
                }
            }
        } else if (xxlScreen.matches) {
            if (cameras.length > 6) {
                if (allCamerasTest && !isHightlighted) {
                    allCamerasTest.classList.remove("grid-layout-template");
                    allCamerasTest.style.display = "grid";
                    allCamerasTest.style.gridTemplateColumns = "repeat(6, minmax(350px, 1fr))";
                    allCamerasTest.style.gap = "10px";
                } else if (allCamerasTest && isHightlighted) {
                    allCamerasTest.classList.add("grid-layout-3");
                    allCamerasTest.style.display = "flex";
                    allCamerasTest.style.flexDirection = "row";
                    adjustCameraDisplay();
                }
            }
        } else if (xlScreen.matches) {
            if (cameras.length > 5) {
                if (allCamerasTest && !isHightlighted) {
                    allCamerasTest.classList.remove("grid-layout-template");
                    allCamerasTest.style.display = "grid";
                    allCamerasTest.style.gridTemplateColumns = "repeat(5, minmax(350px, 1fr))";
                    allCamerasTest.style.gap = "10px";
                } else if (allCamerasTest && isHightlighted) {
                    allCamerasTest.classList.add("grid-layout-3");
                    allCamerasTest.style.display = "flex";
                    allCamerasTest.style.flexDirection = "row";
                    adjustCameraDisplay();
                }
            }
        } else if (lgScreen.matches) {
            if (cameras.length > 4) {
                if (allCamerasTest && !isHightlighted) {
                    allCamerasTest.classList.remove("grid-layout-template");
                    allCamerasTest.style.display = "grid";
                    allCamerasTest.style.gridTemplateColumns = "repeat(4, minmax(350px, 1fr))";
                    allCamerasTest.style.gap = "10px";
                } else if (allCamerasTest && isHightlighted) {
                    allCamerasTest.classList.add("grid-layout-3");
                    allCamerasTest.style.display = "flex";
                    allCamerasTest.style.flexDirection = "row";
                    adjustCameraDisplay();
                }
            }
        } else if (mdScreen.matches) {
            console.log("je suis dans le cas mdScreen");
            if (cameras.length > 2) {
                if (allCamerasTest && !isHightlighted) {
                    allCamerasTest.classList.remove("grid-layout-template");
                    allCamerasTest.style.display = "grid";
                    allCamerasTest.style.gridTemplateColumns = "repeat(2, minmax(350px, 1fr))";
                    allCamerasTest.style.gap = "10px";
                } else if (allCamerasTest && isHightlighted) {
                    allCamerasTest.classList.add("grid-layout-3");
                    allCamerasTest.style.display = "flex";
                    allCamerasTest.style.flexDirection = "row";
                    adjustCameraDisplay();
                }
            }
        }
    }

    $: isHightlighted, stackCameras();
</script>

<div class="grid-layout-template all-cameras-container overflow-visible" id="cameras-container">
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if !highlightedEmbedScreen || $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div id="unique-cam-other" class="all-cameras">
                    <MediaBox streamable={peer} on:camMounted={camMountedWidth} on:camUnmounted={camUnmountedWidth} />
                </div>
            {/key}
        {/if}
    {/each}
    {#if $myCameraStore}
        <div id="unique-mycam" class="all-cameras">
            <MyCamera />
        </div>
    {/if}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style>
    #unique-mycam,
    #unique-cam-other {
        width: 350px;
        height: 200px;
    }

    .grid-layout-template {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    .grid-layout-3 {
        display: grid;
        grid-template-columns: repeat(3, minmax(350px, 1fr));
        gap: 1rem;
    }

    @container (max-width: 767px) {
        .mobile-height {
            height: 300px;
        }
        .grid-layout-template {
            bottom: 0; /* Align to the bottom */
            right: 0; /* Align to the right */
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            align-items: flex-end;
        }

        #unique-cam-other,
        #unique-mycam {
            align-self: flex-end;
            margin-top: auto;
            width: 150px;
            height: 85px;
        }
    }
</style>
