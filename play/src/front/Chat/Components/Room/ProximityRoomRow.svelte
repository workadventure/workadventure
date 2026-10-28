<script lang="ts">
    import highlightWords from "highlight-words";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { chatSearchBarValue } from "../../Stores/ChatStore";
    import type { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import UnreadCount from "../UnreadCount.svelte";
    import { focusAdjacentRoomRow } from "../roomRowKeyboard";
    import WokaFromUserId from "../../../Components/Woka/WokaFromUserId.svelte";
    import { selectProximityRoom } from "./selectProximityRoom";
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
    // unreadMessagesCount only counts while the chat is intentionally closed: it showed 0 next to unread messages.
    let unreadCount = $derived(room.unreadNotificationCount);
    let areNotificationsMuted = $derived(room.areNotificationsMuted);
    let hasUnreadMentions = $derived(room.hasUnreadMentions);

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
        selectProximityRoom(room);
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
        "wa-chat-item group/chatItem relative mb-[1px] text-md m-0 flex gap-2 flex-row items-center transition-all hover:bg-white/10 hover:rounded hover:!cursor-pointer pe-2 cursor-pointer w-full",
        {
            "bg-white/15 rounded before:absolute before:start-0 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-secondary":
                $selectedRoomStore?.id === room.id,
            "opacity-50 ps-6": isParentZone,
        },
    ]}
    aria-current={$selectedRoomStore?.id === room.id ? "true" : undefined}
    data-testid={$roomName}
>
    <!-- The room menu cannot sit inside a button: it stays next to it, in the row. -->
    <button
        data-room-row-button
        class="flex flex-1 min-w-0 items-center gap-2 self-stretch ps-2 py-2 m-0 rounded bg-transparent border-none text-start cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
        onclick={selectRoom}
        onkeydown={focusAdjacentRoomRow}
    >
        <span class="relative shrink-0">
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
        </span>
        <span class="m-0 flex-1 min-w-0">
            {#each chunks as chunk (chunk.key)}
                <span
                    class="{chunk.match ? 'text-light-blue' : ''} {$hasUnreadMessages
                        ? 'text-white'
                        : 'text-white/75'} cursor-default text-sm font-bold">{chunk.text}</span
                >
            {/each}
        </span>
    </button>
    {#if $hasUnreadMessages}
        <UnreadCount
            count={$unreadCount}
            variant={$hasUnreadMentions ? "mention" : $areNotificationsMuted ? "muted" : "default"}
        />
    {/if}
</div>
