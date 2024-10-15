import { get, writable } from "svelte/store";
import { ChatMessage as NewChatMessage, ChatRoom } from "../Connection/ChatConnection";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import { subscribe } from "svelte/internal";
import { custom } from "zod";
import { matrixSecurity } from "../Connection/Matrix/MatrixSecurity";

export const navChat = writable<"chat" | "users">("chat");

export const shownRoomListStore = writable<string>("");
export const chatSearchBarValue = writable<string>("");

const createSelectedRoomStore = () => {
    const { subscribe, set } = writable<ChatRoom | undefined>(undefined);

    const customSet = (value: ChatRoom | undefined) => {
        set(value);
        if (value && get(value.isEncrypted) && !get(alreadyAskForInitCryptoConfiguration)) {
            matrixSecurity.openChooseDeviceVerificationMethodModal().catch((error) => {
                console.error(error);
            });
        }
    };

    return {
        subscribe,
        set: customSet,
    };
};

export const selectedRoomStore = createSelectedRoomStore();

export const selectedChatMessageToReply = writable<NewChatMessage | null>(null);
export const selectedChatMessageToEdit = writable<NewChatMessage | null>(null);

export const joignableRoom = writable<{ id: string; name: string | undefined }[]>([]);

export const isAChatRoomIsVisible = () => {
    return get(selectedRoom) && get(navChat) === "chat" && get(chatVisibilityStore);
};

export const alreadyAskForInitCryptoConfiguration = writable(false);

export const isChatIdSentToPusher = writable(false);
