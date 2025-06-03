<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import {
        AreaDataPropertiesKeys, AreaDataPropertyWithoutId,
        EntityDataPropertiesKeys,
        PersonalAreaAccessClaimMode
    } from "@workadventure/map-editor";
    import audioSvg from "../../images/audio-white.svg";
    import youtubeSvg from "../../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../images/applications/icon_klaxoon.svg";
    import googleDriveSvg from "../../images/applications/icon_google_drive.svg";
    import googleDocsSvg from "../../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../images/applications/icon_google_slides.svg";
    import eraserSvg from "../../images/applications/icon_eraser.svg";
    import excalidrawSvg from "../../images/applications/icon_excalidraw.svg";
    import workerWhiteSvg from "../../images/applications/worker_white.svg";
    import teamWhiteSvg from "../../images/applications/team_white.svg";
    import cardsPng from "../../images/applications/icon_cards.svg";
    import messageSvg from "../../images/applications/icon_message.svg";
    import infoBulleSvg from "../../images/icon_infobulle.svg";
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
        click: AreaDataPropertyWithoutId;
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
        img={workerWhiteSvg}
        style={`z-index: 310;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="personalAreaPropertyData"
        on:click={(event) => {
            dispatch("click", {
                type: "personalAreaPropertyData",
                accessClaimMode: PersonalAreaAccessClaimMode.enum.dynamic,
                allowedTags: [],
                ownerId: null,
            });
        }}
    />
{/if}
{#if property === "restrictedRightsPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.restrictedRightsProperties.label()}
        descriptionText={$LL.mapEditor.properties.restrictedRightsProperties.rightTitle()}
        img={teamWhiteSvg}
        style={`z-index: 300;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="restrictedRightsPropertyData"
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}
{#if property === "focusable"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.focusableProperties.label()}
        descriptionText={$LL.mapEditor.properties.focusableProperties.description()}
        img="resources/icons/icon_focus.png"
        style={`z-index: 280;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="focusable"
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}
{#if property === "silent"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.silentProperty.label()}
        descriptionText={$LL.mapEditor.properties.silentProperty.description()}
        img="resources/icons/icon_silent.png"
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
            img="resources/icons/icon_meeting.png"
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
            img="resources/icons/icon_meeting.png"
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
            img="resources/icons/icon_speaker.png"
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
            img="resources/icons/icon_speaker.png"
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
            img="resources/icons/icon_listener.png"
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
            img="resources/icons/icon_listener.png"
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
        img="resources/icons/icon_start.png"
        style={`z-index: 230;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="startAreaProperty"
    />
{/if}
{#if property === "exit"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.exitProperties.label()}
        descriptionText={$LL.mapEditor.properties.exitProperties.description()}
        img="resources/icons/icon_exit.png"
        style={`z-index: 220;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="exitAreaProperty"
    />
{/if}
{#if property === "playAudio"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.audioProperties.label()}
        descriptionText={$LL.mapEditor.properties.audioProperties.description()}
        img={audioSvg}
        style={`z-index: 210;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="playAudio"
    />
{/if}
{#if property === "openWebsite" && (subProperty == undefined || subProperty === "website")}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.linkProperties.label()}
        descriptionText={$LL.mapEditor.properties.linkProperties.description()}
        img="resources/icons/icon_link.png"
        style={`z-index: 200;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="openWebsite"
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

{#if property === "extensionModule" && modulesExtensionMapEditor.length > 0 && subProperty !== undefined}
    {#each modulesExtensionMapEditor as moduleExtension, index (`modulesExtensionMapEditor-${index}`)}
        <svelte:component
            this={moduleExtension[subProperty].AddAreaPropertyButton}
            on:click={(event) => {
                dispatch("click", event.detail);
            }}
        />
    {/each}
{/if}

{#if property === "matrixRoomPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.matrixProperties.label()}
        descriptionText={$LL.mapEditor.properties.matrixProperties.description()}
        img={messageSvg}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="matrixRoomPropertyData"
        on:click={(event) => {
            dispatch("click", event);
        }}
    />
{/if}

{#if property === "tooltipPropertyData"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.tooltipProperties.label()}
        descriptionText={$LL.mapEditor.properties.tooltipProperties.description()}
        img={infoBulleSvg}
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        on:click={(event) => {
            dispatch("click", event);
        }}
        testId="addTooltipProperty"
    />
{/if}
{#if property === "openPdf"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.openPdfProperties.label()}
        descriptionText={$LL.mapEditor.properties.openPdfProperties.description()}
        img="resources/icons/icon_pdf.png"
        style={`z-index: 180;${isActive ? "background-color: #4156f6;" : ""}`}
        testId="openPdf"
        on:click={(event) => {
            dispatch("click", event);
        }}
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
