<script lang="ts">
    import highlightWords from "highlight-words";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatSearchBarValue, joignableRoom, selectedRoom } from "../../Stores/ChatStore";
    import Avatar from "../Avatar.svelte";
    import { fade } from "svelte/transition";

    export let room: { id: string; name: string | undefined };
    let displayInvitationRoomActions = false;
    const chat = gameManager.getCurrentGameScene().chatConnection;
    let joinRoomError: string | undefined = undefined;

    function toggleDisplayInvitationRoomActions() {
        displayInvitationRoomActions = !displayInvitationRoomActions;
    }

    async function joinRoom() {
        try {
            const newRoom = await chat.joinRoom(room.id);
            joignableRoom.set([]);
            chatSearchBarValue.set("");
            selectedRoom.set(newRoom);
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                joinRoomError = error.message;
            } else {
                joinRoomError = "Unknown error";
            }
            setTimeout(() => {
                joinRoomError = undefined;
            }, 1000);
        }
    }

    $: chunks = highlightWords({
        text: room.name?.match(/\[\d*]/)
            ? room.name?.substring(0, room.name?.search(/\[\d*]/))
            : room.name
            ? room.name
            : "",
        query: $chatSearchBarValue,
    });
</script>

<div
    class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-1"
    on:click={toggleDisplayInvitationRoomActions}
>
    <div class="tw-relative">
        <Avatar avatarUrl={null} fallbackName={room.name} />
    </div>
    <div>
        {#each chunks as chunk (chunk.key)}
            <span class:tw-text-light-blue={chunk.match} class="tw-cursor-default">{chunk.text}</span>
        {/each}
    </div>
</div>
{#if displayInvitationRoomActions}
    <div class="tw-flex">
        <button class="tw-text-blue-300" on:click={() => joinRoom()}>Join</button>
    </div>
{/if}
{#if joinRoomError}
    <div transition:fade class="tw-flex tw-bg-red-500 tw-rounded-md tw-p-2">{joinRoomError}</div>
{/if}
