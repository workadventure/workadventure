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
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import ListAddPropertyButton from "./PropertyEditor/ListAddPropertyButton.svelte";

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
                    case "googleDrive":
                        placeholder = "https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview";
                        buttonLabel = $LL.mapEditor.properties.googleDriveProperties.label();
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
            <ListAddPropertyButton
                property="jitsiRoomProperty"
                on:click={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            />
        {/if}
        <ListAddPropertyButton
            property="playAudio"
            on:click={() => {
                onAddProperty("playAudio");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="klaxoon"
            on:click={() => {
                onAddProperty("openWebsite", "klaxoon");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="youtube"
            on:click={() => {
                onAddProperty("openWebsite", "youtube");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="googleDrive"
            on:click={() => {
                onAddProperty("openWebsite", "googleDrive");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="googleDocs"
            on:click={() => {
                onAddProperty("openWebsite", "googleDocs");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="googleSheets"
            on:click={() => {
                onAddProperty("openWebsite", "googleSheets");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="googleSlides"
            on:click={() => {
                onAddProperty("openWebsite", "googleSlides");
            }}
        />
        <ListAddPropertyButton
            property="openWebsite"
            subProperty="eraser"
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
