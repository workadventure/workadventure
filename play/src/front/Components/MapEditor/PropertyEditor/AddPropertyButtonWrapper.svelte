<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { AreaDataPropertiesKeys, EntityDataPropertiesKeys } from "@workadventure/map-editor";
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
    import {
        IconDesk,
        IconLockCog,
        IconFocus,
        IconMicrophoneOff,
        IconCamera,
        IconDoorIn,
        IconDoorOut,
        IconFileMusic,
        IconWorldWWW,
        IconTooltip,
        IconFile,
        IconMessage,
        IconSpeakerPhone,
        IconHeadphones,
        IconZoomInArea,
    } from "../../Icons";
    import LL from "../../../../i18n/i18n-svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { extensionModuleStore } from "../../../Stores/GameSceneStore";
    import { ExtensionModule, ExtensionModuleAreaProperty } from "../../../ExternalModule/ExtensionModule";
    import { mapEditorRestrictedPropertiesStore } from "../../../Stores/MapEditorStore";
    import AddPropertyButton from "./AddPropertyButton.svelte";

    export let property: AreaDataPropertiesKeys | EntityDataPropertiesKeys;
    export let subProperty: string | undefined = undefined;
    export let isActive = false;

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
        headerText={$LL.mapEditor.properties.personalAreaConfiguration.label()}
        descriptionText={$LL.mapEditor.properties.personalAreaConfiguration.description()}
        style={`z-index: 310;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="personalAreaPropertyData"
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconDesk}
    />
{/if}
{#if property === "restrictedRightsPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.restrictedRightsProperties.label()}
        descriptionText={$LL.mapEditor.properties.restrictedRightsProperties.rightTitle()}
        style={`z-index: 300;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="restrictedRightsPropertyData"
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconLockCog}
    />
{/if}
{#if property === "focusable"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.focusableProperties.label()}
        descriptionText={$LL.mapEditor.properties.focusableProperties.description()}
        img={IconFocus}
        style={`z-index: 280;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="focusable"
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}
{#if property === "highlight"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.highlightProperties.label()}
        descriptionText={$LL.mapEditor.properties.highlightProperties.description()}
        img={IconZoomInArea}
        style={`z-index: 280;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="highlight"
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}
{#if property === "silent"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.silentProperty.label()}
        descriptionText={$LL.mapEditor.properties.silentProperty.description()}
        img={IconMicrophoneOff}
        style={`z-index: 270;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="addSilentProperty"
    />
{/if}
{#if property === "jitsiRoomProperty"}
    {#if $mapEditorRestrictedPropertiesStore.includes("jitsiRoomProperty")}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.jitsiProperties.label()}
            descriptionText={$LL.mapEditor.properties.jitsiProperties.disabled()}
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
            headerText={$LL.mapEditor.properties.jitsiProperties.label()}
            descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
            img={jitsiPng}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            testId="jitsiRoomProperty"
        />
    {/if}
{/if}
{#if property === "speakerMegaphone"}
    {#if $mapEditorRestrictedPropertiesStore.includes("speakerMegaphone")}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
            descriptionText={$LL.mapEditor.properties.speakerMegaphoneProperties.disabled()}
            img={IconSpeakerPhone}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;cursor:not-allowed;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            disabled={true}
            testId="speakerMegaphone"
        />
    {:else}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
            descriptionText={$LL.mapEditor.properties.speakerMegaphoneProperties.description()}
            img={IconSpeakerPhone}
            style={`z-index: 250;${isActive ? "background-color: #4156f6;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            testId="speakerMegaphone"
        />
    {/if}
{/if}
{#if property === "listenerMegaphone"}
    {#if $mapEditorRestrictedPropertiesStore.includes("speakerMegaphone")}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
            descriptionText={$LL.mapEditor.properties.listenerMegaphoneProperties.disabled()}
            img={IconHeadphones}
            style={`z-index: 260;${isActive ? "background-color: #4156f6;cursor:not-allowed;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            disabled={true}
            testId="listenerMegaphone"
        />
    {:else}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
            descriptionText={$LL.mapEditor.properties.listenerMegaphoneProperties.description()}
            img={IconHeadphones}
            style={`z-index: 240;${isActive ? "background-color: #4156f6;" : ""}`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            testId="listenerMegaphone"
        />
    {/if}
{/if}
{#if property === "start"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.startProperties.label()}
        descriptionText={$LL.mapEditor.properties.startProperties.description()}
        style={`z-index: 230;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="startAreaProperty"
        img={IconDoorIn}
    />
{/if}
{#if property === "exit"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.exitProperties.label()}
        descriptionText={$LL.mapEditor.properties.exitProperties.description()}
        style={`z-index: 220;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="exitAreaProperty"
        img={IconDoorOut}
    />
{/if}
{#if property === "playAudio"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.audioProperties.label()}
        descriptionText={$LL.mapEditor.properties.audioProperties.description()}
        style={`z-index: 210;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="playAudio"
        img={IconFileMusic}
    />
{/if}
{#if property === "openWebsite" && (subProperty == undefined || subProperty === "website")}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.linkProperties.label()}
        descriptionText={$LL.mapEditor.properties.linkProperties.description()}
        style={`z-index: 200;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsite"
        img={IconWorldWWW}
    />
{/if}
{#if property === "openWebsite" && subProperty === "klaxoon"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.klaxoonProperties.label()}
        descriptionText={connectionManager.klaxoonToolActivated
            ? $LL.mapEditor.properties.klaxoonProperties.description()
            : $LL.mapEditor.properties.klaxoonProperties.disabled()}
        img={klaxoonSvg}
        style={`z-index: 170;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.klaxoonToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteKlaxoon"
    />
{/if}
{#if property === "openWebsite" && subProperty === "youtube"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.youtubeProperties.label()}
        descriptionText={connectionManager.youtubeToolActivated
            ? $LL.mapEditor.properties.youtubeProperties.description()
            : $LL.mapEditor.properties.youtubeProperties.disabled()}
        img={youtubeSvg}
        style={`z-index: 160;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.youtubeToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteYoutube"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleDrive"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleDriveProperties.label()}
        descriptionText={connectionManager.googleDriveToolActivated
            ? $LL.mapEditor.properties.googleDriveProperties.description()
            : $LL.mapEditor.properties.googleDriveProperties.disabled()}
        img={googleDriveSvg}
        style={`z-index: 150;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleDriveToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleDrive"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleDocs"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleDocsProperties.label()}
        descriptionText={connectionManager.googleDocsToolActivated
            ? $LL.mapEditor.properties.googleDocsProperties.description()
            : $LL.mapEditor.properties.googleDocsProperties.disabled()}
        img={googleDocsSvg}
        style={`z-index: 140;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleDocsToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleDocs"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleSheets"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleSheetsProperties.label()}
        descriptionText={connectionManager.googleSheetsToolActivated
            ? $LL.mapEditor.properties.googleSheetsProperties.description()
            : $LL.mapEditor.properties.googleSheetsProperties.disabled()}
        img={googleSheetsSvg}
        style={`z-index: 130;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleSheetsToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleSheets"
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleSlides"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleSlidesProperties.label()}
        descriptionText={connectionManager.googleSlidesToolActivated
            ? $LL.mapEditor.properties.googleSlidesProperties.description()
            : $LL.mapEditor.properties.googleSlidesProperties.disabled()}
        img={googleSlidesSvg}
        style={`z-index: 120;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.googleSlidesToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteGoogleSlides"
    />
{/if}
{#if property === "openWebsite" && subProperty === "eraser"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.eraserProperties.label()}
        descriptionText={connectionManager.eraserToolActivated
            ? $LL.mapEditor.properties.eraserProperties.description()
            : $LL.mapEditor.properties.eraserProperties.disabled()}
        img={eraserSvg}
        style={`z-index: 110;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.eraserToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteEraser"
    />
{/if}

{#if property === "openWebsite" && subProperty === "excalidraw"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.excalidrawProperties.label()}
        descriptionText={connectionManager.excalidrawToolActivated
            ? $LL.mapEditor.properties.excalidrawProperties.description()
            : $LL.mapEditor.properties.excalidrawProperties.disabled()}
        img={excalidrawSvg}
        style={`z-index: 100;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.excalidrawToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteExcalidraw"
    />
{/if}

{#if property === "openWebsite" && subProperty === "cards"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.cardsProperties.label()}
        descriptionText={connectionManager.cardsToolActivated
            ? $LL.mapEditor.properties.cardsProperties.description()
            : $LL.mapEditor.properties.cardsProperties.disabled()}
        img={cardsPng}
        style={`z-index: 100;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.cardsToolActivated}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsiteCards"
    />
{/if}

{#if property === "openWebsite" && subProperty === "tldraw"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.tldrawProperties.label()}
        descriptionText={connectionManager.tldrawToolActivated
            ? $LL.mapEditor.properties.tldrawProperties.description()
            : $LL.mapEditor.properties.tldrawProperties.disabled()}
        img={tldrawsJpeg}
        style={`z-index: 100;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.tldrawToolActivated}
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
        headerText={$LL.mapEditor.properties.matrixProperties.label()}
        descriptionText={$LL.mapEditor.properties.matrixProperties.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="matrixRoomPropertyData"
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconMessage}
    />
{/if}

{#if property === "tooltipPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.tooltipProperties.label()}
        descriptionText={$LL.mapEditor.properties.tooltipProperties.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="addTooltipProperty"
        img={IconTooltip}
    />
{/if}
{#if property === "openFile"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.openFileProperties.label()}
        descriptionText={$LL.mapEditor.properties.openFileProperties.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="openFile"
        on:click={(event) => {
            dispatch("click", event);
        }}
        img={IconFile}
    />
{/if}
{#if property === "livekitRoomProperty"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.livekitProperties.label()}
        descriptionText={$LL.mapEditor.properties.livekitProperties.description()}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="livekitRoomProperty"
        img={IconCamera}
    />
{/if}

{#each connectionManager.applications as app, index (`my-own-app-${index}`)}
    {#if property === "openWebsite" && subProperty === app.name}
        <AddPropertyButton
            headerText={app.name}
            descriptionText={app.description}
            img={app.image}
            style={`z-index: ${1 + index};`}
            on:click={(event) => {
                dispatch("click", event);
            }}
            testId={`openWebsite${app.name}`}
        />
    {/if}
{/each}
