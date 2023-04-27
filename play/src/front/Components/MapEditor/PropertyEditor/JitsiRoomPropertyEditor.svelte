<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { JitsiRoomConfigData, JitsiRoomPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import JitsiRoomConfigEditor from "./JitsiRoomConfigEditor.svelte";
    import CloseButton from "./CloseButton.svelte";

    export let property: JitsiRoomPropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }

    let jitsiConfigModalOpened = false;

    function onConfigChange(event: { detail: JitsiRoomConfigData }) {
        property.jitsiRoomConfig = event.detail;
        dispatch("change");
    }
</script>

<div class="property-settings-container">
    <div class="header">
        {$LL.mapEditor.properties.jitsiProperties.label()}
        <CloseButton
            on:click={() => {
                dispatch("close");
            }}
        />
    </div>
    <div class="value-input">
        <label for="roomName">{$LL.mapEditor.properties.jitsiProperties.roomNameLabel()}</label>
        <input
            id="roomName"
            type="text"
            placeholder={$LL.mapEditor.properties.jitsiProperties.roomNamePlaceholder()}
            bind:value={property.roomName}
            on:change={onValueChange}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
    </div>
    {#if !property.hideButtonLabel}
        <div class="value-input">
            <label for="jitsiButtonLabel">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
            <input
                id="jitsiButtonLabel"
                type="text"
                bind:value={property.buttonLabel}
                on:change={onValueChange}
                on:focus={onMapEditorInputFocus}
                on:blur={onMapEditorInputUnfocus}
            />
        </div>
    {/if}
    <button
        on:click={() => {
            jitsiConfigModalOpened = true;
        }}>{$LL.mapEditor.properties.jitsiProperties.moreOptionsLabel()}</button
    >
    {#if jitsiConfigModalOpened}
        <JitsiRoomConfigEditor
            bind:visibilityValue={jitsiConfigModalOpened}
            on:change={onConfigChange}
            bind:config={property.jitsiRoomConfig}
        />
    {/if}
</div>

<style lang="scss">
    .header {
        display: flex;
        font-size: 25px;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
    .property-settings-container {
        border: 1px solid grey;
        border-radius: 5px;
        padding: 5px;
    }
    .value-input {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
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

    input {
        background-color: white;
        color: black;
        font-weight: 700;
        width: 100%;
    }

    button {
        flex: 1 1 0px;
        border: 1px solid grey;
        margin-bottom: 0.5em;
    }
    button:hover {
        background-color: rgb(77 75 103);
    }
</style>
