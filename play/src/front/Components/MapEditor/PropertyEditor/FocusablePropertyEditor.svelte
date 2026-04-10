<script lang="ts">
    import type { FocusablePropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import { IconZoomInArea } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: FocusablePropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

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
        <IconZoomInArea font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.focusable.label()}
    </span>
    <span slot="content">
        <Input
            label={$LL.mapEditor.properties.focusable.zoomMarginLabel()}
            id="zoomMarginName"
            type="number"
            min={0}
            max={2}
            step={0.1}
            bind:value={property.zoom_margin}
            onChange={onValueChange}
        />
        {#if !property.hideButtonLabel}
            <Input
                id="focusableButtonLabel"
                label={$LL.mapEditor.entityEditor.buttonLabel()}
                type="text"
                bind:value={property.buttonLabel}
                onChange={onValueChange}
            />
        {/if}
    </span>
</PropertyEditorBase>
