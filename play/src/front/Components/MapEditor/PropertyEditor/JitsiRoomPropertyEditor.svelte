<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import { createEventDispatcher } from "svelte";
    import { JitsiRoomPropertyData } from "@workadventure/map-editor";

    export let property: JitsiRoomPropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<div class="value-input">
    <label for="roomName">{$LL.mapEditor.entityEditor.jitsiProperties.roomNameLabel()}</label>
    <input
        id="roomName"
        type="text"
        placeholder={$LL.mapEditor.entityEditor.jitsiProperties.roomNamePlaceholder()}
        bind:value={property.roomName}
        on:change={onValueChange}
        on:focus={onMapEditorInputFocus}
        on:blur={onMapEditorInputUnfocus}
    />
</div>
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
