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
    import { identity } from "lodash";
    // import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    // import { ICON_URL } from "../../Enum/EnvironmentVariable";
    // import jitsiIcon from "../images/jitsi.png";
    // import meetingIcon from "../images/meeting.svg";

    export let vertical = false;
    let activeCowebsite = $coWebsites[0].getId();
    let cowebsiteContainer: HTMLElement | null;
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startX: number;
    let startWidth: number;

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
            // Cleanup event listener
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
        console.log("toggleFullScreen");
        if (!document.fullscreenElement) {
            if (cowebsiteContainer && cowebsiteContainer.requestFullscreen) {
                cowebsiteContainer.requestFullscreen().catch((e) => {
                    console.error(e);
                });
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen().catch((e) => {
                console.error(e);
            });
        }
    }

    // function addDivForResize() {
    //     if (div === null) {
    //         div.style.display = "none";
    //     } else {
    //         const div = document.createElement("div");
    //         div.style.width = "100%";
    //         div.style.height = "100%";
    //         div.style.position = "absolute";
    //         div.style.top = "0";
    //         div.style.left = "0";
    //         div.style.zIndex = "1000";
    //         div.style.backgroundColor = "pink";
    //         div.style.opacity = "0.4";
    //         document.body.appendChild(div);
    //     }
    // }

    function addDivForResize() {
        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.position = "absolute";
        div.style.top = "0";
        div.style.left = "0";
        div.style.zIndex = "1000";
        div.style.backgroundColor = "pink";
        div.style.opacity = "0.4";
        document.body.appendChild(div);
    }

    function removeDivForResize() {
        console.log("bonjour");
        // const div = document.getElementById("div");
        // console.log("removeDivForResize");
        // if (div) {
        //     document.body.removeChild(div);
        // }
    }
</script>

<div
    class="w-1/2 h-screen absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500] left_panel"
    id="cowebsites-container"
    class:vertical
    transition:fly={{ duration: 750, x: 1000 }}
    bind:this={container}
>
    <div class="flex py-2 ml-3 items-center">
        <div class="grow flex">
            {#each $coWebsites as coWebsite (coWebsite.getId())}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class={`${activeCowebsite === coWebsite.getId()}`}
                    on:click={() => setActiveCowebsite(coWebsite.getId())}
                >
                    {#if coWebsite instanceof JitsiCoWebsite}
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            isClosable={false}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    {/if}
                    {#if coWebsite instanceof SimpleCoWebsite}
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            isClosable={true}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    {/if}
                    {#if coWebsite instanceof BBBCoWebsite}
                        <CoWebsiteTab
                            {coWebsite}
                            isLoading={true}
                            isClosable={true}
                            on:close={() => coWebsites.remove(coWebsite)}
                        />
                    {/if}
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

        <!-- {#each $coWebsites as coWebsite (coWebsite.getId())}
            {#if activeCowebsite === coWebsite.getId()}

                {#if coWebsite instanceof SimpleCowebsiteComponent}
                <SimpleCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
            {/if}
        {/each}

        Itérer sur les cowebsite avec les sveltes components voir pour instance de jitsi -->

        <!-- {#each $coWebsites as coWebsite (coWebsite.getId())} -->
        <!-- {#if activeCowebsite === coWebsite.getId()}
                {#if coWebsite instanceof JitsiCoWebsite}
                    <JitsiCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
            {/if} -->
        <!-- {/each} -->

        <!-- Exemple itération sur ce que je vais devoir faire -->
        <!-- <div class="popups">
            {#each $coWebsites as coWebsite (coWebsite.getId())}
                <div class="container">
                    <svelte:component this={cowebsite.component} {...coWebsite.props} on:close={() => coWebsites.remove(coWebsite.getId())} />
                </div>
            {/each}
        </div> -->
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="absolute left-1 top-0 bottom-0 m-auto w-4 h-40 bg-white rounded cursor-col-resize test-resize"
        id="resize-bar"
        bind:this={resizeBar}
        on:mousedown={addDivForResize}
        on:dragend={removeDivForResize}
    />
</div>
