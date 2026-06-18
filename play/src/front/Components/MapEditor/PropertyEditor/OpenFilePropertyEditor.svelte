<script lang="ts">
    import { onMount } from "svelte";
    import type { OpenFilePropertyData } from "@workadventure/map-editor";
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
    import type { InputTagOption } from "../../Input/InputTagOption";
    import { IconFile } from "../../Icons";
    import FileUpload from "./FileUpload/FileUpload.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: OpenFilePropertyData;
        isArea?: boolean;
        triggerOptionActivated?: boolean;
        triggerOnActionChoosen?: boolean;
        onchange?: (link?: string | null) => void;
        onclose?: () => void;
    }

    let {
        property = $bindable(),
        isArea = false,
        triggerOptionActivated = true,
        triggerOnActionChoosen = property.trigger === ON_ACTION_TRIGGER_BUTTON,
        onchange,
        onclose,
    }: Props = $props();

    type Option = {
        value: string;
        label: string;
        created: boolean | undefined;
    };

    let optionAdvancedActivated = $state(shouldDisplayAdvancedOption());
    let policy: Option[] | undefined = $state(undefined);
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

    function shouldDisplayAdvancedOption(): boolean {
        return !!(property.policy || !property.closable || property.width || property.newTab);
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
                [],
            );
    });

    function onValueChange() {
        onchange?.(property.link);
    }

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === ON_ACTION_TRIGGER_BUTTON;
        onchange?.(property.link);
    }

    function handlePolicyChange() {
        if (policy == undefined) {
            policy = [];
        }
        property.policy = policy?.reduce((policyStr, policy) => `${policyStr}${policy.value};`, "");
        onValueChange();
    }

    function deleteFile() {
        if (property.link === null && property.name === null) {
            return;
        }

        property.link = null;
        property.name = null;
        onchange?.(property.link);
    }
</script>

<PropertyEditorBase
    onclose={() => {
        deleteFile();
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconFile font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.openFile.label()}
        </span>
    {/snippet}

    {#snippet content()}
        <span>
            {#if isArea}
                <Select
                    id="trigger"
                    label={$LL.mapEditor.properties.openWebsite.trigger()}
                    bind:value={property.trigger}
                    onchange={onTriggerValueChange}
                >
                    <option value={ON_ACTION_TRIGGER_ENTER}>
                        {$LL.mapEditor.properties.openWebsite.triggerShowImmediately()}
                    </option>
                    {#if !property.newTab}
                        <option value={ON_ICON_TRIGGER_BUTTON}>
                            {$LL.mapEditor.properties.openWebsite.triggerOnClick()}
                        </option>
                    {/if}
                    <option value={ON_ACTION_TRIGGER_BUTTON}>
                        {$LL.mapEditor.properties.openWebsite.triggerOnAction()}
                    </option>
                </Select>
            {/if}

            <FileUpload
                bind:property
                onchange={() => {
                    onchange?.(property.link);
                }}
                ondeleteFile={() => {
                    deleteFile();
                }}
            />

            {#if !property.hideButtonLabel}
                <div class=" flex flex-col">
                    <Input
                        label={$LL.mapEditor.entityEditor.buttonLabel()}
                        id="linkButton"
                        type="text"
                        bind:value={property.buttonLabel}
                        onchange={onValueChange}
                    />
                </div>
            {/if}

            <InputSwitch
                id="advancedOption"
                label={$LL.mapEditor.properties.advancedOptions()}
                bind:value={optionAdvancedActivated}
            />

            <div class:active={optionAdvancedActivated} class="advanced-option">
                {#if (isArea && triggerOptionActivated && triggerOnActionChoosen) || !isArea}
                    <Input
                        id="triggerMessage"
                        type="text"
                        placeholder={$LL.trigger.object()}
                        label={$LL.mapEditor.properties.openWebsite.triggerMessage()}
                        bind:value={property.triggerMessage}
                        onchange={onValueChange}
                    />
                {/if}

                <InputSwitch
                    id="newTab"
                    label={$LL.mapEditor.properties.openWebsite.newTabLabel()}
                    bind:value={property.newTab}
                    onchange={onValueChange}
                />

                <InputSwitch
                    id="hideUrl"
                    label={$LL.mapEditor.properties.openWebsite.hideUrlLabel()}
                    bind:value={property.hideUrl}
                    onchange={onValueChange}
                />

                {#if !property.newTab}
                    <div class="mt-3 mb-3">
                        <RangeSlider
                            id="websiteWidth"
                            min={15}
                            label={$LL.mapEditor.properties.openWebsite.width()}
                            max={85}
                            bind:value={property.width}
                            onchange={onValueChange}
                            variant="secondary"
                            buttonShape="square"
                        />
                    </div>

                    <InputCheckbox
                        id="closable"
                        label={$LL.mapEditor.properties.openWebsite.closable()}
                        bind:value={property.closable}
                        onchange={onValueChange}
                    />

                    {#if policy != undefined}
                        <InputTags
                            label={$LL.mapEditor.properties.openWebsite.policy()}
                            options={policyOption}
                            bind:value={policy}
                            onchange={handlePolicyChange}
                        />
                    {/if}
                {/if}
            </div>
        </span>
    {/snippet}
</PropertyEditorBase>

<style lang="scss">
    .advanced-option {
        display: none;

        &.active {
            display: block;
        }
    }
</style>
