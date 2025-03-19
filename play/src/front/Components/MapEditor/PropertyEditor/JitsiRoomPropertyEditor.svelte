<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { JitsiRoomPropertyData } from "@workadventure/map-editor";
    import { openModal, closeModal } from "svelte-modals";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import Select from "../../Input/Select.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import JitsiRoomConfigEditor from "./JitsiRoomConfigEditor.svelte";

    export let property: JitsiRoomPropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === "onaction";
    export let triggerOptionActivated = true;
    export let isArea = false;
    let optionAdvancedActivated = false;

    const dispatch = createEventDispatcher();

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === "onaction";
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
        });
        () => {
            closeModal();
        };
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
            class="w-6 mr-1"
            src="resources/icons/icon_meeting.png"
            alt={$LL.mapEditor.properties.jitsiProperties.description()}
        />
        {$LL.mapEditor.properties.jitsiProperties.label()}
    </span>
    <span slot="content">
        <div class="value-input">
            <Input
                id="roomName"
                type="text"
                label={$LL.mapEditor.properties.jitsiProperties.roomNameLabel()}
                placeholder={$LL.mapEditor.properties.jitsiProperties.roomNamePlaceholder()}
                bind:value={property.roomName}
                onChange={onValueChange}
            />
        </div>

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
                        min={1}
                        max={100}
                        placeholder="50"
                        bind:value={property.width}
                        onChange={onValueChange}
                    />
                </div>

                <InputSwitch
                    id="noPrefix"
                    label={$LL.mapEditor.properties.jitsiProperties.noPrefix()}
                    bind:value={property.noPrefix}
                    onChange={onValueChange}
                />

                <div class="value-input">
                    <Input
                        id="jitsiUrl"
                        type="url"
                        label={$LL.mapEditor.properties.jitsiProperties.jitsiUrl()}
                        placeholder={$LL.mapEditor.properties.jitsiProperties.jitsiUrlPlaceholder()}
                        bind:value={property.jitsiUrl}
                        onChange={onValueChange}
                    />
                </div>
                {#if !property.hideButtonLabel}
                    <div class="value-input">
                        <Input
                            id="jitsiButtonLabel"
                            type="text"
                            label={$LL.mapEditor.entityEditor.buttonLabel()}
                            bind:value={property.buttonLabel}
                            onChange={onValueChange}
                        />
                    </div>
                {/if}
                {#if triggerOptionActivated}
                    <div>
                        <Select
                            id="trigger"
                            label={$LL.mapEditor.properties.jitsiProperties.trigger()}
                            bind:value={property.trigger}
                            onChange={onTriggerValueChange}
                        >
                            <option value={undefined}
                                >{$LL.mapEditor.properties.jitsiProperties.triggerShowImmediately()}</option
                            >
                            <option value="onicon">{$LL.mapEditor.properties.jitsiProperties.triggerOnClick()}</option>
                            <option value="onaction"
                                >{$LL.mapEditor.properties.jitsiProperties.triggerOnAction()}</option
                            >
                        </Select>
                    </div>
                {/if}
                {#if (isArea && triggerOptionActivated && triggerOnActionChoosen) || !isArea}
                    <div class="value-input flex flex-col">
                        <Input
                            id="triggerMessage"
                            label={$LL.mapEditor.properties.linkProperties.triggerMessage()}
                            type="text"
                            placeholder={$LL.trigger.object()}
                            bind:value={property.triggerMessage}
                            onChange={onValueChange}
                        />
                    </div>
                {/if}

                <button on:click={OpenPopup}>{$LL.mapEditor.properties.jitsiProperties.moreOptionsLabel()} </button>

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
    .value-input {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
    }

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
    // .advanced-option {
    //     display: none;
    //     &.active {
    //         display: block;
    //     }
    // }
</style>
