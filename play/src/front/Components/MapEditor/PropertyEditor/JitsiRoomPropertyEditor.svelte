<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { JitsiRoomPropertyData } from "@workadventure/map-editor";
    import { openModal } from "svelte-modals";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import Select from "../../Input/Select.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import {
        ON_ACTION_TRIGGER_BUTTON,
        ON_ACTION_TRIGGER_ENTER,
        ON_ICON_TRIGGER_BUTTON,
    } from "../../../WebRtc/LayoutManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import JitsiRoomConfigEditor from "./JitsiRoomConfigEditor.svelte";

    export let property: JitsiRoomPropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === ON_ACTION_TRIGGER_BUTTON;
    export let triggerOptionActivated = true;
    export let isArea = false;
    let optionAdvancedActivated = false;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === ON_ACTION_TRIGGER_BUTTON;
        dispatch("change");
    }

    function onValueChange() {
        dispatch("change");
    }

    let jitsiConfigModalOpened = false;

    function OpenPopup() {
        openModal(JitsiRoomConfigEditor, {
            visibilityValue: jitsiConfigModalOpened,
            config: property.jitsiRoomConfig,
            jitsiRoomAdminTag: property.jitsiRoomAdminTag,
            onSave: (config) => {
                property.jitsiRoomConfig = structuredClone(config);
                dispatch("change");
            },
        });
        jitsiConfigModalOpened = true;
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <img
            class="w-6 me-2"
            src="resources/icons/icon_meeting.png"
            alt={$LL.mapEditor.properties.jitsiProperties.description()}
        />
        {$LL.mapEditor.properties.jitsiProperties.label()}
    </span>
    <span slot="content">
        <Input
            id="roomName"
            type="text"
            label={$LL.mapEditor.properties.jitsiProperties.roomNameLabel()}
            placeholder={$LL.mapEditor.properties.jitsiProperties.roomNamePlaceholder()}
            bind:value={property.roomName}
            onChange={onValueChange}
        />

        <InputSwitch
            id="advancedOption"
            label={$LL.mapEditor.properties.advancedOptions()}
            bind:value={optionAdvancedActivated}
        />

        {#if optionAdvancedActivated}
            <div class:active={optionAdvancedActivated} class="advanced-option flex flex-col mt-3 gap-2 ">
                <div class="value-switch">
                    <InputCheckbox
                        id="closable"
                        label={$LL.mapEditor.properties.jitsiProperties.closable()}
                        bind:value={property.closable}
                        onChange={onValueChange}
                    />
                </div>
                <div>
                    <RangeSlider
                        label={$LL.mapEditor.properties.jitsiProperties.width()}
                        min={15}
                        max={85}
                        placeholder="50"
                        bind:value={property.width}
                        onChange={onValueChange}
                        variant="secondary"
                        buttonShape="square"
                    />
                </div>

                <InputSwitch
                    id="noPrefix"
                    label={$LL.mapEditor.properties.jitsiProperties.noPrefix()}
                    bind:value={property.noPrefix}
                    onChange={onValueChange}
                />

                <Input
                    id="jitsiUrl"
                    type="url"
                    label={$LL.mapEditor.properties.jitsiProperties.jitsiUrl()}
                    placeholder={$LL.mapEditor.properties.jitsiProperties.jitsiUrlPlaceholder()}
                    bind:value={property.jitsiUrl}
                    onChange={onValueChange}
                />
                {#if !property.hideButtonLabel}
                    <Input
                        id="jitsiButtonLabel"
                        type="text"
                        label={$LL.mapEditor.entityEditor.buttonLabel()}
                        bind:value={property.buttonLabel}
                        onChange={onValueChange}
                    />
                {/if}
                {#if triggerOptionActivated}
                    <div>
                        <Select
                            id="trigger"
                            label={$LL.mapEditor.properties.jitsiProperties.trigger()}
                            bind:value={property.trigger}
                            onChange={onTriggerValueChange}
                        >
                            <option value={ON_ACTION_TRIGGER_ENTER}
                                >{$LL.mapEditor.properties.jitsiProperties.triggerShowImmediately()}</option
                            >
                            <option value={ON_ICON_TRIGGER_BUTTON}
                                >{$LL.mapEditor.properties.jitsiProperties.triggerOnClick()}</option
                            >
                            <option value={ON_ACTION_TRIGGER_BUTTON}
                                >{$LL.mapEditor.properties.jitsiProperties.triggerOnAction()}</option
                            >
                        </Select>
                    </div>
                {/if}
                {#if (isArea && triggerOptionActivated && triggerOnActionChoosen) || !isArea}
                    <Input
                        id="triggerMessage"
                        label={$LL.mapEditor.properties.linkProperties.triggerMessage()}
                        type="text"
                        placeholder={$LL.trigger.object()}
                        bind:value={property.triggerMessage}
                        onChange={onValueChange}
                    />
                {/if}

                <button
                    class="btn bg-transparent rounded-md hover:!bg-white/10 transition-all border !border-white py-2"
                    on:click={OpenPopup}
                >
                    {$LL.mapEditor.properties.jitsiProperties.moreOptionsLabel()}
                </button>

                <!-- <JitsiRoomConfigEditor
                    bind:isOpen={jitsiConfigModalOpened}
                    bind:visibilityValue={jitsiConfigModalOpened}
                    on:change={onConfigChange}
                    bind:config={property.jitsiRoomConfig}
                    bind:jitsiRoomAdminTag={property.jitsiRoomAdminTag}
                /> -->
            </div>
        {/if}
    </span>
</PropertyEditorBase>

<style lang="scss">
    button {
        flex: 1 1 0px;
        border: 1px solid grey;
        margin-bottom: 0.5em;
    }
    button:hover {
        background-color: rgb(77 75 103);
    }
    .value-switch {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        align-items: center;
        height: 2.5em;
    }
</style>
