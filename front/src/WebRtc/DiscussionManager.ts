import { iframeListener } from "../Api/IframeListener";
import { chatMessagesStore, chatVisibilityStore } from "../Stores/ChatStore";

export class DiscussionManager {
    constructor() {
        iframeListener.chatStream.subscribe((chatEvent) => {
            chatMessagesStore.addExternalMessage(parseInt(chatEvent.author), chatEvent.message);
            chatVisibilityStore.set(true);
        });
    }
}

export const discussionManager = new DiscussionManager();
