<script lang="ts">
    import highlightWords from "highlight-words";
    import LL from "../../../../i18n/i18n-svelte";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { chatSearchBarValue } from "../../Stores/ChatStore";
    import type { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import WokaFromUserId from "../../../Components/Woka/WokaFromUserId.svelte";
    import { IconEar, IconMapEditor, IconMicrophone, IconUsersGroup } from "@wa-icons";

    interface Props {
        room: ProximityChatRoom;
    }

    let { room }: Props = $props();

    let roomName = $derived(room.name);
    let roomKind = $derived(room.kind);
    let hasUnreadMessages = $derived(room.hasUnreadMessages);
    let unreadCount = $derived(room.unreadMessagesCount);

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
    class="wa-chat-item group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center hover:bg-white transition-all hover:bg-opacity-10 hover:rounded hover:!cursor-pointer px-2 py-2 cursor-pointer w-full"
    class:bg-white={$selectedRoomStore?.id === room.id}
    class:bg-opacity-10={$selectedRoomStore?.id === room.id}
    class:rounded={$selectedRoomStore?.id === room.id}
    onclick={selectRoom}
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectRoom();
        }
    }}
    role="button"
    tabindex="0"
    data-testid={$roomName}
>
    <div class="relative shrink-0">
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
        <div class="relative flex h-7 w-7 items-center justify-center">
            <span class="absolute top-2 start-2 block h-4 w-4 rounded-full bg-white animate-ping"></span>
            <span class="absolute top-2.5 start-2.5 block h-3 w-3 rounded-full bg-white"></span>
            <div
                class="flex aspect-square h-5 w-5 items-center justify-center rounded-full bg-success text-sm font-bold leading-none text-contrast z-10"
                aria-label={$LL.chat.a11y.unreadCount({ count: $unreadCount })}
            >
                <span>{$unreadCount > 9 ? "9" : $unreadCount}</span>
                {#if $unreadCount > 9}
                    <span class="text-xxs">+</span>
                {/if}
            </div>
        </div>
    {/if}
</div>
