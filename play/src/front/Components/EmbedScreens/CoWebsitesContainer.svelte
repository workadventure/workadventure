<script lang="ts">
    import { fly } from "svelte/transition";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { coWebsiteManager, coWebsites } from "../../Stores/CoWebsiteStore";

    export let vertical = false;
    let cowebsiteContainer;
    let activeCowebsite = $coWebsites[0].getId();


    const setActiveCowebsite = (coWebsiteId: string) => {
        activeCowebsite = coWebsiteId;
    };

    coWebsites.subscribe((arr) => {
        activeCowebsite = arr[arr.length - 1]?.getId();
    });

    function toggleFullScreen() {
        cowebsiteContainer = document.getElementById("cowebsites-container")
        if(!document.fullscreenElement){
            if (cowebsiteContainer && cowebsiteContainer.requestFullscreen) {
                cowebsiteContainer.requestFullscreen();
            }
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };
</script>



<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="w-1/2 h-screen absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500] hidden" id ="cowebsites-container"
    class:vertical
    transition:fly={{ duration: 750, x:1000 }}
>
    <div class="flex py-2 ml-3 items-center">
        <div class="grow flex">

            {#each $coWebsites as coWebsite (coWebsite.getId())}
                <div class="{`${activeCowebsite === coWebsite.getId()}`}"
                on:close={() => console.log("bonjour")}
                on:click={() => setActiveCowebsite(coWebsite.getId())}>
                    <CoWebsiteTab title={coWebsite.getId()} url={coWebsite.getUrl().toString()} isLoading={true} active={activeCowebsite === coWebsite.getId()} />
                </div>
            {/each}

        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer" on:click={toggleFullScreen} >
            <FullScreenIcon />
        </div>
        <!-- <div class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer">
            <XIcon />
        </div> -->
    </div>
    <div class="h-full ml-3">
        {#each $coWebsites as coWebsite (coWebsite.getId())}
            {#if activeCowebsite === coWebsite.getId()}
                <iframe title="{coWebsite.getId()}" id={coWebsite.getState()} src={coWebsite.getUrl().toString()} frameborder="0" height="100%" width="100%"></iframe>
            {/if}
            <!-- <iframe title="{coWebsite.getId()}" id={coWebsite.getState()} frameborder="0" height="100%" width="100%"></iframe> -->
            <!-- <JistiCowebsite coWebsite={coWebsite} /> -->
            <!-- Mettre un svelte component dans l'itération -->
        {/each}
    </div>
    <div class="absolute left-1 top-0 bottom-0 m-auto w-0.5 h-40 bg-white rounded cursor-col-resize"></div>
</div>
