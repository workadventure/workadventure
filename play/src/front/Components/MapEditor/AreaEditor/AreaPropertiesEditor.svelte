<script lang="ts">
    import { onDestroy } from "svelte";
    import {
        AreaDataProperties,
        AreaDataPropertiesKeys,
        AreaDataProperty,
        OpenWebsitePropertyData,
        PersonalAreaAccessClaimMode,
        PlayAudioPropertyData,
    } from "@workadventure/map-editor";
    import { KlaxoonEvent, KlaxoonService } from "@workadventure/shared-utils";
    import { ApplicationDefinitionInterface } from "@workadventure/messages";
    import { v4 as uuid } from "uuid";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";
    import {
        FEATURE_FLAG_BROADCAST_AREAS,
        MATRIX_PUBLIC_URI,
        PUSHER_URL,
        ADMIN_URL,
    } from "../../../Enum/EnvironmentVariable";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import JitsiRoomPropertyEditor from "../PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "../PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "../PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import OpenFilePropertyEditor from "../PropertyEditor/OpenFilePropertyEditor.svelte";
    import FocusablePropertyEditor from "../PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "../PropertyEditor/SilentPropertyEditor.svelte";
    import SpeakerMegaphonePropertyEditor from "../PropertyEditor/SpeakerMegaphonePropertyEditor.svelte";
    import ListenerMegaphonePropertyEditor from "../PropertyEditor/ListenerMegaphonePropertyEditor.svelte";
    import StartPropertyEditor from "../PropertyEditor/StartPropertyEditor.svelte";
    import ExitPropertyEditor from "../PropertyEditor/ExitPropertyEditor.svelte";
    import AddPropertyButtonWrapper from "../PropertyEditor/AddPropertyButtonWrapper.svelte";
    import PersonalAreaPropertyEditor from "../PropertyEditor/PersonalAreaPropertyEditor.svelte";
    import RightsPropertyEditor from "../PropertyEditor/RightsPropertyEditor.svelte";
    import { IconChevronDown, IconChevronRight, IconInfoCircle } from "../../Icons";
    import { extensionModuleStore } from "../../../Stores/GameSceneStore";
    import { ExtensionModule, ExtensionModuleAreaProperty } from "../../../ExternalModule/ExtensionModule";
    import MatrixRoomPropertyEditor from "../PropertyEditor/MatrixRoomPropertyEditor.svelte";
    import TooltipPropertyButton from "../PropertyEditor/TooltipPropertyButton.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import { ON_ACTION_TRIGGER_ENTER } from "../../../WebRtc/LayoutManager";

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
    let hasPersonalAreaProperty: boolean;
    let hasRightsProperty: boolean;
    let hasMatrixRoom: boolean;
    let hasTooltipPropertyData: boolean;

    const ROOM_AREA_PUSHER_URL = new URL("roomArea", PUSHER_URL).toString();

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            properties = structuredClone(currentAreaPreview.getProperties());
            areaName = currentAreaPreview.getAreaData().name;
            const descriptionProperty = $mapEditorSelectedAreaPreviewStore
                ?.getProperties()
                .find((property) => property.type === "areaDescriptionProperties");
            if (descriptionProperty == undefined) {
                $mapEditorSelectedAreaPreviewStore?.addProperty({
                    id: uuid(),
                    type: "areaDescriptionProperties",
                    description: areaDescription,
                    searchable: areaSearchable,
                });
            } else if (descriptionProperty.type === "areaDescriptionProperties") {
                areaDescription = descriptionProperty.description ?? "";
                areaSearchable = descriptionProperty.searchable ?? false;
            }
            refreshFlags();
        }
    });

    function getPropertyFromType(type: AreaDataPropertiesKeys, subtype?: string): AreaDataProperty {
        const id = uuid();
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
                    trigger: ON_ACTION_TRIGGER_ENTER,
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
                    case "excalidraw":
                        placeholder = "https://excalidraw.workadventu.re/";
                        break;
                    case "cards":
                        placeholder =
                            "https://member.workadventu.re/cards?tenant=<your tenant from cards>&learning=<your leaning from cards>";
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
                    allowAPI: false,
                    forceNewTab: false,
                    policy,
                    width: 50,
                    trigger: ON_ACTION_TRIGGER_ENTER,
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
            case "restrictedRightsPropertyData":
                return {
                    id,
                    type,
                    readTags: [],
                    writeTags: [],
                };
            case "personalAreaPropertyData":
                return {
                    id,
                    type,
                    accessClaimMode: PersonalAreaAccessClaimMode.enum.dynamic,
                    allowedTags: [],
                    ownerId: null,
                };
            case "extensionModule":
                if (subtype === undefined) {
                    throw new Error("Missing subtype for extensionModule");
                }
                return {
                    id,
                    type,
                    subtype,
                    data: null,
                };
            case "matrixRoomPropertyData":
                return {
                    id,
                    type,
                    shouldOpenAutomatically: false,
                    displayName: "",
                    resourceUrl: ROOM_AREA_PUSHER_URL,
                    serverData: {
                        matrixRoomId: undefined,
                    },
                };
            case "tooltipPropertyData":
                return {
                    id,
                    type,
                    content: "",
                    duration: 2,
                };
            case "openFile":
                return {
                    id,
                    type,
                    link: "",
                    name: "",
                    closable: true,
                    newTab: false,
                    hideButtonLabel: true,
                    policy,
                    width: 50,
                    trigger: ON_ACTION_TRIGGER_ENTER,
                };
            default:
                throw new Error(`Unknown property type ${type}`);
        }
    }

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });

    function onAddProperty(type: AreaDataPropertiesKeys, subtype?: string) {
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

    function onAddSpecificProperty(app: ApplicationDefinitionInterface) {
        if (!$mapEditorSelectedAreaPreviewStore) return;
        analyticsClient.addMapEditorProperty("entity", app.name);
        const property: OpenWebsitePropertyData = {
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
        $mapEditorSelectedAreaPreviewStore.addProperty(property);

        // refresh properties
        properties = $mapEditorSelectedAreaPreviewStore.getProperties();
        refreshFlags();
    }

    function onDeleteProperty(id: string, removeAreaEntities?: boolean) {
        if ($mapEditorSelectedAreaPreviewStore) {
            analyticsClient.removeMapEditorProperty(
                "area",
                properties.find((property) => property.id === id)?.type || "unknown"
            );
            $mapEditorSelectedAreaPreviewStore.deleteProperty(id, removeAreaEntities);
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

    function onUpdateProperty(property: AreaDataProperty, removeAreaEntities?: boolean) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty(property, removeAreaEntities);
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
        hasPersonalAreaProperty = hasProperty("personalAreaPropertyData");
        hasRightsProperty = hasProperty("restrictedRightsPropertyData");
        hasMatrixRoom = hasProperty("matrixRoomPropertyData");
        hasTooltipPropertyData = hasProperty("tooltipPropertyData");
    }

    function openKlaxoonActivityPicker(app: AreaDataProperty) {
        if (!connectionManager.klaxoonToolClientId || app.type !== "openWebsite" || app.application !== "klaxoon") {
            console.info("openKlaxoonActivityPicker: app is not a klaxoon app");
            return;
        }
        KlaxoonService.openKlaxoonActivityPicker(connectionManager.klaxoonToolClientId, (payload: KlaxoonEvent) => {
            app.link = KlaxoonService.getKlaxoonEmbedUrl(new URL(payload.url), connectionManager.klaxoonToolClientId);
            app.poster = payload.imageUrl ?? undefined;
            app.buttonLabel = payload.title ?? undefined;
            onUpdateProperty(app);
        });
    }

    // Fixme: this is a hack to force the map editor to update the property
    function onUpdateAudioProperty(data: CustomEvent<PlayAudioPropertyData>) {
        onUpdateProperty(data.detail);
    }

    function toggleDescriptionField() {
        showDescriptionField = !showDescriptionField;
    }

    let extensionModulesAreaMapEditor = $extensionModuleStore.reduce(
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

{#if $mapEditorSelectedAreaPreviewStore === undefined}
    {$LL.mapEditor.areaEditor.editInstructions()}
{:else}
    <div class="overflow-x-hidden space-y-3">
        <div class="properties-buttons flex flex-row flex-wrap">
            {#if !hasPersonalAreaProperty && !hasRightsProperty && ADMIN_URL}
                <AddPropertyButtonWrapper
                    property="personalAreaPropertyData"
                    on:click={() => onAddProperty("personalAreaPropertyData")}
                />
            {/if}
            {#if !hasPersonalAreaProperty && !hasRightsProperty}
                <AddPropertyButtonWrapper
                    property="restrictedRightsPropertyData"
                    on:click={() => onAddProperty("restrictedRightsPropertyData")}
                />
            {/if}
        </div>
        <div class="properties-buttons flex flex-row flex-wrap">
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
            {#if !hasMatrixRoom && MATRIX_PUBLIC_URI}
                <AddPropertyButtonWrapper
                    property="matrixRoomPropertyData"
                    on:click={() => {
                        onAddProperty("matrixRoomPropertyData");
                    }}
                />
            {/if}
            {#if !hasTooltipPropertyData}
                <AddPropertyButtonWrapper
                    property="tooltipPropertyData"
                    on:click={() => {
                        onAddProperty("tooltipPropertyData");
                    }}
                />
            {/if}
            <AddPropertyButtonWrapper
                property="openFile"
                on:click={() => {
                    onAddProperty("openFile");
                }}
            />
        </div>
        {#if extensionModulesAreaMapEditor.length > 0}
            <div class="properties-buttons flex flex-row flex-wrap mt-2">
                {#each extensionModulesAreaMapEditor as extensionModuleAreaMapEditor, index (`extensionModulesAreaMapEditor-${index}`)}
                    {#each Object.entries(extensionModuleAreaMapEditor) as [subtype, areaProperty] (`extensionModuleAreaMapEditor-${subtype}`)}
                        {#if areaProperty.shouldDisplayButton(properties)}
                            <AddPropertyButtonWrapper
                                property="extensionModule"
                                subProperty={subtype}
                                on:click={() => {
                                    onAddProperty("extensionModule", subtype);
                                }}
                            />
                        {/if}
                    {/each}
                {/each}
            </div>
        {/if}
        <div class="properties-buttons flex flex-row flex-wrap mt-2">
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
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="cards"
                on:click={() => {
                    onAddProperty("openWebsite", "cards");
                }}
            />
        </div>
        <div class="properties-buttons flex flex-row flex-wrap mt-2">
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

        <Input
            id="objectName"
            label={$LL.mapEditor.areaEditor.nameLabel()}
            type="text"
            placeholder={$LL.mapEditor.areaEditor.nameLabelPlaceholder()}
            bind:value={areaName}
            onChange={onUpdateName}
        />
        <p class="help-text">
            <IconInfoCircle font-size="18" />
            {$LL.mapEditor.areaEditor.nameHelpText()}
        </p>

        <div class="area-name-container">
            {#if !showDescriptionField}
                <button class="ps-0 text-blue-500 flex flex-row items-center " on:click={toggleDescriptionField}>
                    <IconChevronRight />{$LL.mapEditor.areaEditor.addDescriptionField()}</button
                >
            {:else}
                <button class="ps-0 text-blue-500 flex flex-row items-center" on:click={toggleDescriptionField}>
                    <IconChevronDown />{$LL.mapEditor.areaEditor.addDescriptionField()}</button
                >

                <TextArea
                    id="objectDescription"
                    label={$LL.mapEditor.areaEditor.areaDescription()}
                    placeHolder={$LL.mapEditor.areaEditor.areaDescriptionPlaceholder()}
                    bind:value={areaDescription}
                    onChange={onUpdateAreaDescription}
                    onKeyPress={() => {}}
                />
            {/if}
        </div>

        <InputSwitch
            id="searchable"
            label={$LL.mapEditor.areaEditor.areaSerchable()}
            bind:value={areaSearchable}
            onChange={onUpdateAreaSearchable}
        />

        <div class="properties-container">
            {#each properties as property (property.id)}
                <div class="property-box mt-[3rem]">
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
                            isArea={true}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "playAudio"}
                        <PlayAudioPropertyEditor
                            property={{ ...property, hideButtonLabel: true }}
                            isArea={true}
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
                    {:else if property.type === "restrictedRightsPropertyData"}
                        <RightsPropertyEditor
                            restrictedRightsPropertyData={property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "personalAreaPropertyData"}
                        <PersonalAreaPropertyEditor
                            personalAreaPropertyData={property}
                            on:close={({ detail }) => {
                                onDeleteProperty(property.id, detail);
                            }}
                            on:change={({ detail }) => onUpdateProperty(property, detail)}
                        />
                    {:else if property.type === "extensionModule" && extensionModulesAreaMapEditor.length > 0}
                        {#each extensionModulesAreaMapEditor as extensionModuleAreaMapEditor, index (`extensionModulesAreaMapEditor-${index}`)}
                            <svelte:component
                                this={extensionModuleAreaMapEditor[property.subtype].AreaPropertyEditor}
                                {extensionModuleAreaMapEditor}
                                {property}
                                on:close={() => {
                                    onDeleteProperty(property.id);
                                }}
                                on:change={() => onUpdateProperty(property)}
                            />
                        {/each}
                    {:else if property.type === "matrixRoomPropertyData"}
                        <MatrixRoomPropertyEditor
                            {property}
                            on:close={({ detail }) => {
                                onDeleteProperty(property.id, detail);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "tooltipPropertyData"}
                        <TooltipPropertyButton
                            {property}
                            on:close={() => {
                                onDeleteProperty(property.id);
                            }}
                            on:change={() => onUpdateProperty(property)}
                        />
                    {:else if property.type === "openFile"}
                        <OpenFilePropertyEditor
                            {property}
                            isArea={true}
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

    .area-name-container {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;

        * {
            margin-bottom: 0;
        }
    }

    //     .input-switch {
    //         position: relative;
    //         top: 0px;
    //         right: 0px;
    //         bottom: 0px;
    //         left: 0px;
    //         display: inline-block;
    //         height: 1rem;
    //         width: 2rem;
    //         -webkit-appearance: none;
    //         -moz-appearance: none;
    //         appearance: none;
    //         border-radius: 9999px;
    //         border-width: 1px;
    //         border-style: solid;
    //         --border-opacity: 1;
    //         border-color: rgb(77 75 103 / var(--border-opacity));
    //         --bg-opacity: 1;
    //         background-color: rgb(15 31 45 / var(--bg-opacity));
    //         background-image: none;
    //         padding: 0px;
    //         --text-opacity: 1;
    //         color: rgb(242 253 255 / var(--text-opacity));
    //         outline: 2px solid transparent;
    //         outline-offset: 2px;
    //         cursor: url(../../../../../public/static/images/cursor_pointer.png), pointer;
    //     }

    //     .input-switch::before {
    //         position: absolute;
    //         left: -3px;
    //         top: -3px;
    //         height: 1.25rem;
    //         width: 1.25rem;
    //         border-radius: 9999px;
    //         --bg-opacity: 1;
    //         background-color: rgb(146 142 187 / var(--bg-opacity));
    //         transition-property: all;
    //         transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    //         transition-duration: 150ms;
    //         --content: "";
    //         content: var(--content);
    //     }

    //     .input-switch:checked {
    //         --border-opacity: 1;
    //         border-color: rgb(146 142 187 / var(--border-opacity));
    //     }

    //     .input-switch:checked::before {
    //         left: 13px;
    //         top: -3px;
    //         --bg-opacity: 1;
    //         background-color: rgb(65 86 246 / var(--bg-opacity));
    //         content: var(--content);
    //         /*--shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
    // --shadow-colored: 0 0 7px 0 var(--shadow-color);
    // box-shadow: var(--ring-offset-shadow, 0 0 #0000), var(--ring-shadow, 0 0 #0000), var(--shadow);*/
    //     }

    //     .input-switch:disabled {
    //         cursor: not-allowed;
    //         opacity: 0.4;
    //     }
</style>
