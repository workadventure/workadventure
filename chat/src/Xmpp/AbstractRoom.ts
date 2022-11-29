import type {Writable} from "svelte/store";
import {writable, get} from "svelte/store";
import {UserData} from "@workadventure/messages";
import {XmppClient} from "./XmppClient";
import * as StanzaProtocol from "stanza/protocol";
import {ChatStateMessage, JID} from "stanza";
import {WaLink, WaReceivedReactions} from "./Lib/Plugin";
import {ChatState} from "stanza/Constants";
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
    protected messageMap: Map<string, Message>;
    protected messageStore: Writable<Message[]>;
    protected reactionMessageStore: Writable<Map<string, ReactionMessage[]>>;
    protected deletedMessagesStore: Writable<Map<string, string>>;
    public lastMessageSeen: Date;
    protected countMessagesToSee: Writable<number>;
    protected loadingStore: Writable<boolean>;
    protected sendTimeOut: Timeout | undefined;
    private composingTimeOut: Timeout | undefined;
    protected subscriptions = new Map<string, string>();
    public closed = false;

    constructor(protected xmppClient: XmppClient, protected _VERBOSE: boolean) {
        if (this.constructor === AbstractRoom) {
            throw new TypeError('Abstract class "AbstractRoom" cannot be instantiated directly');
        }
        this.messageMap = new Map<string, Message>();
        this.messageStore = writable<Message[]>([]);
        this.deletedMessagesStore = writable<Map<string, string>>(new Map<string, string>());
        this.reactionMessageStore = writable<Map<string, ReactionMessage[]>>(new Map<string, ReactionMessage[]>());
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
        this.messageStore.set([]);
        this.messageMap = new Map<string, Message>();
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
    public getMessagesStore(): Writable<Message[]> {
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
    protected updateMessageReactions(messageId: string) {
        // Update reactions of the message targeted
        this.updateMessagePart(messageId, { reactionsMessage: this.reactions(messageId) });
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


    // Function used to manage Messages
    protected appendMessage(message: Message) {
        this.addMessage(message);
        this.messageStore.update((messages) => [...messages, message]);
    }
    protected prependMessage(message: Message) {
        this.addMessage(message);
        this.messageStore.update((messages) => [message, ...messages]);
    }
    protected addMessage(message: Message) {
        this.messageMap.set(message.id, message);
    }
    protected updateMessagePart(messageId: string, part: Object) {
        const message = this.messageMap.get(messageId);
        if (message) {
            this.messageMap.set(messageId, { ...message, ...part });
        } else {
            throw new Error(`AbstractRoom => updateMessagePart => No message found (${messageId})`);
        }
        this.messageStore.update((messages) =>
            messages.map((message) => {
                if (message.id === messageId) {
                    return { ...message, ...part };
                } else {
                    return message;
                }
            })
        );
    }
    public deleteMessage(messageId: string): boolean {
        this.messageMap.delete(messageId);
        this.messageStore.update((messages) => messages.filter((message) => message.id !== messageId));
        return true;
    }
    protected parseMessage(receivedMessage: StanzaProtocol.ReceivedMessage, delay: StanzaProtocol.Delay | null = null): Message{
        let date = new Date();
        if (delay) {
            // Only in case where the message received is an archive (a message automatically sent by the server when joining a room)
            date = new Date(delay.timestamp);
        }
        if (!receivedMessage.remove) {
            const receivedJid = JID.parse(receivedMessage.jid);
            if (receivedJid && receivedMessage.jid && receivedMessage.id) {
                return {
                    name: receivedJid.resource ?? "unknown",
                    jid: JID.create({
                        local: receivedJid.local,
                        domain: receivedJid.domain,
                        resource: JID.parse(receivedMessage.from).resource,
                    }),
                    body: receivedMessage.body ?? "",
                    time: date,
                    id: receivedMessage.id,
                    delivered: true,
                    error: false,
                    from: receivedMessage.from,
                    type: receivedMessage.messageReply ? MessageType.message : MessageType.reply,
                    links: receivedMessage.links as WaLink[],
                    targetMessageReply: receivedMessage.messageReply
                        ? {
                            id: receivedMessage.messageReply.id,
                            senderName: receivedMessage.messageReply.senderName,
                            body: receivedMessage.messageReply.body,
                            links: receivedMessage.messageReply.links
                                ? JSON.parse(receivedMessage.messageReply.links)
                                : undefined,
                        }
                        : undefined,
                    reactionsMessage: this.reactions(receivedMessage.id),
                };
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
    protected parseMessageType(receivedMessage: StanzaProtocol.ReceivedMessage): string{
        const messageId = receivedMessage.id ?? "";
        if (receivedMessage.hasSubject === true) {
            return "subject";
        } else if (this.messageMap.has(messageId)) {
            return "exist";
        } else if(receivedMessage.remove) {
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
