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
    import UnreadCount from "../UnreadCount.svelte";
    import { focusAdjacentRoomRow } from "../roomRowKeyboard";
    import RoomMenu from "./RoomMenu/RoomMenu.svelte";
    import { IconBellOff } from "@wa-icons";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomNotificationControl;
    }

    let { room }: Props = $props();

    let roomType = $derived(room.type);
    let hasUnreadMessage = $derived(room.hasUnreadMessages);
    let roomUnreadCount = $derived(room.unreadNotificationCount);
    let roomName = $derived(room.name);
    let isEncrypted = $derived(room.isEncrypted);
    let areNotificationsMuted = $derived(room.areNotificationsMuted);

    let chunks = $derived(
        highlightWords({
            text: $roomName.match(/\[\d*]/) ? $roomName.substring(0, $roomName.search(/\[\d*]/)) : $roomName,
            query: $chatSearchBarValue,
        }),
    );

    let isSelected = $derived($selectedRoomStore?.id === room.id);
    let peerAvatarColorStore = $derived(room.avatarFallbackColor);
    let peerWaParensStore = $derived(room.peerWaDisplayNameIfDifferent);
    let peerWaDisplayNameParens = $derived(peerWaParensStore ? $peerWaParensStore : undefined);

    let deactivateVisibleProfileSync: (() => void) | undefined;

    onMount(() => {
        deactivateVisibleProfileSync = room.activateVisibleProfileSync?.();
    });

    onDestroy(() => {
        deactivateVisibleProfileSync?.();
    });
</script>

<div
    class={[
        "wa-chat-item group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center transition-all hover:bg-white/10 hover:rounded hover:!cursor-pointer px-2 py-2 cursor-pointer w-full",
        {
            "bg-white/10 rounded": isSelected,
        },
    ]}
    data-testid={$roomName}
>
    <!-- Stretched over the row so the whole row opens the room; the room menu sits above it. -->
    <button
        data-room-row-button
        class="absolute inset-0 m-0 p-0 rounded bg-transparent border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
        aria-label={$roomName}
        onclick={() => selectedRoomStore.set(room)}
        onkeydown={focusAdjacentRoomRow}
    ></button>
    <div class="relative shrink-0 pointer-events-none">
        <Avatar
            compact
            pictureStore={room.pictureStore}
            fallbackName={$roomName}
            color={$roomType === "direct" ? ($peerAvatarColorStore ?? defaultColor) : null}
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
        <UnreadCount
            count={$roomUnreadCount}
            variant={$areNotificationsMuted ? "muted" : "default"}
            class="pointer-events-none"
        />
    {/if}
</div>
