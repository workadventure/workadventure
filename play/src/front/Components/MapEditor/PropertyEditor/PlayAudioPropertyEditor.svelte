<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: PlayAudioPropertyData;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header">
        {$LL.mapEditor.properties.audioProperties.label()}
    </span>
    <span slot="content">
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
        <div class="value-input">
            <label for="volume">{$LL.mapEditor.properties.audioProperties.volumeLabel()}</label>
            <input
                id="volume"
                type="number"
                min="0"
                max="1"
                step="0.05"
                bind:value={property.volume}
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
    </span>
</PropertyEditorBase>

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
