import { iframeListener } from "../Api/IframeListener";
import { chatMessagesStore } from "../Stores/ChatStore";
import { playersStore } from "../Stores/PlayersStore";

export class DiscussionManager {
    constructor() {
        iframeListener.chatStream.subscribe((chatEvent) => {
            const userId = playersStore.addFacticePlayer(chatEvent.author);
            chatMessagesStore.addExternalMessage(userId, chatEvent.message);
        });
    }
}

export const discussionManager = new DiscussionManager();
