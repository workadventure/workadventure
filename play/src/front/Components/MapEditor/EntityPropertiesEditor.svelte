<script lang="ts">
    import { onDestroy } from "svelte";
    import {
        EntityDataProperties,
        EntityDataPropertiesKeys,
        EntityDataProperty,
        EntityDescriptionPropertyData,
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
    import AddPropertyButtonWrapper from "./PropertyEditor/AddPropertyButtonWrapper.svelte";

    let properties: EntityDataProperties = [];
    let entityName = "";
    let entityDescription = "";
    let entitySearchable = false;
    let hasJitsiRoomProperty: boolean;
    let showDescriptionField = false;

    let selectedEntityUnsubscriber = mapEditorSelectedEntityStore.subscribe((currentEntity) => {
        if (currentEntity) {
            currentEntity.setEditColor(0x00ffff);
            properties = currentEntity.getProperties() ?? [];
            entityName = currentEntity.getEntityData().name ?? "";
            const descriptionProperty = properties.find((p) => p.type === "entityDescriptionProperties");
            if (!descriptionProperty) {
                $mapEditorSelectedEntityStore?.addProperty({
                    id: crypto.randomUUID(),
                    type: "entityDescriptionProperties",
                    description: "",
                    searchable: false,
                });
            } else {
                entityDescription = (descriptionProperty as EntityDescriptionPropertyData).description ?? "";
                entitySearchable = (descriptionProperty as EntityDescriptionPropertyData).searchable ?? false;
            }
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

    function onUpdateDescription() {
        let properties = $mapEditorSelectedEntityStore
            ?.getProperties()
            .find((p) => p.type === "entityDescriptionProperties");
        if (!properties || (properties && properties.type !== "entityDescriptionProperties"))
            throw new Error("Wrong property type");

        properties.description = entityDescription;
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.updateProperty(properties);
        }
    }

    function onUpdateSearchable() {
        let properties = $mapEditorSelectedEntityStore
            ?.getProperties()
            .find((p) => p.type === "entityDescriptionProperties");
        if (!properties || (properties && properties.type !== "entityDescriptionProperties"))
            throw new Error("Wrong property type");

        properties.searchable = entitySearchable;
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.updateProperty(properties);
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

    function toggleDescriptionField() {
        showDescriptionField = !showDescriptionField;
    }
</script>

{#if $mapEditorSelectedEntityStore === undefined}
    {$LL.mapEditor.entityEditor.editInstructions()}
{:else}
    <div class="header-container">
        <h3>{$LL.mapEditor.entityEditor.editing({ name: $mapEditorSelectedEntityStore.getPrefab().name })}</h3>
    </div>

    <p on:pointerdown|preventDefault={backToSelectObject} class="tw-flex tw-flex-row tw-items-center tw-text-xs tw-m-0">
        <ArrowLeftIcon size="12" class="tw-cursor-pointer" />
        <span class="tw-ml-1 tw-cursor-pointer">{$LL.mapEditor.entityEditor.itemPicker.backToSelectObject()}</span>
    </p>
    <div class="properties-buttons tw-flex tw-flex-row">
        {#if !hasJitsiRoomProperty}
            <AddPropertyButtonWrapper
                property="jitsiRoomProperty"
                on:pointerdown={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            />
        {/if}
        <AddPropertyButtonWrapper
            property="playAudio"
            on:pointerdown={() => {
                onAddProperty("playAudio");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            on:pointerdown={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="klaxoon"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "klaxoon");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="youtube"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "youtube");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="googleDrive"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "googleDrive");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="googleDocs"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "googleDocs");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="googleSheets"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "googleSheets");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="googleSlides"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "googleSlides");
            }}
        />
        <AddPropertyButtonWrapper
            property="openWebsite"
            subProperty="eraser"
            on:pointerdown={() => {
                onAddProperty("openWebsite", "eraser");
            }}
        />
    </div>
    <div class="entity-name-container">
        <label for="objectName">{$LL.mapEditor.entityEditor.objectName()}</label>
        <input
            id="objectName"
            type="text"
            placeholder={$LL.mapEditor.entityEditor.objectNamePlaceholder()}
            bind:value={entityName}
            on:change={onUpdateName}
        />
    </div>
    <div class="entity-name-container">
        {#if !showDescriptionField}
            <a href="#addDescriptionField" on:pointerdown|preventDefault|stopPropagation={toggleDescriptionField}
                >+ {$LL.mapEditor.entityEditor.addDescriptionField()}</a
            >
        {:else}
            <label for="objectDescription">{$LL.mapEditor.entityEditor.objectDescription()}</label>
            <textarea
                id="objectDescription"
                placeholder={$LL.mapEditor.entityEditor.objectDescriptionPlaceholder()}
                bind:value={entityDescription}
                on:change={onUpdateDescription}
            />
        {/if}
    </div>
    <div class="value-switch">
        <label for="searchable">{$LL.mapEditor.entityEditor.objectSearchable()}</label>
        <input
            id="searchable"
            type="checkbox"
            class="input-switch"
            bind:checked={entitySearchable}
            on:change={onUpdateSearchable}
        />
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

    .input-switch {
        position: relative;
        top: 0px;
        right: 0px;
        bottom: 0px;
        left: 0px;
        display: inline-block;
        height: 1rem;
        width: 2rem;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        border-radius: 9999px;
        border-width: 1px;
        border-style: solid;
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(15 31 45 / var(--tw-bg-opacity));
        background-image: none;
        padding: 0px;
        --tw-text-opacity: 1;
        color: rgb(242 253 255 / var(--tw-text-opacity));
        outline: 2px solid transparent;
        outline-offset: 2px;
        cursor: url(/src/front/style/images/cursor_pointer.png), pointer;
    }

    .input-switch::before {
        position: absolute;
        left: -3px;
        top: -3px;
        height: 1.25rem;
        width: 1.25rem;
        border-radius: 9999px;
        --tw-bg-opacity: 1;
        background-color: rgb(146 142 187 / var(--tw-bg-opacity));
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 150ms;
        --tw-content: "";
        content: var(--tw-content);
    }

    .input-switch:checked {
        --tw-border-opacity: 1;
        border-color: rgb(146 142 187 / var(--tw-border-opacity));
    }

    .input-switch:checked::before {
        left: 13px;
        top: -3px;
        --tw-bg-opacity: 1;
        background-color: rgb(65 86 246 / var(--tw-bg-opacity));
        content: var(--tw-content);
        /*--tw-shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
        --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);*/
    }

    .input-switch:disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }
</style>
