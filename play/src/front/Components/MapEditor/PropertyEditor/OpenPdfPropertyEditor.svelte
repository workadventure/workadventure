<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { OpenPdfPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import {
        ON_ACTION_TRIGGER_BUTTON,
        ON_ACTION_TRIGGER_ENTER,
        ON_ICON_TRIGGER_BUTTON,
    } from "../../../WebRtc/LayoutManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import FileUpload from "./FileUpload/FileUpload.svelte";

    const dispatch = createEventDispatcher();

    export let property: OpenPdfPropertyData;

    function handleFileChange() {
        property.allowAPI = true;
        property.closable = true;

        dispatch("change");
    }

    function onTriggerValueChange() {
        if (property.link) {
            dispatch("change");
        }
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
            src="resources/icons/icon_start.png"
            alt={$LL.mapEditor.properties.startProperties.description()}
        />
        {$LL.mapEditor.properties.openPdfProperties.label()}
    </span>

    <span slot="content">
        <Select
            id="trigger"
            label={$LL.mapEditor.properties.linkProperties.trigger()}
            bind:value={property.trigger}
            onChange={onTriggerValueChange}
        >
            <option value={ON_ACTION_TRIGGER_ENTER}
                >{$LL.mapEditor.properties.linkProperties.triggerShowImmediately()}</option
            >
            {#if !property.newTab}
                <option value={ON_ICON_TRIGGER_BUTTON}
                    >{$LL.mapEditor.properties.linkProperties.triggerOnClick()}</option
                >
            {/if}
            <option value={ON_ACTION_TRIGGER_BUTTON}>{$LL.mapEditor.properties.linkProperties.triggerOnAction()}</option
            >
        </Select>

        <FileUpload
            {property}
            on:change={() => {
                handleFileChange();
            }}
        />
    </span>
</PropertyEditorBase>
