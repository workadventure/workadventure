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
    let disableReport: boolean = false;
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

<div class="report-menu-main nes-container is-rounded">
    <section class="report-menu-title">
        <h2>{$LL.report.moderate.title({ userName })}</h2>
        <section class="justify-center">
            <button type="button" class="nes-btn" on:click|preventDefault={close}>X</button>
        </section>
    </section>
    <section class="report-menu-action {disableReport ? 'hidden' : ''}">
        <section class="justify-center">
            <button
                type="button"
                class="nes-btn {blockActive ? 'is-disabled' : ''}"
                on:click|preventDefault={activateBlock}>{$LL.report.moderate.block()}</button
            >
        </section>
        <section class="justify-center">
            <button
                type="button"
                class="nes-btn {reportActive ? 'is-disabled' : ''}"
                on:click|preventDefault={activateReport}>{$LL.report.moderate.report()}</button
            >
        </section>
    </section>
    <section class="report-menu-content">
        {#if blockActive}
            <BlockSubMenu {userUUID} {userName} />
        {:else if reportActive}
            <ReportSubMenu {userUUID} />
        {:else}
            <p>{$LL.report.moderate.noSelect()}</p>
        {/if}
    </section>
</div>

<style lang="scss">
    .nes-container {
        padding: 5px;
    }

    section.justify-center {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    div.report-menu-main {
        font-family: "Press Start 2P";
        pointer-events: auto;
        background-color: #333333;
        color: whitesmoke;
        z-index: 650;
        position: absolute;
        height: 70vh;
        width: 50vw;
        top: 4%;

        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;

        section.report-menu-title {
            display: grid;
            grid-template-columns: calc(100% - 45px) 40px;
            margin-bottom: 20px;

            h2 {
                display: flex;
                justify-content: center;
                align-items: center;
            }
        }

        section.report-menu-action {
            display: grid;
            grid-template-columns: 50% 50%;
            margin-bottom: 20px;
        }

        section.report-menu-action.hidden {
            display: none;
        }
    }
</style>
