<script lang="ts">
    import { fly } from "svelte/transition";
    import XIcon from "../Icons/XIcon.svelte";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import CoWebsiteTab from "./CoWebsiteTab.svelte";

    export let vertical = false;
</script>

<div
    class="w-1/2 h-screen absolute right-0 top-0 bg-contrast/50 backdrop-blur z-[1000] hidden"
    class:vertical
    transition:fly={{ duration: 750, x: 1000 }}
>
    <div class="flex py-2 ml-3 items-center">
        <div class="grow flex">
            <!--
            {#each [...$coWebsites.values()] as coWebsite, index (coWebsite.getId())}
                <CoWebsiteTab title="Hello world !" link="https://google.fr" active="true" />
            {/each}
            -->
            <CoWebsiteTab title="Hello world !" active="false" />
            <CoWebsiteTab title="Hello world !" url="https://google.fr" isLoading="false" active="true" />
        </div>
        <div
            class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
        >
            <FullScreenIcon />
        </div>
        <div
            class="aspect-ratio h-10 w-10 rounded flex items-center justify-center hover:bg-white/10 mr-2 cursor-pointer"
        >
            <XIcon />
        </div>
    </div>
    <div class="h-full ml-3">
        <iframe src="https://www.rum-x.com/search/" class="h-full w-full border-none" loading="lazy" />
    </div>
    <div class="absolute left-1 top-0 bottom-0 m-auto w-0.5 h-40 bg-white rounded cursor-col-resize" />
</div>
