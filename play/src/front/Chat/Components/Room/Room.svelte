<script lang="ts">
    import highlightWords from "highlight-words";
    import {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomNotificationControl,
    } from "../../Connection/ChatConnection";
    import { chatSearchBarValue, selectedRoomStore } from "../../Stores/ChatStore";
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
    class="tw-group/chatItem tw-relative tw-mb-[1px] tw-text-md tw-m-0 tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white tw-transition-all hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-2 tw-cursor-pointer tw-w-full"
    class:tw-bg-white={isSelected}
    class:tw-bg-opacity-10={isSelected}
    class:tw-rounded-md={isSelected}
    on:click={() => selectedRoomStore.set(room)}
    on:keyup={() => selectedRoomStore.set(room)}
    role="button"
    tabindex="0"
    data-testid={$roomName}
>
    <div class="tw-relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />

        {#if $isEncrypted}
            <EncryptionBadge />
        {/if}
    </div>
    <div class="tw-m-0 tw-flex-1 tw-text-left">
        {#each chunks as chunk (chunk.key)}
            <span
                class="{chunk.match ? 'tw-text-light-blue' : ''} {$hasUnreadMessage
                    ? 'tw-text-white tw-font-bold'
                    : 'tw-text-white/75'} tw-cursor-default tw-text-sm">{chunk.text}</span
            >
        {/each}
    </div>
    {#if $areNotificationsMuted}
        <IconBellOff font-size="12" class="tw-opacity-50" />
    {/if}
    <RoomMenu {room} />
    {#if $hasUnreadMessage}
        <div class="tw-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-relative">
            <div class="tw-rounded-full tw-bg-secondary-200 tw-h-2 tw-w-2 tw-animate-ping tw-absolute" />
            <div class="tw-rounded-full tw-bg-secondary-200 tw-h-1.5 tw-w-1.5 tw-absolute" />
        </div>
    {/if}
</div>
