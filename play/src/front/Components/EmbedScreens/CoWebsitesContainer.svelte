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

    export let vertical = false;
    export let activeCowebsite = $coWebsites[0].getId();
    let cowebsiteContainer: HTMLElement | null;
    let container: HTMLElement;
    let resizeBar: HTMLInputElement;
    let startX: number;
    let startWidth: number;

    onMount(() => {
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
    });

    const setActiveCowebsite = (coWebsiteId: string) => {
        activeCowebsite = coWebsiteId;
    };

    const subscription = coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1]?.getId();
        console.log(typeof activeCowebsite, ": ", activeCowebsite);
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
        resizeBar.style.display = "none";
        resizeBar.disabled = true;
        resizeBar.style.cursor = "not-allowed";
    }

    function showResizeBar() {
        resizeBar.style.display = "block";
        resizeBar.disabled = false;
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
    class="w-1/2 h-screen absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500] left_panel"
    id="cowebsites-container"
    class:vertical
    transition:fly={{ duration: 750, x: 1000 }}
    bind:this={container}
>
    <div class="flex py-2 ml-3 items-center overflow-auto">
        <div class="grow flex">
            {#each $coWebsites.slice().reverse() as coWebsite (coWebsite.getId())}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class={coWebsite.getId().toString() === activeCowebsite}
                    on:click={() => setActiveCowebsite(coWebsite.getId())}
                >
                    <CoWebsiteTab
                        {coWebsite}
                        isLoading={true}
                        active={activeCowebsite === coWebsite.getId().toString()}
                        on:close={() => coWebsites.remove(coWebsite)}
                        on:duplicate={() => console.log("faire la fonction de duplication ici")}
                    />
                </div>
            {/each}
        </div>

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
            on:click={toggleFullScreen}
        >
            <FullScreenIcon />
        </div>
    </div>

    <!-- Probleme avec l'appel en double de l'instance dans le tab voir pourquoi je ne sais pas encore trop -->
    <div class="h-full ml-3">
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
        class="absolute left-1 top-0 bottom-0 m-auto w-1.5 h-40 bg-white rounded cursor-col-resize test-resize"
        id="resize-bar"
        bind:this={resizeBar}
        on:mousedown={addDivForResize}
        on:dragend={removeDivForResize}
    />
</div>
