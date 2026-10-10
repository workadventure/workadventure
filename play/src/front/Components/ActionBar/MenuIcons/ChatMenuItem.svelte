<script lang="ts">
    import { derived } from "svelte/store";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import MessageCircleIcon from "../../Icons/MessageCircleIcon.svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { activeSubMenuStore, menuVisiblilityStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";

    interface Props {
        last?: boolean;
        chatEnabledInAdmin?: boolean;
        onclick?: () => void;
    }

    let { last = undefined, chatEnabledInAdmin = false, onclick }: Props = $props();

    const proximityChatRoomManager = gameManager.getCurrentGameScene().proximityChatRoomManager;
    const unreadMessagesCount = proximityChatRoomManager.unreadMessagesCount;

    function toggleChat() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
        onclick?.();
    }

    const shortcut = ["c"];

    let chatAvailable = $state(false);
    gameManager
        .getChatConnection()
        .then(() => {
            chatAvailable = true;
        })
        .catch((e: unknown) => {
            console.error("Could not get chat", e);
        });

    // The action bar shows with the map, which does not wait for the chat connection: until it exists, it has no
    // unread message. Once it does, follow its unread counters in real time.
    const nbUnreadChatMessages = derived(
        gameManager.chatConnectionStore,
        (chatConnection, set) => {
            if (!chatConnection) {
                set(0);
                return;
            }
            return derived(
                [
                    chatConnection.nbUnreadRoomsMessages,
                    chatConnection.nbUnreadDirectRoomsMessages,
                    chatConnection.nbUnreadInvitationsMessages,
                ],
                ([rooms, directRooms, invitations]) => rooms + directRooms + invitations,
            ).subscribe(set);
        },
        0,
    );

    // Calculate total unread count and format it (max 99+)
    let totalUnreadCount = $derived($nbUnreadChatMessages + $unreadMessagesCount);
    let displayCount = $derived(totalUnreadCount > 99 ? "99" : totalUnreadCount.toString());
</script>

<ActionBarButton
    onclick={() => {
        toggleChat();
        navChat.switchToChat();
        if (!chatEnabledInAdmin) {
            const proximityChatRoom = proximityChatRoomManager.resolveTargetRoom();
            if (proximityChatRoom) {
                selectedRoomStore.set(proximityChatRoom);
                proximityChatRoom.hasUnreadMessages.set(false);
                proximityChatRoom.unreadMessagesCount.set(0);
                chatNotificationStore.clearRoom(proximityChatRoom.id);
                proximityChatRoom.unreadNotificationCount.set(0);
            }
        }
        // toggleChat() has already flipped the store, so this reads the NEW state.
        // Reporting unconditionally counted the click that CLOSES the panel as an
        // opening too, which is why menu_opened_chat has always run at roughly twice
        // the real figure.
        if ($chatVisibilityStore) {
            analyticsClient.trackAdminEvent("chat.opened");
        }
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
        <span class="w-4 h-4 block rounded-full absolute -top-1 -start-1 animate-ping bg-white"></span>
        <span class="w-3 h-3 block rounded-full absolute -top-0.5 -start-0.5 bg-white"></span>
    </div>
{/if}
{#if totalUnreadCount > 0}
    <div
        class="absolute -top-2 -start-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
        data-testid="unreadMessagesCount"
    >
        <span>{displayCount}</span>
        {#if totalUnreadCount > 99}
            <span class="text-xxs">+</span>
        {/if}
    </div>
{/if}
