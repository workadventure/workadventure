<script lang="ts">
    import highlightWords from "highlight-words";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { chatSearchBarValue } from "../../Stores/ChatStore";
    import type { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import UnreadCount from "../UnreadCount.svelte";
    import { focusAdjacentRoomRow } from "../roomRowKeyboard";
    import WokaFromUserId from "../../../Components/Woka/WokaFromUserId.svelte";
    import { IconEar, IconMapEditor, IconMicrophone, IconUsersGroup } from "@wa-icons";

    interface Props {
        room: ProximityChatRoom;
        /** A zone around the deepest zone the user is in: dimmed and indented below it. */
        isParentZone?: boolean;
    }

    let { room, isParentZone = false }: Props = $props();

    let roomName = $derived(room.name);
    let roomKind = $derived(room.kind);
    let hasUnreadMessages = $derived(room.hasUnreadMessages);
    let unreadCount = $derived(room.unreadMessagesCount);
    let areNotificationsMuted = $derived(room.areNotificationsMuted);

    let usesDefaultProximityPicture = $derived($roomKind === "default" || $roomKind === "proximity");
    let RoomIcon = $derived(
        $roomKind === "meeting"
            ? IconUsersGroup
            : $roomKind === "listener"
              ? IconEar
              : $roomKind === "speaker"
                ? IconMicrophone
                : IconMapEditor,
    );

    function selectRoom() {
        selectedRoomStore.set(room);
        gameManager.getCurrentGameScene().proximityChatRoomManager.selectRoom(room);
        room.hasUnreadMessages.set(false);
        room.unreadMessagesCount.set(0);
        room.unreadNotificationCount.set(0);
        chatNotificationStore.clearRoom(room.id);
    }

    let chunks = $derived(
        highlightWords({
            text: $roomName,
            query: $chatSearchBarValue,
        }),
    );
</script>

<div
    class={[
        "wa-chat-item group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center transition-all hover:bg-white/10 hover:rounded hover:!cursor-pointer px-2 py-2 cursor-pointer w-full",
        {
            "bg-white/10 rounded": $selectedRoomStore?.id === room.id,
            "opacity-50 ps-6": isParentZone,
        },
    ]}
    data-testid={$roomName}
>
    <!-- Stretched over the row so the whole row opens the room. -->
    <button
        data-room-row-button
        class="absolute inset-0 m-0 p-0 rounded bg-transparent border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
        aria-label={$roomName}
        onclick={selectRoom}
        onkeydown={focusAdjacentRoomRow}
    ></button>
    <div class="relative shrink-0 pointer-events-none">
        <div
            class="rounded-full bg-white/10 h-7 w-7 border border-solid text-white flex items-center justify-center p-[1px] relative {$hasUnreadMessages
                ? 'border-white'
                : 'border-white/70'}"
        >
            {#if usesDefaultProximityPicture}
                <div class="absolute overflow-hidden w-full h-full rounded-full">
                    <div
                        class="flex items-center justify-center translate-y-[3px] group-hover/chatItem:translate-y-[0] transition-all"
                    >
                        <WokaFromUserId userId={-1} customWidth="32px" placeholderSrc="" />
                    </div>
                </div>
            {:else}
                <RoomIcon font-size="18" />
            {/if}
        </div>
    </div>
    <div class="m-0 flex-1 min-w-0 text-start">
        {#each chunks as chunk (chunk.key)}
            <span
                class="{chunk.match ? 'text-light-blue' : ''} {$hasUnreadMessages
                    ? 'text-white'
                    : 'text-white/75'} cursor-default text-sm font-bold">{chunk.text}</span
            >
        {/each}
    </div>
    {#if $hasUnreadMessages}
        <UnreadCount
            count={$unreadCount}
            variant={$areNotificationsMuted ? "muted" : "default"}
            class="pointer-events-none"
        />
    {/if}
</div>
