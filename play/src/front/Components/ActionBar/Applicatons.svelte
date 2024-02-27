<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { fly } from "svelte/transition";
    import { KlaxoonEvent } from "@workadventure/shared-utils/src/types";
    import { KlaxoonService } from "@workadventure/shared-utils";
    import appOnImg from "../images/applications/appOn.png";
    import appOffImg from "../images/applications/appOff.png";
    import klaxoonImg from "../images/applications/icon_klaxoon.svg";
    import googleDocsSvg from "../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../images/applications/icon_google_slides.svg";
    import eraserSvg from "../images/applications/icon_eraser.svg";
    import { emoteMenuSubStore } from "../../Stores/EmoteStore";
    import { helpSettingsPopupBlockedStore } from "../../Stores/HelpSettingsPopupBlockedStore";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { LL } from "../../../i18n/i18n-svelte";
    import Tooltip from "../Util/Tooltip.svelte";

    let unsubscriptionEmoteMenuStore: Unsubscriber | null = null;

    // Variable to store the app menu state opened or closed
    let appMenuOpened = false;
    function toggleAppMenu() {
        appMenuOpened = !appMenuOpened;
        if (appMenuOpened && $emoteMenuSubStore) {
            emoteMenuSubStore.closeEmoteMenu();
        }
    }

    function klaxoonButtonHandler() {
        if (!connectionManager.currentRoom?.klaxoonToolClientId) return;
        KlaxoonService.openKlaxoonActivityPicker(
            connectionManager.currentRoom?.klaxoonToolClientId,
            (payload: KlaxoonEvent) => {
                if (!payload.url) return;
                const openNewTab = window.open(payload.url, "_blank");
                if (!openNewTab || openNewTab.closed || typeof openNewTab.closed == "undefined") {
                    helpSettingsPopupBlockedStore.set(true);
                }
            }
        );
    }

    function oneApplicationIsActivated() {
        return (
            connectionManager.currentRoom?.klaxoonToolActivated ||
            connectionManager.currentRoom?.googleDocsToolActivated ||
            connectionManager.currentRoom?.googleSheetsToolActivated ||
            connectionManager.currentRoom?.googleSlidesToolActivated ||
            connectionManager.currentRoom?.eraserToolActivated
        );
    }

    function noDrag() {
        return false;
    }

    onMount(() => {
        // Subscribe to the emote menu store and close the app menu if the emote menu is opened
        unsubscriptionEmoteMenuStore = emoteMenuSubStore.subscribe((value) => {
            if (value === true) {
                appMenuOpened = false;
            }
        });
    });

    onDestroy(() => {
        // Unsubscribe to the emote menu store
        if (unsubscriptionEmoteMenuStore) unsubscriptionEmoteMenuStore();
    });
</script>

{#if oneApplicationIsActivated()}
    <div
        in:fly={{}}
        on:dragstart|preventDefault={noDrag}
        on:keyup|preventDefault={noDrag}
        on:keypress|preventDefault={noDrag}
        on:keydown|preventDefault={noDrag}
        on:focus|preventDefault={noDrag}
        on:blur|preventDefault={noDrag}
        on:click={() => {
            toggleAppMenu();
        }}
        class="bottom-action-button"
    >
        <Tooltip text={$LL.actionbar.app()} />
        <button id="klaxoon">
            {#if appMenuOpened}
                <img draggable="false" src={appOnImg} style="padding: 2px" alt={$LL.actionbar.app()} />
            {:else}
                <img draggable="false" src={appOffImg} style="padding: 2px" alt={$LL.actionbar.app()} />
            {/if}
        </button>
    </div>
{/if}

{#if appMenuOpened}
    <div
        class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
        style="margin-bottom: 4.5rem; height: auto;"
    >
        <div class="bottom-action-bar">
            {#if connectionManager.currentRoom?.klaxoonToolActivated}
                <div class="bottom-action-section tw-flex animate">
                    <div class="tw-transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.klaxoonProperties.label()} />
                        <button
                            on:click={() => {
                                klaxoonButtonHandler();
                                appMenuOpened = false;
                            }}
                            id={`button-app-klaxoon`}
                            disabled={!connectionManager.currentRoom?.klaxoonToolActivated}
                        >
                            <img draggable="false" src={klaxoonImg} style="padding: 2px" alt="Klaxoon" />
                        </button>
                    </div>
                </div>
            {/if}
            <div class="bottom-action-section tw-flex animate">
                {#if connectionManager.currentRoom?.googleDocsToolActivated}
                    <div class="tw-transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleDocsProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://docs.google.com/document/u/1/`, "_blanck");
                                appMenuOpened = false;
                            }}
                            id={`button-app-klaxoon`}
                            disabled={!connectionManager.currentRoom?.googleDocsToolActivated}
                        >
                            <img draggable="false" src={googleDocsSvg} style="padding: 2px" alt="Klaxoon" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.currentRoom?.googleSheetsToolActivated}
                    <div class="tw-transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleSheetsProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://docs.google.com/spreadsheets/u/1/`, "_blanck");
                                appMenuOpened = false;
                            }}
                            id={`button-app-klaxoon`}
                            disabled={!connectionManager.currentRoom?.googleSheetsToolActivated}
                        >
                            <img draggable="false" src={googleSheetsSvg} style="padding: 2px" alt="Klaxoon" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.currentRoom?.googleSlidesToolActivated}
                    <div class="tw-transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleSlidesProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://docs.google.com/presentation/u/1/`, "_blanck");
                                appMenuOpened = false;
                            }}
                            id={`button-app-klaxoon`}
                            disabled={!connectionManager.currentRoom?.googleSlidesToolActivated}
                        >
                            <img draggable="false" src={googleSlidesSvg} style="padding: 2px" alt="Klaxoon" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.currentRoom?.eraserToolActivated}
                    <div class="tw-transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.eraserProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://app.eraser.io/dashboard/all`, "_blanck");
                                appMenuOpened = false;
                            }}
                            id={`button-app-klaxoon`}
                            disabled={!connectionManager.currentRoom?.eraserToolActivated}
                        >
                            <img draggable="false" src={eraserSvg} style="padding: 2px" alt="Klaxoon" />
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
