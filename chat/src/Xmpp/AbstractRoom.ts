import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { UserData } from "@workadventure/messages";
import { XmppClient } from "./XmppClient";
import * as StanzaProtocol from "stanza/protocol";
import {ChatStateMessage} from "stanza";
import { WaLink, WaReceivedReactions } from "./Lib/Plugin";
import * as StanzaConstants from "stanza/Constants";
import Timeout = NodeJS.Timeout;
import {get} from "svelte/store";
import {userStore} from "../Stores/LocalUserStore";
import {mucRoomsStore} from "../Stores/MucRoomsStore";
import {availabilityStatusStore, filesUploadStore, mentionsUserStore} from "../Stores/ChatStore";
import { v4 as uuid } from "uuid";
import {fileMessageManager} from "../Services/FileMessageManager";
import {ChatState} from "stanza/Constants";

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

    constructor(protected xmppClient: XmppClient, protected _VERBOSE: boolean) {
        if (this.constructor === AbstractRoom) {
            throw new TypeError('Abstract class "AbstractRoom" cannot be instantiated directly');
        }

        this.messageStore = writable<Map<string, Message>>(new Map<string, Message>());
        this.deletedMessagesStore = writable<string[]>(new Array(0));
        this.reactionMessageStore = writable<Map<string, ReactionMessage[]>>(new Map<string, ReactionMessage[]>());
        this.lastMessageSeen = new Date();
        this.countMessagesToSee = writable<number>(0);
        this.loadingStore = writable<boolean>(false);
        this.readyStore = writable<boolean>(false);
    }

    get recipient(): string {
        throw new TypeError(
            'Can\'t use recipient get from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    get rawRecipient(): string {
        throw new TypeError(
            'Can\'t use rawRecipient get from Abstract class "AbstractRoom", need to be implemented.'
        );
    }
    get chatType(): StanzaConstants.MessageType {
        throw new TypeError(
            'Can\'t use chatType get from Abstract class "AbstractRoom", need to be implemented.'
        );
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
    public sendUserInfo(presenceId: string = uuid()){
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

    // Function used to interpret message from the server
    public connect() {
        throw new TypeError('Can\'t use connect function from Abstract class "AbstractRoom", need to be implemented.');
    }
    onMessage(message: StanzaProtocol.ReceivedMessage): boolean {
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
