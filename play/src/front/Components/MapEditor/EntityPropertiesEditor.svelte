<script lang="ts">
    import { EntityDataPropertiesKeys, EntityDataProperty } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import { mapEditorSelectedEntityStore } from "../../Stores/MapEditorStore";
    import plusImg from "../images/plus.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";

    let properties = $mapEditorSelectedEntityStore?.getProperties() ?? [];

    function onAddProperty(type: EntityDataPropertiesKeys) {
        console.log("try to add property");
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
            case "textHeader":
                return {
                    id,
                    type,
                    header: "text header",
                };
        }
    }

    function onDeleteProperty(id: string) {
        console.log("try to delete property");
        if ($mapEditorSelectedEntityStore) {
            const result = $mapEditorSelectedEntityStore.deleteProperty(id);
            if (result) {
                console.log(`SUCCESFULLY DELETED PROPERTY: ${id}`);
            } else {
                console.log(`CANNOT DELETE PROPERTY: ${id}`);
            }
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
    {#each properties as property}
        {#if property.type === "jitsiRoomProperty"}
            <JitsiRoomPropertyEditor {property} />
        {:else}
            <div>
                <button
                    on:click={() => {
                        onDeleteProperty(property.id);
                    }}
                >
                    <p>{property.id}: {property.type}</p>
                </button>
            </div>
        {/if}
    {/each}
{/if}

<style lang="scss">
    .entity-properties {
        overflow-y: auto;
        overflow-x: hidden;
        .property-enabler {
            border-radius: 0.1em;
            display: flex;
            background-color: rgb(77 75 103);
            margin-top: 1px;
            margin-top: 1px;
            align-items: center;
            padding-right: 1em;
            label {
                padding-top: 1em;
                padding-bottom: 1em;
                padding-left: 1em;
                flex-grow: 1;
                margin: 0;
            }
        }
        .property-enabler:hover {
            background-color: rgb(85 85 113);
        }
        .property-container {
            padding-left: 1em;
        }
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

    .action-button {
        margin-top: 1em;
        display: flex;
        button {
            flex: 1 1 0px;
            border: 1px solid grey;
        }
        button:hover {
            background-color: rgb(77 75 103);
        }
        .delete-button {
            border-color: red;
            color: red;
            display: flex;
            div {
                text-align: left;
                flex-grow: 1;
            }
            img {
                object-fit: contain;
                max-width: 2em;
                max-height: 2em;
            }
        }
        .delete-button:hover {
            background-color: rgb(103 75 75);
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
        padding: 0px;
        --tw-text-opacity: 1;
        color: rgb(242 253 255 / var(--tw-text-opacity));
        outline: 2px solid transparent;
        outline-offset: 2px;
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
        background-color: rgb(86 234 255 / var(--tw-bg-opacity));
        content: var(--tw-content);
        --tw-shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
        --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }

    .input-switch:disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }
</style>
