import { writable } from "svelte/store";
import { Subject } from "rxjs";
import { ChatMessageTypes } from "@workadventure/shared-utils";
import type { PlayerInterface } from "../Phaser/Game/PlayerInterface";
import { iframeListener } from "../Api/IframeListener";
import { mediaManager, NotificationType } from "../WebRtc/MediaManager";
import { playersStore } from "./PlayersStore";

export const chatZoneLiveStore = writable(false);
export const chatVisibilityStore = writable(false);

export const chatInputFocusStore = writable(false);

export const _newChatMessageSubject = new Subject<string>();
export const newChatMessageSubject = _newChatMessageSubject.asObservable();

export const _newChatMessageWritingStatusSubject = new Subject<number>();
export const newChatMessageWritingStatusSubject = _newChatMessageWritingStatusSubject.asObservable();

// Call "forceRefresh" to force the refresh of the chat iframe.
function createForceRefreshChatStore() {
    const { subscribe, update } = writable({});
    return {
        subscribe,
        forceRefresh() {
            update((list) => {
                return {};
            });
        },
    };
}
export const forceRefreshChatStore = createForceRefreshChatStore();

function getAuthor(authorId: number): PlayerInterface {
    const author = playersStore.getPlayerById(authorId);
    if (!author) {
        throw new Error("Could not find data for author " + authorId);
    }
    return author;
}

function createWritingStatusMessageStore() {
    const { subscribe, update } = writable<Set<PlayerInterface>>(new Set<PlayerInterface>());
    return {
        subscribe,
        addWritingStatus(authorId: number, status: 5 | 6) {
            update((list) => {
                if (status === ChatMessageTypes.userWriting) {
                    list.add(getAuthor(authorId));
                } else if (status === ChatMessageTypes.userStopWriting) {
                    list.delete(getAuthor(authorId));
                }

                return list;
            });
        },
    };
}
export const writingStatusMessageStore = createWritingStatusMessageStore();

export const chatMessagesService = {
    addIncomingUser(authorId: number) {
        const author = getAuthor(authorId);

        /* @deprecated with new chat service */
        iframeListener.sendComingUserToChatIframe({
            type: ChatMessageTypes.userIncoming,
            author: {
                name: author.name,
                active: true,
                isMe: false,
                jid: author.userJid,
                isMember: false,
                color: author.color ?? undefined,
            },
            date: new Date(),
        });
    },
    addOutcomingUser(authorId: number) {
        const author = getAuthor(authorId);

        /* @deprecated with new chat service */
        iframeListener.sendComingUserToChatIframe({
            type: ChatMessageTypes.userOutcoming,
            author: {
                name: author.name,
                active: true,
                isMe: false,
                jid: author.userJid,
                isMember: false,
                color: author.color ?? undefined,
            },
            date: new Date(),
        });

        //end of writing message
        writingStatusMessageStore.addWritingStatus(authorId, ChatMessageTypes.userStopWriting);
    },
    addPersonalMessage(text: string) {
        iframeListener.sendUserInputChat(text, undefined);
        _newChatMessageSubject.next(text);
    },
    /**
     * @param origin The iframe that originated this message (if triggered from the Scripting API), or undefined otherwise.
     */
    addExternalMessage(authorId: number, text: string, origin?: Window) {
        const author = getAuthor(authorId);

        //TODO delete it with new XMPP integration
        //send list to chat iframe
        iframeListener.sendMessageToChatIframe({
            type: ChatMessageTypes.text,
            text: [text],
            author: {
                name: author.name,
                active: true,
                isMe: false,
                jid: author.userJid,
                isMember: false,
                color: author.color ?? undefined,
            },
            date: new Date(),
        });

        //create message sound and text notification
        mediaManager.playNewMessageNotification();
        mediaManager.createNotification(author.name, NotificationType.message);
        //end of writing message
        writingStatusMessageStore.addWritingStatus(authorId, ChatMessageTypes.userStopWriting);

        iframeListener.sendUserInputChat(text, authorId, origin);

        chatVisibilityStore.set(true);
    },
    /**
     * Displays the "start writing" message in the chat.
     * This method is only used by the scripting API to fake the fact someone (the local robot) is writing in the chat.
     *
     * @param authorId
     * @param origin
     */
    startWriting(authorId: number, origin?: Window) {
        const author = getAuthor(authorId);

        //send list to chat iframe
        iframeListener.sendMessageToChatIframe({
            type: ChatMessageTypes.userWriting,
            author: {
                name: author.name,
                active: true,
                isMe: false,
                jid: author.userJid,
                isMember: false,
                color: author.color ?? undefined,
            },
            date: new Date(),
        });

        chatVisibilityStore.set(true);
    },
    /**
     * Displays the "start writing" message in the chat.
     * This method is only used by the scripting API to fake the fact someone (the local robot) is writing in the chat.
     *
     * @param authorId
     * @param origin
     */
    stopWriting(authorId: number, origin?: Window) {
        const author = getAuthor(authorId);

        //send list to chat iframe
        iframeListener.sendMessageToChatIframe({
            type: ChatMessageTypes.userStopWriting,
            author: {
                name: author.name,
                active: true,
                isMe: false,
                jid: author.userJid,
                isMember: false,
                color: author.color ?? undefined,
            },
            date: new Date(),
        });
    },
};

function createChatSubMenuVisibilityStore() {
    const { subscribe, update } = writable<string>("");

    return {
        subscribe,
        openSubMenu(playerName: string, index: number) {
            const id = playerName + index;
            update((oldValue) => {
                return oldValue === id ? "" : id;
            });
        },
    };
}

export const chatSubMenuVisibilityStore = createChatSubMenuVisibilityStore();

export const wokaDefinedStore = writable<boolean>(false);
export const iframeLoadedStore = writable<boolean>(false);
