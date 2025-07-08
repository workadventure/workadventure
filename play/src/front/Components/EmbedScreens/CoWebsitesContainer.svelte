<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { coWebsiteRatio, coWebsites, fullScreenCowebsite } from "../../Stores/CoWebsiteStore";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import ChevronLeftIcon from "../Icons/ChevronLeftIcon.svelte";
    import ChevronRightIcon from "../Icons/ChevronRightIcon.svelte";
    import { screenOrientationStore } from "../../Stores/ScreenOrientationStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";

    //let container: HTMLElement;
    let activeCowebsite: CoWebsite = $coWebsites[0];
    let resizeBar: HTMLElement;
    let unsubscribeCowebsitesUpdate: Unsubscriber | undefined;

    onMount(() => {
        unsubscribeCowebsitesUpdate = coWebsites.subscribe((arr) => {
            activeCowebsite = arr[arr.length - 1];
        });

        resizeBar.addEventListener("mousedown", handleMouseDown);
        resizeBar.addEventListener("touchstart", handleTouchStart);
    });

    const handleMouseDown = () => {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleTouchStart = () => {
        document.addEventListener("touchmove", handleTouchMove);
        document.addEventListener("touchend", handleTouchEnd);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if ($screenOrientationStore === "landscape") {
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
        window.removeEventListener("mouseup", removeDivForResize);
    }

    const setActiveCowebsite = (coWebsite: CoWebsite) => {
        activeCowebsite = coWebsite;
    };

    function toggleFullScreen(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        if ($fullScreenCowebsite) {
            fullScreenCowebsite.set(false);
        } else {
            fullScreenCowebsite.set(true);
            analyticsClient.fullScreenCowebsite();
        }
    }

    onDestroy(() => {
        fullScreenCowebsite.set(false);

        unsubscribeCowebsitesUpdate?.();

        resizeBar.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        resizeBar.removeEventListener("touchstart", handleTouchStart);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
    });

    let tabsContainer: HTMLElement | undefined;
    let tabsContainerWidth = 0;
    let tabsOverflowing = false;
    let tabsScrollX = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    $: tabsContainerWidth, $coWebsites, (tabsOverflowing = areTabsOverflowing());

    function areTabsOverflowing(): boolean {
        if (!tabsContainer) {
            return false;
        }

        return tabsContainer.scrollWidth > tabsContainer.clientWidth;
    }

    function scrollTabsLeft() {
        if (!tabsContainer) {
            return;
        }
        const scrollX = tabsContainer.scrollLeft;
        for (let i = tabsContainer.childNodes.length - 1; i >= 0; i--) {
            const tab = tabsContainer.childNodes[i] as HTMLElement;
            if (tab.offsetLeft < scrollX) {
                tabsContainer.scrollTo({
                    left: tab.offsetLeft,
                    behavior: "smooth",
                });
                break;
            }
        }
    }

    function scrollTabsRight() {
        if (!tabsContainer) {
            return;
        }
        const containerWidth = tabsContainer.clientWidth;
        const scrollWidth = tabsContainer.scrollWidth;

        const newScrollX = scrollWidth - containerWidth;

        tabsContainer.scrollTo({
            left: newScrollX,
            behavior: "smooth",
        });
    }

    function onTabsScroll() {
        if (!tabsContainer) return;
        tabsScrollX = tabsContainer.scrollLeft;
        tabsOverflowing = tabsContainer.scrollWidth > tabsContainer.clientWidth;
    }
</script>

<div
    id="cowebsites-container"
    class="w-full h-full bg-contrast/50 backdrop-blur relative {!$fullScreenCowebsite
        ? 'cowebsite-normal'
        : 'cowebsite-fullscreen'}"
    style="transition: background-color 0.2s ease-in-out, backdrop-filter 0.2s ease-in-out;"
>
    <div class="h-full w-full flex flex-col">
        <div class="flex py-2 ms-3 items-center height-tab flex-none gap-x-2">
            {#if tabsOverflowing && tabsScrollX > 0}
                <div class="flex-0 w-10">
                    <button
                        class="w-10 h-10 rounded flex items-center justify-center hover:bg-white/10 me-2"
                        on:click={scrollTabsLeft}
                    >
                        <ChevronLeftIcon />
                    </button>
                </div>
            {/if}
            <!-- For some weird reason, we need to put a random width so that flex-1 can work and ignore the width...
                 Otherwise, flex-1 does nothing -->
            <div class="tab-bar flex-1 w-32 min-w-0 " bind:clientWidth={tabsContainerWidth}>
                <div
                    bind:this={tabsContainer}
                    class="flex items-center space-x-2 snap-x touch-pan-x overflow-x-hidden"
                    on:scroll={onTabsScroll}
                >
                    {#each $coWebsites as coWebsite, index (coWebsite.getId())}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            on:click={() => setActiveCowebsite(coWebsite)}
                            data-testid="tab{index + 1}"
                            class="snap-start flex-shrink min-w-[90px] basis-auto"
                        >
                            <CoWebsiteTab
                                {coWebsite}
                                isLoading={true}
                                active={activeCowebsite === coWebsite}
                                on:close={() => coWebsites.remove(coWebsite)}
                                availableWidth={Math.max(
                                    120,
                                    (tabsContainerWidth - ($coWebsites.length - 1) * 8 - 80) / $coWebsites.length
                                )}
                            />
                        </div>
                    {/each}
                </div>
            </div>

            <div class="flex-0 w-10">
                <button
                    class="w-10 h-10 rounded flex items-center justify-center hover:bg-white/10 me-2 {tabsScrollX >=
                    tabsContainer?.scrollWidth - tabsContainer?.clientWidth
                        ? 'opacity-50 cursor-not-allowed'
                        : ''}"
                    on:click={scrollTabsRight}
                >
                    <ChevronRightIcon />
                </button>
            </div>

            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="flex justify-end w-10 flex-none">
                <div
                    class="ms-full h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 me-2 cursor-pointer"
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

        <div class={$screenOrientationStore === "portrait" ? "flex-1 mb-3" : "h-full object-contain ms-3"}>
            {#each $coWebsites as coWebsite (coWebsite.getId())}
                {#if coWebsite instanceof JitsiCoWebsite}
                    <JitsiCowebsiteComponent actualCowebsite={coWebsite} visible={coWebsite === activeCowebsite} />
                {:else if coWebsite instanceof BBBCoWebsite}
                    <BigBlueButtonCowebsiteComponent
                        actualCowebsite={coWebsite}
                        visible={coWebsite === activeCowebsite}
                    />
                {:else if coWebsite instanceof SimpleCoWebsite}
                    <SimpleCowebsiteComponent
                        actualCowebsite={coWebsite}
                        allowApi={coWebsite.getAllowApi()}
                        visible={coWebsite === activeCowebsite}
                    />
                {/if}
            {/each}
        </div>
    </div>
    <!-- We make the drag handle bigger than it really is to make it more easily selectable (especially on mobile) with "after" pseudo element -->
    <div
        class={$screenOrientationStore === "portrait"
            ? "-mt-1.5 mx-auto w-40 h-1 bg-white rounded cursor-row-resize relative after:content-[''] after:absolute after:-start-4 after:-top-1  after:w-48 after:h-6"
            : "absolute start-1 top-0 bottom-0 m-auto w-1 h-40 bg-white rounded cursor-col-resize after:content-[''] after:absolute after:-start-4 after:-top-4 after:h-48 after:w-6"}
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

<style>
    .cowebsite-normal {
        position: relative;
        z-index: 1;
    }

    .cowebsite-fullscreen {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
    }
</style>
