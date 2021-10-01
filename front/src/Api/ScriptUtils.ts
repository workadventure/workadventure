import { coWebsiteManager } from "../WebRtc/CoWebsiteManager";
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

    public openCoWebsite(url: string, base: string, api: boolean, policy: string) {
        coWebsiteManager.loadCoWebsite(url, base, api, policy);
    }

    public closeCoWebSite() {
        coWebsiteManager.closeCoWebsite();
    }

    public sendAnonymousChat(chatEvent: ChatEvent) {
        const userId = playersStore.addFacticePlayer(chatEvent.author);
        chatMessagesStore.addExternalMessage(userId, chatEvent.message);
    }
}

export const scriptUtils = new ScriptUtils();
