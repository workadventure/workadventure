<script lang="ts">
    import { MatrixRoomPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";

    export let property: MatrixRoomPropertyData;
    let oldName = property.displayName;
    
    const gameScene = gameManager.getCurrentGameScene();
    const roomConnection = gameScene.connection;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }

    onMount(() => {
        if (!property.matrixRoomId && roomConnection) {
            console.log('call roomConnection queryCreateChatRoomForArea');
            roomConnection
                .queryCreateChatRoomForArea(property.id)
                .then((answer) => {
                    property.matrixRoomId = answer.chatRoomID;
                    //use this instead of dispatch beacause if then is execute before areaeditor was close : no effect ...
                    if($mapEditorSelectedAreaPreviewStore){
                        $mapEditorSelectedAreaPreviewStore.updateProperty(property);
                    }else{
                        console.log('$mapEditorSelectedAreaPreviewStore is empty ')
                    }
                        
                })
                .catch((error) => console.error(error));
        }
    });

    onDestroy(() => {
        if (oldName !== property.displayName && roomConnection) {
            roomConnection.emitChatRoomAreaNameChange(property.matrixRoomId, property.displayName);
            dispatch("change");
            return;
        }
        if (property.displayName === "" && roomConnection) {
            roomConnection.emitChatRoomAreaNameChange(
                property.matrixRoomId,
                $LL.mapEditor.properties.matrixProperties.defaultChatRoomAreaName()
            );
            dispatch("change");
            return;
        }
    });
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_focus.png"
            alt={$LL.mapEditor.properties.matrixProperties.description()}
        />
        {$LL.mapEditor.properties.matrixProperties.label()}
    </span>
    <span slot="content">
        <div class="area-name-container">
            <label for="objectName">{$LL.mapEditor.properties.matrixProperties.roomNameLabel()} : </label>
            <input
                id="objectName"
                type="text"
                placeholder={$LL.mapEditor.properties.matrixProperties.roomNameLabelPlaceholder()}
                bind:value={property.displayName}
                on:change={onValueChange}
            />
        </div>
        <div class="value-input">
            <input
                id="openAutomaticallyChatLabel"
                data-testid="shouldOpenAutomaticallyCheckbox"
                type="checkbox"
                class="tw-w-4 tw-h-4"
                bind:checked={property.shouldOpenAutomatically}
                on:change={onValueChange}
            />
            <label for="openAutomaticallyChatLabel"
                >{$LL.mapEditor.properties.matrixProperties.openAutomaticallyChatLabel()}</label
            >
        </div>
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-input {
        display: flex;
        flex-direction: row;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        gap: 10px;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 0;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
