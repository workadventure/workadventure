<script lang="ts">
    import highlightWords from "highlight-words";
    import { defaultColor } from "@workadventure/shared-utils";
    import { onDestroy, onMount } from "svelte";
    import type {
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

    const roomType = room.type;
    let hasUnreadMessage = room.hasUnreadMessages;
    const roomUnreadCount = room.unreadNotificationCount;
    let roomName = room.name;
    let isEncrypted = room.isEncrypted;
    const areNotificationsMuted = room.areNotificationsMuted;

    $: chunks = highlightWords({
        text: $roomName.match(/\[\d*]/) ? $roomName.substring(0, $roomName.search(/\[\d*]/)) : $roomName,
        query: $chatSearchBarValue,
    });

    $: isSelected = $selectedRoomStore?.id === room.id;
    $: peerAvatarColorStore = room.avatarFallbackColor;
    $: peerWaParensStore = room.peerWaDisplayNameIfDifferent;
    $: peerWaDisplayNameParens = peerWaParensStore ? $peerWaParensStore : undefined;

    let deactivateVisibleProfileSync: (() => void) | undefined;

    onMount(() => {
        deactivateVisibleProfileSync = room.activateVisibleProfileSync?.();
    });

    onDestroy(() => {
        deactivateVisibleProfileSync?.();
    });
</script>

<div
    class="wa-chat-item group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center hover:bg-white transition-all hover:bg-opacity-10 hover:rounded hover:!cursor-pointer px-2 py-2 cursor-pointer w-full"
    class:bg-white={isSelected}
    class:bg-opacity-10={isSelected}
    class:rounded={isSelected}
    on:click={() => selectedRoomStore.set(room)}
    on:keyup={() => selectedRoomStore.set(room)}
    role="button"
    tabindex="0"
    data-testid={$roomName}
>
    <div class="relative shrink-0">
        <Avatar
            compact
            pictureStore={room.pictureStore}
            fallbackName={$roomName}
            color={$roomType === "direct" ? $peerAvatarColorStore ?? defaultColor : null}
        />

        {#if $isEncrypted}
            <EncryptionBadge />
        {/if}
    </div>
    <div class="m-0 flex-1 min-w-0 text-start">
        {#each chunks as chunk (chunk.key)}
            <span
                class="{chunk.match ? 'text-light-blue' : ''} {$hasUnreadMessage
                    ? 'text-white'
                    : 'text-white/75'} cursor-default text-sm font-bold">{chunk.text}</span
            >
        {/each}{#if peerWaDisplayNameParens}<span class="text-xs font-normal opacity-75 ml-0.5"
                >({peerWaDisplayNameParens})</span
            >{/if}
    </div>
    {#if $areNotificationsMuted}
        <IconBellOff font-size="12" class="opacity-50" />
    {/if}
    <RoomMenu {room} />
    {#if $hasUnreadMessage}
        <div class="relative flex h-7 w-7 items-center justify-center">
            <span class="absolute top-2 start-2 block h-4 w-4 rounded-full bg-white animate-ping" />
            <span class="absolute top-2.5 start-2.5 block h-3 w-3 rounded-full bg-white" />
            <div
                class="flex aspect-square h-5 w-5 items-center justify-center rounded-full bg-success text-sm font-bold leading-none text-contrast z-10"
                aria-label="{$roomUnreadCount} unread"
            >
                <span>{$roomUnreadCount > 9 ? "9" : $roomUnreadCount}</span>
                {#if $roomUnreadCount > 9}
                    <span class="text-xxs">+</span>
                {/if}
            </div>
        </div>
    {/if}
</div>
