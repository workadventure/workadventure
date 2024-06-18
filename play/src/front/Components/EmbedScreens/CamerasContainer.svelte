<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import MediaBox from "../Video/MediaBox.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import MyCamera from "../MyCamera.svelte";
    import { myCameraStore } from "../../Stores/MyMediaStore";
    import { onMount, afterUpdate } from "svelte";

    let widthWindow: number | undefined;
    // let mdScreen = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    // let lgScreen = window.matchMedia("(min-width: 1025px) and (max-width: 1366px)");
    // let xlScreen = window.matchMedia("(min-width: 1367px) and (max-width: 1919px)");
    // let xxlScreen = window.matchMedia("(min-width: 1920px) and (max-width: 2559px)");
    // let xxxlScreen = window.matchMedia("(min-width: 2560px)");

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

    afterUpdate(() => {
        checkOverflow();
    });

    // function camMountedWidth() {
    //     // adjustCameraDisplay();
    //     // stackCameras();
    // }

    // function camUnmountedWidth() {
    //     // adjustCameraDisplay();
    //     // stackCameras();
    // }

    // function adjustCameraDisplay() {
    //     widthWindow = document.getElementById("presentation-layout")?.offsetWidth;
    //     let allCams = (document.getElementsByClassName("all-cameras-container")[0] as HTMLElement)?.offsetWidth;
    //     if (widthWindow !== undefined && allCams > widthWindow) {
    //         let scale = widthWindow / allCams;
    //         let cameras = document.querySelectorAll(".all-cameras-container");
    //         cameras.forEach((camera) => {
    //             (camera as HTMLElement).style.transform = `scale(${scale})`;
    //         });
    //     }
    // }

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

    function checkOverflow() {
        const camContainer = document.getElementById("cameras-container");
        if (camContainer) {
            if (camContainer.scrollWidth > camContainer.clientWidth) {
                camContainer.style.justifyContent = "flex-start";
            } else {
                camContainer.style.justifyContent = "center";
            }
        }
    }
    window.addEventListener("load", checkOverflow);
    window.addEventListener("resize", checkOverflow);
</script>

<div class={isHightlighted ? "highlight" : "not-highlighted"} id="cameras-container">
    {#each [...$streamableCollectionStore] as [uniqueId, peer] (uniqueId)}
        {#if !highlightedEmbedScreen || $highlightedEmbedScreen !== peer}
            {#key uniqueId}
                <div class={isHightlighted ? "w-[230px] all-cameras-highlighted" : "w-full all-cameras m-auto"}>
                    <MediaBox streamable={peer} />
                </div>
            {/key}
        {/if}
    {/each}
    {#if $myCameraStore}
        <div
            id="unique-mycam"
            class={isHightlighted ? "w-[230px] all-cameras-highlighted " : "w-full all-cameras m-auto"}
        >
            <MyCamera />
        </div>
    {/if}
</div>

<!-- && !$megaphoneEnabledStore TODO HUGO -->
<style>
    .highlight {
        display: flex;
        justify-content: center;
        margin: 0;
        gap: 1rem;
        white-space: nowrap;
        position: relative;
        overflow-x: auto;
        overflow-y: hidden;
        margin: 0 auto;
        width: 80%;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
    }

    .all-cameras-highlighted {
        min-width: 230px;
        max-width: 230px;
        background-color: blue;
        float: none;
        display: inline-block;
        zoom: 1;
    }

    .not-highlighted {
        display: grid;
        justify-content: center;
        align-items: center;
        gap: 1rem;
    }

    @container (min-width: 1024) and (max-width: 1279px) {
        .all-cameras-highlighted {
            min-width: 200px;
            max-width: 200px;
            background-color: green;
            float: none;
            display: inline-block;
            zoom: 1;
        }
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(70px, 140px));
        }
    }

    @container (min-width: 640px) and (max-width: 1024px) {
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(70px, 140px));
        }

        .all-cameras-highlighted {
            min-width: 180px;
            max-width: 180px;
            display: inline-block;
            float: none;
            background-color: yellow;
        }
    }

    @container (max-width: 640px) {
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(70px, 140px));
        }

        .highlight {
            display: flex;
            justify-content: center;
            margin: 0;
            gap: 1rem;
            white-space: nowrap;
            position: relative;
            overflow-x: auto;
            overflow-y: hidden;
            margin: 0 auto;
            width: 100%;
            max-width: 100%;
            -webkit-overflow-scrolling: touch;
        }
        .all-cameras-highlighted {
            min-width: 180px;
            max-width: 180px;
            display: block;
            float: none;
            background-color: red;
        }
    }

    @container (min-width: 768px) {
        .not-highlighted {
            grid-template-columns: repeat(auto-fit, minmax(110px, 320px));
        }
    }
</style>
