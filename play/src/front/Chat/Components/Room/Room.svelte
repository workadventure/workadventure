<script lang="ts">
    import highlightWords from "highlight-words";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { chatSearchBarValue, selectedRoom } from "../../Stores/ChatStore";
    import Avatar from "../Avatar.svelte";
    import EncryptionBadge from "../EncryptionBadge.svelte";
    import RoomMenu from "./RoomMenu/RoomMenu.svelte";

    export let room: ChatRoom;

    let hasUnreadMessage = room.hasUnreadMessages;
    let roomName = room.name;
    let isEncrypted = room.isEncrypted;
    const areNotificationsMuted = room.areNotificationsMuted;

    $: chunks = highlightWords({
        text: $roomName.match(/\[\d*]/) ? $roomName.substring(0, $roomName.search(/\[\d*]/)) : $roomName,
        query: $chatSearchBarValue,
    });

    $: isSelected = $selectedRoom?.id === room.id;
</script>

<div
    class="tw-group/chatItem tw-relative tw-mb-[1px] tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white tw-transition-all hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-2 tw-cursor-pointer"
    class:tw-bg-white={isSelected}
    class:tw-bg-opacity-10={isSelected}
    class:tw-rounded-md={isSelected}
    on:click={() => selectedRoom.set(room)}
>
    <div class="tw-relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />

        {#if $isEncrypted}
            <EncryptionBadge />
        {/if}
    </div>
    <p class="tw-m-0 tw-flex-1">
        {#each chunks as chunk (chunk.key)}
            <span
                class="{chunk.match ? 'tw-text-light-blue' : ''} {$hasUnreadMessage
                    ? 'tw-text-white tw-font-bold'
                    : 'tw-text-white/75'} tw-cursor-default tw-text-sm">{chunk.text}</span
            >
        {/each}
    </p>
    {#if $areNotificationsMuted}
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler icon-tabler-bell-off opacity-50"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke-width="1"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path
                d="M9.346 5.353c.21 -.129 .428 -.246 .654 -.353a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3m-1 3h-13a4 4 0 0 0 2 -3v-3a6.996 6.996 0 0 1 1.273 -3.707"
            />
            <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
            <path d="M3 3l18 18" />
        </svg>
    {/if}
    <RoomMenu {room} />
    {#if $hasUnreadMessage}
        <div class="tw-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-relative">
            <div class="tw-rounded-full tw-bg-secondary-200 tw-h-2 tw-w-2 tw-animate-ping tw-absolute" />
            <div class="tw-rounded-full tw-bg-secondary-200 tw-h-1.5 tw-w-1.5 tw-absolute" />
        </div>
    {/if}
</div>
