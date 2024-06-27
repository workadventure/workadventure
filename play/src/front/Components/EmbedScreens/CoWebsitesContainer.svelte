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
    import MenuBurgerIcon from "../Icons/MenuBurgerIcon.svelte";

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
    let initialWidth: number;
    const widthTab = 300;
    const widthTabResponsive = 220;
    let vertical: boolean;
    let resizeBarHide = false;
    let styleTag: HTMLStyleElement;
    $: appearDropdownMenu = $totalTabWidth > window.innerWidth - $widthContainer + 100;
    // $: appearDropdownMenuMobile = $totalTabWidthMobile > window.innerWidth - $widthContainer + 100;
    $: showArrow = $totalTabWidth > window.innerWidth - $widthContainer + 100;
    let numberMaxOfCowebsite: number;
    let menuBurgerIcon = false;
    // $: console.log(appearDropdownMenu, "appearDropdownMenu");

    onMount(() => {
        mediaQuery.addEventListener("change", (e: any) => handleTabletChange(e));
        handleTabletChange(mediaQuery);
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
    });

    function handleTabletChange(e: MediaQueryList) {
        if (e.matches) {
            vertical = true;
            resizeMobile();
        } else {
            vertical = false;
            resizeDesktop();
        }
    }

    function resizeDesktop() {
        startWidthContainer = parseInt(getComputedStyle(container).width);
        // console.log(startWidthContainer, "startWidthContainer");
        initialWidth = parseInt(getComputedStyle(container).width);
        // console.log(initialWidth, "initialWidth");
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
            resizeMax(newWidth);
            waScaleManager.applyNewSize();
        };
        const handleMouseUp = () => {
            // appearDropdown();
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
        initialWidth = parseInt(getComputedStyle(container).width);
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
            let newHeight = startHeight - (clientY - startY);
            heightContainer.set(newHeight);
            finalHeight = newHeight + "px";
            container.style.height = finalHeight;
            const maxHeight = Math.min(newHeight, window.innerHeight * 0.75);
            heightContainer.set(maxHeight);
            if (maxHeight !== newHeight) {
                container.style.height = maxHeight + "px";
            }
            resizeMax(newHeight);
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

    function resizeMax(newValue: number) {
        if (!vertical) {
            const maxWidth = window.innerWidth * 0.75;
            if (newValue < maxWidth) {
                widthContainer.set(newValue);
            } else {
                container.style.width = `${maxWidth}px`;
            }
        } else {
            const maxHeight = window.innerHeight * 0.75;
            if (newValue < maxHeight) {
                heightContainer.set(newValue);
            } else {
                container.style.height = `${maxHeight}px`;
            }
        }
    }

    // $: if (vertical) ? $totalTabWidth, numberMaxCowebsite() : $totalTabWidthMobile, numberMaxCowebsite();
    $: console.log($totalTabWidth, "totalTabWidth");
    $: $totalTabWidthMobile, numberMaxCowebsite();
    $: $widthContainer, numberMaxCowebsite();
    $: console.log($widthContainer, "widthContainer");

    function numberMaxCowebsite() {
        if (!vertical) {
            numberMaxOfCowebsite = Math.floor((window.innerWidth - $canvasWidth) / 300);
            console.log(numberMaxOfCowebsite, "numberMaxOfCowebsite");
        } else {
            numberMaxOfCowebsite = Math.floor((window.innerWidth - $canvasWidth) / 220);
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
        : "width-default-horizontal h-full right-0 top-0 fixed bg-contrast/50 backdrop-blur left_panel flex-col padding"}
    bind:this={container}
    in:fly|local={vertical ? { duration: 750, y: -1000 } : { duration: 750, x: 1000 }}
>
    <div class="flex py-2 ml-3 items-center height-tab overflow-hidden">
        {#if showArrow}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="aspect-ratio fill-white h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer {menuBurgerIcon
                    ? 'stroke-white'
                    : 'bg-white fill-black'}"
                on:click={() => (appearDropdownMenu = !appearDropdownMenu)}
                on:click={() => (menuBurgerIcon = !menuBurgerIcon)}
            >
                <MenuBurgerIcon />
            </div>
        {/if}

        <div class="relative">
            <div class="tab-bar flex items-center justify-between overflow-x-auto" id="tabBar">
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
            </div>
        </div>

        <div
            class="fixed top-[15%] left-0 bg-contrast/80 rounded-lg max-h-[80vh] min-h-[50px] overflow-y-auto w-auto tab-drop-down"
        >
            {#if appearDropdownMenu}
                {#if !vertical}
                    <div class="max-h-[50px] w-[50px] bg-red-500 absolute top-0 left-0" />
                    {#each $coWebsites.slice(Math.floor(numberMaxOfCowebsite)) as coWebsite (coWebsite.getId())}
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
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    {#each $coWebsites.slice(Math.floor(numberMaxOfCowebsite)) as coWebsite (coWebsite.getId())}
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
            {/if}
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
            on:click={toggleFullScreen}
        >
            <FullScreenIcon />
        </div>
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
            : "absolute left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize test-resize"}
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
    .padding {
        padding-bottom: 76px;
    }
    /* .tab-drop-down {
        margin-top: 10%;
        padding-top: -48px;
        width: 300px;
        height: auto;
        border-radius: 8px;
    } */
    /*
    #dropdown-container {

        max-height: 80vh;
        min-height: 50px;
        width: auto;
    } */

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
        .tab-drop-down {
            margin-top: 15%;
            width: 200px;
            height: auto;
            border-radius: 8px;
        }
        #dropdown-container {
            width: 220px;
        }
    }
</style>
