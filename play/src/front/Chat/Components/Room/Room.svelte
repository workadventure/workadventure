<script lang="ts">
    import highlightWords from "highlight-words";
    import { defaultColor } from "@workadventure/shared-utils";
    import { getContext, onDestroy, onMount } from "svelte";
    import { locale } from "../../../../i18n/i18n-svelte";
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
    import LastMessagePreview from "../LastMessagePreview.svelte";
    import { ROOM_ROW_PREVIEW_CONTEXT } from "../RoomListLayout";
    import { formatLastActivity } from "../unreadCount";
    import RoomMenu from "./RoomMenu/RoomMenu.svelte";
    import { IconBellOff } from "@wa-icons";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomNotificationControl;
    }

    let { room }: Props = $props();

    let roomType = $derived(room.type);
    let hasUnreadMessage = $derived(room.hasUnreadMessages);
    let roomUnreadCount = $derived(room.unreadNotificationCount);
    let hasUnreadMentions = $derived(room.hasUnreadMentions);
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
    const rowPreview = getContext<{ shown: boolean } | undefined>(ROOM_ROW_PREVIEW_CONTEXT);
    // Only listened to while shown.
    let lastMessagePreview = $derived(rowPreview?.shown ? room.lastMessagePreview : undefined);
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

{#snippet nameChunks()}
    {#each chunks as chunk (chunk.key)}
        <span
            class="{chunk.match ? 'text-light-blue' : ''} {$hasUnreadMessage
                ? 'text-white'
                : 'text-white/75'} cursor-default text-sm font-bold">{chunk.text}</span
        >
    {/each}{#if peerWaDisplayNameParens}<span class="text-xs font-normal opacity-75 ml-0.5"
            >({peerWaDisplayNameParens})</span
        >{/if}
{/snippet}

<div
    class={[
        "wa-chat-item group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center transition-all hover:bg-white/10 hover:rounded hover:!cursor-pointer pe-2 cursor-pointer w-full",
        {
            "bg-white/15 rounded before:absolute before:start-0 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-secondary":
                isSelected,
        },
    ]}
    aria-current={isSelected ? "true" : undefined}
    data-roving-row
    data-testid={$roomName}
>
    <!-- The room menu cannot sit inside a button: it stays next to it, in the row. -->
    <button
        data-room-row-button
        class="flex flex-1 min-w-0 items-center gap-2 self-stretch ps-2 py-2 m-0 rounded bg-transparent border-none text-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
        onclick={() => selectedRoomStore.set(room)}
    >
        <span class="relative shrink-0">
            <Avatar
                compact
                pictureStore={room.pictureStore}
                fallbackName={$roomName}
                color={$roomType === "direct" ? ($peerAvatarColorStore ?? defaultColor) : null}
            />

            {#if $isEncrypted}
                <EncryptionBadge />
            {/if}
        </span>
        <span class="m-0 flex-1 min-w-0">
            {#if lastMessagePreview}
                <span class="flex items-baseline gap-2">
                    <span class="min-w-0 truncate">{@render nameChunks()}</span>
                    {#if $lastMessagePreview}
                        <span class="ms-auto shrink-0 text-xs text-white/50">
                            {formatLastActivity($lastMessagePreview.timestamp, new Date(), $locale)}
                        </span>
                    {/if}
                </span>
                <LastMessagePreview preview={lastMessagePreview} showSender={$roomType !== "direct"} />
            {:else}
                {@render nameChunks()}
            {/if}
        </span>
    </button>
    {#if $areNotificationsMuted}
        <IconBellOff font-size="12" class="opacity-50" />
    {/if}
    <RoomMenu {room} />
    {#if $hasUnreadMessage}
        <UnreadCount
            count={$roomUnreadCount}
            variant={$hasUnreadMentions ? "mention" : $areNotificationsMuted ? "muted" : "default"}
        />
    {/if}
</div>
