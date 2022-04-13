import { playersStore } from "../Stores/PlayersStore";
import { chatMessagesStore } from "../Stores/ChatStore";
import type { ChatEvent } from "./Events/ChatEvent";

class ScriptUtils {
    public openTab(url: string) {
        window.open(url);
    }

    public goToPage(url: string) {
        window.location.href = url;
    }

    public sendAnonymousChat(chatEvent: ChatEvent, origin?: Window) {
        const userId = playersStore.addFacticePlayer(chatEvent.author);
        chatMessagesStore.addExternalMessage(userId, chatEvent.message, origin);
    }

    public uuidv4() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}

export const scriptUtils = new ScriptUtils();
