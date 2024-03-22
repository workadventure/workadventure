<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import CopyIcon from "../Icons/CopyIcon.svelte";
    import ExternalLinkIcon from "../Icons/ExternalLinkIcon.svelte";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    // import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";

    export let coWebsite: CoWebsite;
    export let isLoading = false;
    export let isClosable = true;
    export let isDuplicable = true;
    export let active = false;
    let cowebsiteNew: CoWebsite;
    let isJitsi: boolean = coWebsite instanceof JitsiCoWebsite;
    let isBBB: boolean = coWebsite instanceof BBBCoWebsite;
    let cowebsiteName: string;
    let urlForFavicon = coWebsite.getUrl().toString();

    onMount(() => {
        if (isJitsi) {
            const favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlForFavicon}`;
            const cowebsiteTabIcon = document.getElementById("cowebsiteTabIcon") as HTMLImageElement;
            if (cowebsiteTabIcon) {
                cowebsiteTabIcon.src = favicon;
            }
            cowebsiteName = "Jitsi meeting";
            isClosable = false;
            isDuplicable = false;
        } else if (isBBB) {
            console.log(isBBB);
            const favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlForFavicon}`;
            const cowebsiteTabIcon = document.getElementById("cowebsiteTabIcon") as HTMLImageElement;
            if (cowebsiteTabIcon) {
                cowebsiteTabIcon.src = favicon;
            }
            cowebsiteName = "BigBlueButton meeting";
            isClosable = false;
            isDuplicable = false;
        } else {
            const favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlForFavicon}`;
            const cowebsiteTabIcon = document.getElementById("cowebsiteTabIcon") as HTMLImageElement;
            if (cowebsiteTabIcon) {
                cowebsiteTabIcon.src = favicon;
            }
            cowebsiteName = coWebsite.getUrl().toString();
            cowebsiteName = cowebsiteName.replace(/.+\/\/|www.|\..+/g, "");
            cowebsiteName = cowebsiteName.charAt(0).toUpperCase() + cowebsiteName.slice(1);
            isClosable = true;
            isDuplicable = true;
        }
    });

    const dispatch = createEventDispatcher();

    function closeTab() {
        dispatch("close");
    }

    function duplicateTab() {
        dispatch("duplicate");
    }

    function toggleActive() {
        active = !active;
    }

    // function duplicateTab() {
    //     console.log("duplicate");
    //     // const map = new Map();
    //     // const result = coWebsites.map((currentCowebsite) => {
    //     //     map.set(currentCowebsite.getId(), (map.get(currentCowebsite.getId()) ?? -1) + 1);
    //     //     return currentCowebsite;
    //     // });

    //     dispatch("duplicate");
    // }

    // function duplicateTab(cowebsite: CoWebsite) {
    //     console.log("duplicate");
    //     let duplicateCoWebsite = { ...cowebsite };
    //     coWebsites.add(duplicateCoWebsite);
    //     dispatch("duplicate");
    // }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- Pour effet clic onglets -->
<div
    class="text flex items-center px-2 mr-2 rounded transition-all {active
        ? 'text-contrast bg-white hover:bg-white/90 translate-y-2 rounded-b-none pt-1 bg-white'
        : 'text-white hover:bg-white/10'}"
    on:click={toggleActive}
>
    {#if isLoading}
        <img alt="icon" id="cowebsiteTabIcon" />
    {:else}
        <div class="h-6 w-6 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}">
            <LoaderIcon
                size="24"
                color1={active ? "stroke-contrast" : "stroke-white"}
                color2={active ? "stroke-contrast" : "stroke-white"}
            />
        </div>
    {/if}
    <div class="p-2 text-ellipsis overflow-hidden">
        <div
            class="bold leading-3 text-ellipsis pb-1 max-w-[150px] whitespace-nowrap overflow-hidden {active
                ? 'fill-white'
                : ''}"
        >
            {#if isLoading}
                {cowebsiteName}
            {:else}
                <div class="w-[100px] h-2 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}" />
            {/if}
        </div>
        <div class="text-xxs opacity-50 text-ellipsis max-w-[150px] whitespace-nowrap overflow-hidden">
            {#if isLoading}
                {coWebsite.getUrl()}
            {:else}
                <div class="w-[150px] h-1 mt-1 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}" />
            {/if}
        </div>
    </div>
    <div class="flex gap-0.5">
        {#if isDuplicable}
            <div
                class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
                class:active
                on:click={duplicateTab}
            >
                <ExternalLinkIcon
                    classList="h-4 w-4 aspect-ratio transition-all {active
                        ? 'group-hover:stroke-white stroke-contrast fill-transparent'
                        : 'stroke-contrast fill-transparent'}"
                />
            </div>
        {/if}
        <div
            class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
            class:active
            on:click={() => window.open(coWebsite.getUrl().toString(), "_blank")}
        >
            <CopyIcon
                classList="h-4 w-4 aspect-ratio transition-all {active
                    ? 'group-hover:stroke-white stroke-contrast fill-transparent'
                    : 'stroke-white fill-transparent'}"
            />
        </div>
        {#if isClosable}
            <div
                class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
                class:active
                on:click={closeTab}
            >
                <XIcon
                    classList="h-4 w-4 aspect-ratio transition-all {active
                        ? 'group-hover:stroke-white stroke-contrast fill-transparent'
                        : 'stroke-white fill-transparent'}"
                />
            </div>
        {/if}
    </div>
    <!-- <div class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center">
        <SettingsIcon classList="h-4 w-4 aspect-ratio transition-all {active ? 'group-hover:stroke-white stroke-contrast fill-transparent' : 'stroke-white fill-transparent' }" />
    </div> -->
</div>

<!--{active ? 'fill-contrast' : 'fill-white' }  {active ? '' : 'stroke-white fill-transparent' }-->

<!-- {active
    ? 'group-hover:stroke-white stroke-contrast fill-transparent'
    : 'stroke-white fill-transparent'}" -->
