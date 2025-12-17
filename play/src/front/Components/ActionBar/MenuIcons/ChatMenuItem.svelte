<script lang="ts">
    import { derived, get } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import MessageCircleIcon from "../../Icons/MessageCircleIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
    import type { ChatRoom } from "../../../Chat/Connection/ChatConnection";

    export let last: boolean | undefined = undefined;
    export let chatEnabledInAdmin = false;

    const proximityChatRoom = gameManager.getCurrentGameScene().proximityChatRoom;

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function toggleChat() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
        dispatch("click");
    }

    const shortcut = ["c"];

    let chatAvailable = false;
    gameManager
        .getChatConnection()
        .then(() => {
            chatAvailable = true;
        })
        .catch((e: unknown) => {
            console.error("Could not get chat", e);
        });

    // Create derived stores that subscribe to all unreadNotificationCount stores for real-time updates
    const nbUnreadRoomsMessages = derived(
        gameManager.chatConnection.rooms,
        (rooms, set) => {
            // Subscribe to all room unreadNotificationCount stores
            const unsubscribes = rooms.map((room) =>
                room.unreadNotificationCount.subscribe(() => {
                    const total = rooms.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
                    set(total);
                })
            );
            // Initial calculation
            const total = rooms.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
            set(total);
            // Cleanup function
            return () => unsubscribes.forEach((unsub) => unsub());
        },
        0
    );

    const nbUnreadDirectRoomsMessages = derived(
        gameManager.chatConnection.directRooms,
        (directRooms, set) => {
            // Subscribe to all direct room unreadNotificationCount stores
            const unsubscribes = directRooms.map((room) =>
                room.unreadNotificationCount.subscribe(() => {
                    const total = directRooms.reduce(
                        (acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount),
                        0
                    );
                    set(total);
                })
            );
            // Initial calculation
            const total = directRooms.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
            set(total);
            // Cleanup function
            return () => unsubscribes.forEach((unsub) => unsub());
        },
        0
    );

    const nbUnreadInvitationsMessages = derived(
        gameManager.chatConnection.invitations,
        (invitations, set) => {
            // Subscribe to all invitation unreadNotificationCount stores
            const unsubscribes = invitations.map((room) =>
                room.unreadNotificationCount.subscribe(() => {
                    const total = invitations.reduce(
                        (acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount),
                        0
                    );
                    set(total);
                })
            );
            // Initial calculation
            const total = invitations.reduce((acc: number, r: ChatRoom) => acc + get(r.unreadNotificationCount), 0);
            set(total);
            // Cleanup function
            return () => unsubscribes.forEach((unsub) => unsub());
        },
        0
    );

    // Proximity chat room is already a store, so we can use it directly
    const nbUnreadProximityChatRoomMessages = proximityChatRoom.unreadNotificationCount;

    // Calculate total unread count and format it (max 99+)
    $: totalUnreadCount =
        $nbUnreadRoomsMessages +
        $nbUnreadDirectRoomsMessages +
        $nbUnreadInvitationsMessages +
        $nbUnreadProximityChatRoomMessages;
    $: displayCount = totalUnreadCount > 99 ? "99+" : totalUnreadCount.toString();
</script>

<ActionBarButton
    on:click={() => {
        toggleChat();
        navChat.switchToChat();
        if (!chatEnabledInAdmin) {
            selectedRoomStore.set(proximityChatRoom);
            proximityChatRoom.hasUnreadMessages.set(false);
            proximityChatRoom.unreadNotificationCount.set(0);
        }
        analyticsClient.openedChat();
    }}
    classList="group/btn-message-circle rounded-r-lg pe-2 {last ? '' : '@sm/actions:rounded-r-none @sm/actions:pe-0'}"
    tooltipTitle={$LL.actionbar.help.chat.title()}
    desc={$LL.actionbar.help.chat.desc()}
    media="./static/Videos/Chat.mp4"
    tooltipShortcuts={shortcut}
    dataTestId="chat-btn"
    state={chatAvailable ? "normal" : "disabled"}
    {last}
    disabledHelp={false}
>
    <MessageCircleIcon />
</ActionBarButton>
{#if $chatZoneLiveStore || totalUnreadCount > 0}
    <div>
        <span class="w-4 h-4 block rounded-full absolute -top-1 -start-1 animate-ping bg-white" />
        <span class="w-3 h-3 block rounded-full absolute -top-0.5 -start-0.5 bg-white" />
    </div>
{/if}
{#if totalUnreadCount > 0}
    <div
        class="absolute -top-2 -start-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
    >
        {displayCount}
    </div>
{/if}
