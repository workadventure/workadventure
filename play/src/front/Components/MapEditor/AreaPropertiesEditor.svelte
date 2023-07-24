<script lang="ts">
    import { onDestroy } from "svelte";
    import {
        AreaDataProperty,
        AreaDataPropertiesKeys,
        AreaDataProperties,
        OpenWebsiteTypePropertiesKeys,
    } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import audioSvg from "../images/audio-white.svg";
    import {
        FEATURE_FLAG_BROADCAST_AREAS,
        GOOGLE_DOCS_ENABLED,
        KLAXOON_ENABLED,
        YOUTUBE_ENABLED,
        GOOGLE_SHEETS_ENABLED,
        GOOGLE_SLIDES_ENABLED,
    } from "../../Enum/EnvironmentVariable";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import FocusablePropertyEditor from "./PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "./PropertyEditor/SilentPropertyEditor.svelte";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";
    import SpeakerMegaphonePropertyEditor from "./PropertyEditor/SpeakerMegaphonePropertyEditor.svelte";
    import ListenerMegaphonePropertyEditor from "./PropertyEditor/ListenerMegaphonePropertyEditor.svelte";
    import StartPropertyEditor from "./PropertyEditor/StartPropertyEditor.svelte";
    import ExitPropertyEditor from "./PropertyEditor/ExitPropertyEditor.svelte";

    let properties: AreaDataProperties = [];
    let areaName = "";
    let hasJitsiRoomProperty: boolean;
    let hasFocusableProperty: boolean;
    let hasSilentProperty: boolean;
    let hasSpeakerMegaphoneProperty: boolean;
    let hasListenerMegaphoneProperty: boolean;
    let hasStartProperty: boolean;
    let hasExitProperty: boolean;
    let hasplayAudioProperty: boolean;

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            properties = currentAreaPreview.getProperties() ?? [];
            areaName = currentAreaPreview.getAreaData().name;
            refreshFlags();
        }
    });

    function getPropertyFromType(
        type: AreaDataPropertiesKeys,
        subtype?: OpenWebsiteTypePropertiesKeys
    ): AreaDataProperty {
        const id = crypto.randomUUID();
        let link: string;
        switch (type) {
            case "start":
                return {
                    id,
                    type,
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
                        link = "https://www.youtube.com/watch?v=Y9ubBWf5w20";
                        break;
                    case "klaxoon":
                        link = "https://klaxoon.com/";
                        break;
                    case "googleDocs":
                        link = "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit";
                        break;
                    case "googleSheets":
                        link =
                            "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit";
                        break;
                    case "googleSlides":
                        link =
                            "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit";
                        break;
                    default:
                        link = "https://workadventu.re";
                        break;
                }
                return {
                    id,
                    type,
                    link,
                    closable: true,
                    newTab: false,
                    hideButtonLabel: true,
                    application: subtype ?? "website",
                };
            case "playAudio":
                return {
                    id,
                    type,
                    audioLink: "",
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
            $mapEditorSelectedAreaPreviewStore.addProperty(getPropertyFromType(type, subtype));

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
</script>

{#if $mapEditorSelectedAreaPreviewStore === undefined}
    {$LL.mapEditor.areaEditor.editInstructions()}
{:else}
    <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
        {#if !hasFocusableProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.focusableProperties.label()}
                descriptionText={$LL.mapEditor.properties.focusableProperties.description()}
                img={"resources/icons/icon_focus.png"}
                style="z-index: 14;"
                on:click={() => {
                    onAddProperty("focusable");
                }}
            />
        {/if}
        {#if !hasSilentProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.silentProperty.label()}
                descriptionText={$LL.mapEditor.properties.silentProperty.description()}
                img={"resources/icons/icon_silent.png"}
                style="z-index: 13;"
                on:click={() => {
                    onAddProperty("silent");
                }}
            />
        {/if}
        {#if !hasJitsiRoomProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.jitsiProperties.label()}
                descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
                img={"resources/icons/icon_meeting.png"}
                style="z-index: 12;"
                on:click={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            />
        {/if}
        {#if FEATURE_FLAG_BROADCAST_AREAS}
            {#if !hasSpeakerMegaphoneProperty}
                <AddPropertyButton
                    headerText={$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
                    descriptionText={$LL.mapEditor.properties.speakerMegaphoneProperties.description()}
                    img={"resources/icons/icon_speaker.png"}
                    style="z-index: 11;"
                    on:click={() => {
                        onAddProperty("speakerMegaphone");
                    }}
                />
            {/if}
            {#if !hasListenerMegaphoneProperty}
                <AddPropertyButton
                    headerText={$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
                    descriptionText={$LL.mapEditor.properties.listenerMegaphoneProperties.description()}
                    img={"resources/icons/icon_listener.png"}
                    style="z-index: 10;"
                    on:click={() => {
                        onAddProperty("listenerMegaphone");
                    }}
                />
            {/if}
        {/if}
        {#if !hasStartProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.startProperties.label()}
                descriptionText={$LL.mapEditor.properties.startProperties.description()}
                img={"resources/icons/icon_start.png"}
                style="z-index: 9;"
                on:click={() => {
                    onAddProperty("start");
                }}
            />
        {/if}
        {#if !hasExitProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.exitProperties.label()}
                descriptionText={$LL.mapEditor.properties.exitProperties.description()}
                img={"resources/icons/icon_exit.png"}
                style="z-index: 8;"
                on:click={() => {
                    onAddProperty("exit");
                }}
            />
        {/if}
        {#if !hasplayAudioProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.audioProperties.label()}
                descriptionText={$LL.mapEditor.properties.audioProperties.description()}
                img={audioSvg}
                style="z-index: 7;"
                on:click={() => {
                    onAddProperty("playAudio");
                }}
            />
        {/if}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.linkProperties.label()}
            descriptionText={$LL.mapEditor.properties.linkProperties.description()}
            img={"resources/icons/icon_link.png"}
            style="z-index: 6;"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="properties-buttons tw-flex tw-flex-row tw-flex-wrap">
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.youtubeProperties.label()}
            descriptionText={$LL.mapEditor.properties.youtubeProperties.description()}
            img={"resources/icons/applications/icon_youtube.svg"}
            style="z-index: 5;"
            disabled={!YOUTUBE_ENABLED}
            on:click={() => {
                onAddProperty("openWebsite", "youtube");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.klaxoonProperties.label()}
            descriptionText={$LL.mapEditor.properties.klaxoonProperties.description()}
            img={"resources/icons/applications/icon_klaxoon.svg"}
            style="z-index: 4;"
            disabled={!KLAXOON_ENABLED}
            on:click={() => {
                onAddProperty("openWebsite", "klaxoon");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.googleDocsProperties.label()}
            descriptionText={$LL.mapEditor.properties.googleDocsProperties.description()}
            img={"resources/icons/applications/icon_google_docs.svg"}
            style="z-index: 3;"
            disabled={!GOOGLE_DOCS_ENABLED}
            on:click={() => {
                onAddProperty("openWebsite", "googleDocs");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.googleSheetsProperties.label()}
            descriptionText={$LL.mapEditor.properties.googleSheetsProperties.description()}
            img={"resources/icons/applications/icon_google_sheets.svg"}
            style="z-index: 2;"
            disabled={!GOOGLE_SHEETS_ENABLED}
            on:click={() => {
                onAddProperty("openWebsite", "googleSheets");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.googleSlidesProperties.label()}
            descriptionText={$LL.mapEditor.properties.googleSlidesProperties.description()}
            img={"resources/icons/applications/icon_google_slides.svg"}
            style="z-index: 1;"
            disabled={!GOOGLE_SLIDES_ENABLED}
            on:click={() => {
                onAddProperty("openWebsite", "googleSlides");
            }}
        />
    </div>
    <div class="area-name-container">
        <label for="objectName">Area name</label>
        <input id="objectName" type="text" placeholder="Value" bind:value={areaName} on:change={onUpdateName} />
    </div>
    <div class="properties-container">
        {#each properties as property}
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
                        on:change={() => onUpdateProperty(property)}
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
</style>
