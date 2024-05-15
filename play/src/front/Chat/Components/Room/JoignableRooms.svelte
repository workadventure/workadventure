<script lang="ts">
    import highlightWords from "highlight-words";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatSearchBarValue, joignableRoom, selectedRoom } from "../../Stores/ChatStore";
    import Avatar from "../Avatar.svelte";

    export let room: {
        id: string,
        name: string
    };
    let displayInvitationRoomActions = false;
    const chat = gameManager.getCurrentGameScene().chatConnection;

    function toggleDisplayInvitationRoomActions() {
        displayInvitationRoomActions = !displayInvitationRoomActions;
    }

    async function joinRoom() {
        const newRoom = await chat.joinRoom(room.id);
        joignableRoom.set([]);
        chatSearchBarValue.set("");
        selectedRoom.set(newRoom);

    }

    $: chunks = highlightWords({
        text: room.name.match(/\[\d*]/) ? room.name.substring(0, room.name.search(/\[\d*]/)) : room.name,
        query: $chatSearchBarValue
    });
</script>

<div
    class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-1"
    on:click={toggleDisplayInvitationRoomActions}>
    <div class="tw-relative">
        <Avatar avatarUrl={null} fallbackFirstLetter={room.name.charAt(0)} />
    </div>
    <div>
        {#each chunks as chunk (chunk.key)}
            <span class:tw-text-light-blue={chunk.match} class="tw-cursor-default">{chunk.text}</span>
        {/each}
    </div>
</div>
{#if displayInvitationRoomActions}
    <div class="tw-flex">
        <button class="tw-text-blue-300" on:click={()=>joinRoom()}>Join</button>
    </div>
{/if}
