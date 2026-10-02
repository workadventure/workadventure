<script lang="ts">
    import type { FocusablePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import { IconZoomInArea } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: FocusablePropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    function onValueChange() {
        onchange?.();
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconZoomInArea font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.focusable.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <Input
                label={$LL.mapEditor.properties.focusable.zoomMarginLabel()}
                id="zoomMarginName"
                type="number"
                min={0}
                max={2}
                step={0.1}
                bind:value={property.zoom_margin}
                onchange={onValueChange}
            />
            {#if !property.hideButtonLabel}
                <Input
                    id="focusableButtonLabel"
                    label={$LL.mapEditor.entityEditor.buttonLabel()}
                    type="text"
                    bind:value={property.buttonLabel}
                    onchange={onValueChange}
                />
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>
