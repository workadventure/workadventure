<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import { createEventDispatcher } from "svelte";
    import { OpenTabPropertyData } from "@workadventure/map-editor";

    export let property: OpenTabPropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<div class="value-input">
    w
    <label for="tabLink">{$LL.mapEditor.entityEditor.linkProperties.linkLabel()}</label>
    <input
        id="tabLink"
        type="text"
        placeholder={$LL.mapEditor.entityEditor.linkProperties.linkPlaceholder()}
        bind:value={property.link}
        on:change={onValueChange}
        on:focus={onMapEditorInputFocus}
        on:blur={onMapEditorInputUnfocus}
    />
</div>
<div class="value-input">
    <label for="linkButtonLabel">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
    <input
        id="linkButtonlabel"
        type="text"
        bind:value={property.buttonLabel}
        on:change={onValueChange}
        on:focus={onMapEditorInputFocus}
        on:blur={onMapEditorInputUnfocus}
    />
</div>

<style lang="scss">
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
</style>
