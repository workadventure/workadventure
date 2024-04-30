<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { max, min } from "lodash";
    import { ArrowDownIcon } from "svelte-feather-icons";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";

    let activeCowebsite = $coWebsites[0];
    let showDropdown = false;
    let tabBar: HTMLElement;
    let showArrow = false;
    let cowebsiteContainer = document.getElementById("cowebsites-container");
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startY: number;
    let startX: number;
    let startWidthContainer: number;
    let widthContainer: number;
    let startHeight: number;
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    let totalTabsWidth = 0;
    let initialWidth: number;
    const widthTab = 300;
    const widthTabResponsive = 150;
    let vertical: boolean;

    onMount(() => {
        mediaQuery.addEventListener("change", (e: any) => handleTabletChange(e));
        handleTabletChange(mediaQuery);
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
        initialWidth = parseInt(getComputedStyle(container).width);
        startWidthContainer = parseInt(getComputedStyle(container).width);
        const handleMouseDown = (e: { clientX: number }) => {
            startX = e.clientX;
            startWidthContainer = parseInt(getComputedStyle(container).width);
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        };
        resizeBar.addEventListener("mousedown", handleMouseDown);
        const handleMouseMove = (e: { clientX: number }) => {
            widthContainer = startWidthContainer - (e.clientX - startX);
            container.style.width = widthContainer + "px";
            initialWidth = parseInt(getComputedStyle(container).width);
            const maxWidth = min([widthContainer, window.innerWidth - 350]);
            container.style.width = maxWidth + "px";
        };
        const handleMouseUp = () => {
            appearDropdown();
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
        return () => {
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
            document.addEventListener("touchmove", handleMouseMove);
            document.addEventListener("touchend", handleMouseUp);
        }

        resizeBar.addEventListener("touchstart", handleMouseDown, false);

        function handleMouseMove(e: TouchEvent) {
            let clientY = e.touches[0].clientY;
            const height = startHeight + (clientY - startY);
            container.style.height = height + "px";
            const minHeight = max([height, window.innerHeight - 600]);
            container.style.height = minHeight + "px";
            // const maxHeight = min([height, window.innerHeight - 100]);
            // container.style.height = maxHeight + "px";
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
        if (vertical) {
            totalTabsWidth -= widthTabResponsive;
            appearDropdown();
        } else {
            totalTabsWidth -= widthTab;
            appearDropdown();
        }
    }

    function appearDropdown() {
        let div = document.getElementById("dropdown-container");
        if (totalTabsWidth > startWidthContainer) {
            if (div) {
                div.classList.remove("hidden");
            }
            showArrow = true;
        } else {
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

    function addDivForResize() {
        const div = document.createElement("div");
        div.id = "resize-overlay";
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.position = "absolute";
        div.style.top = "0";
        div.style.left = "0";
        div.style.zIndex = "1000";
        document.body.appendChild(div);

        window.addEventListener("mouseup", removeDivForResize);
    }

    function removeDivForResize() {
        const div = document.getElementById("resize-overlay");
        if (div) {
            document.body.removeChild(div);
        }
    }

    function getWidthPercentage() {
        if (activeCowebsite.getWidthPercent()) {
            let widthPercent = activeCowebsite.getWidthPercent();
            const classWidth = document.createElement("style") as HTMLStyleElement;
            classWidth.textContent = `.width-container { width: ${widthPercent}% }`;
            return classWidth;
        }
        return "w-6/12";
    }

    function getPanelClass() {
        const widthPercentage = getWidthPercentage();
        return `${widthPercentage} h-full absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500] left_panel`;
    }

    let panelClass = getPanelClass();
</script>

<!-- svelte-ignore missing-declaration -->
<!-- use:draggable={{ axis: "x" }} -->

<div
    class={vertical ? `${panelClass} responsive-container` : `${panelClass} flex-col padding`}
    id="cowebsites-container"
    bind:this={container}
    in:fly|local={vertical ? { duration: 750, y: -1000 } : { duration: 750, x: 1000 }}
>
    <div class="flex py-2 ml-3 items-center height-tab overflow-hidden">
        {#if showArrow}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="aspect-ratio stroke-white fill-transparent h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer {showDropdown
                    ? 'rotate-180'
                    : ''}"
                on:click={() => (showDropdown = !showDropdown)}
            >
                <ArrowDownIcon />
            </div>
        {/if}

        <div class="grow flex tab" id="tabBar" bind:this={tabBar}>
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
                {#each $coWebsites.slice(0, Math.floor(initialWidth / 150)) as coWebsite (coWebsite.getId())}
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

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer z-2000"
            on:click={toggleFullScreen}
        >
            <FullScreenIcon />
        </div>
    </div>

    <div class="relative" id="dropdown-container">
        <div id="dropdown" class="tab-drop-down bg-contrast/80 absolute {showDropdown ? '' : 'hidden'}">
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
                {#each $coWebsites.slice(Math.floor(initialWidth / 150)) as coWebsite (coWebsite.getId())}
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
        margin-top: 8px;
        padding-top: -48px;
        width: 300px;
        height: auto;
        border-radius: 8px;
    }

    @media (max-width: 768px) {
        .responsive-container {
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
            width: 200px;
            height: auto;
            border-radius: 8px;
        }

        #dropdown {
            width: 200px;
        }
    }
</style>
