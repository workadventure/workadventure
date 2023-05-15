<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { PlayAudioPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import audioSvg from "../../images/audio-white.svg";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: PlayAudioPropertyData;
    let optionAdvancedActivated = false;

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
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img class="tw-w-6 tw-mr-1" src={audioSvg} alt={$LL.mapEditor.properties.audioProperties.description()} />
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
        <div class="value-switch">
            <label for="advancedOption">{$LL.mapEditor.properties.advancedOptions()}</label>
            <input id="advancedOption" type="checkbox" class="input-switch" bind:checked={optionAdvancedActivated} />
        </div>
        <div class:active={optionAdvancedActivated} class="advanced-option tw-px-2">
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
        </div>
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
        cursor: url(/src/front/style/images/cursor_pointer.png), pointer;
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
    .advanced-option {
        display: none;
        &.active {
            display: block;
        }
    }
</style>
