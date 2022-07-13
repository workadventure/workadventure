<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import BlockSubMenu from "./BlockSubMenu.svelte";
    import ReportSubMenu from "./ReportSubMenu.svelte";
    import { onDestroy, onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { playersStore } from "../../Stores/PlayersStore";
    import { connectionManager } from "../../Connexion/ConnectionManager";
    import { get } from "svelte/store";
    import LL from "../../i18n/i18n-svelte";

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
    tw-text-center tw-absolute tw-left-0 tw-right-0 tw-bg-dark-purple/95 tw-rounded tw-text-white tw-p-3 tw-pointer-events-auto
    md:tw-top-14 tw-w-full md:tw-w-1/2 tw-m-auto tw-z-[650]"
>
    <section>
        <button type="button" class="close-window" on:click|preventDefault={close}>&times</button>
        <h2>{$LL.report.moderate.title({ userName })}</h2>
    </section>
    <section class="report-menu-action {disableReport ? 'tw-hidden' : ''}">
        <section class="tw-flex tw-justify-center">
            <button type="button" class={blockActive ? "disabled" : "light"} on:click|preventDefault={activateBlock}
                >{$LL.report.moderate.block()}</button
            >
        </section>
        <section class="tw-flex tw-justify-center">
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
