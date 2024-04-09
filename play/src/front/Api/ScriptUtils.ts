import { GoogleWorkSpaceService, KlaxoonService, ChatMessageTypes } from "@workadventure/shared-utils";
import type { ChatEvent } from "@workadventure/shared-utils";
import { StartWritingEvent, StopWritingEvent } from "@workadventure/shared-utils/src/Events/WritingEvent";
import { playersStore } from "../Stores/PlayersStore";
import { chatMessagesService, writingStatusMessageStore } from "../Stores/ChatStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { iframeListener } from "./IframeListener";

class ScriptUtils {
    public openTab(url: string) {
        const urlApi = new URL(url);
        // Check if the url is a klaxoon link
        if (KlaxoonService.isKlaxoonLink(urlApi)) {
            // If it is a Klaxoon link opening in new tab, we need to remove the embedded parameter
            url = KlaxoonService.getKlaxoonBasicUrl(urlApi);
        }

        // Check if the url is a Google WorkSpace link
        if (GoogleWorkSpaceService.isEmbedableGooglWorkSapceLink(urlApi)) {
            // If it a Google WorkSpace link opening in new tab, we need to remove the embedded parameter
            url = GoogleWorkSpaceService.getGoogleWorkSpaceBasicUrl(urlApi);
        }

        window.open(url);

        // Analytics tracking for opening a new tab
        analyticsClient.openedWebsite(urlApi);
    }

    public goToPage(url: string) {
        // Test if the url is a valid URL
        // eslint-disable-next-line
        const urlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/g;
        let urlToTrack = url;
        if (!urlPattern.test(url)) {
            // Update the url with the current origin
            urlToTrack = `${this.inIframe() ? window.parent.location.origin : window.location.origin}${urlToTrack}`;
        }
        // Analytics tracking for opening a new tab
        if (urlPattern.test(urlToTrack)) {
            analyticsClient.openedWebsite(new URL(urlToTrack));
        }

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

    private inIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            console.info("Error in checking if in iframe", e);
            return true;
        }
    }
}

export const scriptUtils = new ScriptUtils();
