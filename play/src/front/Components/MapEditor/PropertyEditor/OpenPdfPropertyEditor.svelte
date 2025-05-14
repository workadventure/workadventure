<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { OpenPdfPropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import Select from "../../Input/Select.svelte";
    import {
        ON_ACTION_TRIGGER_BUTTON,
        ON_ACTION_TRIGGER_ENTER,
        ON_ICON_TRIGGER_BUTTON,
    } from "../../../WebRtc/LayoutManager";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import { InputTagOption } from "../../Input/InputTagOption";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { DeleteFileFrontCommand } from "../../../Phaser/Game/MapEditor/Commands/File/DeleteFileFrontCommand";
    import FileUpload from "./FileUpload/FileUpload.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: OpenPdfPropertyData;

    type Option = {
        value: string;
        label: string;
        created: boolean | undefined;
    };

    let optionAdvancedActivated = shouldDisplayAdvancedOption();
    let policy: Option[] | undefined = undefined;
    let policyOption: InputTagOption[] = [
        { value: "accelerometer", label: "accelerometer", created: undefined },
        { value: "ambient-light-sensor", label: "ambient-light-sensor", created: undefined },
        { value: "autoplay", label: "autoplay", created: undefined },
        { value: "battery", label: "battery", created: undefined },
        { value: "browsing-topics", label: "browsing-topics", created: undefined },
        { value: "camera", label: "camera", created: undefined },
        { value: "document-domain", label: "document-domain", created: undefined },
        { value: "encrypted-media", label: "encrypted-media", created: undefined },
        { value: "execution-while-not-rendered", label: "execution-while-not-rendered", created: undefined },
        { value: "execution-while-out-of-viewport", label: "execution-while-out-of-viewport", created: undefined },
        { value: "fullscreen", label: "fullscreen", created: undefined },
        { value: "gamepad", label: "gamepad", created: undefined },
        { value: "geolocation", label: "geolocation", created: undefined },
        { value: "gyroscope", label: "gyroscope", created: undefined },
        { value: "hid", label: "hid", created: undefined },
        { value: "identity-credentials-get", label: "identity-credentials-get", created: undefined },
        { value: "idle-detection", label: "idle-detection", created: undefined },
        { value: "local-fonts ", label: "local-fonts", created: undefined },
        { value: "magnetometer", label: "magnetometer", created: undefined },
        { value: "microphone", label: "microphone", created: undefined },
        { value: "midi", label: "midi", created: undefined },
        { value: "otp-credentials", label: "otp-credentials", created: undefined },
        { value: "payment", label: "payment", created: undefined },
        { value: "picture-in-picture", label: "picture-in-picture", created: undefined },
        { value: "publickey-credentials-get", label: "publickey-credentials-get", created: undefined },
        { value: "screen-wake-lock", label: "screen-wake-lock", created: undefined },
        { value: "serial", label: "serial", created: undefined },
        { value: "speaker-selection", label: "speaker-selection", created: undefined },
        { value: "storage-access", label: "storage-access", created: undefined },
        { value: "usb", label: "usb", created: undefined },
        { value: "web-share", label: "web-share", created: undefined },
        { value: "window-management", label: "window-management", created: undefined },
        { value: "xr-spatial-tracking", label: "xr-spatial-tracking", created: undefined },
    ];

    const dispatch = createEventDispatcher<{
        change: string | null | undefined;
        close: undefined;
    }>();

    function shouldDisplayAdvancedOption(): boolean {
        return !!(property.policy || property.allowAPI || !property.closable || property.width || property.newTab);
    }

    onMount(() => {
        // Format policy for input tag policy
        policy = property.policy
            ?.split(";")
            .reduce(
                (options: Option[], value) =>
                    value != ""
                        ? [...options, { value: value.trim(), label: value.trim(), created: undefined }]
                        : options,
                []
            ) as Option[];
    });

    function onValueChange() {
        if (property.link) {
            dispatch("change");
        }
    }

    function handlePolicyChange() {
        if (policy == undefined) {
            policy = [];
        }
        property.policy = policy?.reduce((policyStr, policy) => `${policyStr}${policy.value};`, "");
        onValueChange();
    }

    function deleteFile() {
        const roomConnection = gameManager.getCurrentGameScene()?.connection;
        if (roomConnection === undefined) throw new Error("No connection");

        if (property.link === null || property.name === null) {
            return;
        }

        const fileToDelete = {
            propertyId: property.id,
            name: property.name,
        };
        const deleteFileCommand = new DeleteFileFrontCommand(fileToDelete);
        deleteFileCommand.emitEvent(roomConnection);

        property.file = undefined;
        property.link = null;
        property.name = null;
        dispatch("change");
    }
</script>

<PropertyEditorBase
    on:close={() => {
        deleteFile();
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
            onChange={onValueChange}
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
                dispatch("change");
            }}
            on:deleteFile={() => {
                deleteFile();
            }}
        />

        <InputSwitch
            id="advancedOption"
            label={$LL.mapEditor.properties.advancedOptions()}
            bind:value={optionAdvancedActivated}
        />

        <div class:active={optionAdvancedActivated} class="advanced-option px-2">
            {#if property.trigger == ON_ACTION_TRIGGER_BUTTON}
                <Input
                    id="triggerMessage"
                    type="text"
                    placeholder={$LL.trigger.object()}
                    label={$LL.mapEditor.properties.linkProperties.triggerMessage()}
                    bind:value={property.triggerMessage}
                    onChange={onValueChange}
                />
            {/if}

            <InputSwitch
                id="newTab"
                label={$LL.mapEditor.properties.linkProperties.newTabLabel()}
                bind:value={property.newTab}
                onChange={onValueChange}
            />

            <!-- Replace with this to add the forceNewTab option
            <InputSwitch
                id="newTab"
                label={$LL.mapEditor.properties.linkProperties.newTabLabel()}
                bind:value={property.newTab}
                onChange={onValueChange}
                disabled={property.forceNewTab}
            />

            {#if property.forceNewTab == true}
                <div class="mb-3 ">
                    <span class="err text-warning-900 text-xs italic">
                        <IconAlertTriangle font-size="12" />
                        {$LL.mapEditor.properties.linkProperties.forcedInNewTab()}
                    </span>
                </div>
            {/if} -->
            {#if !property.newTab}
                <div class="mt-3 mb-3">
                    <!-- <label for="websiteWidth"
                        >{$LL.mapEditor.properties.linkProperties.width()}: {property.width ?? 50}%</label
                    > -->

                    <RangeSlider
                        id="websiteWidth"
                        min={15}
                        label={$LL.mapEditor.properties.linkProperties.width()}
                        max={85}
                        bind:value={property.width}
                        onChange={onValueChange}
                        variant="secondary"
                        buttonShape="square"
                    />
                </div>

                <InputCheckbox
                    id="closable"
                    label={$LL.mapEditor.properties.linkProperties.closable()}
                    bind:value={property.closable}
                    onChange={onValueChange}
                />

                <InputCheckbox
                    id="allowAPI"
                    label={$LL.mapEditor.properties.linkProperties.allowAPI()}
                    bind:value={property.allowAPI}
                    onChange={onValueChange}
                />

                {#if policy != undefined}
                    <div class="value-input flex flex-col">
                        <InputTags
                            label={$LL.mapEditor.properties.linkProperties.policy()}
                            options={policyOption}
                            bind:value={policy}
                            handleChange={handlePolicyChange}
                        />
                    </div>
                {/if}
            {/if}
        </div>
    </span>
</PropertyEditorBase>
