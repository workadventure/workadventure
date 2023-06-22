<script lang="ts">
    import { onDestroy } from "svelte";
    import { AreaDataProperty, AreaDataPropertiesKeys, AreaDataProperties } from "@workadventure/map-editor";
    import { LL } from "../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../Stores/MapEditorStore";
    import audioSvg from "../images/audio-white.svg";
    import JitsiRoomPropertyEditor from "./PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "./PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "./PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import FocusablePropertyEditor from "./PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "./PropertyEditor/SilentPropertyEditor.svelte";
    import AddPropertyButton from "./PropertyEditor/AddPropertyButton.svelte";
    import SpeakerMegaphonePropertyEditor from "./PropertyEditor/SpeakerMegaphonePropertyEditor.svelte";
    import ListenerMegaphonePropertyEditor from "./PropertyEditor/ListenerMegaphonePropertyEditor.svelte";

    let properties: AreaDataProperties = [];
    let areaName = "";
    let hasJitsiRoomProperty: boolean;
    let hasFocusableProperty: boolean;
    let hasSilentProperty: boolean;
    let hasSpeakerMegaphoneProperty: boolean;
    let hasListenerMegaphoneProperty: boolean;

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
                    closable: true,
                    jitsiRoomConfig: {},
                    hideButtonLabel: true,
                    roomName: "JITSI ROOM",
                };
            case "openWebsite":
                return {
                    id,
                    type,
                    closable: true,
                    link: "https://workadventu.re",
                    newTab: false,
                    hideButtonLabel: true,
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
        }
    }

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });

    function onAddProperty(type: AreaDataPropertiesKeys) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.addProperty(getPropertyFromType(type));
            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore.getProperties();
            refreshFlags();
        }
    }

    function onDeleteProperty(id: string) {
        if ($mapEditorSelectedAreaPreviewStore) {
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
                img={"resources/icons/icon_silent.png"}
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
                img={"resources/icons/icon_meeting.png"}
                style="z-index: 3;"
                on:click={() => {
                    onAddProperty("jitsiRoomProperty");
                }}
            />
        {/if}
        {#if !hasSpeakerMegaphoneProperty}
            <AddPropertyButton
                headerText={$LL.mapEditor.properties.speakerMegaphoneProperties.label()}
                descriptionText={$LL.mapEditor.properties.speakerMegaphoneProperties.description()}
                img={"resources/icons/icon_speaker.png"}
                style="z-index: 3;"
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
                style="z-index: 3;"
                on:click={() => {
                    onAddProperty("listenerMegaphone");
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
            img={"resources/icons/icon_link.png"}
            style="z-index: 1;"
            on:click={() => {
                onAddProperty("openWebsite");
            }}
        />
    </div>
    <div class="area-name-container" style="display: none;">
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
