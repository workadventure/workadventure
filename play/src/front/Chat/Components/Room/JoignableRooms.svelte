<script lang="ts">
    import highlightWords from "highlight-words";
    import { fade } from "svelte/transition";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatSearchBarValue, joignableRoom, selectedRoomStore } from "../../Stores/ChatStore";
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
    class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-1"
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
{#if !isJoiningRoom}
    <div class="tw-flex">
        <button class="tw-text-blue-300" on:click={() => joinRoom()}>{$LL.chat.join()}</button>
    </div>
{:else}
    <div class="tw-min-h-[30px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1">
        <IconLoader class="tw-animate-spin" />
    </div>
{/if}

{#if joinRoomError}
    <div transition:fade class="tw-flex tw-bg-red-500 tw-rounded-md tw-p-2">{joinRoomError}</div>
{/if}
