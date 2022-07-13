import type { ChatConnection } from "../Connection/ChatConnection";
import xml from "@xmpp/xml";
import jid, { JID } from "@xmpp/jid";
import type { Readable, Writable } from "svelte/store";
import { writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { numberPresenceUserStore } from "../Stores/MucRoomsStore";
import { v4 as uuidv4 } from "uuid";
import {userStore} from "../Stores/LocalUserStore";
import { get } from "svelte/store";

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
};

export const ChatStates = {ACTIVE: 'active', INACTIVE: 'inactive', GONE: 'gone', COMPOSING: 'composing', PAUSED: 'paused'};
export type UserList = Map<string, User>;
export type UsersStore = Readable<UserList>;

export type Teleport = {
  state: boolean;
  to: string | null;
};
export type TeleportStore = Readable<Teleport>;

export type Message = {
    body: string;
    name: string;
    time: Date;
};
export type MessagesList = Message[];
export type MessagesStore = Readable<Message[]>;

export type Me = {
    isAdmin: boolean;
}

export type MeStore = Readable<Me>;

const _VERBOSE = true;
const defaultWoka = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";

export class MucRoom {
    private presenceStore: Writable<UserList>;
    private teleportStore: Writable<Teleport>;
    private messageStore: Writable<Message[]>;
    private meStore: Writable<Me>;
    private nickCount = 0;

    constructor(
        private connection: ChatConnection,
        public readonly name: string,
        private roomJid: JID,
        public type: string,
        private jid: string
    ) {
        this.presenceStore = writable<UserList>(new Map<string, User>());
        this.messageStore = writable<Message[]>(new Array(0));
        this.teleportStore = writable<Teleport>({ state: false, to: null });
        this.meStore = writable<Me>({isAdmin: false});
    }

    public getPlayerName() {
        return (get(userStore).name ?? "unknown") + (this.nickCount > 0 ? `[${this.nickCount}]` : "");
    }

    public getUserDataByName(name: string) {
        let woka = defaultWoka;
        let color = '';
        let jid = null;
        if(this.getPlayerName() === name){
            woka = get(userStore).woka;
            color = get(userStore).color;
        } else {
            get(this.presenceStore).forEach((user, jid_) => {
                if (user.name === name) {
                    woka = user.woka;
                    color = user.color;
                    jid = jid_;
                }
            })
        }
        return {woka, color, jid};
    }

  public goTo(type: string, playUri: string, uuid: string) {
    this.teleportStore.set({ state: true, to: uuid });
    if (type === "room") {
      window.parent.postMessage(
        { type: "goToPage", data: { url: `${playUri}#moveToUser=${uuid}` } },
        "*"
      );
      /*
            Axios.get(`${PUSHER_URL}/room/access`, { params: { token: get(userStore).authToken, playUri, uuid: get(userStore).uuid } })
                .then((_) => {
                    window.parent.postMessage({type: 'goToPage', data: {url: `${playUri}#moveToUser=${uuid}`}}, '*');
                })
                .catch((error) => {
                    console.log("Cant teleport", error);
                    /*
                    layoutManagerActionStore.addAction({
                        uuid: "cantTeleport",
                        type: "warning",
                        message: get(LL).warning.accessDenied.teleport(),
                        callback: () => {
                            layoutManagerActionStore.removeAction("cantTeleport");
                        },
                        userInputManager: undefined,
                    });
                    this.resetTeleportStore();
                });
            */
    } else if (type === "user") {
      window.parent.postMessage(
        { type: "askPosition", data: { uuid, playUri } },
        "*"
      );
    }
  }

  public connect() {
    this.sendSubscribe();
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
    this.connection.emitXmlMessage(messageMucListAllUsers);
    if (_VERBOSE) console.warn("[XMPP]", "Get all subscribers sent");
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
            //add window location and have possibility to teleport on the user and remove all hash from the url
            xml("room", {
                playUri: get(userStore).playUri,
            }),
            //add uuid of the user to identify and target them on teleport
            xml("user", {
                uuid: get(userStore).uuid,
                color: get(userStore).color,
                woka: get(userStore).woka,
                deleteSubscribeOnDisconnect: this.type === 'live' ? "true" : "false"
            })
        );
        this.connection.emitXmlMessage(messagePresence);
        if(_VERBOSE) console.warn("[XMPP]", "Presence sent", get(userStore).uuid);
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
        this.connection.emitXmlMessage(messageMucSubscribe);
        if(_VERBOSE) console.warn("[XMPP]", "Subscribe sent", messageMucSubscribe.toString());
    }

    public rankUp(userJID: string | JID) {
        this.affiliate("admin", userJID);
    }

    public rankDown(userJID: string | JID) {
        this.affiliate("none", userJID);
    }

    private affiliate(type: string, userJID: string | JID) {
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
        if(_VERBOSE) console.warn("[XMPP]", ">> Affiliation sent");
        this.connection.emitXmlMessage(messageMucAffiliateUser);
    }

    public ban(user: string, name: string, playUri: string) {
        const userJID = jid(user);
        //this.affiliate("outcast", userJID);
        this.connection.emitBanUserByUuid(playUri, userJID.local, name, "Test message de ban");
        if(_VERBOSE) console.warn("[XMPP]", ">> Ban user message sent");
    }

    public reInitialize() {
        // Destroy room in ejabberd
        this.destroy();
        // Recreate room in ejabberd
        setTimeout(() => this.sendPresence(), 100);
        // Tell all users to subscribe to it
        //setTimeout(() => this.connection.emitJoinMucRoom(this.name, this.type, this.roomJid.local), 200);
    }

    public destroy() {
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
        if(_VERBOSE) console.warn("[XMPP]", ">> Destroy room sent");
        this.connection.emitXmlMessage(messageMucDestroy);
    }

    public disconnect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, this.getPlayerName());
        const messageMucSubscribe = xml("presence", { to: to.toString(), from: this.jid, type: "unavailable" }, xml("user", {deleteSubscribeOnDisconnect: this.type === 'live' ? "true" : "false"}));
        this.connection.emitXmlMessage(messageMucSubscribe);
        if(_VERBOSE) console.warn("[XMPP]", "Disconnect sent");
        return messageMucSubscribe;
    }

    public sendChatState() {
        const chatState = xml(
            "message",
            {
                type: "groupchat",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(ChatStates.COMPOSING, {
                xmlns: "http://jabber.org/protocol/chatstates",
            })
        );
        this.connection.emitXmlMessage(chatState);
        if (_VERBOSE) console.warn("[XMPP]", "Chat state sent");
    }

  onMessage(xml: ElementExt): void {
    let handledMessage = false;
    if (_VERBOSE) console.warn("[XMPP]", "<< Message received", xml.getName());

        if (xml.getAttr("type") === "error") {
            if (xml.getChild("error")?.getChildText("text") === "That nickname is already in use by another occupant") {
                this.nickCount += 1;
                this.sendSubscribe();
                //this.sendPresence(me);
                handledMessage = true;
            } else if (xml.getChild("error")?.getChildText("text") === "You have been banned from this room") {
                handledMessage = true;
                //this.connectionFinished = true;
            }
        }
        // We are receiving the presence from someone
        else if (xml.getName() === "presence") {
            const from = jid(xml.getAttr("from"));
            const type = xml.getAttr("type");

            //if (from.resource === "") return;

      //It's me (are you sure ?) and I want a profile details
      //TODO create profile details with XMPP connection
      //if (from.toString() === me.toString()) {
      //    return;
      //}

      const x = xml.getChild("x", "http://jabber.org/protocol/muc#user");

            if (x) {
                const jid = x.getChild("item")?.getAttr("jid")?.split("/")[0];
                const playUri = xml.getChild("room")?.getAttr("playUri");
                const uuid = xml.getChild("user")?.getAttr("uuid");
                const color = xml.getChild("user")?.getAttr("color");
                const woka = xml.getChild("user")?.getAttr("woka");
                const affiliation = x.getChild("item")?.getAttr("affiliation");
                const role = x.getChild("item")?.getAttr("role");
                const deleteSubscribeOnDisconnect = xml.getChild("user")?.getAttr("deleteSubscribeOnDisconnect");
                if (
                    type === "unavailable" &&
                    ((deleteSubscribeOnDisconnect !== undefined && deleteSubscribeOnDisconnect === "true") ||
                        affiliation === "outcast")
                ) {
                    this.deleteUser(jid.toString());
                } else {
                    this.updateUser(
                        jid,
                        from.resource,
                        playUri,
                        uuid,
                        type === "unavailable" ? USER_STATUS_DISCONNECTED : USER_STATUS_AVAILABLE,
                        color,
                        woka,
                        ["moderator", "owner"].includes(role)
                    );
                }

                handledMessage = true;
            } else {
                if(this.type === 'live' && type === 'unavailable'){
                    this.reset();

                    setTimeout(() => this.connect(), 500);
                    handledMessage = true;
                }
            }
        }
        // Manage registered subscriptions old and new one
        else if (xml.getName() === "iq" && xml.getAttr("type") === "result") {
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
                    const jid = subscription.getAttr("nick").split("@ejabberd")[0] + "@ejabberd";
                    const nick = subscription.getAttr("nick");
                    this.updateUser(jid, nick, playUri);
                    if (nick === this.getPlayerName()) {
                        this.sendPresence();
                        this.requestAllSubscribers();
                    }
                    handledMessage = true;
                }
            }
        } if (xml.getName() === "message" && xml.getAttr("type") === "groupchat" && !xml.getChild('subject')) {
            const from = jid(xml.getAttr("from"));
            const name = from.resource;
            const state = xml.getChildByAttr('xmlns', 'http://jabber.org/protocol/chatstates');
            if(!state) {
                let delay = xml.getChild('delay')?.getAttr('stamp');
                if (delay) {
                    delay = new Date(delay);
                } else {
                    delay = new Date();
                }
                const body = xml.getChildText('body') ?? '';
                this.messageStore.update(messages => {
                    messages.push({
                        name,
                        body,
                        time: delay
                    });
                    return messages;
                })
                handledMessage = true;
            } else {
                const {jid} = this.getUserDataByName(name);
                if(jid) {
                    this.updateUser(jid, null, null, null, null, null, null, null, state.getName());
                    handledMessage = true;
                }
            }
        }

    if (!handledMessage) {
      console.warn("Unhandled message targeted at the room: ", xml.toString());
      console.warn("Message name : ", xml.getName());
    }
  }

    private getCurrentName(jid: JID|string) {
        return get(this.presenceStore).get(jid.toString())?.name ?? '';
    }

  private getCurrentStatus(jid: JID|string) {
    return get(this.presenceStore).get(jid.toString())?.status ?? USER_STATUS_DISCONNECTED;
  }

    private getCurrentPlayUri(jid: JID|string) {
        return get(this.presenceStore).get(jid.toString())?.playUri ?? '';
    }

  private getCurrentUuid(jid: JID|string) {
    return get(this.presenceStore).get(jid.toString())?.uuid ?? "";
  }

  private getCurrentColor(jid: JID|string) {
    return get(this.presenceStore).get(jid.toString())?.color ?? "#626262";
  }

    private getCurrentWoka(jid: JID|string) {
        return get(this.presenceStore).get(jid.toString())?.woka ?? defaultWoka;
    }

    private getCurrentIsAdmin(jid: JID|string) {
        return get(this.presenceStore).get(jid.toString())?.isAdmin ?? false;
    }

    private getCurrentChatState(jid: JID|string) {
        return get(this.presenceStore).get(jid.toString())?.chatState ?? ChatStates.INACTIVE;
    }

    private getMeIsAdmin() {
        return get(this.meStore).isAdmin;
    }

    private updateUser(jid: JID|string, nick: string|null = null, playUri: string|null = null, uuid: string|null = null, status: string|null = null, color: string|null = null, woka: string|null = null, isAdmin: boolean|null = null, chatState: string|null = null) {
        const user = get(userStore);
        if (
            (MucRoom.encode(user?.email) ?? MucRoom.encode(user?.uuid)) + "@ejabberd" !== jid &&
            nick !== this.getPlayerName()
        ) {
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
                    chatState: chatState ?? this.getCurrentChatState(jid)
                });
                numberPresenceUserStore.set(list.size);
                return list;
            });
        } else {
            this.meStore.update(me => {
                me.isAdmin = isAdmin ?? this.getMeIsAdmin();
                return me;
            });
        }
    }

    private deleteUser(jid: string | JID) {
        this.presenceStore.update((list) => {
            list.delete(jid.toString());
            return list;
        });
    }

  public getPresenceStore(): UsersStore {
    return this.presenceStore;
  }

  public getTeleportStore(): TeleportStore {
    return this.teleportStore;
  }

    public getMessagesStore(): MessagesStore {
        return {
            subscribe: this.messageStore.subscribe,
        };
    }

    public getMeStore(): MeStore {
        return {
            subscribe: this.meStore.subscribe,
        };
    }

    public sendMessage(text: string){
        const message = xml(
            "message",
            {
                type: "groupchat",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml("body", {}, text)
        );
        this.connection.emitXmlMessage(message);
        if(_VERBOSE) console.warn("[XMPP]", "Message sent");
    }

    public getUrl(): string {
        return this.roomJid.local+'@'+this.roomJid.domain.toString();
    }

    public resetTeleportStore(): void {
        this.teleportStore.set({ state: false, to: null });
    }

    public reset(): void {
        this.presenceStore.set(new Map<string, User>());
        this.messageStore.set([]);
        this.meStore.set({isAdmin: false});
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
