import type { Writable } from "svelte/store";
import { writable, get } from "svelte/store";
import { UserData } from "@workadventure/messages";
import * as StanzaProtocol from "stanza/protocol";
import { ChatStateMessage, JID } from "stanza";
import { ChatState } from "stanza/Constants";
import { SearchableArrayStore } from "@workadventure/store-utils";
import { Message } from "../Model/Message";
import { WaLink, WaReceivedReactions } from "./Lib/Plugin";
import { XmppClient } from "./XmppClient";
import Timeout = NodeJS.Timeout;

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
    chatState?: ChatState;
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
    klaxoonToolActivated: false,
    youtubeToolActivated: false,
    googleDocsToolActivated: false,
    googleSheetsToolActivated: false,
    googleSlidesToolActivated: false,
    eraserToolActivated: false,
};

export class AbstractRoom {
    protected messageStore: SearchableArrayStore<string, Message>;
    protected reactionMessageStore: Map<string, ReactionMessage[]>;
    protected deletedMessagesStore: Writable<Map<string, string>>;
    public lastMessageSeen: Date;
    protected countMessagesToSee: Writable<number>;
    protected loadingStore: Writable<boolean>;
    protected sendTimeOut: Timeout | undefined;
    private composingTimeOut: Timeout | undefined;
    protected subscriptions = new Map<string, string>();
    public closed = false;

    constructor(protected xmppClient: XmppClient) {
        if (this.constructor === AbstractRoom) {
            throw new TypeError('Abstract class "AbstractRoom" cannot be instantiated directly');
        }
        this.messageStore = new SearchableArrayStore<string, Message>((message: Message) => message.id);
        this.deletedMessagesStore = writable<Map<string, string>>(new Map<string, string>());
        this.reactionMessageStore = new Map<string, ReactionMessage[]>();
        this.lastMessageSeen = new Date();
        this.countMessagesToSee = writable<number>(0);
        this.loadingStore = writable<boolean>(false);
    }

    // Functions used to send message to the server
    public sendChatState(state: ChatState): void {
        throw new TypeError(
            'Can\'t use sendChatState function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }

    // Function used to interpret message from the server
    public connect() {
        throw new TypeError('Can\'t use connect function from Abstract class "AbstractRoom", need to be implemented.');
    }
    onMessage(message: StanzaProtocol.ReceivedMessage): void {
        throw new TypeError(
            'Can\'t use onMessage function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    onReactions(message: WaReceivedReactions): void {
        throw new TypeError(
            'Can\'t use onReactions function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    onChatState(chatState: ChatStateMessage): void {
        throw new TypeError(
            'Can\'t use onChatState function from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    onPresence(presence: StanzaProtocol.ReceivedPresence) {
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
        this.messageStore.clear();
    }
    public updateLastMessageSeen() {
        this.countMessagesToSee.set(0);
        this.lastMessageSeen = new Date();
    }
    public updateComposingState(state: ChatState) {
        if (state === ChatState.Composing) {
            if (this.composingTimeOut) {
                clearTimeout(this.composingTimeOut);
            } else {
                this.sendChatState(ChatState.Composing);
            }
            this.composingTimeOut = setTimeout(() => {
                this.sendChatState(ChatState.Paused);
                if (this.composingTimeOut) {
                    clearTimeout(this.composingTimeOut);
                }
            }, 5_000);
        } else {
            if (this.composingTimeOut) {
                clearTimeout(this.composingTimeOut);
            }
            this.sendChatState(ChatState.Paused);
        }
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
    public getMessagesStore(): SearchableArrayStore<string, Message> {
        return this.messageStore;
    }
    public getDeletedMessagesStore(): Writable<Map<string, string>> {
        return this.deletedMessagesStore;
    }
    public getCountMessagesToSee(): Writable<number> {
        return this.countMessagesToSee;
    }
    public getLoadingStore(): Writable<boolean> {
        return this.loadingStore;
    }

    // Function used to manage Reactions
    public haveReaction(
        emojiTargeted: string,
        messageId: string,
        userJid: string = this.xmppClient.getMyPersonalJID()
    ): boolean {
        const message = this.messageStore.get(messageId);
        if (message !== undefined) {
            const reactions = message.reactions;
            const usersReaction = get(reactions.getNestedStore(emojiTargeted, (item) => item));
            if (usersReaction) {
                if (usersReaction.find((jid) => jid === userJid)) {
                    return true;
                }
            }
        }
        return false;
    }
    protected reactions(messageId: string): Map<string, string[]> {
        const reactions = new Map<string, string[]>();
        const reactionsMessage = this.reactionMessageStore.get(messageId);
        if (reactionsMessage) {
            reactionsMessage.forEach((reactionMessage) => {
                reactionMessage.userReactions.forEach((reaction) => {
                    reactions.set(reaction, [...(reactions.get(reaction) ?? []), reactionMessage.userJid]);
                });
            });
        }
        return reactions;
    }
    protected updateMessageReactions(messageId: string) {
        // Update reactions of the message targeted
        this.messageStore.get(messageId)?.setReactions(this.reactions(messageId));
    }
    protected toggleReactionsMessage(userJid: string, messageId: string, reactions: Array<string>) {
        const newUserReaction = {
            userJid: userJid,
            userReactions: reactions,
        };

        const reactionsMessage = this.reactionMessageStore.get(messageId);
        if (reactionsMessage) {
            // If message has reactions
            const userReactionMessage = reactionsMessage.find((reactionMessage) => reactionMessage.userJid === userJid);
            if (userReactionMessage) {
                // If reactions of user already exists in the reactions of the message
                if (reactions.length === 0) {
                    // If reactions of user is empty, delete it
                    this.reactionMessageStore.set(
                        messageId,
                        reactionsMessage.filter((reactionMessage) => reactionMessage.userJid !== userJid)
                    );
                } else {
                    // If reactions of user is new, update it
                    this.reactionMessageStore.set(
                        messageId,
                        reactionsMessage.map((userReactions) =>
                            userReactions.userJid === userJid ? newUserReaction : userReactions
                        )
                    );
                }
            } else {
                // If reactions of user doesn't exist in the reactions of the message
                reactionsMessage.push(newUserReaction);
                this.reactionMessageStore.set(messageId, reactionsMessage);
            }
        } else {
            // If message hasn't reactions, add it
            this.reactionMessageStore.set(messageId, [newUserReaction]);
        }

        const message = this.messageStore.get(messageId);
        if (message) {
            newUserReaction.userReactions.forEach((emoji) => {
                if (!this.haveReaction(emoji, messageId, userJid)) {
                    message.addReaction(emoji, userJid);
                }
            });

            message.reactions.forEach((userReactions, emoji) => {
                if (
                    get(userReactions).find((userJid_) => userJid_ === userJid) &&
                    !newUserReaction.userReactions.find((reaction) => reaction === emoji)
                ) {
                    message.removeReaction(emoji, userJid);
                }
            });
        }
    }

    // Function used to manage Messages
    public deleteMessage(messageId: string): boolean {
        this.messageStore.delete(messageId);
        return true;
    }
    protected parseMessage(
        receivedMessage: StanzaProtocol.ReceivedMessage,
        delay: StanzaProtocol.Delay | null = null
    ): Message {
        let date = new Date();
        if (delay) {
            // Only in case where the message received is an archive (a message automatically sent by the server when joining a room)
            date = new Date(delay.timestamp);
        }
        if (!receivedMessage.remove) {
            const receivedJid = JID.parse(receivedMessage.jid);
            if (receivedJid && receivedMessage.jid && receivedMessage.id) {
                const message = new Message(
                    receivedMessage.body ?? "",
                    receivedJid.resource ?? "unknown",
                    JID.create({
                        local: receivedJid.local,
                        domain: receivedJid.domain,
                        resource: JID.parse(receivedMessage.from).resource,
                    }),
                    date,
                    receivedMessage.id,
                    false,
                    false,
                    receivedMessage.from,
                    receivedMessage.messageReply ? MessageType.message : MessageType.reply,
                    receivedMessage.messageReply
                        ? ({
                              id: receivedMessage.messageReply.id,
                              senderName: receivedMessage.messageReply.senderName,
                              body: receivedMessage.messageReply.body,
                              links: receivedMessage.messageReply.links
                                  ? JSON.parse(receivedMessage.messageReply.links)
                                  : undefined,
                          } as ReplyMessage)
                        : undefined,
                    undefined,
                    receivedMessage.links as WaLink[],
                    []
                );
                message.setReactions(this.reactions(receivedMessage.id));
                return message;
            } else {
                console.error("Message format is not good", {
                    received: !!receivedJid,
                    jid: !!receivedMessage.jid,
                    body: !!receivedMessage.body,
                    id: !!receivedMessage.id,
                });
            }
        }
        throw new Error("Message not parsed");
    }
    protected parseMessageType(receivedMessage: StanzaProtocol.ReceivedMessage): string {
        const messageId = receivedMessage.id ?? "";
        if (receivedMessage.hasSubject === true) {
            return "subject";
        } else if (this.messageStore.has(messageId)) {
            return "exist";
        } else if (receivedMessage.remove) {
            return "remove";
        }
        return "new";
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
