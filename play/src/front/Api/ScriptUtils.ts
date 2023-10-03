import { GoogleWorkSpaceService, KlaxoonService } from "@workadventure/shared-utils";
import { playersStore } from "../Stores/PlayersStore";
import { chatMessagesStore } from "../Stores/ChatStore";
import type { ChatEvent } from "./Events/ChatEvent";

class ScriptUtils {
    public openTab(url: string) {
        // Check if the url is a klaxoon link
        if (KlaxoonService.isKlaxoonLink(new URL(url))) {
            // If it a Klaxoon link opening in new tab, we need to remove the embedded parameter
            url = KlaxoonService.getKlaxoonBasicUrl(new URL(url));
        }

        // Check if the url is a Google WorkSpace link
        if (GoogleWorkSpaceService.isEmbedableGooglWorkSapceLink(new URL(url))) {
            // If it a Google WorkSpace link opening in new tab, we need to remove the embedded parameter
            url = GoogleWorkSpaceService.getGoogleWorkSpaceBasicUrl(new URL(url));
        }

        window.open(url);
    }

    public goToPage(url: string) {
        window.location.href = url;
    }

    public sendAnonymousChat(chatEvent: ChatEvent, origin?: Window) {
        const userId = playersStore.addFacticePlayer(chatEvent.author);
        chatMessagesStore.addExternalMessage(userId, chatEvent.message, origin);
    }
}

export const scriptUtils = new ScriptUtils();
