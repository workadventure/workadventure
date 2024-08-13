<script lang="ts">
    import { fly } from "svelte/transition";
    import { Readable } from "svelte/store";
    import { createEventDispatcher, onMount } from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { MSTeamsExtensionModule, TeamsModuleStatus } from "../index";
    import TeamsLogoPng from "./images/TeamsLogo.png";

    const dispatch = createEventDispatcher();

    export let extensionModule: MSTeamsExtensionModule;

    let synchronisationStatusStore: Readable<TeamsModuleStatus> | undefined;
    let meetingSynchronised = false;
    let calendarSynchronised = false;
    let presenceSynchronised = false;

    function closeModal() {
        dispatch("close");
    }
    function goToReSync() {
        dispatch("checkmodulecynschronisation");
    }

    onMount(() => {
        synchronisationStatusStore = extensionModule.statusStore;
        meetingSynchronised = extensionModule.meetingSynchronised === true;
        calendarSynchronised = extensionModule.calendarSynchronised === true;
        presenceSynchronised = extensionModule.presenceSynchronised === true;
    });
</script>

<div class="teams-menu tw-min-h-fit tw-rounded-3xl tw-overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
        <h1 class="tw-p-2">Teams Microsoft Meetings 🎉</h1>
        <img src={TeamsLogoPng} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4 tw-object-contain" />
        <p class="tw-p-2 tw-m-0">
            Teams is a Microsoft 365 app that helps your team stay connected and organized. You can chat, meet, call,
            and collaborate all in one place.
        </p>
        {#if synchronisationStatusStore != undefined && $synchronisationStatusStore === TeamsModuleStatus.ONLINE}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.onLine()}
            </p>
            <ul>
                {#if meetingSynchronised}
                    <li>Meeting ✅</li>
                {:else}
                    <li>Meeting ❌</li>
                {/if}

                {#if calendarSynchronised}
                    <li>Calendar ✅</li>
                {:else}
                    <li>Calendar ❌</li>
                {/if}

                {#if presenceSynchronised}
                    <li>Presence ✅</li>
                {:else}
                    <li>Presence ❌</li>
                {/if}
            </ul>
        {/if}

        {#if synchronisationStatusStore != undefined && $synchronisationStatusStore === TeamsModuleStatus.SYNC}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.sync()}
            </p>
            <ul>
                {#if meetingSynchronised}
                    <li>Meeting 🔄</li>
                {:else}
                    <li>Meeting ❌</li>
                {/if}

                {#if calendarSynchronised}
                    <li>Calendar 🔄</li>
                {:else}
                    <li>Calendar ❌</li>
                {/if}

                {#if presenceSynchronised}
                    <li>Presence 🔄</li>
                {:else}
                    <li>Presence ❌</li>
                {/if}
            </ul>
        {/if}

        {#if synchronisationStatusStore != undefined && $synchronisationStatusStore === TeamsModuleStatus.WARNING}
            <p class="tw-p-0 tw-m-0">
                {$LL.actionbar.externalModule.status.warning()}
            </p>
        {/if}

        {#if synchronisationStatusStore != undefined && $synchronisationStatusStore === TeamsModuleStatus.OFFLINE}
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
        <button
            class="light tw-p-4"
            on:click={goToReSync}
            disabled={$synchronisationStatusStore === TeamsModuleStatus.ONLINE}
            class:tw-cursor-not-allowed={$synchronisationStatusStore === TeamsModuleStatus.ONLINE}
            class:tw-opacity-20={$synchronisationStatusStore === TeamsModuleStatus.ONLINE}
        >
            Sync my Teams 🚀
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
