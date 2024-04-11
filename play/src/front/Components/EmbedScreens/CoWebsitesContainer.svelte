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

    let activeCowebsite = $coWebsites[0].getId();
    let showDropdown = false;
    let tabBar: HTMLElement;
    let showArrow = false;
    let vertical = false;
    let cowebsiteContainer: HTMLElement | null;
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startY: number;
    let startX: number;
    let startWidthContainer: number;
    let widthContainer: number;
    let startHeight: number;
    let mediaQuery = window.matchMedia("(max-width: 768px)");
    let totalTabsWidth = 0;
    let initialWidth: number;
    let widthTab = 300;
    let widthTabResponsive = 200;

    onMount(() => {
        if (mediaQuery.matches) {
            vertical = true;
            cowebsiteContainer = document.getElementById("cowebsites-container");
            startWidthContainer = parseInt(getComputedStyle(container).width);
            initialWidth = parseInt(getComputedStyle(container).width);

            if (cowebsiteContainer) {
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
        } else {
            vertical = false;

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

        return () => {};
    });

    function handleTabMounted() {
        if (mediaQuery.matches) {
            totalTabsWidth += widthTabResponsive;
            appearDropdown();
        } else {
            totalTabsWidth += widthTab;
            appearDropdown();
        }
    }

    function handleTabDestroyed() {
        if (mediaQuery.matches) {
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

    const setActiveCowebsite = (coWebsiteId: string) => {
        activeCowebsite = coWebsiteId;
        showDropdown = false;
    };

    const subscription = coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1]?.getId();
    });

    function toggleFullScreen() {
        cowebsiteContainer = document.getElementById("cowebsites-container");
        resizeBar = document.getElementById("resize-bar") as HTMLInputElement;

        if (!document.fullscreenElement) {
            if (cowebsiteContainer && cowebsiteContainer.requestFullscreen) {
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
</script>

<div
    class={vertical
        ? "w-1/2 h-full absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500] left_panel responsive-container"
        : "w-1/2 h-full absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500] left_panel flex-col padding"}
    id="cowebsites-container"
    transition:fly={vertical ? { duration: 750, y: -1000 } : { duration: 750, x: 1000 }}
    bind:this={container}
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
            {#if !mediaQuery.matches}
                {#each $coWebsites.slice(0, Math.floor(initialWidth / 300)) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={() => setActiveCowebsite(coWebsite.getId())}>
                        <CoWebsiteTab
                            on:tabMounted={handleTabMounted}
                            on:tabUnmounted={handleTabDestroyed}
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite.getId().toString()}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            {:else}
                {#each $coWebsites.slice(0, Math.floor(initialWidth / 200)) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={() => setActiveCowebsite(coWebsite.getId())}>
                        <CoWebsiteTab
                            on:tabMounted={handleTabMounted}
                            on:tabUnmounted={handleTabDestroyed}
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite.getId().toString()}
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
            {#if !mediaQuery.matches}
                {#each $coWebsites.slice(Math.floor(initialWidth / 300)) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div class="" on:click={() => setActiveCowebsite(coWebsite.getId())}>
                        <CoWebsiteTab
                            on:tabMounted={handleTabMounted}
                            on:tabUnmounted={handleTabDestroyed}
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite.getId().toString()}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            {:else}
                {#each $coWebsites.slice(Math.floor(initialWidth / 200)) as coWebsite (coWebsite.getId())}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div class="" on:click={() => setActiveCowebsite(coWebsite.getId())}>
                        <CoWebsiteTab
                            on:tabMounted={handleTabMounted}
                            on:tabUnmounted={handleTabDestroyed}
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite.getId().toString()}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/each}
            {/if}
        </div>
    </div>

    <div class={vertical ? "h-full ml-3 responsive-website" : "h-full object-contain ml-3"}>
        {#each $coWebsites as coWebsite (coWebsite.getId())}
            {#if activeCowebsite === coWebsite.getId()}
                {#if coWebsite instanceof JitsiCoWebsite}
                    <JitsiCowebsiteComponent actualCowebsite={coWebsite} />
                {:else if coWebsite instanceof BBBCoWebsite}
                    <BigBlueButtonCowebsiteComponent actualCowebsite={coWebsite} />
                {:else if coWebsite instanceof SimpleCoWebsite}
                    <SimpleCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
            {/if}
        {/each}
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

<!-- transition:fly={{ duration: 750, y: -1000 }} Pour la transition en vertical -->
<style>
    /* Voir pour utiliser les container queries ou les medias queries pour le responsive */
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
    }
</style>
