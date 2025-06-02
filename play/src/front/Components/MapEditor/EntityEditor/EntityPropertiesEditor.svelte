<script lang="ts">
    import { EntityDataProperties, EntityDataPropertiesKeys, EntityDataProperty } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import { ApplicationDefinitionInterface } from "@workadventure/messages";
    import { v4 as uuid } from "uuid";
    import {
        mapEditorEntityModeStore,
        mapEditorSelectedEntityPrefabStore,
        mapEditorSelectedEntityStore,
    } from "../../../Stores/MapEditorStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import LL from "../../../../i18n/i18n-svelte";
    import AddPropertyButtonWrapper from "../PropertyEditor/AddPropertyButtonWrapper.svelte";
    import JitsiRoomPropertyEditor from "../PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "../PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "../PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { IconChevronDown, IconArrowLeft } from "../../Icons";
    import Input from "../../Input/Input.svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";

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
                    id: uuid(),
                    type: "entityDescriptionProperties",
                    description: "",
                    searchable: false,
                });
            } else {
                entityDescription = descriptionProperty.description ?? "";
                entitySearchable = descriptionProperty.searchable ?? false;
            }
        }
    });

    function onAddProperty(type: EntityDataPropertiesKeys, subtype?: string) {
        if ($mapEditorSelectedEntityStore) {
            analyticsClient.addMapEditorProperty("entity", type || "unknown");
            const property = getPropertyFromType(type, subtype);
            $mapEditorSelectedEntityStore.addProperty(property);

            // refresh properties
            properties = $mapEditorSelectedEntityStore?.getProperties();
            refreshFlags();
        }
    }

    function onAddSpecificProperty(app: ApplicationDefinitionInterface) {
        if (!$mapEditorSelectedEntityStore) return;
        analyticsClient.addMapEditorProperty("entity", app.name);
        const property: EntityDataProperty = {
            id: uuid(),
            type: "openWebsite",
            application: app.name,
            closable: true,
            buttonLabel: app.name,
            link: "",
            newTab: false,
            placeholder: app.description,
            label: app.name,
            policy: app.policy,
            icon: app.image,
            regexUrl: app.regexUrl,
            targetEmbedableUrl: app.targetUrl,
            forceNewTab: app.forceNewTab,
            allowAPI: app.allowAPI,
        };
        $mapEditorSelectedEntityStore.addProperty(property);

        // refresh properties
        properties = $mapEditorSelectedEntityStore?.getProperties();
        refreshFlags();
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

    function getPropertyFromType(type: EntityDataPropertiesKeys, subtype?: string): EntityDataProperty {
        const id = uuid();
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
                    case "excalidraw":
                        placeholder = "https://excalidraw.workadventu.re/";
                        buttonLabel = $LL.mapEditor.properties.excalidrawProperties.label();
                        break;
                    case "cards":
                        placeholder =
                            "https://member.workadventu.re?tenant=<your cards tenant>&learning=<Your cards learning>";
                        buttonLabel = $LL.mapEditor.properties.cardsProperties.label();
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
                    forceNewTab: false,
                    allowAPI: false,
                    policy,
                    width: 50,
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
    <div class="overflow-x-hidden overflow-y-auto">
        <div class="header-container">
            <h3>{$LL.mapEditor.entityEditor.editing({ name: $mapEditorSelectedEntityStore.getPrefab().name })}</h3>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <p on:click|preventDefault={backToSelectObject} class="flex flex-row items-center text-xs m-0">
            <IconArrowLeft font-size="12" class="cursor-pointer" />
            <span class="ml-1 cursor-pointer">{$LL.mapEditor.entityEditor.itemPicker.backToSelectObject()}</span>
        </p>
        <div class="properties-buttons flex flex-row">
            {#if !hasJitsiRoomProperty}
                <AddPropertyButtonWrapper
                    property="jitsiRoomProperty"
                    on:click={() => {
                        onAddProperty("jitsiRoomProperty");
                    }}
                />
            {/if}
            <AddPropertyButtonWrapper
                property="playAudio"
                on:click={() => {
                    onAddProperty("playAudio");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                on:click={() => {
                    onAddProperty("openWebsite");
                }}
            />
        </div>
        <div class="properties-buttons flex flex-row flex-wrap m-2">
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="klaxoon"
                on:click={() => {
                    onAddProperty("openWebsite", "klaxoon");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="youtube"
                on:click={() => {
                    onAddProperty("openWebsite", "youtube");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleDrive"
                on:click={() => {
                    onAddProperty("openWebsite", "googleDrive");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleDocs"
                on:click={() => {
                    onAddProperty("openWebsite", "googleDocs");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleSheets"
                on:click={() => {
                    onAddProperty("openWebsite", "googleSheets");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleSlides"
                on:click={() => {
                    onAddProperty("openWebsite", "googleSlides");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="eraser"
                on:click={() => {
                    onAddProperty("openWebsite", "eraser");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="excalidraw"
                on:click={() => {
                    onAddProperty("openWebsite", "excalidraw");
                }}
            />
        </div>
        <div class="properties-buttons flex flex-row flex-wrap m-2">
            {#each connectionManager.applications as app, index (`my-own-app-${index}`)}
                <AddPropertyButtonWrapper
                    property="openWebsite"
                    subProperty={app.name}
                    on:click={() => {
                        onAddSpecificProperty(app);
                    }}
                />
            {/each}
        </div>
        <div class="entity-name-container">
            <Input
                id="objectName"
                label={$LL.mapEditor.entityEditor.objectName()}
                type="text"
                placeholder={$LL.mapEditor.entityEditor.objectNamePlaceholder()}
                bind:value={entityName}
                onChange={onUpdateName}
            />
        </div>
        <div class="entity-name-container">
            {#if !showDescriptionField}
                <a
                    href="#addDescriptionField"
                    class="pl-0 text-blue-500 flex flex-row items-center"
                    on:click|preventDefault|stopPropagation={toggleDescriptionField}
                    >+ {$LL.mapEditor.entityEditor.addDescriptionField()}</a
                >
            {:else}
                <button class="pl-0 text-blue-500 flex flex-row items-center" on:click={toggleDescriptionField}>
                    <IconChevronDown />{$LL.mapEditor.entityEditor.addDescriptionField()}</button
                >

                <TextArea
                    label={$LL.mapEditor.entityEditor.objectDescription()}
                    id="objectDescription"
                    placeHolder={$LL.mapEditor.entityEditor.objectDescriptionPlaceholder()}
                    bind:value={entityDescription}
                    on:change={onUpdateDescription}
                    onKeyPress={() => {}}
                />
            {/if}
        </div>

        <InputSwitch
            label={$LL.mapEditor.entityEditor.objectSearchable()}
            id="searchable"
            bind:value={entitySearchable}
            onChange={onUpdateSearchable}
        />

        <div class="properties-container">
            {#each properties as property (property.id)}
                <div class="property-box">
                    {#if property.type === "jitsiRoomProperty"}
                        <JitsiRoomPropertyEditor
                            {property}
                            triggerOptionActivated={false}
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
                            triggerOptionActivated={false}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {/if}
                </div>
            {/each}
        </div>
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

    // .input-switch {
    //     position: relative;
    //     top: 0px;
    //     right: 0px;
    //     bottom: 0px;
    //     left: 0px;
    //     display: inline-block;
    //     height: 1rem;
    //     width: 2rem;
    //     -webkit-appearance: none;
    //     -moz-appearance: none;
    //     appearance: none;
    //     border-radius: 9999px;
    //     border-width: 1px;
    //     border-style: solid;
    //     --border-opacity: 1;
    //     border-color: rgb(77 75 103 / var(--border-opacity));
    //     --bg-opacity: 1;
    //     background-color: rgb(15 31 45 / var(--bg-opacity));
    //     background-image: none;
    //     padding: 0px;
    //     --text-opacity: 1;
    //     color: rgb(242 253 255 / var(--text-opacity));
    //     outline: 2px solid transparent;
    //     outline-offset: 2px;
    //     cursor: url(../../../../../public/static/images/cursor_pointer.png), pointer;
    // }

    // .input-switch::before {
    //     position: absolute;
    //     left: -3px;
    //     top: -3px;
    //     height: 1.25rem;
    //     width: 1.25rem;
    //     border-radius: 9999px;
    //     --bg-opacity: 1;
    //     background-color: rgb(146 142 187 / var(--bg-opacity));
    //     transition-property: all;
    //     transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    //     transition-duration: 150ms;
    //     --content: "";
    //     content: var(--content);
    // }

    // .input-switch:checked {
    //     --border-opacity: 1;
    //     border-color: rgb(146 142 187 / var(--border-opacity));
    // }

    // .input-switch:checked::before {
    //     left: 13px;
    //     top: -3px;
    //     --bg-opacity: 1;
    //     background-color: rgb(65 86 246 / var(--bg-opacity));
    //     content: var(--content);
    //     /*--shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
    //     --shadow-colored: 0 0 7px 0 var(--shadow-color);
    //     box-shadow: var(--ring-offset-shadow, 0 0 #0000), var(--ring-shadow, 0 0 #0000), var(--shadow);*/
    // }

    // .input-switch:disabled {
    //     cursor: not-allowed;
    //     opacity: 0.4;
    // }
</style>
