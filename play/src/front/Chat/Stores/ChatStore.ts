import { get, writable } from "svelte/store";
import { ChatMessage as NewChatMessage, ChatRoom } from "../Connection/ChatConnection";
import { chatVisibilityStore } from "../../Stores/ChatStore";

export const navChat = writable<"chat" | "users">("chat");

export const shownRoomListStore = writable<string>("");
export const chatSearchBarValue = writable<string>("");
export const selectedRoom = writable<ChatRoom | undefined>(undefined);

export const selectedChatMessageToReply = writable<NewChatMessage | null>(null);
export const selectedChatMessageToEdit = writable<NewChatMessage | null>(null);

export const joignableRoom = writable<{ id: string; name: string | undefined }[]>([]);

export const isAChatRoomIsVisible = () => {
    return get(selectedRoom) && get(navChat) === "chat" && get(chatVisibilityStore);
};

export const showRoom = (room: ChatRoom) => {
    selectedRoom.set(room);
    navChat.set("chat");
    chatVisibilityStore.set(true);
};

export const alreadyAskForInitCryptoConfiguration = writable(false);
