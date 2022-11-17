import { writable } from "svelte/store";
import { playersStore } from "./PlayersStore";
import type { PlayerInterface } from "../Phaser/Game/PlayerInterface";
import { iframeListener } from "../Api/IframeListener";
import { Subject } from "rxjs";
import { mediaManager, NotificationType } from "../WebRtc/MediaManager";
import type { ChatMessage } from "../Api/Events/ChatEvent";
import { ChatMessageTypes } from "../Api/Events/ChatEvent";

export const chatZoneLiveStore = writable(false);
export const chatVisibilityStore = writable(false);

export const chatInputFocusStore = writable(false);

export const _newChatMessageSubject = new Subject<string>();
export const newChatMessageSubject = _newChatMessageSubject.asObservable();

export const _newChatMessageWritingStatusSubject = new Subject<number>();
export const newChatMessageWritingStatusSubject = _newChatMessageWritingStatusSubject.asObservable();

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

function createChatMessagesStore() {
    const { subscribe, update } = writable<ChatMessage[]>([]);

    return {
        subscribe,
        addIncomingUser(authorId: number) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.userIncoming && lastMessage.targets) {
                    lastMessage.targets.push(getAuthor(authorId).userUuid);
                } else {
                    list.push({
                        type: ChatMessageTypes.userIncoming,
                        targets: [getAuthor(authorId).userUuid],
                        date: new Date(),
                    });
                }

                /* @deprecated with new chat service */
                iframeListener.sendComingUserToChatIframe({
                    type: ChatMessageTypes.userIncoming,
                    targets: [getAuthor(authorId).userUuid],
                    date: new Date(),
                });

                return list;
            });
        },
        addOutcomingUser(authorId: number) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.userOutcoming && lastMessage.targets) {
                    lastMessage.targets.push(getAuthor(authorId).userUuid);
                } else {
                    list.push({
                        type: ChatMessageTypes.userOutcoming,
                        targets: [getAuthor(authorId).userUuid],
                        date: new Date(),
                    });
                }

                /* @deprecated with new chat service */
                iframeListener.sendComingUserToChatIframe({
                    type: ChatMessageTypes.userOutcoming,
                    targets: [getAuthor(authorId).userUuid],
                    date: new Date(),
                });

                //end of writing message
                writingStatusMessageStore.addWritingStatus(authorId, ChatMessageTypes.userStopWriting);
                return list;
            });
        },
        addPersonalMessage(text: string) {
            iframeListener.sendUserInputChat(text);
            _newChatMessageSubject.next(text);
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.me && lastMessage.text) {
                    lastMessage.text.push(text);
                } else {
                    list.push({
                        type: ChatMessageTypes.me,
                        text: [text],
                        date: new Date(),
                    });
                }

                return list;
            });
        },
        /**
         * @param origin The iframe that originated this message (if triggered from the Scripting API), or undefined otherwise.
         */
        addExternalMessage(authorId: number, text: string, origin?: Window) {
            update((list) => {
                const author = getAuthor(authorId);
                let lastMessage = null;
                if (list.length > 0) {
                    lastMessage = list[list.length - 1];
                }
                if (
                    lastMessage &&
                    lastMessage.type === ChatMessageTypes.text &&
                    lastMessage.text &&
                    lastMessage?.author === author.userUuid
                ) {
                    lastMessage.text.push(text);
                } else {
                    list.push({
                        type: ChatMessageTypes.text,
                        text: [text],
                        author: author.userUuid,
                        date: new Date(),
                    });
                }

                //TODO delete it with new XMPP integration
                //send list to chat iframe
                iframeListener.sendMessageToChatIframe({
                    type: ChatMessageTypes.text,
                    text: [text],
                    author: author.userUuid === "dummy" ? author.name : author.userUuid,
                    date: new Date(),
                });

                //create message sound and text notification
                mediaManager.playNewMessageNotification();
                mediaManager.createNotification(author.name, NotificationType.message);
                //end of writing message
                writingStatusMessageStore.addWritingStatus(authorId, ChatMessageTypes.userStopWriting);

                iframeListener.sendUserInputChat(text, origin);
                return list;
            });
            chatVisibilityStore.set(true);
        },
    };
}
export const chatMessagesStore = createChatMessagesStore();

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
