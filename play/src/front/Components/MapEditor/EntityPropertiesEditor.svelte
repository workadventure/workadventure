<script lang="ts">
    import { onDestroy } from "svelte";
    import { EntityDataProperties, EntityDataPropertiesKeys, EntityDataProperty } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import { mapEditorSelectedEntityStore } from "../../Stores/MapEditorStore";
    import visioSvg from "../images/visio-white.svg";
    import audioSvg from "../images/audio-white.svg";
    import webSvg from "../images/web-white.svg";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";

    let properties: EntityDataProperties = [];
    let entityName = "";

    let selectedEntityUnsubscriber = mapEditorSelectedEntityStore.subscribe((currentEntity) => {
        if (currentEntity) {
            currentEntity.setEditColor(0x00ffff);
            properties = currentEntity.getProperties() ?? [];
            entityName = currentEntity.getEntityData().name ?? "";
        }
    });

    function onAddProperty(type: EntityDataPropertiesKeys) {
        if ($mapEditorSelectedEntityStore) {
            analyticsClient.addMapEditorProperty("entity", type || "unknown");
            $mapEditorSelectedEntityStore.addProperty(getPropertyFromType(type));
            // refresh properties
            properties = $mapEditorSelectedEntityStore?.getProperties();
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

    function getPropertyFromType(type: EntityDataPropertiesKeys): EntityDataProperty {
        const id = crypto.randomUUID();
        switch (type) {
            case "jitsiRoomProperty":
                return {
                    id,
                    type,
                    jitsiRoomConfig: {},
                    closable: true,
                    roomName: "JITSI ROOM",
                    buttonLabel: "Connect to Jitsi",
                };
            case "openWebsite":
                return {
                    id,
                    type,
                    closable: true,
                    buttonLabel: "Open Website",
                    link: "https://workadventu.re",
                    newTab: false,
                };
            case "playAudio":
                return {
                    id,
                    type,
                    buttonLabel: "Play audio",
                    audioLink: "",
                };
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
        }
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
    <div class="properties-buttons tw-flex tw-flex-row">
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.jitsiProperties.label()}
            descriptionText={$LL.mapEditor.properties.jitsiProperties.description()}
            img={visioSvg}
            style="z-index: 5;"
            on:click={() => {
                onAddProperty("jitsiRoomProperty");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.audioProperties.label()}
            descriptionText={$LL.mapEditor.properties.audioProperties.description()}
            img={audioSvg}
            style="z-index: 4;"
            on:click={() => {
                onAddProperty("playAudio");
            }}
        />
        <AddPropertyButton
            headerText={$LL.mapEditor.properties.linkProperties.label()}
            descriptionText={$LL.mapEditor.properties.linkProperties.description()}
            img={webSvg}
            style="z-index: 3;"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="entity-name-container">
        <label for="objectName">Object name</label>
        <input id="objectName" type="text" placeholder="Value" bind:value={entityName} on:change={onUpdateName} />
    </div>
    <div class="properties-container">
        {#each properties as property}
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
