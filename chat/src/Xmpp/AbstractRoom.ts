import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { UserData } from "../Messages/JsonMessages/ChatData";
import { XmppClient } from "./XmppClient";
import * as StanzaProtocol from "stanza/protocol";
import { ChatStateMessage } from "stanza";
import { WaLink, WaReceivedReactions } from "./Lib/Plugin";
import { ChatState } from "stanza/Constants";
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
        this.messageStore.set(new Map<string, Message>());
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
