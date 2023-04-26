<script lang="ts">
    import { EntityDataPropertiesKeys, EntityDataProperty } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import {
        mapEditorSelectedEntityStore,
        onMapEditorInputFocus,
        onMapEditorInputUnfocus,
    } from "../../Stores/MapEditorStore";
    import plusImg from "../images/plus.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";

    let properties = $mapEditorSelectedEntityStore?.getProperties() ?? [];
    let entityName = $mapEditorSelectedEntityStore?.getEntityData().name;

    function onAddProperty(type: EntityDataPropertiesKeys) {
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.addProperty(getPropertyFromType(type));
            // refresh properties
            properties = $mapEditorSelectedEntityStore?.getProperties();
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
                    roomName: "JITSI ROOM",
                    buttonLabel: "Connect to Jitsi",
                };
            case "openWebsite":
                return {
                    id,
                    type,
                    buttonLabel: "Open Website",
                    link: "https://google.com",
                    newTab: true,
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
            $mapEditorSelectedEntityStore.deleteProperty(id);
            // refresh properties
            properties = $mapEditorSelectedEntityStore?.getProperties();
        }
    }
</script>

{#if $mapEditorSelectedEntityStore === undefined}
    {$LL.mapEditor.entityEditor.editInstructions()}
{:else}
    <div class="properties-buttons">
        <div>
            <button
                class="add-property-button"
                on:click={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            >
                <div>
                    {$LL.mapEditor.properties.jitsiProperties.label()}
                </div>
                <img src={plusImg} alt="" />
            </button>
        </div>
        <div>
            <button
                class="add-property-button"
                on:click={() => {
                    onAddProperty("playAudio");
                }}
            >
                <div>
                    {$LL.mapEditor.properties.audioProperties.label()}
                </div>
                <img src={plusImg} alt="" />
            </button>
        </div>
        <div>
            <button
                class="add-property-button"
                on:click={() => {
                    onAddProperty("openWebsite");
                }}
            >
                <div>
                    {$LL.mapEditor.properties.linkProperties.label()}
                </div>
                <img src={plusImg} alt="" />
            </button>
        </div>
    </div>
    <div class="entity-name-container">
        <p>Object name</p>
        <input
            id="objectName"
            type="text"
            placeholder="Value"
            bind:value={entityName}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
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
                    />
                {:else if property.type === "playAudio"}
                    <PlayAudioPropertyEditor
                        {property}
                        on:close={() => {
                            onDeleteProperty(property.id);
                        }}
                    />
                {:else if property.type === "openWebsite"}
                    <OpenWebsitePropertyEditor
                        {property}
                        on:close={() => {
                            onDeleteProperty(property.id);
                        }}
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

    .properties-buttons {
        margin-top: 1em;
        display: flex;
        flex-direction: column;
        button:hover {
            background-color: rgb(77 75 103);
        }
        .add-property-button {
            color: gray;
            width: 100%;
            border: 1px solid grey;
            position: relative;
            div {
                display: flex;
                flex-grow: 1;
            }
            img {
                object-fit: contain;
                max-width: 2em;
                max-height: 2em;
            }
        }
    }
</style>
