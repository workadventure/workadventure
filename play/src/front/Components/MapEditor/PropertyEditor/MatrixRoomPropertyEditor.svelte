<script lang="ts">
    import { MatrixRoomPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher, onMount } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
  


    export let property: MatrixRoomPropertyData;

    const gameScene = gameManager.getCurrentGameScene();
    const roomConnection = gameScene.connection;

    const dispatch = createEventDispatcher();

    function onValueChange() {
        dispatch("change");
    }

    onMount(()=>{
            if(!property.matrixRoomId && roomConnection){
                roomConnection.queryCreateChatRoomForArea(property.id)
                .then((answer)=>{
                    property.matrixRoomId = answer.chatRoomID;
                    dispatch("change");
                })
                .catch(error=>console.error(error));
             
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
        <div class="value-input">
            <label for="openAutomaticallyChatLabel">{$LL.mapEditor.properties.matrixProperties.openAutomaticallyChatLabel()}</label>
            <input
                id="openAutomaticallyChatLabel"
                type="checkbox"
                bind:checked={property.shouldOpenAutomatically}
                on:change={onValueChange}
            />
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
</style>
