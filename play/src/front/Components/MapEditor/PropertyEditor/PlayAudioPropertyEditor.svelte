<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";

    export let property: PlayAudioPropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<div class="value-input">
    <label for="audioLink">{$LL.mapEditor.entityEditor.audioProperties.audioLinkLabel()}</label>
    <input
        id="audioLink"
        type="text"
        placeholder={$LL.mapEditor.entityEditor.audioProperties.audioLinkPlaceholder()}
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
