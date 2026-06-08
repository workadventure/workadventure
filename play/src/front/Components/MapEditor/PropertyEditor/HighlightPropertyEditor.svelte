<script lang="ts">
    import type { HighlightPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import { IconFocus } from "../../Icons";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: HighlightPropertyData;
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
            <IconFocus font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.highlight.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <RangeSlider
                label={$LL.mapEditor.properties.highlight.opacityLabel()}
                min={0}
                max={1}
                step={0.01}
                valueFormatter={(v) => (v * 100).toFixed(0)}
                placeholder="0.6"
                bind:value={property.opacity}
                onchange={onValueChange}
                variant="secondary"
                buttonShape="square"
            />
            <RangeSlider
                label={$LL.mapEditor.properties.highlight.gradientWidthLabel()}
                min={0}
                max={100}
                step={1}
                placeholder="10"
                bind:value={property.gradientWidth}
                onchange={onValueChange}
                variant="secondary"
                buttonShape="square"
                unit="px"
            />
            <RangeSlider
                label={$LL.mapEditor.properties.highlight.durationLabel()}
                min={0}
                max={2000}
                step={1}
                placeholder="250"
                bind:value={property.duration}
                onchange={onValueChange}
                variant="secondary"
                buttonShape="square"
                unit="ms"
            />
            <Input
                label={$LL.mapEditor.properties.highlight.colorLabel()}
                type="color"
                size="lg"
                bind:value={property.color}
                oninput={onValueChange}
            />
        </span>
    {/snippet}
</PropertyEditorBase>
