<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import CopyIcon from "../Icons/CopyIcon.svelte";
    import ExternalLinkIcon from "../Icons/ExternalLinkIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import type { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import PopUpCopyUrl from "../PopUp/PopUpCopyUrl.svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    export let coWebsite: CoWebsite;
    export let isLoading = false;
    export let active = false;

    const dispatch = createEventDispatcher<{
        click: void;
        close: void;
        copy: void;
    }>();

    function closeTab() {
        dispatch("close");
        analyticsClient.closeCowebsite();
    }

    function select() {
        dispatch("click");
        analyticsClient.switchCowebsite();
    }

    function copyUrl() {
        const url = coWebsite.getUrl().toString();

        navigator.clipboard.writeText(url).catch((e) => console.error(e));
        analyticsClient.copyCowebsiteLink();
        dispatch("copy");
        popupStore.addPopup(PopUpCopyUrl, {}, "popupCopyUrl");
    }

    function openInNewTab() {
        const url = coWebsite.getUrl().toString();

        window.open(url, "_blank");
        analyticsClient.openCowebsiteInNewTab();
        if (coWebsite.shouldCloseOnOpenInNewTab()) closeTab();
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="text h-full flex items-center px-2 rounded transition-all hover:stroke-white {active
        ? 'text-contrast bg-white hover:bg-white/90 tab justify-between bg-contrast/80' // translate-y-2 rounded-b-none for animation but not working inside dropdown
        : 'text-white cursor-pointer bg-white/10 hover:bg-white/20 tab'}"
    on:click={select}
>
    {#if !isLoading}
        <img draggable="false" src={coWebsite.getIcon()} alt="" class="h-6 w-6 bg-black rounded-lg align-middle" />
    {:else}
        <div class="h-6 w-6 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}">
            <LoaderIcon
                size="24"
                color1={active ? "stroke-contrast" : "stroke-white"}
                color2={active ? "stroke-contrast" : "stroke-white"}
            />
        </div>
    {/if}

    <div class="flex justify-around items-center w-full">
        <div class="p-2 grow text-ellipsis overflow-hidden">
            <div
                class="bold leading-3 text-ellipsis pb-1 pt-1 max-w-[150px] whitespace-nowrap overflow-hidden {active
                    ? 'fill-white'
                    : ''}"
                title={coWebsite.getTitle()}
            >
                {#if !isLoading}
                    {coWebsite.getTitle()}
                {:else}
                    <div class="w-[100px] h-2 animate-pulse rounded-sm {active ? 'bg-contrast/10' : 'bg-white/20'}" />
                {/if}
            </div>
            {#if !coWebsite.getHideUrl()}
                <div class="text-xxs opacity-50 text-ellipsis max-w-[150px] whitespace-nowrap overflow-hidden">
                    {#if !isLoading}
                        {coWebsite.getUrl()}
                    {:else}
                        <div
                            class="w-[150px] h-1 mt-1 animate-pulse rounded-sm {active
                                ? 'bg-contrast/10'
                                : 'bg-white/20'}"
                        />
                    {/if}
                </div>
            {/if}
        </div>

        <div class="flex gap-0.5">
            {#if !coWebsite.getHideUrl()}
                <button
                    class="group {active
                        ? 'hover:bg-contrast/10'
                        : 'hover:bg-white/10'} transition-all aspect-ratio h-8 w-8 rounded flex items-center justify-center"
                    on:click|stopPropagation={copyUrl}
                >
                    <CopyIcon
                        height="h-6"
                        width="w-6"
                        strokeColor={active ? "stroke-contrast" : "stroke-white"}
                        hover={active ? "" : ""}
                    />
                </button>
            {/if}
            {#if !coWebsite.getHideUrl()}
                <button
                    class="group {active
                        ? 'hover:bg-contrast/10'
                        : 'hover:bg-white/10'} transition-all aspect-ratio h-8 w-8 rounded flex items-center justify-center"
                    on:click|stopPropagation={openInNewTab}
                >
                    <ExternalLinkIcon
                        height="h-6"
                        width="w-6"
                        strokeColor={active ? "stroke-contrast" : "stroke-white"}
                        hover={active ? "" : ""}
                    />
                </button>
            {/if}
            {#if coWebsite.isClosable() === true}
                <button
                    class="group {active
                        ? 'hover:bg-contrast/10'
                        : 'hover:bg-white/10'} transition-all aspect-ratio h-8 w-8 rounded flex items-center justify-center"
                    on:click|stopPropagation={closeTab}
                >
                    <XIcon
                        height="h-6"
                        width="w-6"
                        strokeColor={active ? "stroke-contrast" : "stroke-white"}
                        hover={active ? "" : ""}
                    />
                </button>
            {/if}
        </div>
    </div>
</div>

<style>
    .tab {
        width: 300px;
    }

    @media (max-width: 768px) {
        .tab {
            width: 220px;
            padding-right: 1.5rem;
        }
    }
</style>
