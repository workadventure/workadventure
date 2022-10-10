import type { ChatConnection } from "../Connection/ChatConnection";
import { JID } from "@xmpp/jid";
import type { Readable, Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { userStore } from "../Stores/LocalUserStore";
import { UserData } from "../Messages/JsonMessages/ChatData";
import { UploadedFile } from "../Services/FileMessageManager";
import { connectionManager } from "../Connection/ChatConnectionManager";
import {XmppClient} from "./XmppClient";

export const UserStatus = {
    AVAILABLE: "available",
    DISCONNECTED: "disconnected"
}

export type User = {
    name: string;
    playUri: string;
    roomName: string | null;
    uuid: string;
    status: string;
    active: boolean;
    isInSameMap: boolean;
    color: string;
    woka: string;
    unreads: boolean;
    isAdmin: boolean;
    chatState: string;
    isMe: boolean;
    jid: string;
    isMember: boolean;
    availabilityStatus: number;
    visitCardUrl?: string | null;
};

export const ChatStates = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    GONE: "gone",
    COMPOSING: "composing",
    PAUSED: "paused",
};
export type UserList = Map<string, User>;
export type UsersStore = Readable<UserList>;

export type ReplyMessage = {
    id: string;
    senderName: string;
    body: string;
    files?: UploadedFile[];
};

export enum ReactAction {
    add = 1,
    delete = -1,
}

export type ReactMessage = {
    id: string;
    message: string;
    from: string;
    emoji: string;
    operation: number;
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
    files?: UploadedFile[];
    mentions?: User[];
};
export type MessagesList = Message[];
export type MessagesStore = Readable<MessagesList>;


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

export const defaultUser: User = {
    name: "unknown",
    playUri: "",
    roomName: null,
    uuid: "",
    status: "",
    active: false,
    isInSameMap: false,
    color: defaultColor,
    woka: defaultWoka,
    unreads: false,
    isAdmin: false,
    chatState: "",
    isMe: false,
    jid: "",
    isMember: false,
    availabilityStatus: 0,
    visitCardUrl: null,
};


export type DeleteMessageStore = Readable<string[]>;

export class AbstractRoom {
    protected messageStore: Writable<Message[]>;
    protected messageReactStore: Writable<Map<string, ReactMessage[]>>;
    protected deletedMessagesStore: Writable<string[]>;
    public lastMessageSeen: Date;
    protected countMessagesToSee: Writable<number>;
    protected loadingStore: Writable<boolean>;

    constructor(
        protected connection: ChatConnection,
        protected xmppClient: XmppClient
    ) {
        if (this.constructor === AbstractRoom) {
            throw new TypeError('Abstract class "AbstractRoom" cannot be instantiated directly');
        }


        this.messageStore = writable<Message[]>(new Array(0));
        this.deletedMessagesStore = writable<string[]>(new Array(0));
        this.messageReactStore = writable<Map<string, ReactMessage[]>>(new Map<string, ReactMessage[]>());
        this.lastMessageSeen = new Date();
        this.countMessagesToSee = writable<number>(0);
        this.loadingStore = writable<boolean>(false);

        this.messageReactStore.subscribe((reacts) => {
            this.messageStore.update((messages) => {
                messages.forEach((message, index) => {
                    if (!reacts.has(message.id)) return;

                    const reactsByMessage = reacts.get(message.id);
                    message.targetMessageReact = reactsByMessage?.reduce((list: Map<string, number>, reactMessage) => {
                        if (list.has(reactMessage.emoji)) {
                            const nb = (list.get(reactMessage.emoji) as number) + reactMessage.operation;
                            list.set(reactMessage.emoji, nb);
                        } else {
                            list.set(reactMessage.emoji, reactMessage.operation);
                        }
                        return list;
                    }, new Map<string, number>());

                    messages[index] = message;
                });
                return messages;
            });
        });


    }

    public getPlayerName(): string {
        return this.xmppClient.getPlayerName() ?? "unknown";
    }

    public getMyJID(): string {
        return this.xmppClient.getMyJID() ?? "unknown";
    }

    public getPlayerUuid(): string {
        return get(userStore).uuid ?? "unknown";
    }

    public connect() {
        throw new TypeError('Can\'t use connect function from Abstract class "AbstractRoom", need to be implemented.');
    }

    onMessage(xml: ElementExt): void {
        throw new TypeError('Can\'t use onMessage function from Abstract class "AbstractRoom", need to be implemented.');
    }


    // All gets from the presenceStore
    protected getUser(jid: JID | string): User {
        throw new TypeError('Can\'t use getUser function from Abstract class "AbstractRoom", need to be implemented.');
    }
    protected getCurrentName(jid: JID | string) {
        return this.getUser(jid).name ?? "";
    }
    protected getCurrentStatus(jid: JID | string) {
        return this.getUser(jid).status ?? UserStatus.DISCONNECTED;
    }
    protected getCurrentPlayUri(jid: JID | string) {
        return this.getUser(jid).playUri ?? "";
    }
    protected getCurrentRoomName(jid: JID | string) {
        return this.getUser(jid).roomName ?? null;
    }
    protected getCurrentUuid(jid: JID | string) {
        return this.getUser(jid).uuid ?? "";
    }
    protected getCurrentColor(jid: JID | string) {
        return this.getUser(jid).color ?? defaultColor;
    }
    protected getCurrentWoka(jid: JID | string) {
        return this.getUser(jid).woka ?? defaultWoka;
    }
    protected getCurrentIsAdmin(jid: JID | string) {
        return this.getUser(jid).isAdmin ?? false;
    }
    protected getCurrentChatState(jid: JID | string) {
        return this.getUser(jid).chatState ?? ChatStates.INACTIVE;
    }
    protected getCurrentIsMember(jid: JID | string) {
        return this.getUser(jid).isMember ?? true;
    }
    protected getCurrentAvailabilityStatus(jid: JID | string) {
        return this.getUser(jid).availabilityStatus ?? 0;
    }
    protected getVisitCardUrl(jid: JID | string) {
        return this.getUser(jid).visitCardUrl ?? null;
    }

    public deleteMessage(idMessage: string) {
        this.messageStore.update((messages) => {
            return messages.filter((message) => message.id !== idMessage);
        });
        return true;
    }

    // Get all store
    public getMessagesStore(): MessagesStore {
        return this.messageStore;
    }
    public getDeletedMessagesStore(): DeleteMessageStore {
        return this.deletedMessagesStore;
    }
    public getCountMessagesToSee(): Writable<number> {
        return this.countMessagesToSee;
    }
    public getLoadingStore(): Writable<boolean> {
        return this.loadingStore;
    }

    public reset(): void {
        this.messageStore.set([]);
    }

    private static encode(name: string | null | undefined) {
        if (!name) return name;
        return name
            .replace(/\\/g, "\\5c")
            .replace(/ /g, "\\20")
            .replace(/\*/g, "\\22")
            .replace(/&/g, "\\26")
            .replace(/'/g, "\\27")
            .replace(/\//g, "\\2f")
            .replace(/:/g, "\\3a")
            .replace(/</g, "\\3c")
            .replace(/>/g, "\\3e")
            .replace(/@/g, "\\40");
    }
}
