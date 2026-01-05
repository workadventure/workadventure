<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { AreaDataPropertiesKeys, EntityDataPropertiesKeys } from "@workadventure/map-editor";
    import youtubeSvg from "../../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../images/applications/icon_klaxoon.svg";
    import googleDriveSvg from "../../images/applications/icon_google_drive.svg";
    import googleDocsSvg from "../../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../images/applications/icon_google_slides.svg";
    import eraserSvg from "../../images/applications/icon_eraser.svg";
    import excalidrawSvg from "../../images/applications/icon_excalidraw.svg";
    import cardsPng from "../../images/applications/icon_cards.svg";
    import tldrawsJpeg from "../../images/applications/icon_tldraw.jpeg";
    import jitsiPng from "../../images/jitsi.png";
    import LL from "../../../../i18n/i18n-svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { extensionModuleStore } from "../../../Stores/GameSceneStore";
    import type { ExtensionModule, ExtensionModuleAreaProperty } from "../../../ExternalModule/ExtensionModule";
    import { mapEditorRestrictedPropertiesStore } from "../../../Stores/MapEditorStore";
    import AddPropertyButton from "./AddPropertyButton.svelte";
    import {
        IconDesk,
        IconLockCog,
        IconFocus,
        IconMicrophoneOff,
        IconUsersGroup,
        IconDoorIn,
        IconDoorOut,
        IconFileMusic,
        IconLink,
        IconTooltip,
        IconFile,
        IconMessage,
        IconMicrophone,
        IconEar,
        IconZoomInArea,
    } from "@wa-icons";

    export let property: AreaDataPropertiesKeys | EntityDataPropertiesKeys;
    export let subProperty: string | undefined = undefined;
    export let isActive = false;
    export let disabled = false;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
        click: CustomEvent;
    }>();

    let modulesExtensionMapEditor = $extensionModuleStore.reduce(
        (acc: { [key: string]: ExtensionModuleAreaProperty }[], module: ExtensionModule) => {
            const areaProperty = module.areaMapEditor?.();
            if (areaProperty != undefined) {
                acc.push(areaProperty);
            }
            return acc;
        },
        []
    );
</script>

{#if property === "personalAreaPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.personalAreaPropertyData.label()}
        descriptionText={$LL.mapEditor.properties.personalAreaPropertyData.description()}
        style={`z-index: 310;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="personalAreaPropertyData"
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconDesk}
    />
{/if}
{#if property === "restrictedRightsPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.restrictedRightsPropertyData.label()}
        descriptionText={$LL.mapEditor.properties.restrictedRightsPropertyData.rightTitle()}
        style={`z-index: 300;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="restrictedRightsPropertyData"
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconLockCog}
    />
{/if}
{#if property === "focusable"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.focusable.label()}
        descriptionText={$LL.mapEditor.properties.focusable.description()}
        img={IconZoomInArea}
        style={`z-index: 280;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="focusable"
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}
{#if property === "highlight"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.highlight.label()}
        descriptionText={$LL.mapEditor.properties.highlight.description()}
        img={IconFocus}
        style={`z-index: 280;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="highlight"
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}
{#if property === "silent"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.silent.label()}
        descriptionText={$LL.mapEditor.properties.silent.description()}
        img={IconMicrophoneOff}
        style={`z-index: 270;${isActive ? "background-color: #4156f6;" : ""}`}
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="addSilentProperty"
    />
{/if}
{#if property === "jitsiRoomProperty"}
    {#if $mapEditorRestrictedPropertiesStore.includes("jitsiRoomProperty")}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.jitsiRoomProperty.label()}
            descriptionText={$LL.mapEditor.properties.jitsiRoomProperty.disabled()}
            img={jitsiPng}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;cursor:not-allowed;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            disabled={true}
            testId="jitsiRoomProperty"
        />
    {:else}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.jitsiRoomProperty.label()}
            descriptionText={$LL.mapEditor.properties.jitsiRoomProperty.description()}
            img={jitsiPng}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            {disabled}
            testId="jitsiRoomProperty"
        />
    {/if}
{/if}
{#if property === "speakerMegaphone"}
    {#if $mapEditorRestrictedPropertiesStore.includes("speakerMegaphone")}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.speakerMegaphone.label()}
            descriptionText={$LL.mapEditor.properties.speakerMegaphone.disabled()}
            img={IconMicrophone}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;cursor:not-allowed;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            disabled={true}
            testId="speakerMegaphone"
        />
    {:else}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.speakerMegaphone.label()}
            descriptionText={$LL.mapEditor.properties.speakerMegaphone.description()}
            img={IconMicrophone}
            style={`z-index: 250;${isActive ? "background-color: #4156f6;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            {disabled}
            testId="speakerMegaphone"
        />
    {/if}
{/if}
{#if property === "listenerMegaphone"}
    {#if $mapEditorRestrictedPropertiesStore.includes("speakerMegaphone")}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.listenerMegaphone.label()}
            descriptionText={$LL.mapEditor.properties.listenerMegaphone.disabled()}
            img={IconEar}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;cursor:not-allowed;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            disabled={true}
            testId="listenerMegaphone"
        />
    {:else}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.listenerMegaphone.label()}
            descriptionText={$LL.mapEditor.properties.listenerMegaphone.description()}
            img={IconEar}
            style={`z-index: 240;${isActive ? "background-color: #4156f6;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            {disabled}
            testId="listenerMegaphone"
        />
    {/if}
{/if}
{#if property === "start"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.start.label()}
        descriptionText={$LL.mapEditor.properties.start.description()}
        style={`z-index: 230;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="startAreaProperty"
        {disabled}
        img={IconDoorIn}
    />
{/if}
{#if property === "exit"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.exit.label()}
        descriptionText={$LL.mapEditor.properties.exit.description()}
        style={`z-index: 220;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="exitAreaProperty"
        {disabled}
        img={IconDoorOut}
    />
{/if}
{#if property === "playAudio"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.playAudio.label()}
        descriptionText={$LL.mapEditor.properties.playAudio.description()}
        style={`z-index: 210;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="playAudio"
        {disabled}
        img={IconFileMusic}
    />
{/if}
{#if property === "openWebsite" && (subProperty == undefined || subProperty === "website")}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.openWebsite.label()}
        descriptionText={$LL.mapEditor.properties.openWebsite.description()}
        style={`z-index: 200;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsite"
        {disabled}
        img={IconLink}
    />
{/if}
{#if property === "openWebsite" && subProperty === "klaxoon"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.klaxoon.label()}
        descriptionText={connectionManager.klaxoonToolActivated
            ? $LL.mapEditor.properties.klaxoon.description()
            : $LL.mapEditor.properties.klaxoon.disabled()}
        img={klaxoonSvg}
        style={`z-index: 170;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.klaxoonToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteKlaxoon"
    />
{/if}
{#if property === "openWebsite" && subProperty === "youtube"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.youtube.label()}
        descriptionText={connectionManager.youtubeToolActivated
            ? $LL.mapEditor.properties.youtube.description()
            : $LL.mapEditor.properties.youtube.disabled()}
        img={youtubeSvg}
        style={`z-index: 160;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.youtubeToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteYoutube"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleDrive"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleDrive.label()}
        descriptionText={connectionManager.googleDriveToolActivated
            ? $LL.mapEditor.properties.googleDrive.description()
            : $LL.mapEditor.properties.googleDrive.disabled()}
        img={googleDriveSvg}
        style={`z-index: 150;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleDriveToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleDrive"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleDocs"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleDocs.label()}
        descriptionText={connectionManager.googleDocsToolActivated
            ? $LL.mapEditor.properties.googleDocs.description()
            : $LL.mapEditor.properties.googleDocs.disabled()}
        img={googleDocsSvg}
        style={`z-index: 140;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleDocsToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleDocs"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleSheets"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleSheets.label()}
        descriptionText={connectionManager.googleSheetsToolActivated
            ? $LL.mapEditor.properties.googleSheets.description()
            : $LL.mapEditor.properties.googleSheets.disabled()}
        img={googleSheetsSvg}
        style={`z-index: 130;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleSheetsToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleSheets"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleSlides"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleSlides.label()}
        descriptionText={connectionManager.googleSlidesToolActivated
            ? $LL.mapEditor.properties.googleSlides.description()
            : $LL.mapEditor.properties.googleSlides.disabled()}
        img={googleSlidesSvg}
        style={`z-index: 120;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleSlidesToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleSlides"
    />
{/if}
{#if property === "openWebsite" && subProperty === "eraser"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.eraser.label()}
        descriptionText={connectionManager.eraserToolActivated
            ? $LL.mapEditor.properties.eraser.description()
            : $LL.mapEditor.properties.eraser.disabled()}
        img={eraserSvg}
        style={`z-index: 110;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.eraserToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteEraser"
    />
{/if}

{#if property === "openWebsite" && subProperty === "excalidraw"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.excalidraw.label()}
        descriptionText={connectionManager.excalidrawToolActivated
            ? $LL.mapEditor.properties.excalidraw.description()
            : $LL.mapEditor.properties.excalidraw.disabled()}
        img={excalidrawSvg}
        style={`z-index: 100;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.excalidrawToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteExcalidraw"
    />
{/if}

{#if property === "openWebsite" && subProperty === "cards"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.cards.label()}
        descriptionText={connectionManager.cardsToolActivated
            ? $LL.mapEditor.properties.cards.description()
            : $LL.mapEditor.properties.cards.disabled()}
        img={cardsPng}
        style={`z-index: 100;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.cardsToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteCards"
    />
{/if}

{#if property === "openWebsite" && subProperty === "tldraw"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.tldraw.label()}
        descriptionText={connectionManager.tldrawToolActivated
            ? $LL.mapEditor.properties.tldraw.description()
            : $LL.mapEditor.properties.tldraw.disabled()}
        img={tldrawsJpeg}
        style={`z-index: 100;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.tldrawToolActivated || disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteTldraw"
    />
{/if}

{#if property === "extensionModule" && modulesExtensionMapEditor.length > 0 && subProperty !== undefined}
    {#each modulesExtensionMapEditor as moduleExtension, index (`modulesExtensionMapEditor-${index}`)}
        {#if moduleExtension[subProperty] != undefined}
            <svelte:component
                this={moduleExtension[subProperty].AddAreaPropertyButton}
                on:click={(event) => {
                    dispatch("click", event);
                }}
            />
        {/if}
    {/each}
{/if}

{#if property === "matrixRoomPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.matrixRoomPropertyData.label()}
        descriptionText={$LL.mapEditor.properties.matrixRoomPropertyData.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="matrixRoomPropertyData"
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconMessage}
    />
{/if}

{#if property === "tooltipPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.tooltipPropertyData.label()}
        descriptionText={$LL.mapEditor.properties.tooltipPropertyData.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="addTooltipProperty"
        img={IconTooltip}
    />
{/if}
{#if property === "openFile"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.openFile.label()}
        descriptionText={$LL.mapEditor.properties.openFile.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="openFile"
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconFile}
    />
{/if}
{#if property === "livekitRoomProperty"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.livekitRoomProperty.label()}
        descriptionText={$LL.mapEditor.properties.livekitRoomProperty.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        {disabled}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="livekitRoomProperty"
        img={IconUsersGroup}
    />
{/if}

{#each connectionManager.applications as app, index (`my-own-app-${index}`)}
    {#if property === "openWebsite" && subProperty === app.name}
        <AddPropertyButton
            headerText={app.name}
            descriptionText={app.description}
            img={app.image}
            style={`z-index: ${1 + index};`}
            {disabled}
            on:click={(event) => {
                dispatch("click", event);
            }}
            testId={`openWebsite${app.name}`}
        />
    {/if}
{/each}
