<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { get } from "svelte/store";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import ButtonClose from "../Input/ButtonClose.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";
    import BlockSubMenu from "./BlockSubMenu.svelte";

    let blockActive = true;
    let disableReport = $state(false);
    let userUUID: string | undefined = $state(get(showReportScreenStore).userUuid);
    let userName = $state("No name");
    let unsubscriber: Unsubscriber;

    onMount(() => {
        unsubscriber = showReportScreenStore.subscribe((reportScreenStore) => {
            if (reportScreenStore != null) {
                userName = reportScreenStore.userName;
                userUUID = reportScreenStore.userUuid;
                if (userUUID === undefined && reportScreenStore !== userReportEmpty) {
                    console.error("Could not find UUID for user with ID " + reportScreenStore.userUuid);
                }
            }
        });
        disableReport = !connectionManager.currentRoom?.canReport;
    });

    onDestroy(() => {
        if (unsubscriber) {
            unsubscriber();
        }
    });

    function close() {
        showReportScreenStore.set(userReportEmpty);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    class="report-menu-main
    text-center absolute left-0 right-0 bg-contrast/80 overflow-hidden backdrop-blur-md rounded text-white p-3 pointer-events-auto
    md:top-14 w-full md:w-1/2 m-auto z-[650]"
>
    <section>
        <div class="absolute top-2 right-2">
            <ButtonClose onclick={close} />
        </div>

        <h2 class="m-4">{$LL.report.moderate.title({ userName })}</h2>
    </section>

    <section>
        {#if blockActive}
            <BlockSubMenu {userUUID} {userName} />
            {#if !disableReport}
                <ReportSubMenu {userUUID} {userName} />
            {/if}
        {:else}
            <p>{$LL.report.moderate.noSelect()}</p>
        {/if}
    </section>
</div>
