import { derived, writable } from "svelte/store";
import type { ChatMessage, ChatRoom } from "../Connection/ChatConnection";
import type { MentionAuthor } from "../../Stores/ProximityNotificationStore";
import { selectedRoomStore } from "./SelectRoomStore";

export interface ChatMessageBanner {
    room: ChatRoom;
    message: ChatMessage;
    senderName: string;
    body: string;
    mentionsMe: boolean;
    /** Shown next to the title, except for a direct message. */
    roomName: string | undefined;
    author: MentionAuthor;
    /** Banners replaced by this one and not opened since. */
    others: number;
}

/**
 * The banner shown at the top of the open chat for a mention or a direct message received in another conversation.
 * One at a time: the latest one replaces the previous one and counts it.
 */
function createChatMessageBannerStore() {
    const { subscribe, set, update } = writable<ChatMessageBanner | undefined>(undefined);
    return {
        subscribe,
        show(banner: Omit<ChatMessageBanner, "others">): void {
            update((previous) => ({
                ...banner,
                others: previous === undefined ? 0 : previous.others + (previous.room.id === banner.room.id ? 0 : 1),
            }));
        },
        dismiss(): void {
            set(undefined);
        },
        dismissRoom(roomId: string): void {
            update((banner) => (banner?.room.id === roomId ? undefined : banner));
        },
    };
}

export const chatMessageBannerStore = createChatMessageBannerStore();

// Rooms with a mention received while the chat showed another conversation, until they are opened.
const pendingMentionRoomIds = writable<ReadonlySet<string>>(new Set());

export function addPendingMention(roomId: string): void {
    pendingMentionRoomIds.update((ids) => new Set(ids).add(roomId));
}

/** Lights the unread count of the back arrow with an "@" until the mentioning conversation is opened. */
export const hasPendingMentionElsewhere = derived(pendingMentionRoomIds, (ids) => ids.size > 0);

// Lives as long as the page, like the stores it links.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
selectedRoomStore.subscribe((conversation) => {
    const room =
        conversation?.conversationKind === "thread" && conversation.parentRoom ? conversation.parentRoom : conversation;
    if (!room) {
        return;
    }
    chatMessageBannerStore.dismissRoom(room.id);
    pendingMentionRoomIds.update((ids) => {
        if (!ids.has(room.id)) {
            return ids;
        }
        const remaining = new Set(ids);
        remaining.delete(room.id);
        return remaining;
    });
});
