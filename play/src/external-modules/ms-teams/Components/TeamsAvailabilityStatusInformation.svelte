<script lang="ts">
    import { Readable } from "svelte/store";
    import { onMount } from "svelte";
    import { MSTeamsExtensionModule, TeamsModuleStatus } from "..";
    import businessSvg from "./images/business.svg";

    export let extensionModule: MSTeamsExtensionModule;
    let teamsModuleStatusStore: Readable<TeamsModuleStatus> | undefined;

    onMount(() => {
        teamsModuleStatusStore = extensionModule.statusStore;
    });

    const openTeamsDoc = () => {
        // TODO open the doc to sync teams
    };
</script>

<div class="tw-flex tw-flex-row tw-justify-between tw-text-xs tw-p-2 tw-pb-3 hover:tw-bg-dark-purple/80">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <p class="tw-opacity-80 tw-cursor-pointer tw-m-0 tw-p-0" on:click={openTeamsDoc}>
        Teams presence synchronized
        <span class="tw-text-xxxs"
            >{teamsModuleStatusStore == undefined || $teamsModuleStatusStore === TeamsModuleStatus.OFFLINE
                ? "❌"
                : "✅"}</span
        >
    </p>
    <img draggable="false" src={businessSvg} class="tw-w-6" style="padding: 2px;" alt="Teams" />
</div>
