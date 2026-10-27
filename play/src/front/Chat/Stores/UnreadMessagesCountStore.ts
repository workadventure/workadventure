import { derived, readable, type Readable } from "svelte/store";
import { gameManager } from "../../Phaser/Game/GameManager";
import { hasChatRoomNotificationControl, type ChatConversation } from "../Connection/ChatConnection";
import { ProximityChatRoom } from "../Connection/Proximity/ProximityChatRoom";
import {
    countUnreadElsewhere,
    summarizeUnreadCounts,
    type UnreadConversationCount,
    type UnreadSummary,
} from "../Components/unreadCount";

// The action bar shows with the map, which does not wait for the chat connection: until it exists, it has no
// unread message. Once it does, follow its unread counters in real time.
// Muted Matrix rooms do not count: their push rule is "dont_notify", so their notification count stays at 0.
export const matrixUnreadMessagesCountStore: Readable<number> = derived(
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

function unreadCountOf(conversation: ChatConversation): Readable<UnreadConversationCount> {
    const count =
        conversation instanceof ProximityChatRoom
            ? conversation.unreadMessagesCount
            : conversation.unreadNotificationCount;
    const muted = hasChatRoomNotificationControl(conversation) ? conversation.areNotificationsMuted : readable(false);
    return derived([count, muted], ([$count, $muted]) => ({ id: conversation.id, count: $count, muted: $muted }));
}

/** Unread messages in every conversation but the open one (a thread counts as its room), muted ones excluded. */
export function createUnreadElsewhereStore(
    proximityRooms: Readable<readonly ProximityChatRoom[]>,
    openConversation: ChatConversation,
): Readable<number> {
    const openRoom =
        openConversation.conversationKind === "thread" && openConversation.parentRoom
            ? openConversation.parentRoom
            : openConversation;
    const proximityCounts = derived(
        proximityRooms,
        (rooms, set) => {
            if (rooms.length === 0) {
                set([]);
                return;
            }
            return derived(rooms.map(unreadCountOf), (counts) => counts).subscribe(set);
        },
        [] as UnreadConversationCount[],
    );
    return derived(
        [matrixUnreadMessagesCountStore, proximityCounts, unreadCountOf(openRoom)],
        ([matrixTotal, proximity, open]) => countUnreadElsewhere(matrixTotal, proximity, open),
    );
}

/** Unread summary of a list of conversations, for the header of a collapsed section. */
export function createUnreadSummaryStore(
    conversations: Readable<readonly ChatConversation[]>,
): Readable<UnreadSummary> {
    return derived(
        conversations,
        (list, set) => {
            if (list.length === 0) {
                set(summarizeUnreadCounts([]));
                return;
            }
            return derived(list.map(unreadCountOf), summarizeUnreadCounts).subscribe(set);
        },
        summarizeUnreadCounts([]),
    );
}
