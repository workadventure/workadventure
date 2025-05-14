<script lang="ts">
    import highlightWords from "highlight-words";
    import {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomNotificationControl,
    } from "../../Connection/ChatConnection";
    import { chatSearchBarValue } from "../../Stores/ChatStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import Avatar from "../Avatar.svelte";
    import EncryptionBadge from "../EncryptionBadge.svelte";
    import RoomMenu from "./RoomMenu/RoomMenu.svelte";
    import { IconBellOff } from "@wa-icons";

    export let room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomNotificationControl;

    let hasUnreadMessage = room.hasUnreadMessages;
    let roomName = room.name;
    let isEncrypted = room.isEncrypted;
    const areNotificationsMuted = room.areNotificationsMuted;

    $: chunks = highlightWords({
        text: $roomName.match(/\[\d*]/) ? $roomName.substring(0, $roomName.search(/\[\d*]/)) : $roomName,
        query: $chatSearchBarValue,
    });

    $: isSelected = $selectedRoomStore?.id === room.id;
</script>

<div
    class="group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center hover:bg-white transition-all hover:bg-opacity-10 hover:rounded hover:!cursor-pointer p-2 cursor-pointer w-full"
    class:bg-white={isSelected}
    class:bg-opacity-10={isSelected}
    class:rounded={isSelected}
    on:click={() => selectedRoomStore.set(room)}
    on:keyup={() => selectedRoomStore.set(room)}
    role="button"
    tabindex="0"
    data-testid={$roomName}
>
    <div class="relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />

        {#if $isEncrypted}
            <EncryptionBadge />
        {/if}
    </div>
    <div class="m-0 flex-1 text-start">
        {#each chunks as chunk (chunk.key)}
            <span
                class="{chunk.match ? 'text-light-blue' : ''} {$hasUnreadMessage
                    ? 'text-white font-bold'
                    : 'text-white/75'} cursor-default text-sm">{chunk.text}</span
            >
        {/each}
    </div>
    {#if $areNotificationsMuted}
        <IconBellOff font-size="12" class="opacity-50" />
    {/if}
    <RoomMenu {room} />
    {#if $hasUnreadMessage}
        <div class="flex items-center justify-center h-7 w-7 relative">
            <div class="rounded-full bg-secondary-200 h-2 w-2 animate-ping absolute" />
            <div class="rounded-full bg-secondary-200 h-1.5 w-1.5 absolute" />
        </div>
    {/if}
</div>
