<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import CopyIcon from "../Icons/CopyIcon.svelte";
    import ExternalLinkIcon from "../Icons/ExternalLinkIcon.svelte";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    // import { handleTabResize } from "./CoWebsitesContainer";

    export let coWebsite: CoWebsite;
    export let isLoading = false;
    export let isClosable = true;
    export let active = false;

    let isDuplicable = true;
    let isJitsi: boolean = coWebsite instanceof JitsiCoWebsite;
    let isBBB: boolean = coWebsite instanceof BBBCoWebsite;
    let cowebsiteName: string;
    let urlForFavicon = coWebsite.getUrl().toString();
    let url: string;
    let mediaQuery = window.matchMedia("(max-width: 768px)");

    const dispatch = createEventDispatcher();

    onMount(() => {
        if (!mediaQuery.matches) {
            if (isJitsi) {
                cowebsiteName = "Jitsi meeting";
                isClosable = true;
                isDuplicable = true;
            } else if (isBBB) {
                cowebsiteName = "BigBlueButton meeting";
                isClosable = true;
                isDuplicable = true;
            } else {
                cowebsiteName = coWebsite.getUrl().toString();
                cowebsiteName = cowebsiteName.replace(/.+\/\/|www.|\..+/g, "");
                cowebsiteName = cowebsiteName.charAt(0).toUpperCase() + cowebsiteName.slice(1);
                isClosable = true;
                isDuplicable = true;
            }
        }
        if (isJitsi) {
            const favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlForFavicon}`;
            const cowebsiteTabIcon = document.getElementById("cowebsiteTabIcon") as HTMLImageElement;
            if (cowebsiteTabIcon) {
                cowebsiteTabIcon.src = favicon;
            }
            cowebsiteName = "Jitsi meeting";
            isClosable = true;
            isDuplicable = true;
        } else if (isBBB) {
            const favicon = `https://s2.googleusercontent.com/s2/favicons?domain=${urlForFavicon}`;
            const cowebsiteTabIcon = document.getElementById("cowebsiteTabIcon") as HTMLImageElement;
            if (cowebsiteTabIcon) {
                cowebsiteTabIcon.src = favicon;
            }
            cowebsiteName = "BigBlueButton meeting";
            isClosable = true;
            isDuplicable = true;
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
        dispatch("tabMounted");
        console.log("tab mounted");
    });

    onDestroy(() => {
        dispatch("tabUnmounted");
    });

    function closeTab() {
        dispatch("close");
    }

    function toggleActive() {
        if (active === true) {
            active = active;
        } else {
            active = !active;
        }
    }

    function copyUrl() {
        url = coWebsite.getUrl().toString();
        navigator.clipboard.writeText(url).catch((e) => console.error(e));
        alert("URL copied to clipboard");
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="text flex items-center px-2 rounded transition-all hover:stroke-white {active
        ? 'text-contrast bg-white hover:bg-white/90 translate-y-2 rounded-b-none pt-1 bg-white tab justify-between'
        : 'text-white cursor-pointer hover:bg-white/10 tab'}"
    on:click={toggleActive}
>
    {#if isLoading}
        <img alt="icon" id="cowebsiteTabIcon" />
    {/if}
    <!--    {:else}
         <div class="h-6 w-6 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}">
            <LoaderIcon
                size="24"
                color1={active ? "stroke-contrast" : "stroke-white"}
                color2={active ? "stroke-contrast" : "stroke-white"}
            />
        </div>
    {/if} -->

    <div class="flex justify-between items-center w-full">
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
                    <div
                        class="w-[150px] h-1 mt-1 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}"
                    />
                {/if}
            </div>
        </div>

        <div class="flex gap-0.5">
            {#if isDuplicable}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
                    on:click={copyUrl}
                >
                    <ExternalLinkIcon
                        classList="h-4 w-4 aspect-ratio transition-all {active
                            ? 'group-hover:stroke-white stroke-gray-900'
                            : 'stroke-white fill-transparent'}"
                    />
                </div>
            {/if}
            <div
                class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
                on:click={() => window.open(coWebsite.getUrl().toString(), "_blank")}
            >
                <CopyIcon
                    classList="h-4 w-4 aspect-ratio transition-all {active
                        ? 'group-hover:stroke-white stroke-gray-900'
                        : 'stroke-white fill-transparent'}"
                />
            </div>
            {#if isClosable}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center"
                    on:click={closeTab}
                >
                    <XIcon
                        classList="h-4 w-4 aspect-ratio transition-all {active
                            ? 'group-hover:stroke-white stroke-gray-900'
                            : 'stroke-white fill-transparent'}"
                    />
                </div>
            {/if}
        </div>
    </div>
</div>

<!-- <div class="group hover:bg-contrast transition-all aspect-ratio transition-all h-8 w-8 rounded flex items-center justify-center">
<SettingsIcon classList="h-4 w-4 aspect-ratio transition-all {active ? 'group-hover:stroke-white stroke-contrast fill-transparent' : 'stroke-white fill-transparent' }" />
</div> -->
<style>
    .tab {
        width: 300px;
    }

    @media (max-width: 768px) {
        .tab {
            width: 200px;
        }
    }
</style>
