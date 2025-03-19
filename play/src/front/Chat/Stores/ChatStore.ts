import { get, writable } from "svelte/store";
import { ComponentType } from "svelte";
import { ChatMessage as NewChatMessage } from "../Connection/ChatConnection";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import { ENABLE_CHAT } from "../../Enum/EnvironmentVariable";
import { gameManager } from "../../Phaser/Game/GameManager";
import { selectedRoomStore } from "./SelectRoomStore";

type NavChatTab =
    | {
          key: "chat";
      }
    | {
          key: "users";
      }
    | {
          key: "externalModule";
          component: ComponentType;
          props?: Record<string, unknown>;
      };

function createNavChatStore() {
    const defaultValue = ENABLE_CHAT ? "chat" : "users";
    const { subscribe, set } = writable<NavChatTab>({ key: defaultValue });

    return {
        subscribe,
        switchToChat() {
            set({ key: "chat" });
        },
        switchToUserList() {
            const room = gameManager.getCurrentGameScene().room;
            const isChatOnlineListEnabled = room.isChatOnlineListEnabled;
            const isChatDisconnectedListEnabled = room.isChatDisconnectedListEnabled;

            if (isChatOnlineListEnabled || isChatDisconnectedListEnabled) {
                set({ key: "users" });
            }
        },
        switchToCustomComponent(component: ComponentType, props?: Record<string, unknown>) {
            set({ key: "externalModule", component, props });
        },
    };
}

export const navChat = createNavChatStore();

export const shownRoomListStore = writable<string>("");
export const chatSearchBarValue = writable<string>("");

export const selectedChatMessageToReply = writable<NewChatMessage | null>(null);

export const selectedChatMessageToEdit = writable<NewChatMessage | null>(null);

export const joignableRoom = writable<{ id: string; name: string | undefined }[]>([]);

export const isAChatRoomIsVisible = () => {
    return get(selectedRoomStore) && get(navChat).key === "chat" && get(chatVisibilityStore);
};

export const isChatIdSentToPusher = writable(false);

export const botsChatIds = writable<string[]>([]);
