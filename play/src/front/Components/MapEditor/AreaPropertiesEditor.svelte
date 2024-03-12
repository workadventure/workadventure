<script lang="ts">
    import { onDestroy } from "svelte";
    import {
        AreaDataProperty,
        AreaDataPropertiesKeys,
        AreaDataProperties,
        OpenWebsiteTypePropertiesKeys,
        PlayAudioPropertyData,
        AreaRightPropertyData,
    } from "@workadventure/map-editor";
    import { KlaxoonEvent, KlaxoonService } from "@workadventure/shared-utils";
    import { InfoIcon } from "svelte-feather-icons";
    import { LL } from "../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import { FEATURE_FLAG_BROADCAST_AREAS } from "../../Enum/EnvironmentVariable";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import InputTags from "../Input/InputTags.svelte";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import FocusablePropertyEditor from "./PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "./PropertyEditor/SilentPropertyEditor.svelte";
    import SpeakerMegaphonePropertyEditor from "./PropertyEditor/SpeakerMegaphonePropertyEditor.svelte";
    import ListenerMegaphonePropertyEditor from "./PropertyEditor/ListenerMegaphonePropertyEditor.svelte";
    import StartPropertyEditor from "./PropertyEditor/StartPropertyEditor.svelte";
    import ExitPropertyEditor from "./PropertyEditor/ExitPropertyEditor.svelte";
    import AddPropertyButtonWrapper from "./PropertyEditor/AddPropertyButtonWrapper.svelte";

    let properties: AreaDataProperties = [];
    let areaName = "";
    let areaDescription = "";
    let areaSearchable = false;
    let hasJitsiRoomProperty: boolean;
    let hasFocusableProperty: boolean;
    let hasSilentProperty: boolean;
    let hasSpeakerMegaphoneProperty: boolean;
    let hasListenerMegaphoneProperty: boolean;
    let hasStartProperty: boolean;
    let hasExitProperty: boolean;
    let hasplayAudioProperty: boolean;
    let showDescriptionField = false;
    let addRights = false;

    type Option = {
        value: string;
        label: string;
        created: undefined | boolean;
    };
    let writeTags: Option[] | undefined = [];
    let readTags: Option[] | undefined = [];
    let _tag: Option[] = [
        {
            value: "member",
            label: "member",
            created: false,
        },
        {
            value: "admin",
            label: "admin",
            created: false,
        },
    ];

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            properties = structuredClone(currentAreaPreview.getProperties());
            areaName = currentAreaPreview.getAreaData().name;
            const descriptionProperty = $mapEditorSelectedAreaPreviewStore
                ?.getProperties()
                .find((property) => property.type === "areaDescriptionProperties");
            if (descriptionProperty == undefined) {
                $mapEditorSelectedAreaPreviewStore?.addProperty({
                    id: crypto.randomUUID(),
                    type: "areaDescriptionProperties",
                    description: areaDescription,
                    searchable: areaSearchable,
                });
            } else if (descriptionProperty.type === "areaDescriptionProperties") {
                areaDescription = descriptionProperty.description ?? "";
                areaSearchable = descriptionProperty.searchable ?? false;
            }

            const rightsProperty = $mapEditorSelectedAreaPreviewStore
                ?.getProperties()
                .find((property) => property.type === "areaRightPropertyData");
            if (rightsProperty == undefined) {
                $mapEditorSelectedAreaPreviewStore?.addProperty({
                    id: crypto.randomUUID(),
                    type: "areaRightPropertyData",
                    writeTags: [],
                    readTags: [],
                    searchable: false,
                });
            } else if (rightsProperty.type === "areaRightPropertyData") {
                writeTags = rightsProperty.writeTags.map((tag) => {
                    return { value: tag, label: tag, created: false };
                });
                readTags = rightsProperty.readTags.map((tag) => {
                    return { value: tag, label: tag, created: false };
                });
            }
            refreshFlags();
        }
    });

    function getPropertyFromType(
        type: AreaDataPropertiesKeys,
        subtype?: OpenWebsiteTypePropertiesKeys
    ): AreaDataProperty {
        const id = crypto.randomUUID();
        let placeholder: string;
        let policy: string | undefined;
        switch (type) {
            case "start":
                return {
                    id,
                    type,
                    isDefault: true,
                };
            case "silent":
                return {
                    id,
                    type,
                    hideButtonLabel: true,
                };
            case "focusable":
                return {
                    id,
                    type,
                    zoom_margin: 0.5,
                    hideButtonLabel: true,
                };
            case "jitsiRoomProperty":
                return {
                    id,
                    type,
                    closable: true,
                    jitsiRoomConfig: {},
                    hideButtonLabel: true,
                    roomName: $LL.mapEditor.properties.jitsiProperties.label(),
                };
            case "openWebsite":
                // TODO refactore and use the same code than EntityPropertiesEditor
                switch (subtype) {
                    case "youtube":
                        placeholder = "https://www.youtube.com/watch?v=Y9ubBWf5w20";
                        policy =
                            "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share;";
                        break;
                    case "klaxoon":
                        placeholder = "https://app.klaxoon.com/";
                        break;
                    case "googleDrive":
                        placeholder = "https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview";
                        break;
                    case "googleDocs":
                        placeholder =
                            "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit";
                        break;
                    case "googleSheets":
                        placeholder =
                            "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit";
                        break;
                    case "googleSlides":
                        placeholder =
                            "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit";
                        break;
                    case "eraser":
                        placeholder = "https://app.eraser.io/workspace/ExSd8Z4wPsaqMMgTN4VU";
                        break;
                    default:
                        placeholder = "https://workadventu.re";
                        break;
                }
                return {
                    id,
                    type,
                    link: "",
                    closable: true,
                    newTab: false,
                    hideButtonLabel: true,
                    application: subtype ?? "website",
                    placeholder,
                    policy,
                };
            case "playAudio":
                return {
                    id,
                    type,
                    hideButtonLabel: true,
                    audioLink: "",
                    volume: 1,
                };
            case "speakerMegaphone":
                return {
                    id,
                    type,
                    name: "",
                    chatEnabled: false,
                };
            case "listenerMegaphone":
                return {
                    id,
                    type,
                    speakerZoneName: "",
                    chatEnabled: false,
                };
            case "exit":
                return {
                    id,
                    type,
                    url: "",
                    areaName: "",
                };
            default:
                throw new Error(`Unknown property type ${type}`);
        }
    }

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });

    function onAddProperty(type: AreaDataPropertiesKeys, subtype?: OpenWebsiteTypePropertiesKeys) {
        if ($mapEditorSelectedAreaPreviewStore) {
            analyticsClient.addMapEditorProperty("area", type || "unknown");
            const property = getPropertyFromType(type, subtype);
            $mapEditorSelectedAreaPreviewStore.addProperty(property);

            // if klaxoon, open Activity Picker
            if (subtype === "klaxoon") {
                openKlaxoonActivityPicker(property);
            }

            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore.getProperties();
            refreshFlags();
        }
    }

    function onDeleteProperty(id: string) {
        if ($mapEditorSelectedAreaPreviewStore) {
            analyticsClient.removeMapEditorProperty(
                "area",
                properties.find((property) => property.id === id)?.type || "unknown"
            );
            $mapEditorSelectedAreaPreviewStore.deleteProperty(id);
            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore.getProperties();
            refreshFlags();
        }
    }

    function onUpdateName() {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.setAreaName(areaName);
        }
    }

    function onUpdateAreaDescription() {
        let properties = $mapEditorSelectedAreaPreviewStore
            ?.getProperties()
            .find((p) => p.type === "areaDescriptionProperties");
        if (!properties || (properties && properties.type !== "areaDescriptionProperties"))
            throw new Error("Wrong property type");

        properties.description = areaDescription;
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty(properties);
        }
    }

    function onUpdateAreaSearchable() {
        let properties = $mapEditorSelectedAreaPreviewStore
            ?.getProperties()
            .find((p) => p.type === "areaDescriptionProperties");
        if (!properties || (properties && properties.type !== "areaDescriptionProperties"))
            throw new Error("Wrong property type");

        properties.searchable = areaSearchable;
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty(properties);
        }
    }

    function onUpdateProperty(property: AreaDataProperty) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty(property);
        }
    }

    function hasProperty(propertyType: AreaDataPropertiesKeys): boolean {
        return properties.find((property) => property.type === propertyType) !== undefined;
    }

    function refreshFlags(): void {
        hasJitsiRoomProperty = hasProperty("jitsiRoomProperty");
        hasFocusableProperty = hasProperty("focusable");
        hasSilentProperty = hasProperty("silent");
        hasSpeakerMegaphoneProperty = hasProperty("speakerMegaphone");
        hasListenerMegaphoneProperty = hasProperty("listenerMegaphone");
        hasStartProperty = hasProperty("start");
        hasExitProperty = hasProperty("exit");
        hasplayAudioProperty = hasProperty("playAudio");
    }

    function openKlaxoonActivityPicker(app: AreaDataProperty) {
        if (
            !connectionManager.currentRoom?.klaxoonToolClientId ||
            app.type !== "openWebsite" ||
            app.application !== "klaxoon"
        ) {
            console.info("openKlaxoonActivityPicker: app is not a klaxoon app");
            return;
        }
        KlaxoonService.openKlaxoonActivityPicker(
            connectionManager.currentRoom?.klaxoonToolClientId,
            (payload: KlaxoonEvent) => {
                app.link = KlaxoonService.getKlaxoonEmbedUrl(
                    new URL(payload.url),
                    connectionManager.currentRoom?.klaxoonToolClientId
                );
                app.poster = payload.imageUrl ?? undefined;
                app.buttonLabel = payload.title ?? undefined;
                onUpdateProperty(app);
            }
        );
    }

    // Fixme: this is a hack to force the map editor to update the property
    function onUpdateAudioProperty(data: CustomEvent<PlayAudioPropertyData>) {
        onUpdateProperty(data.detail);
    }

    function toggleDescriptionField() {
        showDescriptionField = !showDescriptionField;
    }

    function toggleRight() {
        addRights = !addRights;
    }

    function onChangeWriteReadTags() {
        let areaRightProperties = $mapEditorSelectedAreaPreviewStore
            ?.getProperties()
            .find((p) => p.type === "areaRightPropertyData");
        if (!areaRightProperties || (areaRightProperties && areaRightProperties.type !== "areaRightPropertyData")) {
            areaRightProperties = {
                id: crypto.randomUUID(),
                type: "areaRightPropertyData",
                readTags: [],
                writeTags: [],
                searchable: false,
            } as AreaRightPropertyData;
            $mapEditorSelectedAreaPreviewStore?.addProperty(areaRightProperties);
        }

        areaRightProperties.readTags = readTags?.map((tag) => tag.value) ?? [];
        areaRightProperties.writeTags = writeTags?.map((tag) => tag.value) ?? [];
        $mapEditorSelectedAreaPreviewStore?.updateProperty(areaRightProperties);
    }
</script>

{#if $mapEditorSelectedAreaPreviewStore === undefined}
    {$LL.mapEditor.areaEditor.editInstructions()}
{:else}
    <div class="tw-overflow-auto">
        <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
            {#if !hasFocusableProperty}
                <AddPropertyButtonWrapper
                    property="focusable"
                    on:click={() => {
                        onAddProperty("focusable");
                    }}
                />
            {/if}
            {#if !hasSilentProperty}
                <AddPropertyButtonWrapper
                    property="silent"
                    on:click={() => {
                        onAddProperty("silent");
                    }}
                />
            {/if}
            {#if !hasJitsiRoomProperty}
                <AddPropertyButtonWrapper
                    property="jitsiRoomProperty"
                    on:click={() => {
                        onAddProperty("jitsiRoomProperty");
                    }}
                />
            {/if}
            {#if FEATURE_FLAG_BROADCAST_AREAS}
                {#if !hasSpeakerMegaphoneProperty}
                    <AddPropertyButtonWrapper
                        property="speakerMegaphone"
                        on:click={() => {
                            onAddProperty("speakerMegaphone");
                        }}
                    />
                {/if}
                {#if !hasListenerMegaphoneProperty}
                    <AddPropertyButtonWrapper
                        property="listenerMegaphone"
                        on:click={() => {
                            onAddProperty("listenerMegaphone");
                        }}
                    />
                {/if}
            {/if}
            {#if !hasStartProperty}
                <AddPropertyButtonWrapper
                    property="start"
                    on:click={() => {
                        onAddProperty("start");
                    }}
                />
            {/if}
            {#if !hasExitProperty}
                <AddPropertyButtonWrapper
                    property="exit"
                    on:click={() => {
                        onAddProperty("exit");
                    }}
                />
            {/if}
            {#if !hasplayAudioProperty}
                <AddPropertyButtonWrapper
                    property="playAudio"
                    on:click={() => {
                        onAddProperty("playAudio");
                    }}
                />
            {/if}
            <AddPropertyButtonWrapper
                property="openWebsite"
                on:click={() => {
                    onAddProperty("openWebsite");
                }}
            />
        </div>
        <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
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
        </div>
        <div class="area-name-container">
            <label for="objectName">{$LL.mapEditor.areaEditor.nameLabel()}</label>
            <input
                id="objectName"
                type="text"
                placeholder={$LL.mapEditor.areaEditor.nameLabelPlaceholder()}
                bind:value={areaName}
                on:change={onUpdateName}
            />
        </div>
        <div class="area-name-container">
            {#if !showDescriptionField}
                <a href="#addDescriptionField" on:click|preventDefault|stopPropagation={toggleDescriptionField}
                    >+ {$LL.mapEditor.areaEditor.addDescriptionField()}</a
                >
            {:else}
                <a href="#addDescriptionField" on:click|preventDefault|stopPropagation={toggleDescriptionField}
                    >- {$LL.mapEditor.areaEditor.addDescriptionField()}</a
                >
                <label for="objectDescription">{$LL.mapEditor.areaEditor.areaDescription()}</label>
                <textarea
                    id="objectDescription"
                    placeholder={$LL.mapEditor.areaEditor.areaDescriptionPlaceholder()}
                    bind:value={areaDescription}
                    on:change={onUpdateAreaDescription}
                />
            {/if}
        </div>
        <div class="value-switch">
            <label for="searchable">{$LL.mapEditor.areaEditor.areaSerchable()}</label>
            <input
                id="searchable"
                type="checkbox"
                class="input-switch"
                bind:checked={areaSearchable}
                on:change={onUpdateAreaSearchable}
            />
        </div>
        <div class="properties-container">
            {#if !addRights}
                <a href="#toggleRight" on:click|preventDefault|stopPropagation={toggleRight} data-testid="addRights"
                    >+ {$LL.mapEditor.areaEditor.addRight()} ({(writeTags?.length ?? 0) + (readTags?.length ?? 0)})</a
                >
            {:else}
                <a href="#toggleRight" class="tw-cursor-pointer" on:click|preventDefault|stopPropagation={toggleRight}
                    >- {$LL.mapEditor.areaEditor.rightTitle()}</a
                >
                <p class="help-text"><InfoIcon size="18" /> {$LL.mapEditor.areaEditor.rightWriteDescription()}</p>
                <InputTags
                    label={$LL.mapEditor.areaEditor.rightWriteTitle()}
                    options={_tag}
                    bind:value={writeTags}
                    handleChange={onChangeWriteReadTags}
                    testId="writeTags"
                />
                <p class="help-text"><InfoIcon size="18" /> {$LL.mapEditor.areaEditor.rightReadDescription()}</p>
                <InputTags
                    label={$LL.mapEditor.areaEditor.rightReadTitle()}
                    options={_tag}
                    bind:value={readTags}
                    handleChange={onChangeWriteReadTags}
                    testId="readTags"
                />
                {#if writeTags != undefined && writeTags.length > 0}
                    <div class="tw-flex tw-flex-wrap tw-gap-1">
                        {#each writeTags as tag, index (`${index}-${tag.value}`)}
                            <span class="tw-py-1 tw-px-2 tw-bg-gray-400 tw-text-black tw-rounded-lg">{tag.label}</span>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
        <div class="properties-container">
            {#each properties as property (property.id)}
                <div class="property-box">
                    {#if property.type === "focusable"}
                        <FocusablePropertyEditor
                            {property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "silent"}
                        <SilentPropertyEditor
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "jitsiRoomProperty"}
                        <JitsiRoomPropertyEditor
                            {property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "playAudio"}
                        <PlayAudioPropertyEditor
                            property={{ ...property, hideButtonLabel: true }}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:audioLink={onUpdateAudioProperty}
                        />
                    {:else if property.type === "openWebsite"}
                        <OpenWebsitePropertyEditor
                            {property}
                            isArea={true}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "speakerMegaphone"}
                        <SpeakerMegaphonePropertyEditor
                            {property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "listenerMegaphone"}
                        <ListenerMegaphonePropertyEditor
                            {property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "start"}
                        <StartPropertyEditor
                            {property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "exit"}
                        <ExitPropertyEditor
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
    </div>
{/if}

<style lang="scss">
    .properties-container {
        overflow-y: auto;
        overflow-x: hidden;
    }

    .property-box {
        margin-top: 5px;
    }

    .properties-container::-webkit-scrollbar {
        display: none;
    }

    .area-name-container {
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
