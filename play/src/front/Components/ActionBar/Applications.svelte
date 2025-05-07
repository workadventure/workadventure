<script lang="ts">
    import { fly } from "svelte/transition";
    import { KlaxoonEvent } from "@workadventure/shared-utils/src/types";
    import { KlaxoonService } from "@workadventure/shared-utils";
    import appOnImg from "../images/applications/appOn.png";
    import appOffImg from "../images/applications/appOff.png";
    import klaxoonImg from "../images/applications/icon_klaxoon.svg";
    import googleDriveSvg from "../images/applications/icon_google_drive.svg";
    import googleDocsSvg from "../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../images/applications/icon_google_slides.svg";
    import eraserSvg from "../images/applications/icon_eraser.svg";
    import excalidrawSvg from "../images/applications/icon_excalidraw.svg";
    import cardsPng from "../images/applications/icon_cards.svg";
    import { helpSettingsPopupBlockedStore } from "../../Stores/HelpSettingsPopupBlockedStore";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { LL } from "../../../i18n/i18n-svelte";
    import Tooltip from "../Util/Tooltip.svelte";
    import { openedMenuStore } from "../../Stores/MenuStore";

    //let unsubscriptionSecondaryZoneMenuStore: Unsubscriber | null = null;

    function klaxoonButtonHandler() {
        if (!connectionManager.klaxoonToolClientId) return;
        KlaxoonService.openKlaxoonActivityPicker(connectionManager.klaxoonToolClientId, (payload: KlaxoonEvent) => {
            if (!payload.url) return;
            const openNewTab = window.open(payload.url, "_blank");
            if (!openNewTab || openNewTab.closed || typeof openNewTab.closed == "undefined") {
                helpSettingsPopupBlockedStore.set(true);
            }
        });
    }

    function oneApplicationIsActivated() {
        return (
            connectionManager.klaxoonToolActivated ||
            connectionManager.googleDriveToolActivated ||
            connectionManager.googleDocsToolActivated ||
            connectionManager.googleSheetsToolActivated ||
            connectionManager.googleSlidesToolActivated ||
            connectionManager.eraserToolActivated
        );
    }

    function noDrag() {
        return false;
    }
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
            openedMenuStore.toggle("appMenu");
        }}
        class="bottom-action-button"
    >
        <Tooltip text={$LL.actionbar.app()} />
        <button id="klaxoon">
            {#if $openedMenuStore === "appMenu"}
                <img draggable="false" src={appOnImg} style="padding: 2px" alt={$LL.actionbar.app()} />
            {:else}
                <img draggable="false" src={appOffImg} style="padding: 2px" alt={$LL.actionbar.app()} />
            {/if}
        </button>
    </div>
{/if}

{#if $openedMenuStore === "appMenu"}
    <div
        class="flex justify-center m-auto absolute left-0 right-0 bottom-0"
        style="margin-bottom: 4.5rem; height: auto;"
    >
        <div class="bottom-action-bar">
            {#if connectionManager.klaxoonToolActivated}
                <div class="bottom-action-section flex animate">
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.klaxoonProperties.label()} />
                        <button
                            on:click={() => {
                                klaxoonButtonHandler();
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.klaxoonToolActivated}
                        >
                            <img draggable="false" src={klaxoonImg} style="padding: 2px" alt="Klaxoon" />
                        </button>
                    </div>
                </div>
            {/if}
            <div class="bottom-action-section flex animate">
                {#if connectionManager.googleDriveToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleDriveProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://drive.google.com/drive/home`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.googleDriveToolActivated}
                        >
                            <img draggable="false" src={googleDriveSvg} style="padding: 2px" alt="Goodle Doc" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.googleDocsToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleDocsProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://docs.google.com/document/u/1/`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.googleDocsToolActivated}
                        >
                            <img draggable="false" src={googleDocsSvg} style="padding: 2px" alt="Goodle Doc" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.googleSheetsToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleSheetsProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://docs.google.com/spreadsheets/u/1/`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.googleSheetsToolActivated}
                        >
                            <img draggable="false" src={googleSheetsSvg} style="padding: 2px" alt="Google Sheet" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.googleSlidesToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.googleSlidesProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://docs.google.com/presentation/u/1/`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.googleSlidesToolActivated}
                        >
                            <img draggable="false" src={googleSlidesSvg} style="padding: 2px" alt="Google Slide" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.eraserToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.eraserProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://app.eraser.io/dashboard/all`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.eraserToolActivated}
                        >
                            <img draggable="false" src={eraserSvg} style="padding: 2px" alt="Eraser" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.excalidrawToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.excalidrawProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://excalidraw.com`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.excalidrawToolActivated}
                        >
                            <img draggable="false" src={excalidrawSvg} style="padding: 2px" alt="Excalidraw" />
                        </button>
                    </div>
                {/if}
                {#if connectionManager.cardsToolActivated}
                    <div class="transition-all bottom-action-button">
                        <Tooltip text={$LL.mapEditor.properties.cardsProperties.label()} />
                        <button
                            on:click={() => {
                                window.open(`https://excalidraw.com`, "_blanck");
                                openedMenuStore.close("appMenu");
                            }}
                            id="button-app-klaxoon"
                            disabled={!connectionManager.cardsToolActivated}
                        >
                            <img draggable="false" src={cardsPng} style="padding: 2px" alt="Excalidraw" />
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
