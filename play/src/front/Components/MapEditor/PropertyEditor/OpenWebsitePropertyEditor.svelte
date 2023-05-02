<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { OpenWebsitePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { onMapEditorInputFocus, onMapEditorInputUnfocus } from "../../../Stores/MapEditorStore";
    import CloseButton from "./CloseButton.svelte";

    export let property: OpenWebsitePropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === "onaction";

    const dispatch = createEventDispatcher();

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === "onaction";
        dispatch("change");
    }

    function onValueChange() {
        dispatch("change");
    }
</script>

<div class="property-settings-container">
    <div class="header">
        {$LL.mapEditor.properties.linkProperties.label()}
        <CloseButton
            on:click={() => {
                dispatch("close");
            }}
        />
    </div>
    <div class="value-input">
        <label for="tabLink">{$LL.mapEditor.properties.linkProperties.linkLabel()}</label>
        <input
            id="tabLink"
            type="text"
            placeholder={$LL.mapEditor.properties.linkProperties.linkPlaceholder()}
            bind:value={property.link}
            on:change={onValueChange}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
    </div>
    <div class="">
        <label for="websiteWidth">{$LL.mapEditor.properties.linkProperties.width()}: {property.width}%</label>
        <input
            id="websiteWidth"
            type="range"
            min="0"
            max="100"
            placeholder="50"
            bind:value={property.width}
            on:change={onValueChange}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
    </div>
    {#if !property.hideButtonLabel}
        <div class="value-input">
            <label for="linkButton">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
            <input
                id="linkButton"
                type="text"
                bind:value={property.buttonLabel}
                on:change={onValueChange}
                on:focus={onMapEditorInputFocus}
                on:blur={onMapEditorInputUnfocus}
            />
        </div>
    {/if}
    <div>
        <label for="trigger">{$LL.mapEditor.properties.linkProperties.trigger()}</label>
        <select id="trigger" class="tw-w-full" bind:value={property.trigger} on:change={onTriggerValueChange}>
            <option value={undefined}>{$LL.mapEditor.properties.linkProperties.triggerShowImmediately()}</option>
            <option value="onicon">{$LL.mapEditor.properties.linkProperties.triggerOnClick()}</option>
            <option value="onaction">{$LL.mapEditor.properties.linkProperties.triggerOnAction()}</option>
        </select>
    </div>
    {#if triggerOnActionChoosen}
        <div class="value-input">
            <label for="triggerMessage">{$LL.mapEditor.properties.linkProperties.triggerMessage()}</label>
            <input
                id="triggerMessage"
                type="text"
                bind:value={property.triggerMessage}
                on:change={onValueChange}
                on:focus={onMapEditorInputFocus}
                on:blur={onMapEditorInputUnfocus}
            />
        </div>
    {/if}
    <div class="value-switch">
        <label for="newTab">{$LL.mapEditor.properties.linkProperties.newTabLabel()}</label>
        <input
            id="newTab"
            type="checkbox"
            class="input-switch"
            bind:checked={property.newTab}
            on:change={onValueChange}
        />
    </div>
    <div class="value-switch">
        <label for="closable">{$LL.mapEditor.properties.linkProperties.closable()}</label>
        <input
            id="closable"
            type="checkbox"
            class="input-switch"
            bind:checked={property.closable}
            on:change={onValueChange}
        />
    </div>
    <div class="value-switch">
        <label for="allowAPI">{$LL.mapEditor.properties.linkProperties.allowAPI()}</label>
        <input
            id="allowAPI"
            type="checkbox"
            class="input-switch"
            bind:checked={property.allowAPI}
            on:change={onValueChange}
        />
    </div>
    <div class="value-input">
        <label for="policy">{$LL.mapEditor.properties.linkProperties.policy()}</label>
        <input
            id="policy"
            type="text"
            placeholder={$LL.mapEditor.properties.linkProperties.policyPlaceholder()}
            bind:value={property.policy}
            on:change={onValueChange}
            on:focus={onMapEditorInputFocus}
            on:blur={onMapEditorInputUnfocus}
        />
    </div>
</div>

<style lang="scss">
    .header {
        display: flex;
        font-size: 25px;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
    .property-settings-container {
        border: 1px solid grey;
        border-radius: 5px;
        padding: 5px;
        .close-button:hover {
            background-color: red;
        }
    }

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
            background-color: white;
            color: black;
            font-weight: 700;
            width: 100%;
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
        padding: 0px;
        --tw-text-opacity: 1;
        color: rgb(242 253 255 / var(--tw-text-opacity));
        outline: 2px solid transparent;
        outline-offset: 2px;
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
        background-color: rgb(86 234 255 / var(--tw-bg-opacity));
        content: var(--tw-content);
        --tw-shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
        --tw-shadow-colored: 0 0 7px 0 var(--tw-shadow-color);
        box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }

    .input-switch:disabled {
        cursor: not-allowed;
        opacity: 0.4;
    }
</style>
