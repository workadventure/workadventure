<script lang="ts">
    import { onDestroy } from "svelte";
    import { AreaDataProperty, AreaDataPropertiesKeys, AreaDataProperties } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        mapEditorSelectedAreaPreviewStore,
        onMapEditorInputFocus,
        onMapEditorInputUnfocus,
    } from "../../Stores/MapEditorStore";
    import visioSvg from "../images/visio-white.svg";
    import audioSvg from "../images/audio-white.svg";
    import webSvg from "../images/web-white.svg";
    import silentSvg from "../images/silent-white.svg";
    import focusSvg from "../images/focus-white.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import FocusablePropertyEditor from "./PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "./PropertyEditor/SilentPropertyEditor.svelte";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";

    let properties: AreaDataProperties = [];
    let areaName = "";
    let hasJitsiRoomProperty: boolean;
    let hasFocusableProperty: boolean;
    let hasSilentProperty: boolean;

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            properties = currentAreaPreview.getProperties() ?? [];
            areaName = currentAreaPreview.getAreaData().name;
            refreshFlags();
        }
    });

    function getPropertyFromType(type: AreaDataPropertiesKeys): AreaDataProperty {
        const id = crypto.randomUUID();
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
                    jitsiRoomConfig: {},
                    hideButtonLabel: true,
                    roomName: "JITSI ROOM",
                };
            case "openWebsite":
                return {
                    id,
                    type,
                    link: "https://workadventu.re",
                    newTab: false,
                    hideButtonLabel: true,
                    trigger: undefined,
                };
            case "playAudio":
                return {
                    id,
                    type,
                    audioLink: "",
                };
        }
    }

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });

    function onAddProperty(type: AreaDataPropertiesKeys) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.addProperty(getPropertyFromType(type));
            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore?.getProperties();
            refreshFlags();
        }
    }

    function onDeleteProperty(id: string) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.deleteProperty(id);
            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore?.getProperties();
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
                img={focusSvg}
                style="z-index: 5;"
                on:click={() => {
                    onAddProperty("focusable");
                }}
            />
        {/if}
        {#if !hasSilentProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.silentProperty.label()}
                descriptionText={$LL.mapEditor.properties.silentProperty.description()}
                img={silentSvg}
                style="z-index: 4;"
                on:click={() => {
                    onAddProperty("silent");
                }}
            />
        {/if}
        {#if !hasJitsiRoomProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.jitsiProperties.label()}
                descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
                img={visioSvg}
                style="z-index: 3;"
                on:click={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            />
        {/if}
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.audioProperties.label()}
            descriptionText={$LL.mapEditor.properties.audioProperties.description()}
            img={audioSvg}
            style="z-index: 2;"
            on:click={() => {
                onAddProperty("playAudio");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.linkProperties.label()}
            descriptionText={$LL.mapEditor.properties.linkProperties.description()}
            img={webSvg}
            style="z-index: 1;"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="area-name-container">
        <label for="objectName">Area name</label>
        <input
            id="objectName"
            type="text"
            placeholder="Value"
            bind:value={areaName}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
            on:change={onUpdateName}
        />
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
