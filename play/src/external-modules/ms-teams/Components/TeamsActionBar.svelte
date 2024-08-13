<script lang="ts">
    import { Readable } from "svelte/store";
    import { TeamsModuleStatus } from "..";
    import { createEventDispatcher } from "svelte";
    import { analyticsClient } from "../../../front/Administration/AnalyticsClient";
    import LL from "../../../i18n/i18n-svelte";
    import Tooltip from "../../../front/Components/Util/Tooltip.svelte";

    import businessSvg from "../images/applications/business.svg";
    import checkSvg from "../images/applications/check.svg";
    import reloadSvg from "../images/applications/reload.svg";
    import warningSvg from "../images/applications/warning.svg";

    const dispatch = createEventDispatcher();

    export let teamsModuleStatusStore: Readable<TeamsModuleStatus> | undefined;
    export let isMobile: boolean = false;

    function noDrag(): boolean {
        return false;
    }

    function showExternalModule() {
        dispatch("showExternalModule");
    }
</script>
<!-- Teams integration -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="bottom-action-button"
    on:dragstart|preventDefault={noDrag}
    on:click={() => analyticsClient.openExternalModule()}
    on:click={showExternalModule}
>
    {#if !isMobile && teamsModuleStatusStore != undefined}
        {#if $teamsModuleStatusStore === TeamsModuleStatus.ONLINE}
            <Tooltip text={$LL.actionbar.externalModule.status.onLine()} />
        {:else if $teamsModuleStatusStore === TeamsModuleStatus.WARNING}
            <Tooltip text={$LL.actionbar.externalModule.status.warning()} />
        {:else if $teamsModuleStatusStore === TeamsModuleStatus.SYNC}
            <Tooltip text={$LL.actionbar.externalModule.status.sync()} />
        {:else}
            <Tooltip text={$LL.actionbar.externalModule.status.offLine()} />
        {/if}
    {/if}
    <button id="teamsIcon" class="tw-relative">
        <img draggable="false" src={businessSvg} style="padding: 2px;" alt="Teams" />
        {#if teamsModuleStatusStore != undefined}
            <span
                class="tw-absolute tw-right-0 tw-top-5 tw-text-white tw-rounded-full tw-px-1 tw-py-0.5 tw-text-xxs tw-font-bold tw-leading-none"
            >
                {#if $teamsModuleStatusStore === TeamsModuleStatus.ONLINE}
                    <img
                        draggable="false"
                        src={checkSvg}
                        style="padding: 2px; width: 16px; opacity: 0.6;"
                        alt="Teams"
                    />
                {:else if $teamsModuleStatusStore === TeamsModuleStatus.WARNING}
                    <img
                        draggable="false"
                        src={warningSvg}
                        style="padding: 2px; width: 16px; opacity: 0.6;"
                        alt="Teams"
                    />
                {:else if $teamsModuleStatusStore === TeamsModuleStatus.SYNC}
                    <img
                        draggable="false"
                        src={reloadSvg}
                        style="padding: 2px; width: 16px; opacity: 0.6;"
                        alt="Teams"
                    />
                {/if}
            </span>
        {/if}
    </button>
</div>
