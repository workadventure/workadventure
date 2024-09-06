<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { MSTeamsExtensionModule } from "../index";
    import TeamsLogoSvg from "./images/business.svg";

    export let extensionModule: MSTeamsExtensionModule;

    let isGuest = false;

    function closeModal() {
        extensionModule.closePopUpMeetingNotCreated();
    }

    onMount(() => {
        isGuest = extensionModule.isGuest === true;
    });
</script>

<div
    class="teams-menu-meeting-not-created tw-min-h-fit tw-rounded-3xl tw-overflow-visible"
    transition:fly={{ x: 1000, duration: 500 }}
>
    <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
        <h1 class="tw-p-2">Teams Microsoft Meetings 🎉</h1>
        <img src={TeamsLogoSvg} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4 tw-object-contain" />
        <p class="tw-p-2 tw-m-0">The Teams Meeting is not created yet 😱</p>
        {#if isGuest}
            <p>You are not connected and cannot create Teams Online Meeting 😭</p>
            <p>
                Please connect to the platform to create a Teams Online Meeting or ask the owner to create it for you 🚀
            </p>
        {/if}
        <div class={`tw-grid tw-place-items-center tw-h-10 loader`}>
            <div class="tw-flex tw-items-center tw-flex-col">
                <div
                    style="border-top-color:transparent"
                    class="tw-w-16 tw-h-16 tw-border-2 tw-border-white tw-border-solid tw-rounded-full tw-animate-spin tw-mb-5"
                />
            </div>
        </div>
    </div>
    <div
        class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
    >
        <button class="tw-bg-dark-purple tw-p-4" on:click={closeModal}>
            {$LL.mapEditor.explorer.details.close()}
        </button>
    </div>
</div>

<style lang="scss">
    .teams-menu {
        position: absolute;
        width: 668px;
        height: max-content !important;
        z-index: 425;
        word-break: break-all;
        pointer-events: auto;
        color: whitesmoke;
        background-color: #1b2a41d9;
        backdrop-filter: blur(40px);
        top: 15rem;
        left: calc(50% - 334px);
    }
</style>
