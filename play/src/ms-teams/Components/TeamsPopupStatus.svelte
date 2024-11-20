<script lang="ts">
    import { fly } from "svelte/transition";
    import { Writable } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import LL from "../../i18n/i18n-svelte";
    import { ExternalModuleStatus } from "../../front/ExternalModule/ExtensionModule";
    import TeamsLogoPng from "./images/TeamsLogo.png";

    const dispatch = createEventDispatcher();

    export let synchronisationStatusStore: Writable<ExternalModuleStatus>;
    export let meetingSynchronised = false;
    export let calendarSynchronised = false;
    export let presenceSynchronised = false;

    function closeModal() {
        dispatch("close");
    }
    function goToReSync() {
        dispatch("checkmodulecynschronisation");
    }
</script>

<div class="teams-menu min-h-fit rounded-3xl overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    <div class="p-8 flex flex-col justify-center items-center">
        <h1 class="p-2">Teams Microsoft Meetings 🎉</h1>
        <img src={TeamsLogoPng} alt="Object" class="w-32 h-32 mb-4 object-contain" />
        <p class="p-2 m-0">
            Teams is a Microsoft 365 app that helps your team stay connected and organized. You can chat, meet, call,
            and collaborate all in one place.
        </p>
        {#if $synchronisationStatusStore === ExternalModuleStatus.ONLINE}
            <p class="p-0 m-0">
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

        {#if $synchronisationStatusStore === ExternalModuleStatus.SYNC}
            <p class="p-0 m-0">
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

        {#if $synchronisationStatusStore === ExternalModuleStatus.WARNING}
            <p class="p-0 m-0">
                {$LL.actionbar.externalModule.status.warning()}
            </p>
        {/if}

        {#if $synchronisationStatusStore === ExternalModuleStatus.OFFLINE}
            <p class="p-0 m-0">
                {$LL.actionbar.externalModule.status.offLine()}
            </p>
        {/if}
    </div>
    <div
        class="flex flex-row justify-evenly items-center bg-dark-purple w-full p-2 rounded-b-3xl"
    >
        <button class="bg-dark-purple p-4" on:click={closeModal}>
            {$LL.mapEditor.explorer.details.close()}
        </button>
        <button
            class="light p-4"
            on:click={goToReSync}
            disabled={$synchronisationStatusStore === ExternalModuleStatus.ONLINE}
            class:cursor-not-allowed={$synchronisationStatusStore === ExternalModuleStatus.ONLINE}
            class:opacity-20={$synchronisationStatusStore === ExternalModuleStatus.ONLINE}
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
