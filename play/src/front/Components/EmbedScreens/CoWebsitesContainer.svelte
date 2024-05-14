<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { ArrowDownIcon } from "svelte-feather-icons";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { widthContainer } from "../../Stores/CoWebsiteStore";
    import { heightContainer } from "../../Stores/CoWebsiteStore";
    import { waScaleManager } from "../../Phaser/Services/WaScaleManager";

    let activeCowebsite = $coWebsites[0];
    let showDropdown = false;
    let showArrow = false;
    let cowebsiteContainer = document.getElementById("cowebsites-container");
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startY: number;
    let startX: number;
    let startWidthContainer: number;
    let finalWidth;
    let finalHeight;
    let startHeight: number;
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    let totalTabsWidth = 0;
    let initialWidth: number;
    const widthTab = 300;
    const widthTabResponsive = 220;
    let vertical: boolean;

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

        setTimeout(() => {
            waScaleManager.applyNewSize();
        }, 500);
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
        initialWidth = parseInt(getComputedStyle(container).width);

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
            const maxWidth = Math.min(newWidth, window.innerWidth - 350);
            widthContainer.set(maxWidth);
            if (maxWidth !== newWidth) {
                container.style.width = maxWidth + "px";
            }
            resizeMax(newWidth);
            waScaleManager.applyNewSize();
        };
        const handleMouseUp = () => {
            appearDropdown();
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

    function resizeMax(newValue: number) {
        if (!vertical) {
            const maxWidth = window.innerWidth - 350;
            if (newValue < maxWidth) {
                widthContainer.set(newValue);
            } else {
                container.style.width = `${maxWidth}px`;
            }
        } else {
            const maxHeight = window.innerHeight - 350;
            console.log("MAX RESIZE DU MOBILE", newValue);
            console.log("MAX HEIGHT", maxHeight);
            if (newValue < maxHeight) {
                heightContainer.set(newValue);
            } else {
                container.style.height = `${maxHeight}px`;
            }
        }
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
            const maxHeight = Math.min(newHeight, window.innerHeight - 350);
            heightContainer.set(maxHeight);
            if (maxHeight !== newHeight) {
                container.style.height = maxHeight + "px";
            }

            resizeMax(newHeight);

            // const totalHeight = document.body.scrollHeight + window.innerHeight;
            // const stopScrollAt75 = totalHeight * 0.75;
            // console.log("STOP SCROLL AT 75", stopScrollAt75);
            // console.log("HEIGHT CONTAINER", $heightContainer);
            // const stopScrollAt25 = totalHeight * 0.25;
            // console.log("STOP SCROLL AT 25", stopScrollAt25);

            // if ($heightContainer > stopScrollAt75 || $heightContainer < stopScrollAt25) {
            //     e.preventDefault(); // Prevent scrolling
            // }
            // const minHeight = max([height, window.innerHeight - 600]);
            // container.style.height = minHeight + "px";
            // const maxHeight = min([height, window.innerHeight - 100]);
            // container.style.height = maxHeight + "px";
            waScaleManager.applyNewSize();
        }

        const handleMouseUp = () => {
            appearDropdown();
            document.removeEventListener("touchmove", handleMouseMove);
            document.removeEventListener("touchend", handleMouseUp);
        };

        return () => {
            resizeBar.removeEventListener("touchstart", handleMouseDown);
            document.removeEventListener("touchmove", handleMouseMove);
            document.removeEventListener("touchend", handleMouseUp);
        };
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

    function handleTabMounted() {
        if (!vertical) {
            totalTabsWidth += widthTab;
            appearDropdown();
        } else {
            totalTabsWidth += widthTabResponsive;
            appearDropdown();
        }
    }

    function handleTabDestroyed() {
        if (!vertical) {
            totalTabsWidth -= widthTab;
            appearDropdown();
        } else {
            totalTabsWidth -= widthTabResponsive;
            appearDropdown();
        }
    }

    function appearDropdown() {
        let div = document.getElementById("dropdown-container");
        // let startWidthContainer = parseInt(getComputedStyle(container).width);
        console.log("WIDTH OF TAB BAR AT ONMOUNT", startWidthContainer);
        console.log("total tabs width", totalTabsWidth);
        if (totalTabsWidth > startWidthContainer) {
            console.log("CA PASSE PLUS DU TOUT");
            if (div) {
                div.classList.remove("hidden");
            }
            showArrow = true;
        } else {
            console.log("CA PASSE PASSE PASSE");
            if (div) {
                div.classList.add("hidden");
            }
            showArrow = false;
        }
    }

    const setActiveCowebsite = (coWebsite: CoWebsite) => {
        activeCowebsite = coWebsite;
        showDropdown = false;
    };
    const subscription = coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1];
    });

    function toggleFullScreen() {
        resizeBar = document.getElementById("resize-bar") as HTMLInputElement;
        cowebsiteContainer = document.getElementById("cowebsites-container");

        if (!document.fullscreenElement) {
            if (cowebsiteContainer?.requestFullscreen) {
                cowebsiteContainer.requestFullscreen().catch((e) => {
                    console.error(e);
                });
                hideResizeBar();
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen().catch((e) => {
                console.error(e);
            });
            showResizeBar();
        }
    }

    function hideResizeBar() {
        const resizeBarInput = resizeBar as HTMLInputElement;
        resizeBar.style.display = "none";
        resizeBarInput.disabled = true;
        resizeBar.style.cursor = "not-allowed";
    }

    function showResizeBar() {
        const resizeBarInput = resizeBar as HTMLInputElement;
        resizeBar.style.display = "block";
        resizeBarInput.disabled = false;
        resizeBar.style.cursor = "col-resize";
    }

    document.addEventListener("fullscreenchange", function () {
        if (!document.fullscreenElement) {
            showResizeBar();
        }
    });

    let styleTag: HTMLStyleElement;

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
        ? "height-default-vertical w-full right-0 top-0 fixed bg-contrast/50 backdrop-blur left_panel responsive-container"
        : "width-default-horizontal h-full right-0 top-0 fixed bg-contrast/50 backdrop-blur left_panel flex-col padding"}
    bind:this={container}
    in:fly|local={vertical ? { duration: 750, y: -1000 } : { duration: 750, x: 1000 }}
>
    <div class="flex py-2 ml-3 items-center height-tab overflow-hidden">
        {#if showArrow}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="aspect-ratio stroke-white h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer {showDropdown
                    ? 'rotate-180'
                    : ''}"
                on:click={() => (showDropdown = !showDropdown)}
            >
                <ArrowDownIcon />
            </div>
        {/if}

        <div class="relative">
            <div class="tab-bar flex items-center justify-between overflow-x-auto">
                {#if !vertical}
                    {#each $coWebsites.slice(0, Math.floor(initialWidth / 300)) as coWebsite (coWebsite.getId())}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={() => setActiveCowebsite(coWebsite)}>
                            <CoWebsiteTab
                                on:tabMounted={handleTabMounted}
                                on:tabUnmounted={handleTabDestroyed}
                                {coWebsite}
                                isLoading={true}
                                active={activeCowebsite === coWebsite}
                                on:close={() => coWebsites.remove(coWebsite)}
                            />
                        </div>
                    {/each}
                {:else}
                    {#each $coWebsites.slice(0, Math.floor(initialWidth / 220)) as coWebsite (coWebsite.getId())}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={() => setActiveCowebsite(coWebsite)}>
                            <CoWebsiteTab
                                on:tabMounted={handleTabMounted}
                                on:tabUnmounted={handleTabDestroyed}
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
            class="absolute top-0 left-0 mt-12 bg-contrast/80 rounded tab-drop-down {showDropdown ? '' : 'hidden'}"
            id="dropdown-container"
        >
            {#if !vertical}
                {#each $coWebsites.slice(Math.floor(initialWidth / 300)) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={() => setActiveCowebsite(coWebsite)}>
                        <CoWebsiteTab
                            on:tabMounted={handleTabMounted}
                            on:tabUnmounted={handleTabDestroyed}
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            {:else}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                {#each $coWebsites.slice(Math.floor(initialWidth / 220)) as coWebsite (coWebsite.getId())}
                    <div on:click={() => setActiveCowebsite(coWebsite)}>
                        <CoWebsiteTab
                            on:tabMounted={handleTabMounted}
                            on:tabUnmounted={handleTabDestroyed}
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
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
    .padding {
        padding-bottom: 76px;
    }
    .tab-drop-down {
        margin-top: 10%;
        padding-top: -48px;
        width: 300px;
        height: auto;
        border-radius: 8px;
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
