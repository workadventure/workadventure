import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { UserData } from "@workadventure/messages";
import { XmppClient } from "./XmppClient";
import * as StanzaProtocol from "stanza/protocol";
import { ChatStateMessage } from "stanza";
import { WaLink, WaReceivedReactions } from "./Lib/Plugin";
import * as StanzaConstants from "stanza/Constants";
import Timeout = NodeJS.Timeout;
import { get } from "svelte/store";
import { userStore } from "../Stores/LocalUserStore";
import { mucRoomsStore } from "../Stores/MucRoomsStore";
import { availabilityStatusStore, filesUploadStore, mentionsUserStore } from "../Stores/ChatStore";
import { v4 as uuid } from "uuid";
import { fileMessageManager } from "../Services/FileMessageManager";
import { ChatState } from "stanza/Constants";
import { UserList, UsersStore } from "./MucRoom";

export type User = {
    name: string;
    playUri?: string;
    roomName?: string;
    uuid?: string;
    status?: string;
    active: boolean;
    isInSameMap?: boolean;
    color?: string;
    woka?: string;
    unreads?: boolean;
    isAdmin?: boolean;
    role?: string;
    chatState?: StanzaConstants.ChatState;
    isMe: boolean;
    jid: string;
    isMember: boolean;
    availabilityStatus?: number;
    visitCardUrl?: string;
};

export type ReplyMessage = {
    id: string;
    senderName: string;
    body: string;
    links?: WaLink[];
};

export type ReactionMessage = {
    userJid: string;
    userReactions: Array<string>;
};

export type Message = {
    body: string;
    name: string;
    jid: string;
    time: Date;
    id: string;
    delivered: boolean;
    error: boolean;
    from: string;
    type: MessageType;
    targetMessageReply?: ReplyMessage;
    targetMessageReact?: Map<string, number>;
    reactionsMessage?: Map<string, Array<string>>;
    links?: WaLink[];
    mentions?: User[];
};
export type MessagesList = Message[];
export type MessageMap = Map<string, Message>;

export enum MessageType {
    message = 1,
    reply,
    react,
}

export const defaultWoka =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
export const defaultColor = "#626262";

export const defaultUserData: UserData = {
    uuid: "default",
    email: null,
    name: "",
    playUri: "",
    authToken: "",
    color: defaultColor,
    woka: defaultWoka,
    isLogged: false,
    availabilityStatus: 0,
    roomName: null,
    visitCardUrl: null,
};

export class AbstractRoom {
    protected presenceStore: Writable<UserList>;
    protected messageStore: Writable<Map<string, Message>>;
    protected reactionMessageStore: Writable<Map<string, ReactionMessage[]>>;
    protected deletedMessagesStore: Writable<string[]>;
    public lastMessageSeen: Date;
    protected countMessagesToSee: Writable<number>;
    protected loadingStore: Writable<boolean>;
    protected sendTimeOut: Timeout | undefined;
    private composingTimeOut: Timeout | undefined;
    protected subscriptions = new Map<string, string>();
    public closed = false;
    protected readyStore: Writable<boolean>;
    protected canLoadOlderMessagesStore: Writable<boolean>;

    constructor(protected xmppClient: XmppClient, protected _VERBOSE: boolean) {
        if (this.constructor === AbstractRoom) {
            throw new TypeError('Abstract class "AbstractRoom" cannot be instantiated directly');
        }

        this.presenceStore = writable<UserList>(new Map<string, User>());
        this.messageStore = writable<Map<string, Message>>(new Map<string, Message>());
        this.deletedMessagesStore = writable<string[]>(new Array(0));
        this.reactionMessageStore = writable<Map<string, ReactionMessage[]>>(new Map<string, ReactionMessage[]>());
        this.lastMessageSeen = new Date();
        this.countMessagesToSee = writable<number>(0);
        this.loadingStore = writable<boolean>(false);
        this.readyStore = writable<boolean>(false);
        this.canLoadOlderMessagesStore = writable<boolean>(true);
    }

    get recipient(): string {
        throw new TypeError('Can\'t use recipient get from Abstract class "AbstractRoom", need to be implemented.');
    }
    get rawRecipient(): string {
        throw new TypeError('Can\'t use rawRecipient get from Abstract class "AbstractRoom", need to be implemented.');
    }
    get chatType(): StanzaConstants.MessageType {
        throw new TypeError('Can\'t use chatType get from Abstract class "AbstractRoom", need to be implemented.');
    }

    // Functions used to send message to the server
    protected sendPresence(first: boolean = false) {
        if (this.closed) {
            return;
        }
        const presenceId = uuid();
        if (first) {
            this.subscriptions.set("firstPresence", presenceId);
        }
        this.sendUserInfo(presenceId);
    }
    public sendUserInfo(presenceId: string = uuid()) {
        this.xmppClient.socket.sendUserInfo(this.recipient, presenceId, {
            jid: this.xmppClient.getMyJID(),
            roomPlayUri: get(userStore).playUri,
            roomName: get(userStore).roomName ?? "",
            userUuid: get(userStore).uuid,
            userColor: get(userStore).color,
            userWoka: get(userStore).woka,
            name: this.playerName,
            // If you can subscribe to the default muc room, this is that you are a member
            userIsMember: mucRoomsStore.getDefaultRoom()?.subscribe ?? false,
            userAvailabilityStatus: get(availabilityStatusStore),
            userVisitCardUrl: get(userStore).visitCardUrl ?? "",
        });
    }
    protected sendChatState(state: ChatState) {
        if (this.closed) {
            return;
        }
        this.xmppClient.socket.sendMessage({
            type: this.chatType,
            to: this.rawRecipient,
            chatState: state,
            jid: this.xmppClient.getMyPersonalJID(),
        });
    }
    protected sendMessage(text: string, messageReply?: Message) {
        if (this.closed) {
            return;
        }
        const idMessage = uuid();
        let links = {};
        if (get(filesUploadStore).size > 0) {
            links = { links: fileMessageManager.jsonFiles };
        }
        if (messageReply) {
            let messageReplyLinks = {};
            if (messageReply.links != undefined) {
                messageReplyLinks = { links: JSON.stringify(messageReply.links) };
            }
            this.xmppClient.socket.sendMessage({
                type: this.chatType,
                to: this.rawRecipient,
                id: idMessage,
                jid: this.xmppClient.getMyPersonalJID(),
                body: text,
                messageReply: {
                    to: messageReply.from,
                    id: messageReply.id,
                    senderName: messageReply.name,
                    body: messageReply.body,
                    ...messageReplyLinks,
                },
                ...links,
            });
        } else {
            this.xmppClient.socket.sendMessage({
                type: this.chatType,
                to: this.rawRecipient,
                id: idMessage,
                jid: this.xmppClient.getMyPersonalJID(),
                body: text,
                ...links,
            });
        }

        this.messageStore.update((messages) => {
            messages.set(idMessage, {
                name: this.xmppClient.getPlayerName(),
                jid: this.xmppClient.getMyPersonalJID(),
                body: text,
                time: new Date(),
                id: idMessage,
                delivered: false,
                error: false,
                from: this.xmppClient.getMyJID(),
                type: messageReply ? MessageType.reply : MessageType.message,
                ...links,
                targetMessageReply: messageReply
                    ? {
                          id: messageReply.id,
                          senderName: messageReply.name,
                          body: messageReply.body,
                          links: messageReply.links,
                      }
                    : undefined,
                mentions: [...get(mentionsUserStore).values()],
            });
            return messages;
        });

        fileMessageManager.reset();
        mentionsUserStore.set(new Set<User>());

        this.updateLastMessageSeen();

        if (this.sendTimeOut) {
            clearTimeout(this.sendTimeOut);
        }
        this.sendTimeOut = setTimeout(() => {
            this.messageStore.update((messages) => {
                const messagesUpdated = new Map<string, Message>();
                messages.forEach((message, messageId) => {
                    messagesUpdated.set(messageId, { ...message, error: !message.delivered });
                });
                return messagesUpdated;
            });
        }, 10_000);
    }
    public sendReactionMessage(emojiTargeted: string, messageId: string) {
        if (this.closed) {
            return;
        }
        let newReactions = [];
        const myReaction = get(this.reactionMessageStore)
            .get(messageId)
            ?.find((reactionMessage) => reactionMessage.userJid === this.xmppClient.getMyPersonalJID());
        if (myReaction) {
            if (myReaction.userReactions.find((emoji) => emoji === emojiTargeted)) {
                newReactions = myReaction.userReactions.filter((emoji) => emoji !== emojiTargeted);
            } else {
                newReactions = [...myReaction.userReactions, emojiTargeted];
            }
        } else {
            newReactions.push(emojiTargeted);
        }
        this.xmppClient.socket.sendMessage({
            type: this.chatType,
            to: this.rawRecipient,
            id: uuid(),
            jid: this.xmppClient.getMyPersonalJID(),
            body: "",
            reactions: {
                id: messageId,
                reaction: newReactions,
            },
        });

        // Recompute reactions
        this.toggleReactionsMessage(this.xmppClient.getMyPersonalJID(), messageId, newReactions);
    }
    public sendRetrieveLastMessages() {
        throw new TypeError(
            'Can\'t use sendRetrieveLastMessages function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    public sendBack(idMessage: string) {
        this.messageStore.update((messages) => {
            this.sendMessage(messages.get(idMessage)?.body ?? "");
            messages.delete(idMessage);
            return messages;
        });
    }

    // Function used to interpret message from the server
    public connect() {
        throw new TypeError('Can\'t use connect function from Abstract class "AbstractRoom", need to be implemented.');
    }
    onMessage(message: StanzaProtocol.ReceivedMessage, delay: StanzaProtocol.Delay): boolean {
        throw new TypeError(
            'Can\'t use onMessage function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    onReactions(message: WaReceivedReactions): boolean {
        throw new TypeError(
            'Can\'t use onReactions function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    onChatState(chatState: ChatStateMessage): boolean {
        throw new TypeError(
            'Can\'t use onChatState function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    onPresence(presence: StanzaProtocol.ReceivedPresence): boolean {
        throw new TypeError(
            'Can\'t use onPresence function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }

    public goTo(type: string, playUri: string, uuid: string) {
        if (type === "room") {
            window.parent.postMessage({ type: "goToPage", data: { url: `${playUri}#moveToUser=${uuid}` } }, "*");
        } else if (type === "user") {
            window.parent.postMessage({ type: "askPosition", data: { uuid, playUri } }, "*");
        }
    }
    public reset(): void {
        this.messageStore.set(new Map<string, Message>());
    }
    public updateLastMessageSeen() {
        this.countMessagesToSee.set(0);
        this.lastMessageSeen = new Date();
    }
    public updateComposingState(state: StanzaConstants.ChatState) {
        if (state === StanzaConstants.ChatState.Composing) {
            if (this.composingTimeOut) {
                clearTimeout(this.composingTimeOut);
            } else {
                this.sendChatState(StanzaConstants.ChatState.Composing);
            }
            this.composingTimeOut = setTimeout(() => {
                this.sendChatState(StanzaConstants.ChatState.Paused);
                if (this.composingTimeOut) {
                    clearTimeout(this.composingTimeOut);
                }
            }, 5_000);
        } else {
            if (this.composingTimeOut) {
                clearTimeout(this.composingTimeOut);
            }
            this.sendChatState(StanzaConstants.ChatState.Paused);
        }
    }

    public haveReaction(emojiTargeted: string, messageId: string): boolean {
        const reactionsMessage = get(this.reactionMessageStore).get(messageId);
        if (!reactionsMessage) return false;
        const myReaction =
            reactionsMessage.find(
                (reactionMessage) => reactionMessage.userJid === this.xmppClient.getMyPersonalJID()
            ) ?? null;
        if (!myReaction) return false;
        return !!myReaction.userReactions.find((emoji) => emoji === emojiTargeted);
    }
    public deleteMessage(idMessage: string): boolean {
        this.messageStore.update((messages) => {
            messages.delete(idMessage);
            return messages;
        });
        return true;
    }
    protected reactions(messageId: string): Map<string, Array<string>> {
        const reactions = new Map<string, Array<string>>();
        const reactionsMessage = get(this.reactionMessageStore).get(messageId);
        if (reactionsMessage) {
            reactionsMessage.forEach((reactionMessage) => {
                reactionMessage.userReactions.forEach((reaction) => {
                    reactions.set(reaction, [...(reactions.get(reaction) ?? []), reactionMessage.userJid]);
                });
            });
        }
        return reactions;
    }
    private updateMessageReactions(messageId: string) {
        // Update reactions of the message targeted
        this.messageStore.update((messages) => {
            const thisMessage = messages.get(messageId);
            if (thisMessage) {
                messages.set(messageId, { ...thisMessage, reactionsMessage: this.reactions(messageId) });
            }
            return messages;
        });
    }
    protected toggleReactionsMessage(userJid: string, messageId: string, reactions: Array<string>) {
        const newUserReaction = {
            userJid: userJid,
            userReactions: reactions,
        };

        this.reactionMessageStore.update((reactionsMessages) => {
            const reactionsMessage = reactionsMessages.get(messageId);
            if (reactionsMessage) {
                // If message has reactions
                const userReactionMessage = reactionsMessage.find(
                    (reactionMessage) => reactionMessage.userJid === userJid
                );
                if (userReactionMessage) {
                    // If reactions of user already exists in the reactions of the message
                    if (reactions.length === 0) {
                        // If reactions of user is empty, delete it
                        reactionsMessages.set(
                            messageId,
                            reactionsMessage.filter((reactionMessage) => reactionMessage.userJid !== userJid)
                        );
                    } else {
                        // If reactions of user is new, update it
                        reactionsMessages.set(
                            messageId,
                            reactionsMessage.map((userReactions) =>
                                userReactions.userJid === userJid ? newUserReaction : userReactions
                            )
                        );
                    }
                } else {
                    // If reactions of user doesn't exist in the reactions of the message
                    reactionsMessage.push(newUserReaction);
                    reactionsMessages.set(messageId, reactionsMessage);
                }
            } else {
                // If message hasn't reactions, add it
                reactionsMessages.set(messageId, [newUserReaction]);
            }
            return reactionsMessages;
        });
        this.updateMessageReactions(messageId);
    }

    get playerName(): string {
        return this.xmppClient.getPlayerName() ?? "unknown";
    }
    get myJID(): string {
        return this.xmppClient.getMyJID();
    }
    get myJIDBare(): string {
        return this.xmppClient.getMyJIDBare();
    }

    // Get all store
    public getPresenceStore(): UsersStore {
        return this.presenceStore;
    }
    public getMessagesStore(): Writable<MessageMap> {
        return this.messageStore;
    }
    public getDeletedMessagesStore(): Writable<string[]> {
        return this.deletedMessagesStore;
    }
    public getCountMessagesToSee(): Writable<number> {
        return this.countMessagesToSee;
    }
    public getLoadingStore(): Writable<boolean> {
        return this.loadingStore;
    }
    public getRoomReadyStore(): Writable<boolean> {
        return this.readyStore;
    }
    public getCanLoadOlderMessagesStore() {
        return this.canLoadOlderMessagesStore;
    }

    // DO NOT USE BUT CAN BE USEFUL
    // private static encode(name: string | null | undefined) {
    //     if (!name) return name;
    //     return name
    //         .replace(/\\/g, "\\5c")
    //         .replace(/ /g, "\\20")
    //         .replace(/\*/g, "\\22")
    //         .replace(/&/g, "\\26")
    //         .replace(/'/g, "\\27")
    //         .replace(/\//g, "\\2f")
    //         .replace(/:/g, "\\3a")
    //         .replace(/</g, "\\3c")
    //         .replace(/>/g, "\\3e")
    //         .replace(/@/g, "\\40");
    // }
}
