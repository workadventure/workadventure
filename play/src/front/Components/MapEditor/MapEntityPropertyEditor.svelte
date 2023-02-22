<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { onDestroy } from "svelte";
    import { mapEditorSelectedEntityStore } from "../../Stores/MapEditorStore";
    import { slide } from "svelte/transition";
    import crossImg from "../images/cross-icon.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import OpenTabPropertyEditor from "./PropertyEditor/OpenTabPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import TextPropertyEditor from "./PropertyEditor/TextPropertyEditor.svelte";
    import { EntityDataProperties, EntityDataPropertiesKeys } from "@workadventure/map-editor";

    interface EntityPropertyDescription<K extends EntityDataPropertiesKeys> {
        key: K;
        name: string;
        active: boolean;
        currentValue: EntityDataProperties[K];
        component: unknown;
        defaultValue: EntityDataProperties[K];
    }

    let possibleProperties: EntityPropertyDescription<EntityDataPropertiesKeys>[] = [
        {
            key: "textHeader",
            name: $LL.mapEditor.entityEditor.textProperties.label(),
            active: false,
            currentValue: undefined,
            component: TextPropertyEditor,
            defaultValue: "",
        },
        {
            key: "jitsiRoom",
            name: $LL.mapEditor.entityEditor.jitsiProperties.label(),
            active: false,
            currentValue: undefined,
            component: JitsiRoomPropertyEditor,
            defaultValue: {
                buttonLabel: $LL.mapEditor.entityEditor.jitsiProperties.defaultButtonLabel(),
                roomName: "",
                jitsiRoomConfig: {},
            },
        },
        {
            key: "playAudio",
            name: $LL.mapEditor.entityEditor.audioProperties.label(),
            active: false,
            currentValue: undefined,
            component: PlayAudioPropertyEditor,
            defaultValue: {
                buttonLabel: $LL.mapEditor.entityEditor.audioProperties.defaultButtonLabel(),
                audioLink: "",
            },
        },
        {
            key: "openTab",
            name: $LL.mapEditor.entityEditor.linkProperties.label(),
            active: false,
            currentValue: undefined,
            component: OpenTabPropertyEditor,
            defaultValue: {
                buttonLabel: $LL.mapEditor.entityEditor.linkProperties.defaultButtonLabel(),
                link: "",
                inNewTab: true,
            },
        },
    ];

    let selectedEntityUnsubscriber = mapEditorSelectedEntityStore.subscribe((currentEntity) => {
        if (currentEntity) {
            currentEntity.setEditColor(0x00ffff);
            for (let property of possibleProperties) {
                property.active =
                    currentEntity.getProperties()[property.key] !== undefined &&
                    currentEntity.getProperties()[property.key] !== null;
                property.currentValue = currentEntity.getProperties()[property.key];
                if (!property.currentValue) {
                    property.currentValue = structuredClone(property.defaultValue);
                }
            }
        }
        possibleProperties = possibleProperties;
    });

    onDestroy(() => {
        selectedEntityUnsubscriber();
    });

    function onPropertyChecked(property: EntityPropertyDescription<EntityDataPropertiesKeys>) {
        if ($mapEditorSelectedEntityStore) {
            if (property.active) {
                if (!property.currentValue) {
                    property.currentValue = possibleProperties.find((v) => v.key === property.key)?.defaultValue; //initialize here the property value
                }
                $mapEditorSelectedEntityStore.setProperty(property.key, property.currentValue);
            } else {
                $mapEditorSelectedEntityStore.setProperty(property.key, undefined);
            }
        }
    }

    function onUpdateProperty(property: EntityPropertyDescription<EntityDataPropertiesKeys>) {
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.setProperty(property.key, property.currentValue);
        }
    }

    function onTestInteraction() {
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.TestActivation();
        }
    }

    function onDeleteEntity() {
        if ($mapEditorSelectedEntityStore) {
            $mapEditorSelectedEntityStore.delete();
            mapEditorSelectedEntityStore.set(undefined);
        }
    }
</script>

{#if $mapEditorSelectedEntityStore === undefined}
    {$LL.mapEditor.entityEditor.editInstructions()}
{:else}
    <div class="entity-properties">
        {#each possibleProperties as property (property.key)}
            <div class="property-enabler">
                <label for={property.key}>{property.name}</label>
                <input
                    id={property.key}
                    type="checkbox"
                    class="input-switch"
                    bind:checked={property.active}
                    on:change={() => onPropertyChecked(property)}
                />
            </div>
            {#if property.active}
                <div class="property-container" transition:slide|local>
                    <svelte:component
                        this={property.component}
                        bind:property={property.currentValue}
                        on:change={() => onUpdateProperty(property)}
                    />
                </div>
            {/if}
        {/each}
    </div>
    <div class="action-button">
        <button on:click={onTestInteraction}>{$LL.mapEditor.entityEditor.testInteractionButton()}</button>
        <button class="delete-button" on:click={onDeleteEntity}
            ><div>{$LL.mapEditor.entityEditor.deleteButton()}</div>
            <img src={crossImg} alt="" /></button
        >
    </div>
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
