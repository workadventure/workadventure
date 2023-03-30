<script lang="ts">
    import { onDestroy } from "svelte";
    import { slide } from "svelte/transition";
    import { AreaDataProperties, AreaDataPropertiesKeys } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import crossImg from "../images/cross-icon.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import FocusablePropertyEditor from "./PropertyEditor/FocusablePropertyEditor.svelte";

    interface AreaPropertyDescription<K extends AreaDataPropertiesKeys> {
        key: K;
        name: string;
        active: boolean;
        currentValue: AreaDataProperties[K];
        component: unknown;
        defaultValue: AreaDataProperties[K];
    }

    let possibleProperties: AreaPropertyDescription<AreaDataPropertiesKeys>[] = [
        {
            key: "focusable",
            name: $LL.mapEditor.properties.focusableProperties.label(),
            active: false,
            currentValue: undefined,
            component: FocusablePropertyEditor,
            defaultValue: {
                zoom_margin: 0,
                hideButtonLabel: true,
            },
        },
        {
            key: "jitsiRoom",
            name: $LL.mapEditor.properties.jitsiProperties.label(),
            active: false,
            currentValue: undefined,
            component: JitsiRoomPropertyEditor,
            defaultValue: {
                roomName: "",
                hideButtonLabel: true,
                jitsiRoomConfig: {},
            },
        },
        {
            key: "playAudio",
            name: $LL.mapEditor.properties.audioProperties.label(),
            active: false,
            currentValue: undefined,
            component: PlayAudioPropertyEditor,
            defaultValue: {
                audioLink: "",
                hideButtonLabel: true,
            },
        },
        {
            key: "openWebsite",
            name: $LL.mapEditor.properties.linkProperties.label(),
            active: false,
            currentValue: undefined,
            component: OpenWebsitePropertyEditor,
            defaultValue: {
                link: "",
                hideButtonLabel: true,
                newTab: true,
            },
        },
    ];

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            for (let property of possibleProperties) {
                property.active =
                    currentAreaPreview.getAreaData().properties[property.key] !== undefined &&
                    currentAreaPreview.getAreaData().properties[property.key] !== null;
                property.currentValue = currentAreaPreview.getAreaData().properties[property.key];
                if (!property.currentValue) {
                    property.currentValue = structuredClone(property.defaultValue);
                }
            }
        }
        possibleProperties = possibleProperties;
    });

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });

    function onPropertyChecked(property: AreaPropertyDescription<AreaDataPropertiesKeys>) {
        if ($mapEditorSelectedAreaPreviewStore) {
            if (property.active) {
                if (!property.currentValue) {
                    property.currentValue = possibleProperties.find((v) => v.key === property.key)?.defaultValue; //initialize here the property value
                }
                $mapEditorSelectedAreaPreviewStore.setProperty(property.key, property.currentValue);
            } else {
                $mapEditorSelectedAreaPreviewStore.setProperty(property.key, undefined);
            }
        }
    }

    function onUpdateProperty(property: AreaPropertyDescription<AreaDataPropertiesKeys>) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.setProperty(property.key, property.currentValue);
        }
    }

    function onTestInteraction() {
        // if ($mapEditorSelectedAreaPreviewStore) {
        //     $mapEditorSelectedAreaPreviewStore.TestActivation();
        // }
    }

    function onDeleteAreaPreview() {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.delete();
            mapEditorSelectedAreaPreviewStore.set(undefined);
        }
    }
</script>

{#if $mapEditorSelectedAreaPreviewStore === undefined}
    {$LL.mapEditor.entityEditor.editInstructions()}
{:else}
    <div class="area-properties">
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
        <button class="delete-button" on:click={onDeleteAreaPreview}
            ><div>{$LL.mapEditor.entityEditor.deleteButton()}</div>
            <img src={crossImg} alt="" /></button
        >
    </div>
{/if}

<style lang="scss">
    .area-properties {
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
