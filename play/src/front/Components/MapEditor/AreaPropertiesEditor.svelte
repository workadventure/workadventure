<script lang="ts">
    import { onDestroy } from "svelte";
    import { AreaDataProperty, AreaDataPropertiesKeys, AreaDataProperties } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        mapEditorSelectedAreaPreviewStore,
        onMapEditorInputFocus,
        onMapEditorInputUnfocus,
    } from "../../Stores/MapEditorStore";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import FocusablePropertyEditor from "./PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "./PropertyEditor/SilentPropertyEditor.svelte";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";

    let properties: AreaDataProperties = [];
    let areaName = "";

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            properties = currentAreaPreview.getProperties() ?? [];
            areaName = currentAreaPreview.getAreaData().name;
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
                };
            case "focusable":
                return {
                    id,
                    type,
                    zoom_margin: 0.5,
                };
            case "jitsiRoomProperty":
                return {
                    id,
                    type,
                    jitsiRoomConfig: {},
                    roomName: "JITSI ROOM",
                };
            case "openWebsite":
                return {
                    id,
                    type,
                    link: "https://google.com",
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
        }
    }

    function onDeleteProperty(id: string) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.deleteProperty(id);
            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore?.getProperties();
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
</script>

{#if $mapEditorSelectedAreaPreviewStore === undefined}
    {$LL.mapEditor.areaEditor.editInstructions()}
{:else}
    <div class="properties-buttons">
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.jitsiProperties.label()}
            descriptionText="Lorem ipsum dolor sit amet"
            on:click={() => {
                onAddProperty("jitsiRoomProperty");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.audioProperties.label()}
            descriptionText="Lorem ipsum dolor sit amet"
            on:click={() => {
                onAddProperty("playAudio");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.linkProperties.label()}
            descriptionText="Lorem ipsum dolor sit amet"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="area-name-container">
        <h3>Area name</h3>
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
                        {property}
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

    .properties-container::-webkit-scrollbar {
        display: none;
    }

    .area-name-container {
        input {
            background-color: white;
            color: black;
            font-weight: 700;
            width: 100%;
        }
    }
</style>
