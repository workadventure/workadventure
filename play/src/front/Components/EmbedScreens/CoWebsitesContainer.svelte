<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import {
        canvasHeight,
        canvasWidth,
        coWebsites,
        fullScreenCowebsite,
        totalTabWidth,
        totalTabWidthMobile,
    } from "../../Stores/CoWebsiteStore";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { widthContainer } from "../../Stores/CoWebsiteStore";
    import { heightContainer } from "../../Stores/CoWebsiteStore";
    import { waScaleManager } from "../../Phaser/Services/WaScaleManager";
    import XIcon from "../Icons/XIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";

    let activeCowebsite = $coWebsites[0];
    let showArrow = false;
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startY: number;
    let startX: number;
    let startWidthContainer: number;
    let finalWidth;
    let finalHeight;
    let startHeight: number;
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    let vertical: boolean;
    let resizeBarHide = false;
    let styleTag: HTMLStyleElement;
    $: appearDropdownMenu = vertical
        ? $totalTabWidthMobile > $widthContainer
        : $totalTabWidth >= window.innerWidth - $widthContainer;
    $: showArrow = $totalTabWidth > window.innerWidth - $widthContainer;
    let numberMaxOfCowebsite: number;
    let menuBurgerIcon = false;

    onMount(() => {
        mediaQuery.addEventListener("change", handleTabletChange);
        handleTabletChange();
        if (!vertical) {
            let widthOnMount = parseInt(getComputedStyle(container).width);
            widthContainer.set(widthOnMount);
            widthContainer.subscribe(() => {});
        } else {
            let heightOnMount = parseInt(getComputedStyle(container).height);
            heightContainer.set(heightOnMount);
            heightContainer.subscribe(() => {});
        }
        updateDynamicStyles();
        waScaleManager.applyNewSize();
    });

    onDestroy(() => {
        heightContainer.set(window.innerHeight);
        widthContainer.set(window.innerWidth);
        waScaleManager.applyNewSize();
        if (styleTag) {
            document.head.removeChild(styleTag);
        }
        mediaQuery.removeEventListener("change", handleTabletChange);
    });

    function handleTabletChange() {
        if (mediaQuery.matches) {
            vertical = true;
            console.log(vertical, "vertical");
            resizeMobile();
        } else {
            vertical = false;
            console.log(vertical, "vertical");
            resizeDesktop();
        }
    }

    function resizeDesktop() {
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
            widthContainer.set(newWidth);
            finalWidth = newWidth + "px";
            container.style.width = finalWidth;
            const maxWidth = Math.min(newWidth, window.innerWidth * 0.75);
            widthContainer.set(maxWidth);
            if (maxWidth !== newWidth) {
                container.style.width = maxWidth + "px";
            }
            waScaleManager.applyNewSize();
        };
        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
        return () => {
            widthContainer;
            resizeBar.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }

    function resizeMobile() {
        startWidthContainer = parseInt(getComputedStyle(container).width);
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
            heightContainer.set(newHeight);
            finalHeight = newHeight + "px";
            container.style.height = finalHeight;
            const maxHeight = Math.min(newHeight, window.innerHeight * 0.75);
            heightContainer.set(maxHeight);
            if (maxHeight !== newHeight) {
                container.style.height = maxHeight + "px";
            }
            // resizeMax(newHeight);
            resizeMin(newHeight);
            waScaleManager.applyNewSize();
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

    function resizeMin(newValue: number) {
        const minHeight = window.innerHeight * 0.25;
        if (newValue > minHeight) {
            widthContainer.set(newValue);
        } else {
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
    $: $widthContainer, numberMaxCowebsite();
    $: {
        if (appearDropdownMenu) {
            menuBurgerIcon = !menuBurgerIcon;
        }
    }

    function numberMaxCowebsite() {
        if (!vertical) {
            numberMaxOfCowebsite = Math.floor((window.innerWidth - $canvasWidth) / 300);
        } else {
            numberMaxOfCowebsite = Math.floor($canvasWidth / 220);
            menuBurgerIcon = !menuBurgerIcon;
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
    };

    const subscription = coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1];
    });

    function toggleFullScreen() {
        if ($fullScreenCowebsite && !vertical) {
            fullScreenCowebsite.set(false);
            container.style.width = `${$widthContainer - $canvasWidth}px`;
            resizeBarHide = false;
        } else if ($fullScreenCowebsite && vertical) {
            fullScreenCowebsite.set(false);
            widthContainer.set(window.innerHeight);
            container.style.height = `${$heightContainer - $canvasHeight}px`;
            resizeBarHide = false;
        } else if (!$fullScreenCowebsite && !vertical) {
            fullScreenCowebsite.set(true);
            widthContainer.set(window.innerWidth);
            container.style.width = `${$widthContainer}px`;
            container.style.backgroundColor = "#1b2a40";
            resizeBarHide = true;
        } else {
            fullScreenCowebsite.set(true);
            heightContainer.set(window.innerHeight);
            container.style.height = `${$heightContainer}px`;
            resizeBarHide = true;
        }
    }

    function updateDynamicStyles() {
        let widthPercent = activeCowebsite.getWidthPercent() || 50;
        let heightPercent = activeCowebsite.getHeightPercent() || 50;
        if (widthPercent < 25) {
            widthPercent = 25;
        } else if (widthPercent > 75) {
            widthPercent = 75;
        }
        if (heightPercent < 25) {
            heightPercent = 25;
        } else if (heightPercent > 75) {
            heightPercent = 75;
        }
        const cssVertical = `
            .height-default-vertical {
                width: 100%;
                height: ${heightPercent}%;
            }`;
        const cssHorizontal = `
            .width-default-horizontal {
                height: 100%;
                width: ${widthPercent}%;
            }`;
        if (!styleTag) {
            styleTag = document.createElement("style");
            document.head.appendChild(styleTag);
        }
        vertical ? (styleTag.textContent = cssVertical) : (styleTag.textContent = cssHorizontal);
    }

    $: activeCowebsite, updateDynamicStyles();
    $: vertical, updateDynamicStyles();
</script>

<div
    id="cowebsites-container"
    class={vertical
        ? "height-default-vertical w-full right-0 top-0 fixed bg-contrast/50 backdrop-blur left_panel responsive-container fullscreen"
        : "width-default-horizontal h-full right-0 top-0 fixed bg-contrast/50 backdrop-blur left_panel flex-col pb-[76px]"}
    bind:this={container}
    in:fly|local={vertical ? { duration: 750, y: -1000 } : { duration: 750, x: 1000 }}
>
    <div class="flex py-2 ml-3 items-center height-tab overflow-hidden">
        {#if showArrow}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
                on:click={() => (appearDropdownMenu = !appearDropdownMenu)}
                on:click={() => (menuBurgerIcon = !menuBurgerIcon)}
            >
                {#if menuBurgerIcon}
                    <ChevronDownIcon />
                {:else}
                    <XIcon />
                {/if}
            </div>
        {/if}

        <!-- <div class="relative"> -->
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
        <!-- </div> -->

        {#if !vertical && appearDropdownMenu}
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
            ? "absolute left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize test-resize responsive-resize-bar"
            : "absolute resize-x left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize test-resize"}
        class:resize-bar={resizeBarHide}
        id="resize-bar"
        bind:this={resizeBar}
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
