<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        coWebsites,
        fullScreenCowebsite,
        totalTabWidth,
        totalTabWidthMobile,
        widthContainerForWindow,
        heightContainerForWindow,
        resizeFromCowebsite,
        canvasWidth,
        widthFromResize,
        heightFromResize,
        canvasHeight,
        isVerticalMode,
    } from "../../Stores/CoWebsiteStore";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { waScaleManager } from "../../Phaser/Services/WaScaleManager";
    import XIcon from "../Icons/XIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";

    let container: HTMLElement;
    let activeCowebsite = $coWebsites[0];
    let resizeBar: HTMLElement;
    let startY: number;
    let startX: number;
    let startWidthContainer: number;
    let finalWidth;
    let finalHeight;
    let startHeight: number;
    let vertical: boolean;
    let resizeBarHide = false;
    let styleTag: HTMLStyleElement;
    $: appearDropdownMenu = vertical
        ? $totalTabWidthMobile > $widthContainerForWindow
        : $totalTabWidth >= window.innerWidth - $widthContainerForWindow &&
          window.innerWidth !== $widthContainerForWindow;
    $: showArrow = $totalTabWidth > window.innerWidth - $widthContainerForWindow ? true : false;
    let numberMaxOfCowebsite: number;
    let menuArrow = false;
    let isToggleFullScreen = false;

    function updateScreenSize() {
        if (window.innerWidth < 768) {
            vertical = true;
            isVerticalMode.set(true);
            resizeCowebsite();
        } else {
            vertical = false;
            isVerticalMode.set(false);
            resizeCowebsite();
        }
    }

    window.addEventListener("resize", () => {
        getSizeOfCowebsiteWhenResizeWindow();
        resizeFromCowebsite.set(false);
        updateScreenSize();
    });

    onMount(() => {
        updateScreenSize();
        if (!vertical) {
            let widthOnMount = parseInt(getComputedStyle(container).width);
            widthContainerForWindow.set(widthOnMount);
        } else {
            let heightOnMount = parseInt(getComputedStyle(container).height);
            heightContainerForWindow.set(heightOnMount);
        }
        // updateDynamicStyles();
        waScaleManager.applyNewSize();
        resizeCowebsite();
    });

    function getSizeOfCowebsiteWhenResizeWindow() {
        if (vertical) {
            heightFromResize.set($heightContainerForWindow);
            container.style.height = `${$heightContainerForWindow}px`;
            container.style.width = "100%";
        } else {
            widthFromResize.set($widthContainerForWindow);
            container.style.width = `${$widthFromResize}px`;
            container.style.height = "100%";
        }
    }

    function resizeCowebsite() {
        resizeFromCowebsite.set(true);
        if (!vertical) {
            heightContainerForWindow.set(window.innerHeight);
            widthContainerForWindow.set(window.innerWidth / 2);
            startWidthContainer = parseInt(getComputedStyle(container).width);
            const handleMouseDown = (e: { clientX: number }) => {
                startX = e.clientX;
                startWidthContainer = parseInt(getComputedStyle(container).width);
                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
            };
            resizeBar.addEventListener("mousedown", handleMouseDown);
            const handleMouseMove = (e: { clientX: number }) => {
                let newWidth = startWidthContainer - (e.clientX - startX);
                widthContainerForWindow.set(newWidth);
                // console.log($widthContainerForWindow, "WIDTH CONTAINER DANS LE RESIZE ORDI");
                finalWidth = newWidth + "px";
                container.style.width = finalWidth;
                const maxWidth = Math.min(newWidth, window.innerWidth * 0.75);
                if (maxWidth !== newWidth) {
                    container.style.width = maxWidth + "px";
                    widthContainerForWindow.set(maxWidth);
                }
                waScaleManager.applyNewSize();
                waScaleManager.refreshFocusOnTarget();
            };
            const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            };
            return () => {
                resizeBar.removeEventListener("mousedown", handleMouseDown);
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
            };
        } else {
            widthContainerForWindow.set(window.innerWidth);
            heightContainerForWindow.set(window.innerHeight / 2);
            startWidthContainer = parseInt(getComputedStyle(container).height);
            function handleMouseDown(e: TouchEvent) {
                let clientY = e.touches[0].clientY;
                startY = clientY;
                startHeight = parseInt(getComputedStyle(container).height);
                document.addEventListener("touchmove", handleMouseMove, { passive: false });
                document.addEventListener("touchend", handleMouseUp);
            }
            resizeBar.addEventListener("touchstart", handleMouseDown, false);
            function handleMouseMove(e: TouchEvent) {
                let clientY = e.touches[0].clientY;
                let newHeight = startHeight + (clientY - startY);
                heightContainerForWindow.set(newHeight);
                // console.log($heightContainerForWindow, "HEIGHT CONTAINER DANS LE RESIZE MOBILE");
                finalHeight = newHeight + "px";
                container.style.height = finalHeight;
                const maxHeight = Math.min(newHeight, window.innerHeight * 0.75);
                if (maxHeight !== newHeight) {
                    container.style.height = maxHeight + "px";
                    heightContainerForWindow.set(maxHeight);
                }
                resizeMin(newHeight);
                waScaleManager.applyNewSize();
                waScaleManager.refreshFocusOnTarget();
            }
            const handleMouseUp = () => {
                document.removeEventListener("touchmove", handleMouseMove);
                document.removeEventListener("touchend", handleMouseUp);
            };
            return () => {
                resizeBar.removeEventListener("touchstart", handleMouseDown);
                document.removeEventListener("touchmove", handleMouseMove);
                document.removeEventListener("touchend", handleMouseUp);
            };
        }
    }

    function resizeMin(newValue: number) {
        const minHeight = window.innerHeight * 0.35;
        if (newValue > minHeight) {
            widthContainerForWindow.set(newValue);
        } else {
            heightContainerForWindow.set(minHeight);
            container.style.height = `${minHeight}px`;
        }
    }

    $: {
        if (vertical) {
            $totalTabWidth, numberMaxCowebsite();
        } else {
            $totalTabWidthMobile, numberMaxCowebsite();
        }
    }

    $: $totalTabWidthMobile, numberMaxCowebsite();
    $: $widthContainerForWindow, numberMaxCowebsite();
    $: isToggleFullScreen, numberMaxCowebsite();

    $: {
        if (isToggleFullScreen) {
            menuArrow = false;
            numberMaxCowebsite();
        } else {
            menuArrow = true;
            showArrow = true;
            appearDropdownMenu = true;
        }
    }

    function numberMaxCowebsite() {
        if (!vertical) {
            numberMaxOfCowebsite = Math.floor($widthContainerForWindow / 300);
            if (numberMaxOfCowebsite < 1) {
                appearDropdownMenu = false;
            }
            if (isToggleFullScreen) {
                numberMaxOfCowebsite = Math.floor(window.innerWidth / 300);
                if ($totalTabWidth < window.innerWidth) {
                    appearDropdownMenu = false;
                    showArrow = false;
                }
            }
        } else {
            numberMaxOfCowebsite = Math.floor(window.innerWidth / 220);
            if (numberMaxOfCowebsite < 1) {
                appearDropdownMenu = false;
            }
        }
    }

    function addDivForResize() {
        const div = document.createElement("div");
        div.id = "resize-overlay";
        div.style.width = "75%";
        div.style.height = "100%";
        div.style.position = "absolute";
        div.style.top = "0";
        div.style.right = "0";
        div.style.zIndex = "1800";
        document.body.appendChild(div);
        window.addEventListener("mouseup", removeDivForResize);
    }

    function removeDivForResize() {
        const div = document.getElementById("resize-overlay");
        if (div) {
            document.body.removeChild(div);
        }
    }

    const setActiveCowebsite = (coWebsite: CoWebsite) => {
        activeCowebsite = coWebsite;
        appearDropdownMenu = false;
        menuArrow = false;
    };

    const subscription = coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1];
    });

    function toggleFullScreen() {
        if ($fullScreenCowebsite && !vertical) {
            fullScreenCowebsite.set(false);
            container.style.width = `${$widthContainerForWindow - $canvasWidth}px`;
            widthContainerForWindow.set(window.innerWidth - $canvasWidth);
            resizeBarHide = false;
            isToggleFullScreen = false;
        } else if ($fullScreenCowebsite && vertical) {
            fullScreenCowebsite.set(false);
            container.style.height = `${$heightContainerForWindow - $canvasHeight}px`;
            heightContainerForWindow.set(window.innerHeight - $canvasHeight);
            resizeBarHide = false;
            isToggleFullScreen = false;
        } else if (!$fullScreenCowebsite && !vertical) {
            fullScreenCowebsite.set(true);
            widthContainerForWindow.set(window.innerWidth);
            container.style.width = `${$widthContainerForWindow}px`;
            container.style.backgroundColor = "#1b2a40";
            resizeBarHide = true;
            isToggleFullScreen = true;
        } else {
            fullScreenCowebsite.set(true);
            heightContainerForWindow.set(window.innerHeight);
            container.style.height = `${$heightContainerForWindow}px`;
            resizeBarHide = true;
            isToggleFullScreen = true;
        }
    }

    // function updateDynamicStyles() {
    //     let widthPercent = activeCowebsite.getWidthPercent() || 50;
    //     let heightPercent = activeCowebsite.getHeightPercent() || 50;
    //     if (widthPercent < 25) {
    //         widthPercent = 25;
    //     } else if (widthPercent > 75) {
    //         widthPercent = 75;
    //     }
    //     if (heightPercent < 25) {
    //         heightPercent = 25;
    //     } else if (heightPercent > 75) {
    //         heightPercent = 75;
    //     }
    //     const cssVertical = `
    //         .height-default{
    //             width: 100%;
    //             height: ${heightPercent}%;
    //         }`;
    //     const cssHorizontal = `
    //         .width-default{
    //             height: 100%;
    //             width: ${widthPercent}%;
    //         }`;
    //     if (!styleTag) {
    //         styleTag = document.createElement("style");
    //         document.head.appendChild(styleTag);
    //     }
    //     vertical ? (styleTag.textContent = cssVertical) : (styleTag.textContent = cssHorizontal);
    // }

    // $: activeCowebsite, updateDynamicStyles();
    // $: vertical, updateDynamicStyles();

    onDestroy(() => {
        heightContainerForWindow.set(window.innerHeight);
        widthContainerForWindow.set(window.innerWidth);
        resizeFromCowebsite.set(false);
        waScaleManager.applyNewSize();

        if (styleTag) {
            document.head.removeChild(styleTag);
        }
        subscription();
    });
</script>

<div
    id="cowebsites-container"
    class={vertical
        ? "height-default w-full bg-contrast/50 backdrop-blur responsive-container fullscreen"
        : "width-default h-full bg-contrast/50 backdrop-blur flex-col pb-[76px]"}
    bind:this={container}
>
    <div class="flex py-2 ml-3 items-center height-tab overflow-hidden">
        {#if showArrow}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
                on:click={() => (menuArrow = !menuArrow)}
                on:click={() => (appearDropdownMenu = !appearDropdownMenu)}
            >
                {#if menuArrow}
                    <XIcon />
                {:else}
                    <ChevronDownIcon />
                {/if}
            </div>
        {/if}

        <div class="tab-bar flex items-center w-full overflow-x-auto">
            {#if !vertical}
                <!-- 300 is corresponding to the width of a tab so we calculate to know if it will fit -->
                {#each $coWebsites.slice(0, numberMaxOfCowebsite) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={() => setActiveCowebsite(coWebsite)}>
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            {:else}
                <!-- Same thing for mobile -->
                {#each $coWebsites.slice(0, numberMaxOfCowebsite) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={() => setActiveCowebsite(coWebsite)}>
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            {/if}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="flex justify-end w-full">
                <div
                    class="ml-full aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
                    on:click={toggleFullScreen}
                >
                    <FullScreenIcon />
                </div>
            </div>
        </div>

        {#if !vertical && appearDropdownMenu && menuArrow}
            <div
                class="absolute md:fixed z-1800 md:top-[8%] left-0 bg-contrast/80 rounded-lg max-h-[80vh] min-h-[50px] overflow-y-auto w-auto tab-drop-down"
            >
                {#each $coWebsites.slice(numberMaxOfCowebsite) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={() => setActiveCowebsite(coWebsite)}>
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            </div>
        {:else if vertical && appearDropdownMenu}
            <div
                class="absolute md:fixed z-1800 top-[15%] left-0 bg-contrast/80 rounded-md max-h-[80vh] w-[220px] overflow-y-auto w-auto tab-drop-down"
            >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                {#each $coWebsites.slice(numberMaxOfCowebsite) as coWebsite (coWebsite.getId())}
                    <div on:click={() => setActiveCowebsite(coWebsite)}>
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class={vertical ? "h-full ml-3 responsive-website" : "h-full object-contain ml-3"}>
        {#if activeCowebsite instanceof JitsiCoWebsite}
            <JitsiCowebsiteComponent actualCowebsite={activeCowebsite} />
        {:else if activeCowebsite instanceof BBBCoWebsite}
            <BigBlueButtonCowebsiteComponent actualCowebsite={activeCowebsite} />
        {:else if activeCowebsite instanceof SimpleCoWebsite}
            <SimpleCowebsiteComponent actualCowebsite={activeCowebsite} />
        {/if}
    </div>

    <div
        class={vertical
            ? "absolute left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize responsive-resize-bar"
            : "absolute left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize"}
        class:resize-bar={resizeBarHide}
        bind:this={resizeBar}
        on:mousedown={resizeCowebsite}
        on:mousedown={addDivForResize}
        on:mouseup={removeDivForResize}
        on:touchstart={addDivForResize}
        on:dragend={removeDivForResize}
        on:touchend={removeDivForResize}
    />
</div>

<style>
    .resize-bar {
        display: none;
    }
    .fullscreen {
        width: 100%;
        background-color: #1b2941;
    }
    @media (max-width: 768px) {
        #cowebsites-container {
            width: 100%;
            height: 50%;
            display: flex;
            flex-direction: column;
        }
        .responsive-resize-bar {
            position: relative;
            rotate: 90deg;
            height: 10rem;
            margin: -3rem auto -3rem auto;
        }
        .responsive-website {
            width: 94%;
            border-radius: 8px;
        }
    }
</style>
