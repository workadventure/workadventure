<script lang="ts">
    import { fly } from "svelte/transition";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import { onMount } from "svelte";
    // import JitsiCowebsiteComponent from "../Cowebsites/JistiCowebsiteComponent.svelte";
    // import SimpleCowebsiteComponent from "../Cowebsites/SimpleCowebsiteComponent.svelte";
    // import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    // import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
    // import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    // import BigBlueButtonCowebsiteComponent from "../Cowebsites/BigBlueButtonCowebsiteComponent.svelte";

    export let vertical = false;

    let activeCowebsite = $coWebsites[0].getId();
    let cowebsiteContainer: HTMLElement | null;
    let container: HTMLElement;
    let resizeBar: HTMLElement;
    let startX: number;
    let startWidth: number;
    // const resizeContainer = document.getElementById("cowebsites-container");
    // let mousePosition: number;

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

    // onMount(() => {
    //     const handleMouseDown = (e) => {
    //         let isResizing = true;
    //         let startWidth = parseInt(getComputedStyle(container).width);
    //         let startX = e.clientX;

    //         const handleMouseMove = (e) => {
    //             if (!isResizing) return;

    //             const width = startWidth - (e.clientX - startX);
    //             container.style.width = width + "px";
    //         };

    //         const handleMouseUp = () => {
    //             isResizing = false;
    //             document.removeEventListener("mousemove", handleMouseMove);
    //             document.removeEventListener("mouseup", handleMouseUp);
    //         };

    //         document.addEventListener("mousemove", handleMouseMove);
    //         document.addEventListener("mouseup", handleMouseUp);
    //     };

    //     resizeBar.addEventListener("mousedown", handleMouseDown);

    //     return () => {
    //         // Cleanup event listener
    //         resizeBar.removeEventListener("mousedown", handleMouseDown);
    //     };
    // });
    // onMount(() => {
    // console.log(resizeBar);
    // console.log(container);
    // window.addEventListener("click", function (e) {
    //     isResizing = true;
    //     lastDownX = e.clientX;
    //     console.log(lastDownX);
    // });

    // document.addEventListener("mousemove", function (e) {
    //     // On ne veut rien faire si nous ne sommes pas en train de redimensionner.
    //     // if (!isResizing) return;
    //     const offsetRight = container
    //         ? container.offsetWidth - (e.clientX - container.getBoundingClientRect().left)
    //         : 0;
    //     left.style.right = offsetRight + "px";
    // });

    // document.addEventListener("mouseup", function (e) {
    //     // Arrêter de redimensionner
    //     isResizing = false;
    // });
    // });

    // onMount(() => {
    //     if (cowebsiteContainer) {
    //         cowebsiteContainer.addEventListener(
    //             "mousedown",
    //             function (e) {
    //                 mousePosition = e.clientX;
    //                 document.addEventListener("mousemove", resize, false);
    //             },
    //             false
    //         );
    //     }

    //     document.addEventListener(
    //         "mouseup",
    //         function () {
    //             document.removeEventListener("mousemove", resize, true);
    //         },
    //         false
    //     );
    // });

    // function resize(e) {
    //     const dx = mousePosition - e.clientX;
    //     mousePosition = e.clientX;
    //     cowebsiteContainer!.style.width = parseInt(getComputedStyle(cowebsiteContainer!, "").width) + dx + "px";
    // }

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
</script>

<!-- on:close={() => console.log("bonjourrrrrr")} pour event dispacher -->

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- <svelte:window
    on:mouseup={() => {
        document.removeEventListener("mousemove", resize, false);
        console.log("mouseup");
    }}
/> -->
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
                    <!-- svelte-ignore missing-declaration -->
                    <CoWebsiteTab
                        title={coWebsite.getId()}
                        url={coWebsite.getUrl().toString()}
                        isLoading={true}
                        active={activeCowebsite === coWebsite.getId()}
                        on:close={() => coWebsites.remove(coWebsite)}
                    />
                </div>
            {/each}
        </div>
        <!-- isClosable={coWebsite instanceof JitsiCoWebsite} -->

        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
            on:click={toggleFullScreen}
        >
            <FullScreenIcon />
        </div>
        <!-- <div class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer">
            <XIcon />
        </div> -->
    </div>
    <div class="h-full ml-3">
        {#each $coWebsites as coWebsite (coWebsite.getId())}
            {#if activeCowebsite === coWebsite.getId()}
                <!-- <svelte:component this={coWebsite.component} {...coWebsite.props} on:close={() => coWebsiteStore.remove(coWebsite.getId())} /> -->

                <!-- {#if coWebsite instanceof JitsiCoWebsite}
                    <JitsiCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
                {#if coWebsite instanceof SimpleCoWebsite}
                    <SimpleCowebsiteComponent actualCowebsite={coWebsite} />
                {/if}
                {#if coWebsite instanceof BBBCoWebsite}
                    <BigBlueButtonCowebsiteComponent actualCowebsite={coWebsite} />
                {/if} -->
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
            {#each $popupStore as popup, index (popup.uuid)}
                <div class="popupwrapper {index === 0 ? 'popup1' : index === 1 ? 'popup2' : index === 2 ? 'popup3' : index === 3 ? 'popup4' : index === 4 ? 'popup5' : ''}">
                    <svelte:component this={popup.component} {...popup.props} on:close={() => popupStore.removePopup(popup.uuid)} />
                </div>
            {/each}
        </div> -->
    </div>
    <div
        class="absolute left-1 top-0 bottom-0 m-auto w-4 h-40 bg-white rounded cursor-col-resize test-resize"
        id="resize-bar"
        bind:this={resizeBar}
    />
</div>

<style>
    /* #cowebsites-container::before {
        content: "";
        background-color: white;
        position: absolute;
        left: 0;
        width: 8px;
        height: 30%;
        cursor: ew-resize;
        border-radius: 4px;
        top: 35%;
    } */
</style>
