<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { TooltipPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: TooltipPropertyData;
    let infinity = property.duration == -1;

    const dispatch = createEventDispatcher();

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
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_infobulle.png"
            alt={$LL.mapEditor.properties.tooltipProperties.label()}
        />
        <label for="contentTooltip">{$LL.mapEditor.properties.tooltipProperties.label()}</label>
    </span>
    {$LL.mapEditor.properties.tooltipProperties.label()}
    <span slot="content">
        <div class="value-input">
            <label for="contentTooltip">{$LL.mapEditor.properties.tooltipProperties.description()}</label>
            <textarea
                id="contentTooltip"
                placeholder={$LL.mapEditor.properties.tooltipProperties.contentPlaceholder()}
                bind:value={property.content}
                on:change={onValueChange}
            />
        </div>
        <div class="value-switch">
            <label for="durationInfinityTooltip">{$LL.mapEditor.properties.tooltipProperties.infinityDuration()}</label>
            <input
                id="durationInfinityTooltip"
                type="checkbox"
                class="input-switch"
                bind:checked={infinity}
                on:change={onInfinityChange}
            />
        </div>
        {#if !infinity}
            <div class="value-input">
                <label for="durationTooltip">{$LL.mapEditor.properties.tooltipProperties.duration()}</label>
                <input
                    id="durationTooltip"
                    type="number"
                    min="1"
                    step="1"
                    max="20"
                    disabled={infinity}
                    bind:value={property.duration}
                    on:change={onValueChange}
                />
            </div>
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
        label {
            min-width: fit-content;
            margin-right: 0.5em;
            flex-grow: 1;
        }
        input {
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
    .input-switch {
        position: relative;
        top: 0px;
        right: 0px;
        bottom: 0px;
        left: 0px;
        display: inline-block;
        height: 1rem;
        width: 2rem;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        border-radius: 9999px;
        border-width: 1px;
        border-style: solid;
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(15 31 45 / var(--tw-bg-opacity));
        background-image: none;
        padding: 0px;
        --tw-text-opacity: 1;
        color: rgb(242 253 255 / var(--tw-text-opacity));
        outline: 2px solid transparent;
        outline-offset: 2px;
        cursor: url(../../../../../public/static/images/cursor_pointer.png), pointer;
    }
    .input-switch::before {
        position: absolute;
        left: -3px;
        top: -3px;
        height: 1.25rem;
        width: 1.25rem;
        border-radius: 9999px;
        --tw-bg-opacity: 1;
        background-color: rgb(146 142 187 / var(--tw-bg-opacity));
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 150ms;
        --tw-content: "";
        content: var(--tw-content);
    }
    .input-switch:checked {
        --tw-border-opacity: 1;
        border-color: rgb(146 142 187 / var(--tw-border-opacity));
    }
    .input-switch:checked::before {
        left: 13px;
        top: -3px;
        --tw-bg-opacity: 1;
        background-color: rgb(65 86 246 / var(--tw-bg-opacity));
        content: var(--tw-content);
        /*--tw-shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
        --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);*/
    }
    .input-switch:disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }
</style>
