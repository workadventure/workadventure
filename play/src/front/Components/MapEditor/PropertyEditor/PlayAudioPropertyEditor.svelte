<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import CloseButton from "./CloseButton.svelte";

    export let property: PlayAudioPropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<div class="property-settings-container">
    <div class="header">
        {$LL.mapEditor.properties.audioProperties.label()}
        <CloseButton
            on:click={() => {
                dispatch("close");
            }}
        />
    </div>
    <div class="value-input">
        <label for="audioLink">{$LL.mapEditor.properties.audioProperties.audioLinkLabel()}</label>
        <input
            id="audioLink"
            type="text"
            placeholder={$LL.mapEditor.properties.audioProperties.audioLinkPlaceholder()}
            bind:value={property.audioLink}
            on:change={onValueChange}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
    </div>
    {#if !property.hideButtonLabel}
        <div class="value-input">
            <label for="audioButtonLabel">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
            <input
                id="audioButtonLabel"
                type="text"
                bind:value={property.buttonLabel}
                on:change={onValueChange}
                on:focus={onMapEditorInputFocus}
                on:blur={onMapEditorInputUnfocus}
            />
        </div>
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
            background-color: white;
            color: black;
            font-weight: 700;
            width: 100%;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
