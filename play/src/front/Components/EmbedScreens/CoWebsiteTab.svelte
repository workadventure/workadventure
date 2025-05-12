<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import CopyIcon from "../Icons/CopyIcon.svelte";
    import ExternalLinkIcon from "../Icons/ExternalLinkIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";
    import { BBBCoWebsite } from "../../WebRtc/CoWebsite/BBBCoWebsite";
    import { ICON_URL } from "../../Enum/EnvironmentVariable";
    import jitsiIcon from "../images/jitsi.png";
    import meetingIcon from "../images/meeting.svg";
    import LoaderIcon from "../Icons/LoaderIcon.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import PopUpCopyUrl from "../PopUp/PopUpCopyUrl.svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    export let coWebsite: CoWebsite;
    export let isLoading = false;
    export let active = false;

    let isDuplicable = true;
    let isJitsi: boolean = coWebsite instanceof JitsiCoWebsite;
    let isBBB: boolean = coWebsite instanceof BBBCoWebsite;
    let cowebsiteName: string;
    let alt: string;
    let srcSimpleCowebsite = `${ICON_URL}/icon?url=${encodeURIComponent(
        coWebsite.getUrl().toString()
    )}&size=64..96..256&fallback_icon_color=14304c`;
    let url: string;
    let srcJitsi = jitsiIcon;
    let srcMeeting = meetingIcon;

    const dispatch = createEventDispatcher<{
        close: void;
        copy: void;
    }>();

    onMount(() => {
        if (isJitsi) {
            isDuplicable = true;
        } else if (isBBB) {
            isDuplicable = true;
        } else {
            alt = coWebsite.getUrl().hostname;
            cowebsiteName = coWebsite
                .getUrl()
                .toString()
                .replace(/.+\/\/|www.|\..+/g, "");
            cowebsiteName = cowebsiteName.charAt(0).toUpperCase() + cowebsiteName.slice(1);
            isDuplicable = true;
        }
    });

    function closeTab() {
        dispatch("close");
        analyticsClient.closeCowebsite();
    }

    function toggleActive() {
        if (active === true) {
            active = active;
        } else {
            active = !active;
            analyticsClient.switchCowebsite();
        }
    }

    function copyUrl() {
        url = coWebsite.getUrl().toString();
        navigator.clipboard.writeText(url).catch((e) => console.error(e));
        analyticsClient.copyCowebsiteLink();
        dispatch("copy");
        popupStore.addPopup(PopUpCopyUrl, {}, "popupCopyUrl");
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="text flex items-center px-2 rounded transition-all hover:stroke-white {active
        ? 'text-contrast bg-white hover:bg-white/90 tab justify-between bg-contrast/80' // translate-y-2 rounded-b-none for animation but not working inside dropdown
        : 'text-white cursor-pointer bg-white/10 hover:bg-white/20 tab'}"
    on:click={toggleActive}
    on:click={() => (active = !active)}
>
    {#if isLoading}
        {#if isJitsi}
            <img src={srcJitsi} {alt} class="h-6 w-6 bg-black rounded-lg align-middle" />
        {:else if isBBB}
            <img src={srcMeeting} {alt} class="h-6 w-6 bg-black rounded-lg align-middle" />
        {:else}
            <img src={srcSimpleCowebsite} {alt} class="h-6 w-6 bg-black rounded-lg align-middle" />
        {/if}
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
            >
                {#if isLoading}
                    {#if isJitsi}
                        {$LL.cowebsite.jitsi()}
                    {:else if isBBB}
                        {$LL.cowebsite.bigBlueButton()}
                    {:else}
                        {cowebsiteName}
                    {/if}
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
                <button
                    class="group {active
                        ? 'hover:bg-contrast/10'
                        : 'hover:bg-white/10'} transition-all aspect-ratio h-8 w-8 rounded flex items-center justify-center"
                    on:click={copyUrl}
                >
                    <ExternalLinkIcon
                        height="h-6"
                        width="w-6"
                        strokeColor={active ? "stroke-contrast" : "stroke-white"}
                        hover={active ? "" : ""}
                    />
                </button>
            {/if}
            <button
                class="group {active
                    ? 'hover:bg-contrast/10'
                    : 'hover:bg-white/10'} transition-all aspect-ratio h-8 w-8 rounded flex items-center justify-center"
                on:click={() => {
                    window.open(coWebsite.getUrl().toString(), "_blank");
                    analyticsClient.openCowebsiteInNewTab();
                }}
            >
                <CopyIcon
                    height="h-6"
                    width="w-6"
                    strokeColor={active ? "stroke-contrast" : "stroke-white"}
                    hover={active ? "" : ""}
                />
            </button>
            {#if coWebsite.isClosable() === true}
                <button
                    class="group {active
                        ? 'hover:bg-contrast/10'
                        : 'hover:bg-white/10'} transition-all aspect-ratio h-8 w-8 rounded flex items-center justify-center"
                    on:click={closeTab}
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
