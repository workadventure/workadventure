<script lang="ts">
    import { fly } from "svelte/transition";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import { onMount } from "svelte";
    import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";

    export let vertical = false;
    export let activeCowebsite = $coWebsites[0].getId();
    let cowebsiteContainer: HTMLElement | null;
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startX: number;
    let startWidth: number;
    let active = false;
    let coWebsiteTab = document.getElementById("cowebsite-tab");

    onMount(() => {
        const handleMouseDown = (e) => {
            startX = e.clientX;
            startWidth = parseInt(getComputedStyle(container).width);
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        };

        resizeBar.addEventListener("mousedown", handleMouseDown);

        const handleMouseMove = (e) => {
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

    coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1]?.getId();
    });

    function toggleFullScreen() {
        cowebsiteContainer = document.getElementById("cowebsites-container");
        resizeBar = document.getElementById("resize-bar") as HTMLElement;
        if (!document.fullscreenElement) {
            if (cowebsiteContainer && cowebsiteContainer.requestFullscreen) {
                cowebsiteContainer.requestFullscreen().catch((e) => {
                    console.error(e);
                });
                resizeBar.style.display = "none";
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen().catch((e) => {
                console.error(e);
            });
            resizeBar.style.display = "block";
        }
    }

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

<!-- Cette div devra apparaitre que s'il y a un event et elle peux apparaitre avec la methode display main dans le cowebsite manager-->

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
                    id="cowebsite-tab"
                    class={`${activeCowebsite === coWebsite.getId()}`}
                    on:click={() => setActiveCowebsite(coWebsite.getId())}
                >
                    <CoWebsiteTab
                        {coWebsite}
                        active={false}
                        isLoading={true}
                        on:close={() => coWebsites.remove(coWebsite)}
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
    <div class="h-full ml-3">
        {#each $coWebsites as coWebsite (coWebsite.getId())}
            {#if activeCowebsite === coWebsite.getId()}
                {#if coWebsite instanceof JitsiCoWebsite}
                    <JitsiCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
                {#if coWebsite instanceof SimpleCoWebsite}
                    <SimpleCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
                {#if coWebsite instanceof BBBCoWebsite}
                    <BigBlueButtonCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
            {/if}
        {/each}
    </div>
    <div
        class="absolute left-1 top-0 bottom-0 m-auto w-2 h-40 bg-white rounded cursor-col-resize test-resize"
        id="resize-bar"
        bind:this={resizeBar}
        on:mousedown={addDivForResize}
        on:dragend={removeDivForResize}
    />
</div>

<style>
    .active {
        background-color: white;
    }
</style>
