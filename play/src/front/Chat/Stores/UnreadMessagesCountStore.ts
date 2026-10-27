import { derived, get, readable, type Readable } from "svelte/store";
import { gameManager } from "../../Phaser/Game/GameManager";
import {
    hasChatRoomNotificationControl,
    type ChatConnectionInterface,
    type ChatConversation,
    type RoomFolder,
} from "../Connection/ChatConnection";
import { ProximityChatRoom } from "../Connection/Proximity/ProximityChatRoom";
import {
    countUnreadElsewhere,
    listUnreadConversations,
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

export function unreadCountOf(conversation: ChatConversation): Readable<UnreadConversationCount> {
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

export interface UnreadConversation extends UnreadConversationCount {
    conversation: ChatConversation;
    lastMessageTimestamp: number;
}

function collectLoadedFolderRooms(folders: readonly RoomFolder[]): ChatConversation[] {
    return folders.flatMap((folder) => [...get(folder.rooms), ...collectLoadedFolderRooms(get(folder.folders))]);
}

/**
 * A snapshot of the unread conversations other than the open one, the most recent first.
 * Rooms of folders that were never opened are not loaded, so they are not listed: their folder shows their count.
 */
export function getUnreadConversationsElsewhere(
    chatConnection: ChatConnectionInterface,
    proximityRooms: readonly ProximityChatRoom[],
    openConversation: ChatConversation,
): UnreadConversation[] {
    const openRoomId =
        openConversation.conversationKind === "thread" && openConversation.parentRoom
            ? openConversation.parentRoom.id
            : openConversation.id;
    const conversations = new Map<string, ChatConversation>();
    for (const conversation of [
        ...proximityRooms,
        ...get(chatConnection.directRooms),
        ...get(chatConnection.rooms),
        ...collectLoadedFolderRooms(get(chatConnection.folders)),
    ]) {
        if (conversation.id !== openRoomId) {
            conversations.set(conversation.id, conversation);
        }
    }
    return listUnreadConversations(
        Array.from(conversations.values()).map((conversation) => ({
            ...get(unreadCountOf(conversation)),
            conversation,
            lastMessageTimestamp: conversation.lastMessageTimestamp,
        })),
    );
}
