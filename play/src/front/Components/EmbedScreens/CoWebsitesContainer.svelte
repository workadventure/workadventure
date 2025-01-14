<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import {
        coWebsiteRatio,
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
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import XIcon from "../Icons/XIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";

    //let container: HTMLElement;
    let activeCowebsite = $coWebsites[0];
    let resizeBar: HTMLElement;
    let vertical: boolean;

    // TODO
    let appearDropdownMenu = false;
    let showArrow: boolean;
    let numberMaxOfCowebsite: number;
    let menuArrow = false;
    let isToggleFullScreen = false;

    let containerWidth: number;

    function updateScreenSize() {
        if (window.innerWidth <= window.innerHeight) {
            vertical = true;
            //resizeCowebsite();
        } else {
            vertical = false;
            //resizeCowebsite();
        }
    }

    window.addEventListener("resize", () => {
        if ($coWebsites.length > 0) {
            //getSizeOfCowebsiteWhenResizeWindow();
            //resizeFromCowebsite.set(false);
            updateScreenSize();
            showArrow = $totalTabWidth > containerWidth;
        }
    });

    let unsubscribeCowebsitesUpdate: Unsubscriber | undefined;

    onMount(() => {
        updateScreenSize();
        //resizeCowebsite();
        if (!vertical) {
            //let widthOnMount = parseInt(getComputedStyle(container).width);
            //widthContainerForWindow.set(widthOnMount);
        } else {
            //let heightOnMount = parseInt(getComputedStyle(container).height);
            //heightContainerForWindow.set(heightOnMount);
        }

        unsubscribeCowebsitesUpdate = coWebsites.subscribe((arr) => {
            activeCowebsite = arr[arr.length - 1];
        });

        //waScaleManager.applyNewSize();
        numberMaxCowebsite();
        showArrow = $totalTabWidth > containerWidth;
        resizeBar.addEventListener("mousedown", handleMouseDown);
        resizeBar.addEventListener("touchstart", handleTouchStart);
    });

    /*function getSizeOfCowebsiteWhenResizeWindow() {
        if (vertical) {
            heightFromResize.set($heightContainerForWindow);
            container.style.height = `${$heightContainerForWindow}px`;
            container.style.width = "100%";
        } else {
            widthFromResize.set($widthContainerForWindow);
            container.style.width = `${$widthFromResize}px`;
            container.style.height = "100%";
        }
    }*/

    const handleMouseDown = (e: { clientX: number }) => {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleTouchStart = () => {
        document.addEventListener("touchmove", handleTouchMove);
        document.addEventListener("touchend", handleTouchEnd);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!vertical) {
            if (document.documentElement.dir === "rtl") {
                // 8 is the number of pixels of the resize bar
                if (clientX < 8) {
                    clientX = 8;
                }
                if (clientX > window.innerWidth) {
                    clientX = window.innerWidth;
                }

                coWebsiteRatio.set(clientX / window.innerWidth);
            } else {
                if (clientX < 0) {
                    clientX = 0;
                }
                // 8 is the number of pixels of the resize bar
                if (clientX > window.innerWidth - 8) {
                    clientX = window.innerWidth - 8;
                }
                coWebsiteRatio.set((window.innerWidth - clientX) / window.innerWidth);
            }
        } else {
            // 8 is the number of pixels of the resize bar
            if (clientY < 8) {
                clientY = 8;
            }
            if (clientY > window.innerHeight) {
                clientY = window.innerHeight;
            }

            coWebsiteRatio.set(clientY / window.innerHeight);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        let clientX = e.clientX;
        let clientY = e.clientY;
        handleMove(clientX, clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        let clientX = e.touches[0].clientX;
        let clientY = e.touches[0].clientY;
        handleMove(clientX, clientY);
    };
    const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };
    const handleTouchEnd = () => {
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
    };

    $: {
        if (vertical) {
            $totalTabWidth, numberMaxCowebsite();
        } else {
            $totalTabWidthMobile, numberMaxCowebsite();
        }
    }

    $: $totalTabWidthMobile, numberMaxCowebsite();
    $: containerWidth, numberMaxCowebsite();
    $: isToggleFullScreen, numberMaxCowebsite();

    $: {
        if (isToggleFullScreen) {
            menuArrow = false;
            numberMaxCowebsite();
        } else {
            menuArrow = true;
            numberMaxCowebsite();
            appearDropdownMenu = true;
        }
    }

    function numberMaxCowebsite() {
        showArrow = $totalTabWidth > containerWidth;
        if (!vertical) {
            numberMaxOfCowebsite = Math.floor(containerWidth / 300);
            if (numberMaxOfCowebsite < 1) {
                showArrow = false;
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
        div.style.width = "100%";
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

    function toggleFullScreen() {
        if ($fullScreenCowebsite) {
            fullScreenCowebsite.set(false);
            isToggleFullScreen = false;
        } else {
            fullScreenCowebsite.set(true);
            isToggleFullScreen = true;
        }
    }

    onDestroy(() => {
        //heightContainerForWindow.set(window.innerHeight);
        //widthContainerForWindow.set(0);
        //resizeFromCowebsite.set(false);
        fullScreenCowebsite.set(false);
        //waScaleManager.applyNewSize();

        unsubscribeCowebsitesUpdate?.();
        //isResized.set(false);
        //canvasHeight.set(window.innerHeight);
        //canvasWidth.set(window.innerWidth);

        resizeBar.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        resizeBar.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
    });
</script>

<div id="cowebsites-container" class="w-full h-full bg-contrast/50 backdrop-blur" bind:clientWidth={containerWidth}>
    <div class="h-full w-full flex flex-col">
        <div class="flex py-2 ml-3 items-center height-tab overflow-hidden h-13 flex-none">
            {#if showArrow}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
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

            <div class="tab-bar flex items-center space-x-2 w-full overflow-x-auto">
                {#if !vertical}
                    <!-- 300 is corresponding to the width of a tab so we calculate to know if it will fit -->
                    {#each $coWebsites.slice(0, numberMaxOfCowebsite) as coWebsite, index (coWebsite.getId())}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div on:click={() => setActiveCowebsite(coWebsite)} data-testid="tab{index + 1}">
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
                        class="ml-full h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
                        on:click={toggleFullScreen}
                    >
                        {#if !$fullScreenCowebsite}
                            <FullScreenIcon />
                        {:else}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-arrows-minimize"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M5 9l4 0l0 -4" />
                                <path d="M3 3l6 6" />
                                <path d="M5 15l4 0l0 4" />
                                <path d="M3 21l6 -6" />
                                <path d="M19 9l-4 0l0 -4" />
                                <path d="M15 9l6 -6" />
                                <path d="M19 15l-4 0l0 4" />
                                <path d="M15 15l6 6" />
                            </svg>
                        {/if}
                    </div>
                </div>
            </div>

            {#if !vertical && appearDropdownMenu && menuArrow}
                <div
                    class="absolute md:fixed z-10 md:top-[8%] left-0 bg-contrast/80 rounded-lg max-h-[80vh] min-h-[50px] overflow-y-auto w-auto tab-drop-down"
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
                    class="absolute md:fixed z-10 top-[15%] left-0 bg-contrast/80 rounded-md max-h-[80vh] w-[220px] overflow-y-auto tab-drop-down"
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

        <div class={vertical ? "flex-1 mb-3" : "h-full object-contain ml-3"}>
            {#if activeCowebsite instanceof JitsiCoWebsite}
                <JitsiCowebsiteComponent actualCowebsite={activeCowebsite} />
            {:else if activeCowebsite instanceof BBBCoWebsite}
                <BigBlueButtonCowebsiteComponent actualCowebsite={activeCowebsite} />
            {:else if activeCowebsite instanceof SimpleCoWebsite}
                <SimpleCowebsiteComponent actualCowebsite={activeCowebsite} allowApi={activeCowebsite.getAllowApi()} />
            {/if}
        </div>
    </div>
    <div
        class={vertical
            ? "-mt-1.5 mx-auto w-40 h-1 bg-white rounded cursor-row-resize"
            : "absolute left-1 top-0 bottom-0 m-auto w-1 h-40 bg-white rounded cursor-col-resize"}
        class:hidden={$fullScreenCowebsite}
        bind:this={resizeBar}
        on:mousedown={addDivForResize}
        on:mouseup={removeDivForResize}
        on:touchstart={addDivForResize}
        on:touchstart={() => {
            /*isResized.set(true)*/
        }}
        on:dragend={removeDivForResize}
        on:touchend={removeDivForResize}
    />
</div>
