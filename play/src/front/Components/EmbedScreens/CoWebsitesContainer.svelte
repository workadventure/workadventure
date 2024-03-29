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

    let vertical = false;
    let cowebsiteContainer: HTMLElement | null;
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startY: number;
    let startX: number;
    let startWidth: number;
    let startHeight: number;
    let mediaQuery = window.matchMedia("(max-width: 768px)");

    onMount(() => {
        // console.log(secondCoWebsite);
        if (mediaQuery.matches) {
            vertical = true;
            cowebsiteContainer = document.getElementById("cowebsites-container");

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
                    // const maxHeight = min([height, window.innerHeight - 150]);
                    // container.style.height = maxHeight + "px";
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
        } else {
            vertical = false;
            const handleMouseDown = (e: { clientX: number }) => {
                startX = e.clientX;
                startWidth = parseInt(getComputedStyle(container).width);
                document.addEventListener("mousemove", handleMouseMove);
                document.addEventListener("mouseup", handleMouseUp);
            };
            resizeBar.addEventListener("mousedown", handleMouseDown);
            const handleMouseMove = (e: { clientX: number }) => {
                const width = startWidth - (e.clientX - startX);
                container.style.width = width + "px";
                const maxWidth = min([width, window.innerWidth - 350]);
                container.style.width = maxWidth + "px";
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
        }
        return true;
    });

    const setActiveCowebsite = (coWebsiteId: string) => {
        activeCowebsite = coWebsiteId;
        showDropdown = false;
    };

    const subscription = coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1]?.getId();
    });

    function checkActiveCowebsite(coWebsiteId: string) {
        return activeCowebsite === coWebsiteId.toString();
    }

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
    <div class="flex py-2 ml-3 items-center overflow-auto height-tab">
        <div class="grow flex">
            <!-- Affichez uniquement l'onglet actif dans la barre d'onglets -->
            {#each $coWebsites as coWebsite}
                <div>
                    <CoWebsiteTab
                        {coWebsite}
                        isLoading={true}
                        active={activeCowebsite === coWebsite.getId().toString()}
                        on:close={() => coWebsites.remove(coWebsite)}
                    />
                </div>
            {/each}
        </div>
        <!-- Affichez l'icône du menu déroulant si le nombre d'onglets dépasse 1 -->
        {#if $coWebsites.length > 1}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div
                class="aspect-ratio h-10 w-10 fill-white rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer {showDropdown
                    ? 'rotate-180'
                    : ''}"
                on:click={() => (showDropdown = !showDropdown)}
            >
                <ArrowDownIcon />
            </div>
        {/if}
    </div>

    <!-- Affichez les onglets supplémentaires dans le menu déroulant -->
    {#if showDropdown}
        <div id="dropdown" class="tab-drop-down">
            {#each $coWebsites as coWebsite}
                <!-- Excluez l'onglet actif du menu déroulant -->
                {#if activeCowebsite !== coWebsite.getId().toString()}
                    <div>
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            active={activeCowebsite === coWebsite.getId().toString()}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    </div>
                {/if}
            {/each}
        </div>
    {/if}
    <!-- </div> -->

    <div class={vertical ? "h-full ml-3 responsive-website" : "h-full object-contain ml-3"}>
        {#each $coWebsites as coWebsite (coWebsite.getId())}
            {#if activeCowebsite === coWebsite.getId()}
                {#if coWebsite instanceof JitsiCoWebsite}
                    <JitsiCowebsiteComponent actualCowebsite={coWebsite} />
                {:else if coWebsite instanceof SimpleCoWebsite}
                    <SimpleCowebsiteComponent actualCowebsite={coWebsite} />
                {:else if coWebsite instanceof BBBCoWebsite}
                    <BigBlueButtonCowebsiteComponent actualCowebsite={coWebsite} />
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

    .dropdown {
        position: relative;
        display: inline-block;
        background-color: red;
    }

    .drop-down-content {
        display: none;
        position: absolute;
        background-color: #f1f1f1;
        min-width: 160px;
        overflow: auto;
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
        z-index: 1000;
    }

    .tab-drop-down {
        background-color: red;
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
    }
</style>
