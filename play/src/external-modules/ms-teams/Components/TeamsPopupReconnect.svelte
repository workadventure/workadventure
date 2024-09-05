<script lang="ts">
    import { fly } from "svelte/transition";
    import LL from "../../../i18n/i18n-svelte";
    import { MSTeamsExtensionModule } from "../index";
    import TeamsLogoSvg from "./images/business.svg";

    export let extensionModule: MSTeamsExtensionModule;

    function closeModal() {
        extensionModule.closePopUpModuleReconnect();
    }
    function goToReSync() {
        extensionModule.reconnectToTeams();
    }
    function dontShowAgain() {
        extensionModule.dontShowAgainPopUpModuleReconnect();
    }
</script>

<div class="teams-menu tw-min-h-fit tw-rounded-3xl tw-overflow-visible" transition:fly={{ x: 1000, duration: 500 }}>
    <div class="tw-p-8 tw-flex tw-flex-col tw-justify-center tw-items-center">
        <h1 class="tw-p-2">Teams Synchonization 🚀</h1>
        <img src={TeamsLogoSvg} alt="Object" class="tw-w-32 tw-h-32 tw-mb-4 tw-object-contain" />
        <p class="tw-p-2 tw-m-0">
            We detected that your Teams synchronization is not up to date. Please click on the button below to reconnect
            your Teams account 🙏
        </p>
        <div class="tw-flex tw-row tw-justify-center tw-content-center tw-items-center tw-text-xs tw-p-4">
            <input type="checkbox" id="askagain" class="tw-mx-1" on:change={dontShowAgain} />
            <label for="askagain" class="tw-m-0 tw-mx-1">{$LL.camera.webrtc.solutionVpnNotAskAgain()}</label>
        </div>
    </div>
    <div
        class="tw-flex tw-flex-row tw-justify-evenly tw-items-center tw-bg-dark-purple tw-w-full tw-p-2 tw-rounded-b-3xl"
    >
        <button class="tw-bg-dark-purple tw-p-4" on:click={closeModal}>
            {$LL.mapEditor.explorer.details.close()}
        </button>
        <button class="light tw-p-4" on:click={goToReSync}> Reconnect Teams </button>
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
