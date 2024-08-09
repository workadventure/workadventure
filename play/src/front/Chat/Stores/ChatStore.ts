import { writable } from "svelte/store";
import { ChatMessage as NewChatMessage, ChatRoom, ChatConnectionInterface } from "../Connection/ChatConnection";

export const navChat = writable<"chat" | "users" | "settings">("chat");

export const shownRoomListStore = writable<string>("");
export const chatSearchBarValue = writable<string>("");
export const selectedRoom = writable<ChatRoom | undefined>(undefined);

export const selectedChatMessageToReply = writable<NewChatMessage | null>(null);
export const selectedChatMessageToEdit = writable<NewChatMessage | null>(null);

export const joignableRoom = writable<{ id: string; name: string | undefined }[]>([]);

export const proximityRoomConnection = writable<ChatConnectionInterface | undefined>(undefined);
