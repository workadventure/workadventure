<script lang="ts">
    import type { TooltipPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import infoBulleSvg from "../../images/icon_infobulle.svg";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: TooltipPropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();
    let infinity = $state(property.duration == -1);

    function onValueChange() {
        onchange?.();
    }

    function onInfinityChange() {
        if (infinity) property.duration = -1;
        else property.duration = 2;
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
            <img
                class="w-6 mr-1"
                src={infoBulleSvg}
                alt={$LL.mapEditor.properties.tooltipPropertyData.label()}
                draggable="false"
            />
            <label for="contentTooltip">{$LL.mapEditor.properties.tooltipPropertyData.label()}</label>
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <TextArea
                id="contentTooltip"
                label={$LL.mapEditor.properties.tooltipPropertyData.description()}
                placeHolder={$LL.mapEditor.properties.tooltipPropertyData.contentPlaceholder()}
                bind:value={property.content}
                onchange={onValueChange}
            />

            <div class="value-switch">
                <InputSwitch
                    id="durationInfinityTooltip"
                    label={$LL.mapEditor.properties.tooltipPropertyData.infinityDuration()}
                    bind:value={infinity}
                    onchange={onInfinityChange}
                />
            </div>
            {#if !infinity}
                <Input
                    id="durationTooltip"
                    type="number"
                    label={$LL.mapEditor.properties.tooltipPropertyData.duration()}
                    min={1}
                    step={1}
                    max={20}
                    disabled={infinity}
                    bind:value={property.duration}
                    onchange={onValueChange}
                    oninput={onValueChange}
                />
            {/if}
        </span>
    {/snippet}
</PropertyEditorBase>

<style>
    .value-switch {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        height: 2.5em;
    }
</style>
