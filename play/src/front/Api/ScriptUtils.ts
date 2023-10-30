import { GoogleWorkSpaceService, KlaxoonService, ChatMessageTypes } from "@workadventure/shared-utils";
import type { ChatEvent } from "@workadventure/shared-utils";
import { playersStore } from "../Stores/PlayersStore";
import { chatMessagesService } from "../Stores/ChatStore";
import { iframeListener } from "./IframeListener";

class ScriptUtils {
    public openTab(url: string) {
        // Check if the url is a klaxoon link
        if (KlaxoonService.isKlaxoonLink(new URL(url))) {
            // If it is a Klaxoon link opening in new tab, we need to remove the embedded parameter
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

    public sendChat(chatEvent: ChatEvent, origin?: Window) {
        switch (chatEvent.options.scope) {
            case "local": {
                const userId = playersStore.addFacticePlayer(chatEvent.options.author || "System");
                chatMessagesService.addExternalMessage(userId, chatEvent.message, origin);
                break;
            }
            case "bubble": {
                iframeListener.sendMessageToChatIframe({
                    type: ChatMessageTypes.me,
                    text: [chatEvent.message],
                    date: new Date(),
                });
                //chatMessagesStore.addExternalMessage(gameManager.getCurrentGameScene().connection?.getUserId(), chatEvent.message, origin);
                break;
            }
            default: {
                const _exhaustiveCheck: never = chatEvent.options;
            }
        }
    }
}

export const scriptUtils = new ScriptUtils();
