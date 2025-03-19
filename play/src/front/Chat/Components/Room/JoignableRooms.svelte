<script lang="ts">
    import highlightWords from "highlight-words";
    import { fade } from "svelte/transition";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatSearchBarValue, joignableRoom } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import Avatar from "../Avatar.svelte";
    import { IconLoader } from "@wa-icons";

    export let room: { id: string; name: string | undefined };
    const chat = gameManager.chatConnection;
    let isJoiningRoom = false;
    let joinRoomError: string | undefined = undefined;

    async function joinRoom() {
        try {
            isJoiningRoom = true;
            const newRoom = await chat.joinRoom(room.id);
            joignableRoom.set([]);
            chatSearchBarValue.set("");
            selectedRoomStore.set(newRoom);
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
        } finally {
            isJoiningRoom = false;
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
    class="text-md flex gap-2 flex-row items-center hover:bg-white hover:bg-opacity-10 hover:rounded hover:!cursor-pointer p-1"
>
    <div class="relative">
        <Avatar avatarUrl={null} fallbackName={room.name} />
    </div>
    <div>
        {#each chunks as chunk (chunk.key)}
            <span class:text-light-blue={chunk.match} class="cursor-default">{chunk.text}</span>
        {/each}
    </div>
</div>
{#if !isJoiningRoom}
    <div class="flex">
        <button class="text-blue-300" on:click={() => joinRoom()}>{$LL.chat.join()}</button>
    </div>
{:else}
    <div class="min-h-[30px] text-md flex gap-2 justify-center flex-row items-center p-1">
        <IconLoader class="animate-spin" />
    </div>
{/if}

{#if joinRoomError}
    <div transition:fade class="flex bg-red-500 rounded p-2">{joinRoomError}</div>
{/if}
