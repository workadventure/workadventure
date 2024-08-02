<script lang="ts">
    import { fly } from "svelte/transition";
    import { Writable } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import LL from "../../i18n/i18n-svelte";
    import { ExternalModuleStatus } from "../../front/ExternalModule/ExtensionModule";
    import TeamsLogoPng from "./images/TeamsLogo.png";

    const dispatch = createEventDispatcher();

    export let synchronisationStatusStore: Writable<ExternalModuleStatus>;

    function closeModal() {
        dispatch("close");
    }
    function goToReSync() {
        dispatch("checkmodulecynschronisation");
    }
</script>

<div class="teams-menu tw-min-h-fit tw-rounded-3xl tw-overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
        <h1 class="tw-p-2">Teams Microsoft Meetings 🎉</h1>
        <img src={TeamsLogoPng} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4 tw-object-contain" />
        <p class="tw-p-2 tw-m-0">
            Teams is a Microsoft 365 app that helps your team stay connected and organized. You can chat, meet, call,
            and collaborate all in one place.
        </p>
        {#if $synchronisationStatusStore === ExternalModuleStatus.ONLINE}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.onLine()}
            </p>
            <ul>
                <li>Meeting ✅</li>
                <li>Calendar ✅</li>
                <li>Presence ✅</li>
            </ul>
        {/if}

        {#if $synchronisationStatusStore === ExternalModuleStatus.SYNC}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.sync()}
            </p>
            <ul>
                <li>Meeting 🔄</li>
                <li>Calendar 🔄</li>
                <li>Presence 🔄</li>
            </ul>
        {/if}

        {#if $synchronisationStatusStore === ExternalModuleStatus.WARNING}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.warning()}
            </p>
        {/if}

        {#if $synchronisationStatusStore === ExternalModuleStatus.OFFLINE}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.offLine()}
            </p>
        {/if}
    </div>
    <div
        class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
    >
        <button class="tw-bg-dark-purple tw-p-4" on:click={closeModal}>
            {$LL.mapEditor.explorer.details.close()}
        </button>
        {#if $synchronisationStatusStore === ExternalModuleStatus.OFFLINE}
            <button class="light tw-p-4" on:click={goToReSync}> Sync my Teams 🚀 </button>
        {:else}
            <button class="light tw-p-4" on:click={goToReSync}> Re-sync my Teams 🚀 </button>
        {/if}
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
