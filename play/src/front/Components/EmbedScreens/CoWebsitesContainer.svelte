<script lang="ts">
    import { fly } from "svelte/transition";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
;


    export let vertical = false;
    let activeCowebsite = $coWebsites[0].getId();
    console.log(activeCowebsite);

    coWebsites.subscribe((arr) => {
        let activeCowebsite = arr[arr.length - 1]?.getId();
        console.log(activeCowebsite);
    });



   // Idée pour la fonction du cowebiste principal :
    // async function onClick() {
    //     if ($mainCoWebsite) {
    //         if ($mainCoWebsite.getId() === coWebsite.getId()) {
    //             if (coWebsiteManager.getMainState() === iframeStates.closed) {
    //                 coWebsiteManager.displayMain();
    //             } else if ($highlightedEmbedScreen?.type === "cowebsite") {
    //                 coWebsiteManager.goToMain($highlightedEmbedScreen.embed);
    //             } else {
    //                 coWebsiteManager.hideMain();
    //             }
    //         } else {
    //             if (vertical) {
    //                 coWebsiteManager.hideMain();
    //                 coWebsiteManager.goToMain(coWebsite);
    //                 coWebsiteManager.displayMain();
    //             } else if (coWebsiteManager.getMainState() === iframeStates.closed) {
    //                 coWebsiteManager.goToMain(coWebsite);
    //                 coWebsiteManager.displayMain();
    //             } else {
    //                 highlightedEmbedScreen.toggleHighlight({
    //                     type: "cowebsite",
    //                     embed: coWebsite,
    //                 });
    //             }
    //         }
    //     }

    //     if ($state === "asleep") {
    //         await coWebsiteManager.loadCoWebsite(coWebsite);
    //     }

    //     coWebsiteManager.resizeAllIframes();
    // }

    // function noDrag() {
    //     return false;
    // }

    // let isHighlight = false;
    // let isMain = false;
    // $: {
    //     isMain =tr
    //         $mainState === iframeStates.opened &&
    //         $mainCoWebsite !== undefined &&
    //         $mainCoWebsite.getId() === coWebsite.getId();
    //     isHighlight =
    //         $highlightedEmbedScreen !== undefined &&
    //         $highlightedEmbedScreen?.type === "cowebsite" &&
    //         $highlightedEmbedScreen?.embed.getId() === coWebsite.getId();
    // }
</script>



<div
    class="w-1/2 h-screen absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1500]" id ="co-websites-container"
    class:vertical
    transition:fly={{ duration: 750, x:1000 }}
>
    <div class="flex py-2 ml-3 items-center">
        <div class="grow flex">

            {#each $coWebsites as coWebsite (coWebsite.getId())}
                <CoWebsiteTab title={coWebsite.getId()} url={coWebsite.getUrl().toString()} isLoading={true} active={false} />
                {#if activeCowebsite === coWebsite.getId()}

                {/if}
            {/each}
        </div>
        <div class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer">
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


<style>

</style>
