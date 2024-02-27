<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import {
        AreaDataPropertiesKeys,
        EntityDataPropertiesKeys,
        OpenWebsiteTypePropertiesKeys,
    } from "@workadventure/map-editor";
    import audioSvg from "../../images/audio-white.svg";
    import youtubeSvg from "../../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../images/applications/icon_klaxoon.svg";
    import googleDriveSvg from "../../images/applications/icon_google_drive.svg";
    import googleDocsSvg from "../../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../images/applications/icon_google_slides.svg";
    import eraserSvg from "../../images/applications/icon_eraser.svg";
    import LL from "../../../../i18n/i18n-svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import AddPropertyButton from "./AddPropertyButton.svelte";

    export let property: AreaDataPropertiesKeys | EntityDataPropertiesKeys;
    export let subProperty: OpenWebsiteTypePropertiesKeys | undefined = undefined;
    export let isActive = false;

    const dispatch = createEventDispatcher();
</script>

{#if property === "focusable"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.focusableProperties.label()}
        descriptionText={$LL.mapEditor.properties.focusableProperties.description()}
        img={"resources/icons/icon_focus.png"}
        style={`z-index: 16;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "silent"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.silentProperty.label()}
        descriptionText={$LL.mapEditor.properties.silentProperty.description()}
        img={"resources/icons/icon_silent.png"}
        style={`z-index: 15;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "jitsiRoomProperty"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.jitsiProperties.label()}
        descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
        img={"resources/icons/icon_meeting.png"}
        style={`z-index: 14;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "speakerMegaphone"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
        descriptionText={$LL.mapEditor.properties.speakerMegaphoneProperties.description()}
        img={"resources/icons/icon_speaker.png"}
        style={`z-index: 13;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "listenerMegaphone"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
        descriptionText={$LL.mapEditor.properties.listenerMegaphoneProperties.description()}
        img={"resources/icons/icon_listener.png"}
        style={`z-index: 12;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "start"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.startProperties.label()}
        descriptionText={$LL.mapEditor.properties.startProperties.description()}
        img={"resources/icons/icon_start.png"}
        style={`z-index: 11;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "exit"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.exitProperties.label()}
        descriptionText={$LL.mapEditor.properties.exitProperties.description()}
        img={"resources/icons/icon_exit.png"}
        style={`z-index: 10;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "playAudio"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.audioProperties.label()}
        descriptionText={$LL.mapEditor.properties.audioProperties.description()}
        img={audioSvg}
        style={`z-index: 9;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty == undefined}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.linkProperties.label()}
        descriptionText={$LL.mapEditor.properties.linkProperties.description()}
        img={"resources/icons/icon_link.png"}
        style={`z-index: 8;${isActive ? "background-color: #4156f6;" : ""}`}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "klaxoon"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.klaxoonProperties.label()}
        descriptionText={connectionManager.currentRoom?.klaxoonToolActivated
            ? $LL.mapEditor.properties.klaxoonProperties.description()
            : $LL.mapEditor.properties.klaxoonProperties.disabled()}
        img={klaxoonSvg}
        style={`z-index: 7;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.klaxoonToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "youtube"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.youtubeProperties.label()}
        descriptionText={connectionManager.currentRoom?.youtubeToolActivated
            ? $LL.mapEditor.properties.youtubeProperties.description()
            : $LL.mapEditor.properties.youtubeProperties.disabled()}
        img={youtubeSvg}
        style={`z-index: 6;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.youtubeToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleDrive"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleDriveProperties.label()}
        descriptionText={connectionManager.currentRoom?.googleDocsToolActivated
            ? $LL.mapEditor.properties.googleDriveProperties.description()
            : $LL.mapEditor.properties.googleDriveProperties.disabled()}
        img={googleDriveSvg}
        style={`z-index: 5;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.googleDocsToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleDocs"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleDocsProperties.label()}
        descriptionText={connectionManager.currentRoom?.googleDocsToolActivated
            ? $LL.mapEditor.properties.googleDocsProperties.description()
            : $LL.mapEditor.properties.googleDocsProperties.disabled()}
        img={googleDocsSvg}
        style={`z-index: 4;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.googleDocsToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleSheets"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleSheetsProperties.label()}
        descriptionText={connectionManager.currentRoom?.googleSheetsToolActivated
            ? $LL.mapEditor.properties.googleSheetsProperties.description()
            : $LL.mapEditor.properties.googleSheetsProperties.disabled()}
        img={googleSheetsSvg}
        style={`z-index: 3;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.googleSheetsToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "googleSlides"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.googleSlidesProperties.label()}
        descriptionText={connectionManager.currentRoom?.googleSlidesToolActivated
            ? $LL.mapEditor.properties.googleSlidesProperties.description()
            : $LL.mapEditor.properties.googleSlidesProperties.disabled()}
        img={googleSlidesSvg}
        style={`z-index: 2;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.googleSlidesToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
{#if property === "openWebsite" && subProperty === "eraser"}
    <AddPropertyButton
        headerText={$LL.mapEditor.properties.eraserProperties.label()}
        descriptionText={connectionManager.currentRoom?.eraserToolActivated
            ? $LL.mapEditor.properties.eraserProperties.description()
            : $LL.mapEditor.properties.eraserProperties.disabled()}
        img={eraserSvg}
        style={`z-index: 1;${isActive ? "background-color: #4156f6;" : ""}`}
        disabled={!connectionManager.currentRoom?.eraserToolActivated}
        on:pointerdown={(event) => {
            dispatch("pointerdown", event);
        }}
    />
{/if}
