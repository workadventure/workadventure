<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { TooltipPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import infoBulleSvg from "../../images/icon_infobulle.svg";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: TooltipPropertyData;
    let infinity = property.duration == -1;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    function onValueChange() {
        dispatch("change");
    }

    function onInfinityChange() {
        if (infinity) property.duration = -1;
        else property.duration = 2;
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <img class="w-6 mr-1" src={infoBulleSvg} alt={$LL.mapEditor.properties.tooltipProperties.label()} />
        <label for="contentTooltip">{$LL.mapEditor.properties.tooltipProperties.label()}</label>
    </span>
    {$LL.mapEditor.properties.tooltipProperties.label()}
    <span slot="content">
        <TextArea
            id="contentTooltip"
            label={$LL.mapEditor.properties.tooltipProperties.description()}
            placeHolder={$LL.mapEditor.properties.tooltipProperties.contentPlaceholder()}
            bind:value={property.content}
            onChange={onValueChange}
            onKeyPress={() => {}}
        />

        <div class="value-switch">
            <InputSwitch
                id="durationInfinityTooltip"
                label={$LL.mapEditor.properties.tooltipProperties.infinityDuration()}
                bind:value={infinity}
                onChange={onInfinityChange}
            />
        </div>
        {#if !infinity}
            <Input
                id="durationTooltip"
                type="number"
                label={$LL.mapEditor.properties.tooltipProperties.duration()}
                min={1}
                step={1}
                max={20}
                disabled={infinity}
                bind:value={property.duration}
                on:change={onValueChange}
                onInput={onValueChange}
            />
        {/if}
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-switch {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        height: 2.5em;
    }
    // .input-switch {
    //     position: relative;
    //     top: 0px;
    //     right: 0px;
    //     bottom: 0px;
    //     left: 0px;
    //     display: inline-block;
    //     height: 1rem;
    //     width: 2rem;
    //     -webkit-appearance: none;
    //     -moz-appearance: none;
    //     appearance: none;
    //     border-radius: 9999px;
    //     border-width: 1px;
    //     border-style: solid;
    //     --border-opacity: 1;
    //     border-color: rgb(77 75 103 / var(--border-opacity));
    //     --bg-opacity: 1;
    //     background-color: rgb(15 31 45 / var(--bg-opacity));
    //     background-image: none;
    //     padding: 0px;
    //     --text-opacity: 1;
    //     color: rgb(242 253 255 / var(--text-opacity));
    //     outline: 2px solid transparent;
    //     outline-offset: 2px;
    //     cursor: url(../../../../../public/static/images/cursor_pointer.png), pointer;
    // }
    // .input-switch::before {
    //     position: absolute;
    //     left: -3px;
    //     top: -3px;
    //     height: 1.25rem;
    //     width: 1.25rem;
    //     border-radius: 9999px;
    //     --bg-opacity: 1;
    //     background-color: rgb(146 142 187 / var(--bg-opacity));
    //     transition-property: all;
    //     transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    //     transition-duration: 150ms;
    //     --content: "";
    //     content: var(--content);
    // }
    // .input-switch:checked {
    //     --border-opacity: 1;
    //     border-color: rgb(146 142 187 / var(--border-opacity));
    // }
    // .input-switch:checked::before {
    //     left: 13px;
    //     top: -3px;
    //     --bg-opacity: 1;
    //     background-color: rgb(65 86 246 / var(--bg-opacity));
    //     content: var(--content);
    //     /*--shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
    //     --shadow-colored: 0 0 7px 0 var(--shadow-color);
    //     box-shadow: var(--ring-offset-shadow, 0 0 #0000), var(--ring-shadow, 0 0 #0000), var(--shadow);*/
    // }
    // .input-switch:disabled {
    //     cursor: not-allowed;
    //     opacity: 0.4;
    // }
</style>
