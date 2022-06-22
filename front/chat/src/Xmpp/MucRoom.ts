import type { ChatConnection } from "../Connection/ChatConnection";
import xml from "@xmpp/xml";
import jid, { JID } from "@xmpp/jid";
import type { Readable, Writable } from "svelte/store";
import { writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { numberPresenceUserStore } from "../Stores/MucRoomsStore";
import { v4 as uuidv4 } from "uuid";
import {localUserStore, userStore} from "../Stores/LocalUserStore";
import Axios from "axios";
import { PUSHER_URL } from "../Enum/EnvironmentVariable";
import { get } from "svelte/store";
import LL from "../i18n/i18n-svelte";

export const USER_STATUS_AVAILABLE = "available";
export const USER_STATUS_DISCONNECTED = "disconnected";
export type User = {
    name: string;
    roomId: string;
    uuid: string;
    status: string;
    active: boolean;
    isInSameMap: boolean;
    color: string;
    woka: string;
};
export type UserList = Map<string, User>;
export type UsersStore = Readable<UserList>;

export type Teleport = {
    state: boolean;
    to: string | null;
};
export type TeleportStore = Readable<Teleport>;

const _VERBOSE = true;

export class MucRoom {
    private presenceStore: Writable<UserList>;
    private teleportStore: Writable<Teleport>;
    private nickCount: number = 0;

    constructor(
        private connection: ChatConnection,
        public readonly name: string,
        private roomJid: JID,
        private jid: string
    ) {
        this.presenceStore = writable<UserList>(new Map<string, User>());
        this.teleportStore = writable<Teleport>({ state: false, to: null });
    }

    private getPlayerName() {
        return (get(userStore).name ?? "unknown") + (this.nickCount > 0 ? `[${this.nickCount}]` : "");
    }

    public goTo(type: string, playUri: string, uuid: string) {
        this.teleportStore.set({ state: true, to: uuid });
        if (type === "room") {
            window.parent.postMessage({type: 'goToPage', data: {url: `${playUri}#moveToUser=${uuid}`}}, '*');
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
            window.parent.postMessage({type: 'askPosition', data: {uuid, playUri}}, '*');
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
        if(_VERBOSE) console.warn("[XMPP]", "Get all subscribers sent");
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
                id: get(userStore).playUri,
            }),
            //add uuid of the user to identify and target them on teleport
            xml("user", {
                uuid: get(userStore).uuid,
                color: get(userStore).color,
                woka: get(userStore).woka
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
                xml("event", { node: "urn:xmpp:mucsub:nodes:messages" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:presence" })
            )
        );
        this.connection.emitXmlMessage(messageMucSubscribe);
        if(_VERBOSE) console.warn("[XMPP]", "Subscribe sent", messageMucSubscribe.toString());
    }

    public disconnect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, this.getPlayerName());
        const messageMucSubscribe = xml("presence", { to: to.toString(), from: this.jid, type: "unavailable" });
        this.connection.emitXmlMessage(messageMucSubscribe);
        if(_VERBOSE) console.warn("[XMPP]", "Disconnect sent");
        return messageMucSubscribe;
    }

    onMessage(xml: ElementExt): void {
        let handledMessage = false;
        if(_VERBOSE) console.warn("[XMPP]", "<< Message received", xml.getName());

        if (xml.getAttr("type") === "error") {
            if (xml.getChild("error")?.getChildText("text") === "That nickname is already in use by another occupant") {
                this.nickCount += 1;
                this.sendSubscribe();
                //this.sendPresence(me);
                handledMessage = true;
            }
        }
        // We are receiving the presence from someone
        else if (xml.getName() === "presence") {
            const from = jid(xml.getAttr("from"));
            const type = xml.getAttr("type");

            if (from.resource === "") return;

            //It's me (are you sure ?) and I want a profile details
            //TODO create profile details with XMPP connection
            //if (from.toString() === me.toString()) {
            //    return;
            //}

            const x = xml.getChild("x", "http://jabber.org/protocol/muc#user");

            if (x) {
                const jid = x.getChild("item")?.getAttr("jid").split("/")[0];
                const roomId = xml.getChild("room")?.getAttr("id");
                const uuid = xml.getChild("user")?.getAttr("uuid");
                const color = xml.getChild("user")?.getAttr("color");
                const woka = xml.getChild("user")?.getAttr("woka");
                this.updateUser(
                    jid,
                    from.resource,
                    roomId,
                    uuid,
                    type === "unavailable" ? USER_STATUS_DISCONNECTED : USER_STATUS_AVAILABLE,
                    color,
                    woka
                );

                handledMessage = true;
            }
        }
        // Manage registered subscriptions old and new one
        else if (xml.getName() === "iq" && xml.getAttr("type") === "result") {
            const subscriptions = xml.getChild("subscriptions")?.getChildren("subscription");
            const roomId = xml.getChild("room")?.getAttr("id");
            if (subscriptions) {
                subscriptions.forEach((subscription) => {
                    const jid = subscription.getAttr("jid");
                    const nick = subscription.getAttr("nick");
                    this.updateUser(jid, nick, roomId);
                });
                handledMessage = true;
            } else {
                const subscription = xml.getChild("subscribe");
                if (subscription) {
                    const jid = subscription.getAttr("nick").split("@ejabberd")[0] + "@ejabberd";
                    const nick = subscription.getAttr("nick");
                    this.updateUser(jid, nick, roomId);
                    if (nick === this.getPlayerName()) {
                        this.sendPresence();
                        this.requestAllSubscribers();
                    }
                    handledMessage = true;
                }
            }
        }

        if (!handledMessage) {
            console.warn("Unhandled message targeted at the room: ", xml.toString());
            console.warn("Message name : ", xml.getName());
        }
    }

    private getCurrentStatus(jid: string) {
        return get(this.presenceStore).get(jid)?.status ?? USER_STATUS_DISCONNECTED;
    }

    private getCurrentRoomId(jid: string) {
        return get(this.presenceStore).get(jid)?.roomId ?? '';
    }

    private getCurrentUuid(jid: string) {
        return get(this.presenceStore).get(jid)?.uuid ?? '';
    }

    private getCurrentColor(jid: string) {
        return get(this.presenceStore).get(jid)?.color ?? '#626262';
    }

    private getCurrentWoka(jid: string) {
        return get(this.presenceStore).get(jid)?.woka ?? ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==';
    }

    private updateUser(jid: string, nick: string, roomId: string|null = null, uuid: string|null = null, status: string|null = null, color: string|null = null, woka: string|null = null) {
        const user = get(userStore);
        if (
            (MucRoom.encode(user?.email) ?? MucRoom.encode(user?.uuid)) + "@ejabberd" !== jid &&
            nick !== this.getPlayerName()
        ) {
            this.presenceStore.update((list) => {
                list.set(jid, {
                    name: nick,
                    roomId: roomId ?? this.getCurrentRoomId(jid),
                    uuid: uuid ?? this.getCurrentUuid(jid),
                    status: status ?? this.getCurrentStatus(jid),
                    isInSameMap: (roomId ?? this.getCurrentRoomId(jid)) === user.playUri,
                    active: (status ?? this.getCurrentStatus(jid)) === USER_STATUS_AVAILABLE,
                    color: color ?? this.getCurrentColor(jid),
                    woka: woka ?? this.getCurrentWoka(jid)
                });
                numberPresenceUserStore.set(list.size);
                return list;
            });
        }
    }

    public getPresenceStore(): UsersStore {
        return {
            subscribe: this.presenceStore.subscribe,
        };
    }

    public getTeleportStore(): TeleportStore {
        return {
            subscribe: this.teleportStore.subscribe,
        };
    }

    public resetTeleportStore(): void {
        this.teleportStore.set({ state: false, to: null });
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
