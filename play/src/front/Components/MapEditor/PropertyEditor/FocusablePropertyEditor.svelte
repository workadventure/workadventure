<script lang="ts">
    import { FocusablePropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";

    export let property: FocusablePropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<div class="value-input">
    <label for="zoomMarginName">{$LL.mapEditor.properties.focusableProperties.zoomMarginLabel()}</label>
    <input
        id="zoomMarginName"
        type="number"
        min="0"
        max="2"
        step="0.1"
        bind:value={property.zoom_margin}
        on:change={onValueChange}
        on:focus={onMapEditorInputFocus}
        on:blur={onMapEditorInputUnfocus}
    />
</div>
{#if !property.hideButtonLabel}
    <div class="value-input">
        <label for="focusableButtonLabel">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
        <input
            id="focusableButtonLabel"
            type="text"
            bind:value={property.buttonLabel}
            on:change={onValueChange}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
    </div>
{/if}

<style lang="scss">
    .value-input {
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
