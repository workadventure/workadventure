<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { CreateRoomOptions } from "../../Connection/ChatConnection";

    let createRoomOptions: CreateRoomOptions = { visibility: "public" };
    let createRoomError: string;


    const chat = gameManager.getCurrentGameScene().chatConnection;
    const dispatch = createEventDispatcher();

    async function createNewRoom(createRoomOptions: CreateRoomOptions) {
        try {
            await chat.createRoom(createRoomOptions);
            dispatch("onCreatedRoom");
        } catch (error) {
            console.error(error);
            createRoomError = error.message;
        }
    }
</script>

<form class="tw-flex tw-flex-col tw-gap-2" on:submit|preventDefault={()=>createNewRoom(createRoomOptions)}>
    {#if createRoomError !== undefined}
        <p>Unable to create the room.</p>
    {/if}
    <input
        class="tw-w-full tw-rounded-md wa-searchbar tw-block tw-text-white placeholder:tw-text-sm tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
        placeholder="Name"
        bind:value={createRoomOptions.name} />
    <select bind:value={createRoomOptions.visibility}>
        <option value="private">Private</option>
        <option value="public">Public</option>
    </select>
    <div class="tw-flex tw-flex-row tw-self-end">
        <button class="tw-text-red-500"  on:click|preventDefault={()=>dispatch("onCancelRoomCreation")}>Cancel</button>
        <button class="tw-text-blue-300" type="submit">Create</button>
    </div>

</form>
