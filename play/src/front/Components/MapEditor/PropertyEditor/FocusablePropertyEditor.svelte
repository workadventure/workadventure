<script lang="ts">
    import { FocusablePropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: FocusablePropertyData;

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
    <span slot="header" class="flex justify-center items-center">
        <img
            class="w-6 mr-1"
            src="resources/icons/icon_focus.png"
            alt={$LL.mapEditor.properties.focusableProperties.description()}
        />
        {$LL.mapEditor.properties.focusableProperties.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <Input
                label={$LL.mapEditor.properties.focusableProperties.zoomMarginLabel()}
                id="zoomMarginName"
                type="number"
                min={0}
                max={2}
                step={0.1}
                bind:value={property.zoom_margin}
                onChange={onValueChange}
            />
        </div>
        {#if !property.hideButtonLabel}
            <div class="value-input">
                <Input
                    id="focusableButtonLabel"
                    label={$LL.mapEditor.entityEditor.buttonLabel()}
                    type="text"
                    bind:value={property.buttonLabel}
                    onChange={onValueChange}
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
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
