<script lang="ts">
    import { MatrixRoomPropertyData } from "@workadventure/map-editor";
    import { createEventDispatcher } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import Room from "../../../Chat/Components/Room/Room.svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { get } from "svelte/store";
    import { bubble } from "svelte/internal";


    export let property: MatrixRoomPropertyData;
    let roomType : "local" | "remote" =  "local";

    const chat = gameManager.getCurrentGameScene().chatConnection;
    $: roomList = chat.rooms

    const dispatch = createEventDispatcher();

    function onRoomTypeChange(event) {
		roomType = event.currentTarget.value;
	}

    function onValueChange() {
        console.log({property})
        dispatch("change");
    }
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
            <fieldset>
                <legend>Type de room (à modifier) : </legend>
                <div>
                    <input type="radio" id="localRoom" name="typeOfRoom" value="local" checked={roomType==="local"} on:change={onRoomTypeChange}> <label for="localRoom">{ $LL.mapEditor.properties.matrixProperties.localRoomLabel()}</label>
                </div>
                <div>
                    <input type="radio" id="remoteRoom" name="typeOfRoom" value="remote" checked={roomType==="remote"} on:change={onRoomTypeChange}> <label for="remoteRoom">{ $LL.mapEditor.properties.matrixProperties.remoteRoomLabel()}</label>
                </div>
            </fieldset>
        </div>

        {#if roomType === "local"}
            <!--input select avec room dispo + bouton créer une room-->
            <select bind:value={property.matrixRoomId}  on:change={onValueChange} name="rooms" id="room-select">
                <option value="">--Please choose an option--</option>
                {#each $roomList as room (room.id)}
                    <option value={room.id}>{get(room.name)}</option>
                {/each}
            </select>

            <button>{$LL.mapEditor.properties.matrixProperties.createARoom()}</button>

        {:else if roomType === "remote"} 
            <!--input text-->
            <input bind:value={property.matrixRoomId}  on:change={onValueChange} type="text" id="roomId" name="roomId" required minlength="4"/>
        {/if}

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
