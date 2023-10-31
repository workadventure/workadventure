import { GoogleWorkSpaceService, KlaxoonService, ChatMessageTypes } from "@workadventure/shared-utils";
import type { ChatEvent } from "@workadventure/shared-utils";
import { StartWritingEvent, StopWritingEvent } from "@workadventure/shared-utils/src/Events/WritingEvent";
import { playersStore } from "../Stores/PlayersStore";
import { chatMessagesService, writingStatusMessageStore } from "../Stores/ChatStore";
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

    public startWriting(startWritingEvent: StartWritingEvent, origin?: Window) {
        const userId = playersStore.addFacticePlayer(startWritingEvent.author || "System");

        /*const writingUsersList = get(writingStatusMessageStore);
        writingUsersList.add(playersStore.getPlayerById(userId));*/
        writingStatusMessageStore.addWritingStatus(userId, ChatMessageTypes.userWriting);

        /*iframeListener.sendWritingStatusToChatIframe()

        chatMessagesService.startWriting(userId, origin);*/
    }

    public stopWriting(stopWritingEvent: StopWritingEvent, origin?: Window) {
        const userId = playersStore.addFacticePlayer(stopWritingEvent.author || "System");
        //chatMessagesService.stopWriting(userId, origin);
        writingStatusMessageStore.addWritingStatus(userId, ChatMessageTypes.userStopWriting);
    }
}

export const scriptUtils = new ScriptUtils();
