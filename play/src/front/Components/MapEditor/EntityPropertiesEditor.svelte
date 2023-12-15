<script lang="ts">
    import { onDestroy } from "svelte";
    import {
        EntityDataProperties,
        EntityDataPropertiesKeys,
        EntityDataProperty,
        OpenWebsiteTypePropertiesKeys,
    } from "@workadventure/map-editor";
    import { ArrowLeftIcon } from "svelte-feather-icons";
    import { get } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        mapEditorEntityModeStore,
        mapEditorSelectedEntityPrefabStore,
        mapEditorSelectedEntityStore,
    } from "../../Stores/MapEditorStore";
    import visioSvg from "../images/visio-white.svg";
    import audioSvg from "../images/audio-white.svg";
    import webSvg from "../images/web-white.svg";
    import youtubeSvg from "../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../images/applications/icon_klaxoon.svg";
    import googleDocsSvg from "../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../images/applications/icon_google_slides.svg";
    import eraserSvg from "../images/applications/icon_eraser.svg";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";

    let properties: EntityDataProperties = [];
    let entityName = "";
    let hasJitsiRoomProperty: boolean;

    let selectedEntityUnsubscriber = mapEditorSelectedEntityStore.subscribe((currentEntity) => {
        if (currentEntity) {
            currentEntity.setEditColor(0x00ffff);
            properties = currentEntity.getProperties() ?? [];
            entityName = currentEntity.getEntityData().name ?? "";
        }
    });

    function onAddProperty(type: EntityDataPropertiesKeys, subtype?: OpenWebsiteTypePropertiesKeys) {
        if ($mapEditorSelectedEntityStore) {
            analyticsClient.addMapEditorProperty("entity", type || "unknown");
            const property = getPropertyFromType(type, subtype);
            $mapEditorSelectedEntityStore.addProperty(property);

            // refresh properties
            properties = $mapEditorSelectedEntityStore?.getProperties();
            refreshFlags();
        }
    }

    function onUpdateName() {
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.setEntityName(entityName);
        }
    }

    function onUpdateProperty(property: EntityDataProperty) {
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.updateProperty(property);
        }
    }

    function getPropertyFromType(
        type: EntityDataPropertiesKeys,
        subtype?: OpenWebsiteTypePropertiesKeys
    ): EntityDataProperty {
        const id = crypto.randomUUID();
        let placeholder: string;
        let buttonLabel: string;
        let policy: string | undefined;
        switch (type) {
            case "jitsiRoomProperty":
                return {
                    id,
                    type,
                    jitsiRoomConfig: {},
                    closable: true,
                    roomName: "JITSI ROOM",
                    buttonLabel: $LL.mapEditor.properties.jitsiProperties.label(),
                };
            case "openWebsite":
                switch (subtype) {
                    case "youtube":
                        placeholder = "https://www.youtube.com/watch?v=Y9ubBWf5w20";
                        buttonLabel = $LL.mapEditor.properties.youtubeProperties.label();
                        policy =
                            "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share;";
                        break;
                    case "klaxoon":
                        placeholder = "https://app.klaxoon.com/";
                        buttonLabel = $LL.mapEditor.properties.klaxoonProperties.label();
                        break;
                    case "googleDocs":
                        placeholder =
                            "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit";
                        buttonLabel = $LL.mapEditor.properties.googleDocsProperties.label();
                        break;
                    case "googleSheets":
                        placeholder =
                            "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit";
                        buttonLabel = $LL.mapEditor.properties.googleSheetsProperties.label();
                        break;
                    case "googleSlides":
                        placeholder =
                            "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit";
                        buttonLabel = $LL.mapEditor.properties.googleSlidesProperties.label();
                        break;
                    case "eraser":
                        placeholder = "https://app.eraser.io/workspace/ExSd8Z4wPsaqMMgTN4VU";
                        buttonLabel = $LL.mapEditor.properties.eraserProperties.label();
                        break;
                    default:
                        placeholder = "https://workadventu.re";
                        buttonLabel = $LL.mapEditor.properties.linkProperties.label();
                }
                return {
                    id,
                    type,
                    closable: true,
                    buttonLabel,
                    link: "",
                    newTab: false,
                    application: subtype ?? "website",
                    placeholder,
                    policy,
                };
            case "playAudio":
                return {
                    id,
                    type,
                    buttonLabel: $LL.mapEditor.properties.audioProperties.label(),
                    audioLink: "",
                    volume: 1,
                };
            default:
                throw new Error(`Unknown property type ${type}`);
        }
    }

    function onDeleteProperty(id: string) {
        if ($mapEditorSelectedEntityStore) {
            analyticsClient.removeMapEditorProperty("entity", properties.find((p) => p.id === id)?.type || "unknown");
            $mapEditorSelectedEntityStore.deleteProperty(id);
            // refresh properties
            properties = $mapEditorSelectedEntityStore?.getProperties();
            // $mapEditorSelectedEntityStore.delete();
            // mapEditorSelectedEntityStore.set(undefined);
            // mapEditorEntityModeStore.set("ADD");
            refreshFlags();
        }
    }

    function refreshFlags(): void {
        hasJitsiRoomProperty = hasProperty("jitsiRoomProperty");
    }
    function hasProperty(propertyType: EntityDataPropertiesKeys): boolean {
        return properties.find((property) => property.type === propertyType) !== undefined;
    }

    function backToSelectObject() {
        get(mapEditorSelectedEntityStore)?.delete();
        mapEditorSelectedEntityStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
    }

    onDestroy(() => {
        selectedEntityUnsubscriber();
    });
</script>

{#if $mapEditorSelectedEntityStore === undefined}
    {$LL.mapEditor.entityEditor.editInstructions()}
{:else}
    <div class="header-container">
        <h2>Editing: {$mapEditorSelectedEntityStore.getPrefab().name}</h2>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <p on:click|preventDefault={backToSelectObject} class="tw-flex tw-flex-row tw-items-center tw-text-xs tw-m-0">
        <ArrowLeftIcon size="12" class="tw-cursor-pointer" />
        <span class="tw-ml-1 tw-cursor-pointer">{$LL.mapEditor.entityEditor.itemPicker.backToSelectObject()}</span>
    </p>
    <div class="properties-buttons tw-flex tw-flex-row">
        {#if !hasJitsiRoomProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.jitsiProperties.label()}
                descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
                img={visioSvg}
                style="z-index: 8;"
                on:click={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            />
        {/if}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.audioProperties.label()}
            descriptionText={$LL.mapEditor.properties.audioProperties.description()}
            img={audioSvg}
            style="z-index: 7;"
            on:click={() => {
                onAddProperty("playAudio");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.linkProperties.label()}
            descriptionText={$LL.mapEditor.properties.linkProperties.description()}
            img={webSvg}
            style="z-index: 6;"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.klaxoonProperties.label()}
            descriptionText={connectionManager.currentRoom?.klaxoonToolActivated
                ? $LL.mapEditor.properties.klaxoonProperties.description()
                : $LL.mapEditor.properties.klaxoonProperties.disabled()}
            img={klaxoonSvg}
            style="z-index: 4;"
            disabled={!connectionManager.currentRoom?.klaxoonToolActivated}
            on:click={() => {
                onAddProperty("openWebsite", "klaxoon");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.youtubeProperties.label()}
            descriptionText={connectionManager.currentRoom?.youtubeToolActivated
                ? $LL.mapEditor.properties.youtubeProperties.description()
                : $LL.mapEditor.properties.youtubeProperties.disabled()}
            img={youtubeSvg}
            style="z-index: 5;"
            disabled={!connectionManager.currentRoom?.youtubeToolActivated}
            on:click={() => {
                onAddProperty("openWebsite", "youtube");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.googleDocsProperties.label()}
            descriptionText={connectionManager.currentRoom?.googleDocsToolActivated
                ? $LL.mapEditor.properties.googleDocsProperties.description()
                : $LL.mapEditor.properties.googleDocsProperties.disabled()}
            img={googleDocsSvg}
            style="z-index: 3;"
            disabled={!connectionManager.currentRoom?.googleDocsToolActivated}
            on:click={() => {
                onAddProperty("openWebsite", "googleDocs");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.googleSheetsProperties.label()}
            descriptionText={connectionManager.currentRoom?.googleSheetsToolActivated
                ? $LL.mapEditor.properties.googleSheetsProperties.description()
                : $LL.mapEditor.properties.googleSheetsProperties.disabled()}
            img={googleSheetsSvg}
            style="z-index: 2;"
            disabled={!connectionManager.currentRoom?.googleSheetsToolActivated}
            on:click={() => {
                onAddProperty("openWebsite", "googleSheets");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.googleSlidesProperties.label()}
            descriptionText={connectionManager.currentRoom?.googleSlidesToolActivated
                ? $LL.mapEditor.properties.googleSlidesProperties.description()
                : $LL.mapEditor.properties.googleSlidesProperties.disabled()}
            img={googleSlidesSvg}
            style="z-index: 1;"
            disabled={!connectionManager.currentRoom?.googleSlidesToolActivated}
            on:click={() => {
                onAddProperty("openWebsite", "googleSlides");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.eraserProperties.label()}
            descriptionText={connectionManager.currentRoom?.eraserToolActivated
                ? $LL.mapEditor.properties.eraserProperties.description()
                : $LL.mapEditor.properties.eraserProperties.disabled()}
            img={eraserSvg}
            style="z-index: 1;"
            disabled={!connectionManager.currentRoom?.eraserToolActivated}
            on:click={() => {
                onAddProperty("openWebsite", "eraser");
            }}
        />
    </div>
    <div class="entity-name-container">
        <label for="objectName">Object name</label>
        <input id="objectName" type="text" placeholder="Value" bind:value={entityName} on:change={onUpdateName} />
    </div>
    <div class="properties-container">
        {#each properties as property (property.id)}
            <div class="property-box">
                {#if property.type === "jitsiRoomProperty"}
                    <JitsiRoomPropertyEditor
                        {property}
                        on:close={() => {
                            onDeleteProperty(property.id);
                        }}
                        on:change={() => onUpdateProperty(property)}
                    />
                {:else if property.type === "playAudio"}
                    <PlayAudioPropertyEditor
                        {property}
                        on:close={() => {
                            onDeleteProperty(property.id);
                        }}
                        on:change={() => onUpdateProperty(property)}
                    />
                {:else if property.type === "openWebsite"}
                    <OpenWebsitePropertyEditor
                        {property}
                        on:close={() => {
                            onDeleteProperty(property.id);
                        }}
                        on:change={() => onUpdateProperty(property)}
                    />
                {/if}
            </div>
        {/each}
    </div>
{/if}

<style lang="scss">
    .properties-container {
        overflow-y: auto;
        overflow-x: hidden;
    }

    .properties-container::-webkit-scrollbar {
        display: none;
    }

    .property-box {
        margin-top: 5px;
    }

    .entity-name-container {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
