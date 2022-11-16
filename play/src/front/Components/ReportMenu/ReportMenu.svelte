<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import BlockSubMenu from "./BlockSubMenu.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { playersStore } from "../../Stores/PlayersStore";
    import { connectionManager } from "../../Connexion/ConnectionManager";
    import { get } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";

    let blockActive = true;
    let reportActive = !blockActive;
    let disableReport = false;
    let userUUID: string | undefined = playersStore.getPlayerById(get(showReportScreenStore).userId)?.userUuid;
    let userName = "No name";
    let unsubscriber: Unsubscriber;

    onMount(() => {
        unsubscriber = showReportScreenStore.subscribe((reportScreenStore) => {
            if (reportScreenStore != null) {
                userName = reportScreenStore.userName;
                userUUID = playersStore.getPlayerById(reportScreenStore.userId)?.userUuid;
                if (userUUID === undefined && reportScreenStore !== userReportEmpty) {
                    console.error("Could not find UUID for user with ID " + reportScreenStore.userId);
                }
            }
        });
        disableReport = !connectionManager.currentRoom?.canReport ?? true;
    });

    onDestroy(() => {
        if (unsubscriber) {
            unsubscriber();
        }
    });

    function close() {
        showReportScreenStore.set(userReportEmpty);
    }

    function activateBlock() {
        blockActive = true;
        reportActive = false;
    }

    function activateReport() {
        blockActive = false;
        reportActive = true;
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            close();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    class="report-menu-main
    text-center absolute left-0 right-0 bg-dark-purple/95 rounded text-white p-3 pointer-events-auto
    md:top-14 w-full md:w-1/2 m-auto z-[650]"
>
    <section>
        <button type="button" class="close-window" on:click|preventDefault={close}>&times;</button>
        <h2>{$LL.report.moderate.title({ userName })}</h2>
    </section>
    <section class="report-menu-action {disableReport ? 'hidden' : ''}">
        <section class="flex justify-center">
            <button type="button" class={blockActive ? "disabled" : "light"} on:click|preventDefault={activateBlock}
                >{$LL.report.moderate.block()}</button
            >
        </section>
        <section class="flex justify-center">
            <button type="button" class={reportActive ? "disabled" : "light"} on:click|preventDefault={activateReport}
                >{$LL.report.moderate.report()}</button
            >
        </section>
    </section>

    <section>
        {#if blockActive}
            <BlockSubMenu {userUUID} {userName} />
        {:else if reportActive}
            <ReportSubMenu {userUUID} />
        {:else}
            <p>{$LL.report.moderate.noSelect()}</p>
        {/if}
    </section>
</div>
