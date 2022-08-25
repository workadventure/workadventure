import type { ChatConnection } from "../Connection/ChatConnection";
import xml, { Element } from "@xmpp/xml";
import jid, { JID } from "@xmpp/jid";
import type { Readable, Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { mucRoomsStore, numberPresenceUserStore } from "../Stores/MucRoomsStore";
import { v4 as uuidv4 } from "uuid";
import { localUserStore, userStore } from "../Stores/LocalUserStore";
import { UserData } from "../Messages/JsonMessages/ChatData";
import { filesUploadStore, mentionsUserStore } from "../Stores/ChatStore";
import { fileMessageManager, UploadedFile } from "../Services/FileMessageManager";
import { mediaManager, NotificationType } from "../Media/MediaManager";
import { availabilityStatusStore } from "../Stores/ChatStore";
import { activeThreadStore } from "../Stores/ActiveThreadStore";
import Timeout = NodeJS.Timeout;
import { connectionManager } from "../Connection/ChatConnectionManager";

export const USER_STATUS_AVAILABLE = "available";
export const USER_STATUS_DISCONNECTED = "disconnected";
export type User = {
    name: string;
    playUri: string;
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

export type Teleport = {
    state: boolean;
    to: string | null;
};
export type TeleportStore = Readable<Teleport>;

type ReplyMessage = {
    id: string;
    senderName: string;
    body: string;
    files?: UploadedFile[];
};

enum reactAction {
    add = 1,
    delete = -1,
}

type ReactMessage = {
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
    type: messageType;
    targetMessageReply?: ReplyMessage;
    targetMessageReact?: Map<string, number>;
    files?: UploadedFile[];
    mentions?: User[];
};
export type MessagesList = Message[];
export type MessagesStore = Readable<MessagesList>;

export type Me = {
    isAdmin: boolean;
};

export type MeStore = Readable<Me>;

enum messageType {
    message = 1,
    reply,
    react,
}

const _VERBOSE = true;
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
};

export type DeleteMessageStore = Readable<string[]>;

export class MucRoom {
    private presenceStore: Writable<UserList>;
    private teleportStore: Writable<Teleport>;
    private messageStore: Writable<Message[]>;
    private messageReactStore: Writable<Map<string, ReactMessage[]>>;
    private deletedMessagesStore: Writable<string[]>;
    private meStore: Writable<Me>;
    private nickCount = 0;
    private composingTimeOut: Timeout | undefined;
    public lastMessageSeen: Date;
    private countMessagesToSee: Writable<number>;
    private sendTimeOut: Timeout | undefined;
    private loadingStore: Writable<boolean>;
    public canLoadOlderMessages: boolean;
    private closed: boolean = false;
    private description: string = "";

    constructor(
        private connection: ChatConnection,
        public readonly name: string,
        private roomJid: JID,
        public type: string,
        public subscribe: boolean,
        private jid: string
    ) {
        this.presenceStore = writable<UserList>(new Map<string, User>());
        this.messageStore = writable<Message[]>(new Array(0));
        this.deletedMessagesStore = writable<string[]>(new Array(0));
        this.messageReactStore = writable<Map<string, ReactMessage[]>>(new Map<string, ReactMessage[]>());
        this.teleportStore = writable<Teleport>({ state: false, to: null });
        this.meStore = writable<Me>({ isAdmin: false });
        this.lastMessageSeen = new Date();
        this.countMessagesToSee = writable<number>(0);
        this.loadingStore = writable<boolean>(false);
        this.canLoadOlderMessages = true;

        //refrech react message
        this.messageReactStore.subscribe((reacts) => {
            this.messageStore.update((messages) => {
                messages.forEach((message, index) => {
                    if (!reacts.has(message.id)) return;

                    const reactsByMessage = reacts.get(message.id);
                    message.targetMessageReact = reactsByMessage?.reduce((list: Map<string, number>, reactMessage) => {
                        if (list.has(reactMessage.emoji)) {
                            const nb = (list.get(reactMessage.emoji) as number) + reactMessage.operation * 1;
                            list.set(reactMessage.emoji, nb);
                        } else {
                            list.set(reactMessage.emoji, reactMessage.operation * 1);
                        }
                        return list;
                    }, new Map<string, number>());

                    messages[index] = message;
                });
                return messages;
            });
        });
    }

    public getPlayerName() {
        try {
            return connectionManager.connectionOrFail.getXmppClient()?.getPlayerName() ?? "unknown";
        } catch (e) {
            console.log(e);
        }
        return "unknown";
    }

    public getPlayerUuid() {
        return get(userStore).uuid ?? "unknown";
    }

    public getUserDataByName(name: string) {
        let woka = defaultWoka;
        let color = "";
        let jid = null;
        if (this.getPlayerName() === name) {
            woka = get(userStore).woka;
            color = get(userStore).color;
        } else {
            get(this.presenceStore).forEach((user, jid_) => {
                if (user.name === name) {
                    woka = user.woka;
                    color = user.color;
                    jid = jid_;
                }
            });
        }
        return { woka, color, jid };
    }

    public getUserDataByUuid(uuid: string): User {
        for (const [, user] of get(this.presenceStore)) {
            if (user.uuid === uuid) {
                return user;
            }
        }
        return {
            name: "unknown",
            playUri: "",
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
        };
    }

    public goTo(type: string, playUri: string, uuid: string) {
        this.teleportStore.set({ state: true, to: uuid });
        if (type === "room") {
            window.parent.postMessage({ type: "goToPage", data: { url: `${playUri}#moveToUser=${uuid}` } }, "*");
        } else if (type === "user") {
            window.parent.postMessage({ type: "askPosition", data: { uuid, playUri } }, "*");
        }
    }

    public connect() {
        if (localUserStore.getUserData().isLogged && this.subscribe && this.type !== "live") {
            this.sendSubscribe();
        } else {
            this.sendPresence();
        }
    }

    private requestAllSubscribers() {
        const messageMucListAllUsers = xml(
            "iq",
            {
                type: "get",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml("subscriptions", {
                xmlns: "urn:xmpp:mucsub:0",
            })
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messageMucListAllUsers);
            if (_VERBOSE) console.warn("[XMPP]", ">> Get all subscribers sent");
        }
    }

    public retrieveLastMessages() {
        const firstMessage = get(this.messageStore).shift();
        if (!firstMessage) return;
        this.loadingStore.set(true);
        const messageRetrieveLastMessages = xml(
            "iq",
            {
                type: "set",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(
                "query",
                {
                    xmlns: "urn:xmpp:mam:2",
                },
                xml(
                    "x",
                    {
                        xmlns: "jabber:x:data",
                        type: "submit",
                    },
                    xml(
                        "field",
                        {
                            var: "FORM_TYPE",
                            type: "hidden",
                        },
                        xml("value", {}, "urn:xmpp:mam:2")
                    ),
                    xml(
                        "field",
                        {
                            var: "end",
                        },
                        xml("value", {}, firstMessage.time.toISOString())
                    )
                ),
                xml(
                    "set",
                    {
                        xmlns: "http://jabber.org/protocol/rsm",
                    },
                    xml("max", {}, "50")
                )
            )
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messageRetrieveLastMessages);
            if (_VERBOSE) console.warn("[XMPP]", ">> Get older messages sent");
        }
    }

    private sendPresence() {
        const messagePresence = xml(
            "presence",
            {
                to: jid(this.roomJid.local, this.roomJid.domain, this.getPlayerName()).toString(),
                from: this.jid,
                //type:'subscribe', //check presence documentation https://www.ietf.org/archive/id/draft-ietf-xmpp-3921bis-01.html#sub
                //persistent: true
            },
            xml("x", {
                xmlns: "http://jabber.org/protocol/muc",
            }),
            // Add window location and have possibility to teleport on the user and remove all hash from the url
            xml("room", {
                playUri: get(userStore).playUri,
            }),
            // Add uuid of the user to identify and target them on teleport
            xml("user", {
                uuid: get(userStore).uuid,
                color: get(userStore).color,
                woka: get(userStore).woka,
                // If you can subscribe to the default muc room, this is that you are a member
                isMember: mucRoomsStore.getDefaultRoom()?.subscribe ?? false,
            })
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messagePresence);
            if (_VERBOSE) console.warn("[XMPP]", ">> Presence sent", get(userStore).uuid);
        }
    }

    private sendSubscribe() {
        const messageMucSubscribe = xml(
            "iq",
            {
                type: "set",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(
                "subscribe",
                {
                    xmlns: "urn:xmpp:mucsub:0",
                    nick: this.getPlayerName(),
                },
                xml("event", { node: "urn:xmpp:mucsub:nodes:subscribers" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:messages" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:config" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:presence" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:affiliations" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:system" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:subject" })
            )
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messageMucSubscribe);
            if (_VERBOSE)
                console.warn("[XMPP]", ">> Subscribe sent from", this.getPlayerName(), "to", this.roomJid.local);
        }
    }

    public sendRankUp(userJID: string | JID) {
        this.sendAffiliate("admin", userJID);
    }

    public sendRankDown(userJID: string | JID) {
        this.sendAffiliate("none", userJID);
    }

    private sendAffiliate(type: string, userJID: string | JID) {
        const messageMucAffiliateUser = xml(
            "iq",
            {
                type: "set",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(
                "query",
                {
                    xmlns: "http://jabber.org/protocol/muc#admin",
                },
                xml(
                    "item",
                    {
                        affiliation: type,
                        jid: userJID.toString(),
                    },
                    xml("reason", {}, "test")
                )
            )
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messageMucAffiliateUser);
            if (_VERBOSE) console.warn("[XMPP]", ">> Affiliation sent");
        }
    }

    public sendBan(user: string, name: string, playUri: string) {
        const userJID = jid(user);
        //this.affiliate("outcast", userJID);
        this.connection.emitBanUserByUuid(playUri, userJID.local, name, "Test message de ban");
        if (_VERBOSE) console.warn("[XMPP]", ">> Ban user message sent");
    }

    public reInitialize() {
        // Destroy room in ejabberd
        this.sendDestroy();
        // Recreate room in ejabberd
        setTimeout(() => this.sendPresence(), 100);
        // Tell all users to subscribe to it
        //setTimeout(() => this.connection.emitJoinMucRoom(this.name, this.type, this.roomJid.local), 200);
    }

    public sendDestroy() {
        const messageMucDestroy = xml(
            "iq",
            {
                type: "set",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(
                "query",
                {
                    xmlns: "http://jabber.org/protocol/muc#owner",
                },
                xml(
                    "destroy",
                    {
                        jid: jid(this.roomJid.local, this.roomJid.domain).toString(),
                    },
                    xml("reason", {}, "")
                )
            )
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messageMucDestroy);
            if (_VERBOSE) console.warn("[XMPP]", ">> Destroy room sent");
        }
    }

    public sendDisconnect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, this.getPlayerName());
        const messageMucSubscribe = xml("presence", { to: to.toString(), from: this.jid, type: "unavailable" });
        if (!this.closed) {
            this.connection.emitXmlMessage(messageMucSubscribe);
            if (_VERBOSE) console.warn("[XMPP]", ">> Disconnect sent");
            this.closed = true;
        }
    }

    public sendRemoveMessage(messageId: string) {
        const messageRemove = xml(
            "message",
            {
                to: this.roomJid.toString(),
                from: this.jid,
                type: "groupchat",
                id: uuidv4(),
                xmlns: "jabber:client",
            },
            xml("remove", {
                xmlns: "urn:xmpp:message-delete:0",
                origin_id: messageId,
            }),
            xml("body", {}, "")
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(messageRemove);
            if (_VERBOSE) console.warn("[XMPP]", ">> Remove message sent");
        }
    }

    public sendChatState(state: string) {
        const chatState = xml(
            "message",
            {
                type: "groupchat",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(state, {
                xmlns: "http://jabber.org/protocol/chatstates",
            })
        );
        if (!this.closed) {
            this.connection.emitXmlMessage(chatState);
            if (_VERBOSE) console.warn("[XMPP]", ">> Chat state sent");
        }
    }

    public sendMessage(text: string, messageReply?: Message) {
        const idMessage = uuidv4();
        const message = xml(
            "message",
            {
                type: "groupchat",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: idMessage,
            },
            xml("body", {}, text)
        );

        //create message reply
        if (messageReply != undefined) {
            const xmlReplyMessage = xml("reply", {
                to: messageReply.from,
                id: messageReply.id,
                xmlns: "urn:xmpp:reply:0",
                senderName: messageReply.name,
                body: messageReply.body,
            });
            //check if exist files in the reply message
            if (messageReply.files != undefined) {
                xmlReplyMessage.append(fileMessageManager.getXmlFileAttrFrom(messageReply.files));
            }
            //append node xml of reply message
            message.append(xmlReplyMessage);
        }

        //check if exist files into the message
        if (get(filesUploadStore).size > 0) {
            message.append(fileMessageManager.getXmlFileAttr);
        }

        if (get(mentionsUserStore).size > 0) {
            message.append(
                [...get(mentionsUserStore).values()].reduce((xmlValue, user) => {
                    xmlValue.append(
                        xml(
                            "mention",
                            {
                                from: this.jid,
                                to: user.jid,
                                name: user.name,
                                user,
                            } //TODO change it to use an XMPP implementation of mention
                        )
                    );
                    return xmlValue;
                }, xml("mentions"))
            );
        }

        if (!this.closed) {
            this.connection.emitXmlMessage(message);

            this.messageStore.update((messages) => {
                messages.push({
                    name: this.getPlayerName(),
                    jid: this.getMyJID().toString(),
                    body: text,
                    time: new Date(),
                    id: idMessage,
                    delivered: false,
                    error: false,
                    from: this.jid,
                    type: messageReply != undefined ? messageType.reply : messageType.message,
                    files: fileMessageManager.files,
                    targetMessageReply:
                        messageReply != undefined
                            ? {
                                  id: messageReply.id,
                                  senderName: messageReply.name,
                                  body: messageReply.body,
                                  files: messageReply.files,
                              }
                            : undefined,
                    mentions: [...get(mentionsUserStore).values()],
                });
                return messages;
            });

            //clear list of file uploaded
            fileMessageManager.reset();
            mentionsUserStore.set(new Set<User>());

            this.manageResendMessage();
        }
    }

    public haveSelected(messageId: string, emojiStr: string) {
        const messages = get(this.messageReactStore).get(messageId);
        if (!messages) return false;

        return messages.reduce((value, message) => {
            if (message.emoji == emojiStr && jid(message.from).getLocal() == jid(this.jid).getLocal()) {
                value = message.operation == reactAction.add;
            }
            return value;
        }, false);
    }

    public sendReactMessage(emoji: string, messageReact: Message) {
        //define action, delete or not
        let action = reactAction.add;
        if (this.haveSelected(messageReact.id, emoji)) {
            action = reactAction.delete;
        }

        const idMessage = uuidv4();
        const newReactMessage = {
            id: idMessage,
            message: messageReact.id,
            from: this.jid,
            emoji,
            operation: action,
        };

        const messageReacted = xml(
            "message",
            {
                type: "groupchat",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: idMessage,
            },
            xml("body", {}, emoji),
            xml("reaction", {
                to: messageReact.from,
                from: this.jid,
                id: messageReact.id,
                xmlns: "urn:xmpp:reaction:0",
                reaction: emoji,
                action,
            })
        );

        if (!this.closed) {
            this.connection.emitXmlMessage(messageReacted);

            this.messageReactStore.update((reactMessages) => {
                //create or get list of react message
                let newReactMessages = new Array<ReactMessage>();
                if (reactMessages.has(newReactMessage.message)) {
                    newReactMessages = reactMessages.get(newReactMessage.message) as ReactMessage[];
                }
                //check if already exist
                if (!newReactMessages.find((react) => react.id === newReactMessage.id)) {
                    newReactMessages.push(newReactMessage);
                    reactMessages.set(newReactMessage.message, newReactMessages);
                }
                return reactMessages;
            });

            this.manageResendMessage();
        }
    }

    private manageResendMessage() {
        this.lastMessageSeen = new Date();
        this.countMessagesToSee.set(0);

        if (this.sendTimeOut) {
            clearTimeout(this.sendTimeOut);
        }
        this.sendTimeOut = setTimeout(() => {
            this.messageStore.update((messages) => {
                messages = messages.map((message) => (!message.delivered ? { ...message, error: true } : message));
                return messages;
            });
        }, 10_000);
        if (_VERBOSE) console.warn("[XMPP]", ">> Message sent");
    }

    onMessage(xml: ElementExt): void {
        let handledMessage = false;
        if (_VERBOSE) console.warn("[XMPP]", "<< Stanza received", xml.getName());

        if (xml.getAttr("type") === "error") {
            console.warn("[XMPP]", "<< Error received :", xml.toString());
            if (xml.getChild("error")?.getChildText("text") === "That nickname is already in use by another occupant") {
                connectionManager.connectionOrFail.getXmppClient()?.incrementNickCount();
                this.connect();
                handledMessage = true;
            } else if (xml.getChild("error")?.getChildText("text") === "You have been banned from this room") {
                handledMessage = true;
                this.closed = true;
            }
        }
        // We are receiving the presence from someone
        else if (xml.getName() === "presence") {
            const from = jid(xml.getAttr("from"));
            const type = xml.getAttr("type");

            const x = xml.getChild("x", "http://jabber.org/protocol/muc#user");

            if (x) {
                const userJID = jid(x.getChild("item")?.getAttr("jid"));
                userJID.setResource("");
                const playUri = xml.getChild("room")?.getAttr("playUri");
                const uuid = xml.getChild("user")?.getAttr("uuid");
                const color = xml.getChild("user")?.getAttr("color");
                const woka = xml.getChild("user")?.getAttr("woka");
                const isMember = xml.getChild("user")?.getAttr("isMember");
                //const affiliation = x.getChild("item")?.getAttr("affiliation");
                const role = x.getChild("item")?.getAttr("role");
                if (type === "unavailable") {
                    if (userJID.toString() === this.getMyJID().toString()) {
                        // If presence received from ME and type is unavailable and room type is LIVE, delete this MucRoom
                        connectionManager.connectionOrFail.getXmppClient()?.removeMuc(this);
                    } else {
                        this.deleteUser(userJID.toString());
                    }
                } else {
                    this.updateUser(
                        userJID,
                        from.resource,
                        playUri,
                        uuid,
                        type === "unavailable" ? USER_STATUS_DISCONNECTED : USER_STATUS_AVAILABLE,
                        color,
                        woka,
                        ["moderator", "owner"].includes(role),
                        isMember === "true"
                    );
                }

                handledMessage = true;
            } else {
                if (this.type === "live" && type === "unavailable") {
                    this.reset();

                    setTimeout(() => this.connect(), 500);
                }
                handledMessage = true;
            }
        } else if (xml.getName() === "iq" && xml.getAttr("type") === "result") {
            // Manage registered subscriptions old and new one
            const subscriptions = xml.getChild("subscriptions")?.getChildren("subscription");
            const playUri = xml.getChild("room")?.getAttr("playUri");
            if (subscriptions) {
                subscriptions.forEach((subscription) => {
                    const jid = subscription.getAttr("jid");
                    const nick = subscription.getAttr("nick");
                    this.updateUser(jid, nick, playUri);
                });
                handledMessage = true;
            } else {
                const subscription = xml.getChild("subscribe");
                if (subscription) {
                    const nick = subscription.getAttr("nick");
                    if (nick === this.getPlayerName()) {
                        this.sendPresence();
                        this.requestAllSubscribers();
                    }
                    handledMessage = true;
                }
            }
            // Manage return of MAM response
            const fin = xml.getChild("fin", "urn:xmpp:mam:2");
            if (fin) {
                const count = fin.getChild("set", "http://jabber.org/protocol/rsm")?.getChildText("count") ?? "0";
                if (parseInt(count) < 50) {
                    this.canLoadOlderMessages = false;
                }
                this.loadingStore.set(false);
                handledMessage = true;
            }
        } else if (xml.getName() === "message" && xml.getAttr("type") === "groupchat") {
            if (xml.getChild("subject")) {
                this.description = xml.getChildText("subject") ?? "";
                handledMessage = true;
            } else {
                const from = jid(xml.getAttr("from"));
                const idMessage = xml.getAttr("id");
                const name = from.resource;
                const state = xml.getChildByAttr("xmlns", "http://jabber.org/protocol/chatstates");
                if (!state) {
                    let delay = xml.getChild("delay")?.getAttr("stamp");
                    if (delay) {
                        delay = new Date(delay);
                    } else {
                        delay = new Date();
                    }
                    const body = xml.getChildText("body") ?? "";

                    if (xml.getChild("reaction") != undefined) {
                        //define action, delete or not
                        const newReactMessage = {
                            id: idMessage,
                            message: xml.getChild("reaction")?.getAttr("id"),
                            from: xml.getChild("reaction")?.getAttr("from"),
                            emoji: body,
                            operation: xml.getChild("reaction")?.getAttr("action"),
                        };

                        //update list of message
                        this.messageReactStore.update((reactMessages) => {
                            //create or get list of react message
                            let newReactMessages = new Array<ReactMessage>();
                            if (reactMessages.has(newReactMessage.message)) {
                                newReactMessages = reactMessages.get(newReactMessage.message) as ReactMessage[];
                            }
                            //check if already exist
                            if (!newReactMessages.find((react) => react.id === newReactMessage.id)) {
                                newReactMessages.push(newReactMessage);
                                reactMessages.set(newReactMessage.message, newReactMessages);
                            }
                            return reactMessages;
                        });
                    } else {
                        this.messageStore.update((messages) => {
                            if (messages.find((message) => message.id === idMessage)) {
                                this.countMessagesToSee.set(0);
                                this.lastMessageSeen = new Date();
                                messages = messages.map((message) =>
                                    message.id === idMessage ? { ...message, delivered: true } : message
                                );
                            } //Check if message is deleted
                            else if (xml.getChildByAttr("xmlns", "urn:xmpp:message-delete:0")?.getName() === "remove") {
                                console.log("delete message => ", xml);
                                this.deletedMessagesStore.update((deletedMessages) => [
                                    ...deletedMessages,
                                    xml.getChild("remove")?.getAttr("origin_id"),
                                ]);
                            } else {
                                if (delay > this.lastMessageSeen) {
                                    this.countMessagesToSee.update((last) => last + 1);
                                    if (get(activeThreadStore) !== this || get(availabilityStatusStore) !== 1) {
                                        mediaManager.playNewMessageNotification();
                                        mediaManager.createNotification(name, NotificationType.message, this.name);
                                    }
                                }
                                const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore();
                                const owner = [...(presenceStore ? get(presenceStore) : new Map<string, User>())].find(
                                    ([, user]) => user.name === name
                                );
                                const message: Message = {
                                    name,
                                    jid: owner ? owner[0] : "",
                                    body,
                                    time: delay,
                                    id: idMessage,
                                    delivered: true,
                                    error: false,
                                    from: from.toString(),
                                    type: xml.getChild("reply") ? messageType.message : messageType.reply,
                                };

                                //get reply message
                                if (xml.getChild("reply") != undefined) {
                                    const targetMessageReply = {
                                        ...xml.getChild("reply")?.attrs,
                                    };

                                    //get file of reply message
                                    const files = xml.getChild("reply")?.getChild("files");
                                    if (files != undefined && files instanceof Element) {
                                        targetMessageReply.files = fileMessageManager.getFilesListFromXml(files);
                                    }
                                    message.targetMessageReply = targetMessageReply as ReplyMessage;
                                }

                                //get file of message
                                const files = xml.getChild("files");
                                if (files != undefined && files instanceof Element) {
                                    message.files = fileMessageManager.getFilesListFromXml(files);
                                }

                                //get list of mentions
                                if (xml.getChild("mentions")) {
                                    xml.getChild("mentions")
                                        ?.getChildElements()
                                        .forEach((value) => {
                                            if (message.mentions == undefined) {
                                                message.mentions = [];
                                            }
                                            const uuid = value.getAttr("to");
                                            if (get(this.presenceStore).has(uuid)) {
                                                message.mentions.push(get(this.presenceStore).get(uuid) as User);
                                            } else if (value.getAttr("user")) {
                                                message.mentions.push(value.getAttr("user") as User);
                                            }
                                        });
                                }

                                messages.push(message);
                            }
                            return messages;
                        });
                    }
                    handledMessage = true;
                } else {
                    const { jid } = this.getUserDataByName(name);
                    if (jid !== null && jid) {
                        this.updateUser(jid, null, null, null, null, null, null, null, null, state.getName());
                    }
                    handledMessage = true;
                }
            }
        } else if (xml.getName() === "message" && xml.getChild("result", "urn:xmpp:mam:2")) {
            const messageXML = xml.getChild("result", "urn:xmpp:mam:2")?.getChild("forwarded")?.getChild("message");
            const from = jid(messageXML?.getAttr("from"));
            const name = from.resource;
            const body = messageXML?.getChildText("body") ?? "";
            const idMessage = messageXML?.getAttr("id");
            const state = messageXML?.getChildByAttr("xmlns", "http://jabber.org/protocol/chatstates");
            let delay = xml
                .getChild("result", "urn:xmpp:mam:2")
                ?.getChild("forwarded")
                ?.getChild("delay", "urn:xmpp:delay")
                ?.getAttr("stamp");
            if (!state && delay) {
                delay = new Date(delay);
                const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore();
                const owner = [...(presenceStore ? get(presenceStore) : new Map<string, User>())].find(
                    ([, user]) => user.name === name
                );
                const message: Message = {
                    name,
                    jid: owner ? owner[0] : "",
                    body,
                    time: delay,
                    id: idMessage,
                    delivered: true,
                    error: false,
                    from: from.toString(),
                    type: messageXML?.getChild("reply") ? messageType.message : messageType.reply,
                };
                //console.warn('MAM message received not state', messageXML?.toString());
                this.messageStore.update((messages) => {
                    messages.unshift(message);
                    return messages.sort((a, b) => a.time.getTime() - b.time.getTime());
                });
            }
            handledMessage = true;
        }

        if (!handledMessage) {
            console.warn("Unhandled message targeted at the room: ", xml.toString());
            console.warn("Message name : ", xml.getName());
        }
    }

    private getCurrentName(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.name ?? "";
    }

    private getCurrentStatus(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.status ?? USER_STATUS_DISCONNECTED;
    }

    private getCurrentPlayUri(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.playUri ?? "";
    }

    private getCurrentUuid(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.uuid ?? "";
    }

    private getCurrentColor(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.color ?? defaultColor;
    }

    private getCurrentWoka(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.woka ?? defaultWoka;
    }

    private getCurrentIsAdmin(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.isAdmin ?? false;
    }

    private getCurrentChatState(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.chatState ?? ChatStates.INACTIVE;
    }

    private getCurrentIsMember(jid: JID | string) {
        return get(this.presenceStore).get(jid.toString())?.isMember ?? false;
    }

    private getMeIsAdmin() {
        return get(this.meStore).isAdmin;
    }

    private updateUser(
        jid: JID | string,
        nick: string | null = null,
        playUri: string | null = null,
        uuid: string | null = null,
        status: string | null = null,
        color: string | null = null,
        woka: string | null = null,
        isAdmin: boolean | null = null,
        isMember: boolean | null = null,
        chatState: string | null = null
    ) {
        let isMe = false;
        const user = get(userStore);
        //MucRoom.encode(user?.email) ?? MucRoom.encode(user?.uuid)) + "@" + EJABBERD_DOMAIN === jid &&
        if (jid.toString() === this.getMyJID().toString()) {
            isMe = true;
            this.meStore.update((me) => {
                me.isAdmin = isAdmin ?? this.getMeIsAdmin();
                return me;
            });
        }
        this.presenceStore.update((list) => {
            list.set(jid.toString(), {
                name: nick ?? this.getCurrentName(jid),
                playUri: playUri ?? this.getCurrentPlayUri(jid),
                uuid: uuid ?? this.getCurrentUuid(jid),
                status: status ?? this.getCurrentStatus(jid),
                isInSameMap: (playUri ?? this.getCurrentPlayUri(jid)) === user.playUri,
                active: (status ?? this.getCurrentStatus(jid)) === USER_STATUS_AVAILABLE,
                color: color ?? this.getCurrentColor(jid),
                woka: woka ?? this.getCurrentWoka(jid),
                unreads: false,
                isAdmin: isAdmin ?? this.getCurrentIsAdmin(jid),
                chatState: chatState ?? this.getCurrentChatState(jid),
                isMe,
                jid: jid.toString(),
                isMember: isMember ?? this.getCurrentIsMember(jid),
            });
            numberPresenceUserStore.set(list.size);
            return list;
        });
    }

    private deleteUser(jid: string | JID) {
        this.presenceStore.update((list) => {
            list.delete(jid.toString());
            return list;
        });
    }

    public updateComposingState(state: string) {
        if (state === ChatStates.COMPOSING) {
            if (!this.composingTimeOut) {
                this.sendChatState(ChatStates.COMPOSING);
            } else {
                clearTimeout(this.composingTimeOut);
            }
            this.composingTimeOut = setTimeout(() => {
                this.sendChatState(ChatStates.PAUSED);
                if (this.composingTimeOut) {
                    clearTimeout(this.composingTimeOut);
                }
            }, 5_000);
        } else {
            if (this.composingTimeOut) {
                clearTimeout(this.composingTimeOut);
            }
            this.sendChatState(ChatStates.PAUSED);
        }
    }

    public deleteMessage(idMessage: string) {
        this.messageStore.update((messages) => {
            return messages.filter((message) => message.id !== idMessage);
        });
        return true;
    }

    public sendBack(idMessage: string) {
        this.messageStore.update((messages) => {
            this.sendMessage(messages.find((message) => message.id === idMessage)?.body ?? "");
            return messages.filter((message) => message.id !== idMessage);
        });
        return true;
    }

    public getPresenceStore(): UsersStore {
        return this.presenceStore;
    }

    public getTeleportStore(): TeleportStore {
        return this.teleportStore;
    }

    public getMessagesStore(): MessagesStore {
        return this.messageStore;
    }

    public getDeletedMessagesStore(): DeleteMessageStore {
        return this.deletedMessagesStore;
    }

    public getMeStore(): MeStore {
        return this.meStore;
    }

    public getCountMessagesToSee() {
        return this.countMessagesToSee;
    }

    public getLoadingStore() {
        return this.loadingStore;
    }

    public getUrl(): string {
        return this.roomJid.local + "@" + this.roomJid.domain.toString();
    }

    public getMyJID(): JID {
        const myJID = jid(this.jid);
        myJID.setResource("");
        return myJID;
    }

    public resetTeleportStore(): void {
        this.teleportStore.set({ state: false, to: null });
    }

    public reset(): void {
        this.presenceStore.set(new Map<string, User>());
        this.messageStore.set([]);
        this.meStore.set({ isAdmin: false });
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
