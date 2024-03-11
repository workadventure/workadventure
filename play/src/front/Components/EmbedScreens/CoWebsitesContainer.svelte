<script lang="ts">
    import { fly } from "svelte/transition";
    import XIcon from "../Icons/XIcon.svelte";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { coWebsites } from "../../stores/CoWebsiteStore";
    import { mainCoWebsite } from "../../stores/CoWebsiteStore";




    export let vertical = false;
</script>


<!-- Cette div devra apparaitre que s'il y a un event et elle peux apparaitre-->

<div
    class="w-1/2 h-screen absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1000] hidden"
    class:vertical
    transition:fly={{ duration: 750, x:1000 }}
>
    <div class="flex py-2 ml-3 items-center">
        <div class="grow flex">

        <!-- {#each $allCowebsites as coWebsite, index (coWebsite.getId())}
            <CoWebsiteTab title="Hello world !" url="https://google.fr" isLoading={true} active={true} />
            <CoWebsiteTab title="Github" url="https://google.fr"  isLoading={true} active={true} />
        {/each} -->

        </div>
        <div class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer">
            <FullScreenIcon />
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer">
            <XIcon />
        </div>
    </div>
    <div class="h-full ml-3">

        <!-- {#each $coWebsites as cowebsite, index (cowebsite.getId())}
            <div class="">
                <svelte:component this={cowebsite.component} {...cowebsite.props} on:close={() => cowebsite.removeCoWebsiteToStore(cowebsite.getId())} />
            </div>
        {/each} -->

        <!-- svelte-ignore a11y-missing-attribute -->

    </div>
    <div class="absolute left-1 top-0 bottom-0 m-auto w-0.5 h-40 bg-white rounded cursor-col-resize"></div>
</div>
