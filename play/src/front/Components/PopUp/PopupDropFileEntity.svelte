<script lang="ts">
    import { v4 as uuidv4 } from "uuid";
    import { get } from "svelte/store";
    import type { EntityPrefab, OpenFilePropertyData, WAMEntityData } from "@workadventure/map-editor";
    import Input from "../Input/Input.svelte";
    import InputSwitch from "../Input/InputSwitch.svelte";
    import InputCheckbox from "../Input/InputCheckbox.svelte";
    import InputTags from "../Input/InputTags.svelte";
    import RangeSlider from "../Input/RangeSlider.svelte";
    import Select from "../Input/Select.svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { UploadFileFrontCommand } from "../../Phaser/Game/MapEditor/Commands/File/UploadFileFrontCommand";
    import { CreateEntityFrontCommand } from "../../Phaser/Game/MapEditor/Commands/Entity/CreateEntityFrontCommand";
    import { gameSceneStore } from "../../Stores/GameSceneStore";
    import {
        ON_ACTION_TRIGGER_ENTER,
        ON_ICON_TRIGGER_BUTTON,
        ON_ACTION_TRIGGER_BUTTON,
    } from "../../WebRtc/LayoutManager";
    import type { InputTagOption } from "../Input/InputTagOption";
    import { popupStore } from "../../Stores/PopupStore";
    import LL from "../../../i18n/i18n-svelte";
    import DropFileEntityPicker from "./DropFileEntityPicker.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    export let x: number;
    export let y: number;
    export let file: File;

    let property = {
        link: null,
        name: null,
        trigger: ON_ACTION_TRIGGER_ENTER,
        buttonLabel: "Open",
        newTab: false,
        hideButtonLabel: false,
        triggerMessage: "",
        closable: true,
        width: 50,
    };

    let entity = {
        prefabRef: {
            id: "basic office decoration:Books (Variant 5):black:Down",
            collectionName: "basic office decoration",
        },
    };

    let policy: InputTagOption[] | undefined = undefined;

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

    let isArea = true;
    let optionAdvancedActivated = false;
    const triggerOptionActivated = true;
    const triggerOnActionChoosen = true;

    function selectEntity(entityPrefab: EntityPrefab) {
        entity.prefabRef.id = entityPrefab.id;
        entity.prefabRef.collectionName = entityPrefab.collectionName;
    }

    async function onSave() {
        const scene = gameManager.getCurrentGameScene();
        const pointerX = x;
        const pointerY = y;

        const propertyId = uuidv4();
        const entityId = uuidv4();

        const lastDot = file.name.lastIndexOf(".");
        const name = file.name.slice(0, lastDot);
        const fileExt = file.name.slice(lastDot + 1);
        const fileUrl = `${get(
            gameSceneStore
        )?.room.mapStorageUrl?.toString()}private/files/${name}-${propertyId}.${fileExt}`;

        const entityData: WAMEntityData = {
            x: Math.floor(pointerX - 16),
            y: Math.floor(pointerY - 16),
            prefabRef: {
                id: entity.prefabRef.id,
                collectionName: entity.prefabRef.collectionName,
            },
            properties: [],
            name: name,
        };
        console.log("Creating entity with data:", entityData);

        const propertyObj: OpenFilePropertyData = {
            type: "openFile",
            newTab: property.newTab,
            link: fileUrl,
            id: propertyId,
            name: file.name,
            buttonLabel: property.buttonLabel || "Open",
            trigger: property.trigger as OpenFilePropertyData["trigger"],
            triggerMessage: property.triggerMessage,
            closable: property.closable,
            width: property.width,
        };

        entityData.properties?.push(propertyObj);

        // Upload file
        const fileBuffer = await file.arrayBuffer();
        const fileAsUint8Array = new Uint8Array(fileBuffer);
        const fileToUpload = {
            id: uuidv4(),
            file: fileAsUint8Array,
            name: file.name,
            propertyId,
        };

        const roomConnection = scene.connection;
        if (!roomConnection) throw new Error("No room connection");

        new UploadFileFrontCommand(fileToUpload).emitEvent(roomConnection);

        // Create Entity
        const mapEditorModeManager = scene.getMapEditorModeManager();
        const entitiesManager = scene.getGameMapFrontWrapper().getEntitiesManager();

        console.log("Executing CreateEntityFrontCommand with entityId:", entityId, "and entityData:", entityData);
        await mapEditorModeManager.executeCommand(
            new CreateEntityFrontCommand(scene.getGameMap(), entityId, entityData, undefined, entitiesManager, {
                width: 32,
                height: 32,
            })
        );

        removePopup();
    }

    function removePopup() {
        popupStore.removePopup("popupDropFileEntity");
    }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="flex flex-col gap-4 p-2 max-h-[80vh] overflow-y-auto">
        <DropFileEntityPicker on:select={(event) => selectEntity(event.detail)} />

        <div class="flex justify-center items-center my-2">
            <img class="w-6 mr-1" src="resources/icons/icon_file.png" alt="Start icon" />
            <span class="font-semibold">{$LL.mapEditor.properties.openFileProperties.label()}</span>
        </div>

        {#if isArea}
            <Select
                id="trigger"
                label={$LL.mapEditor.properties.linkProperties.trigger()}
                bind:value={property.trigger}
            >
                <option value={ON_ACTION_TRIGGER_ENTER}
                    >{$LL.mapEditor.properties.linkProperties.triggerShowImmediately()}</option
                >
                {#if !property.newTab}
                    <option value={ON_ICON_TRIGGER_BUTTON}
                        >{$LL.mapEditor.properties.linkProperties.triggerOnClick()}</option
                    >
                {/if}
                <option value={ON_ACTION_TRIGGER_BUTTON}
                    >{$LL.mapEditor.properties.linkProperties.triggerOnAction()}</option
                >
            </Select>
        {/if}

        {#if !property.hideButtonLabel}
            <Input
                label={$LL.mapEditor.entityEditor.buttonLabel()}
                id="linkButton"
                type="text"
                bind:value={property.buttonLabel}
            />
        {/if}

        <InputSwitch
            id="advancedOption"
            label={$LL.mapEditor.properties.advancedOptions()}
            bind:value={optionAdvancedActivated}
        />

        <div class:active={optionAdvancedActivated} class="advanced-option px-2">
            {#if (isArea && triggerOptionActivated && triggerOnActionChoosen) || !isArea}
                <Input
                    id="triggerMessage"
                    type="text"
                    placeholder={$LL.trigger.object()}
                    label={$LL.mapEditor.properties.linkProperties.triggerMessage()}
                    bind:value={property.triggerMessage}
                />
            {/if}

            <InputSwitch
                id="newTab"
                label={$LL.mapEditor.properties.linkProperties.newTabLabel()}
                bind:value={property.newTab}
            />

            {#if !property.newTab}
                <div class="mt-3 mb-3">
                    <RangeSlider
                        id="websiteWidth"
                        min={15}
                        max={85}
                        label={$LL.mapEditor.properties.linkProperties.width()}
                        bind:value={property.width}
                        variant="secondary"
                        buttonShape="square"
                    />
                </div>

                <InputCheckbox
                    id="closable"
                    label={$LL.mapEditor.properties.linkProperties.closable()}
                    bind:value={property.closable}
                />

                {#if policy !== undefined}
                    <InputTags
                        label={$LL.mapEditor.properties.linkProperties.policy()}
                        options={policyOption}
                        bind:value={policy}
                    />
                {/if}
            {/if}
        </div>
    </div>

    <svelte:fragment slot="buttons">
        <button class="btn btn-primary btn-sm w-full max-w-96 justify-center" on:click={onSave}>Save</button>
        <button class="btn btn-secondary btn-sm w-full max-w-96 justify-center" on:click={() => removePopup}
            >Cancel</button
        >
    </svelte:fragment>
</PopUpContainer>
