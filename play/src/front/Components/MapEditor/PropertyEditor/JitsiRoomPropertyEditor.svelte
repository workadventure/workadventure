<script lang="ts">
    import type { JitsiRoomConfigData, JitsiRoomPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Input from "../../Input/Input.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import Select from "../../Input/Select.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import jitsiPng from "../../images/jitsi.png";
    import {
        ON_ACTION_TRIGGER_BUTTON,
        ON_ACTION_TRIGGER_ENTER,
        ON_ICON_TRIGGER_BUTTON,
    } from "../../../WebRtc/LayoutManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import JitsiRoomConfigEditor from "./JitsiRoomConfigEditor.svelte";
    import { modals } from "@wa-modals";

    interface Props {
        property: JitsiRoomPropertyData;
        triggerOnActionChoosen?: boolean;
        triggerOptionActivated?: boolean;
        isArea?: boolean;
        onchange?: () => void;
        onclose?: () => void;
    }

    let {
        property = $bindable(),
        triggerOnActionChoosen = property.trigger === ON_ACTION_TRIGGER_BUTTON,
        triggerOptionActivated = true,
        isArea = false,
        onchange,
        onclose,
    }: Props = $props();
    let optionAdvancedActivated = $state(false);

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === ON_ACTION_TRIGGER_BUTTON;
        onchange?.();
    }

    function onValueChange() {
        onchange?.();
    }

    let jitsiConfigModalOpened = false;

    function OpenPopup() {
        modals.open(JitsiRoomConfigEditor, {
            visibilityValue: jitsiConfigModalOpened,
            config: property.jitsiRoomConfig,
            jitsiRoomAdminTag: property.jitsiRoomAdminTag,
            onsave: (config: JitsiRoomConfigData & { jitsiRoomAdminTag: string }) => {
                property.jitsiRoomConfig = $state.snapshot(config);
                property.jitsiRoomAdminTag = config.jitsiRoomAdminTag;
                onchange?.();
            },
        });
        jitsiConfigModalOpened = true;
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
                draggable="false"
                class="w-6 me-2"
                src={jitsiPng}
                alt={$LL.mapEditor.properties.jitsiRoomProperty.description()}
            />
            {$LL.mapEditor.properties.jitsiRoomProperty.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <Input
                id="roomName"
                type="text"
                label={$LL.mapEditor.properties.jitsiRoomProperty.roomNameLabel()}
                placeholder={$LL.mapEditor.properties.jitsiRoomProperty.roomNamePlaceholder()}
                bind:value={property.roomName}
                onchange={onValueChange}
            />

            <InputSwitch
                id="advancedOption"
                label={$LL.mapEditor.properties.advancedOptions()}
                bind:value={optionAdvancedActivated}
            />

            {#if optionAdvancedActivated}
                <div class:active={optionAdvancedActivated} class="advanced-option flex flex-col mt-3 gap-2">
                    <div class="value-switch">
                        <InputCheckbox
                            id="closable"
                            label={$LL.mapEditor.properties.jitsiRoomProperty.closable()}
                            bind:value={property.closable}
                            onchange={onValueChange}
                        />
                    </div>
                    <div>
                        <RangeSlider
                            label={$LL.mapEditor.properties.jitsiRoomProperty.width()}
                            min={15}
                            max={85}
                            placeholder="50"
                            bind:value={property.width}
                            onchange={onValueChange}
                            variant="secondary"
                            buttonShape="square"
                        />
                    </div>

                    <InputSwitch
                        id="noPrefix"
                        label={$LL.mapEditor.properties.jitsiRoomProperty.noPrefix()}
                        bind:value={property.noPrefix}
                        onchange={onValueChange}
                    />

                    <Input
                        id="jitsiUrl"
                        type="url"
                        label={$LL.mapEditor.properties.jitsiRoomProperty.jitsiUrl()}
                        placeholder={$LL.mapEditor.properties.jitsiRoomProperty.jitsiUrlPlaceholder()}
                        bind:value={property.jitsiUrl}
                        onchange={onValueChange}
                    />
                    {#if !property.hideButtonLabel}
                        <Input
                            id="jitsiButtonLabel"
                            type="text"
                            label={$LL.mapEditor.entityEditor.buttonLabel()}
                            bind:value={property.buttonLabel}
                            onchange={onValueChange}
                        />
                    {/if}
                    {#if triggerOptionActivated}
                        <div>
                            <Select
                                id="trigger"
                                label={$LL.mapEditor.properties.jitsiRoomProperty.trigger()}
                                bind:value={property.trigger}
                                onchange={onTriggerValueChange}
                            >
                                <option value={ON_ACTION_TRIGGER_ENTER}>
                                    {$LL.mapEditor.properties.jitsiRoomProperty.triggerShowImmediately()}</option
                                >
                                <option value={ON_ICON_TRIGGER_BUTTON}>
                                    {$LL.mapEditor.properties.jitsiRoomProperty.triggerOnClick()}</option
                                >
                                <option value={ON_ACTION_TRIGGER_BUTTON}>
                                    {$LL.mapEditor.properties.jitsiRoomProperty.triggerOnAction()}</option
                                >
                            </Select>
                        </div>
                    {/if}
                    {#if (isArea && triggerOptionActivated && triggerOnActionChoosen) || !isArea}
                        <Input
                            id="triggerMessage"
                            label={$LL.mapEditor.properties.openWebsite.triggerMessage()}
                            type="text"
                            placeholder={$LL.trigger.object()}
                            bind:value={property.triggerMessage}
                            onchange={onValueChange}
                        />
                    {/if}

                    <button
                        class="btn bg-transparent rounded-md hover:!bg-white/10 transition-all border !border-white py-2"
                        onclick={OpenPopup}
                        data-testid="livekitRoomMoreOptionsButton"
                    >
                        {$LL.mapEditor.properties.jitsiRoomProperty.moreOptionsLabel()}
                    </button>

                    <!-- <JitsiRoomConfigEditor
                        bind:isOpen={jitsiConfigModalOpened}
                        bind:visibilityValue={jitsiConfigModalOpened}
                        onchange={onConfigChange}
                        bind:config={property.jitsiRoomConfig}
                        bind:jitsiRoomAdminTag={property.jitsiRoomAdminTag}
                    /> -->
                </div>
            {/if}
        </span>
    {/snippet}
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
