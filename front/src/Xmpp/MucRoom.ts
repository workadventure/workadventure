import type { RoomConnection } from "../Connexion/RoomConnection";
import xml from "@xmpp/xml";
import jid, { JID } from "@xmpp/jid";
import { gameManager } from "../Phaser/Game/GameManager";
import type { Readable, Writable } from "svelte/store";
import { writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { getRoomId } from "../Stores/GuestMenuStore";
import { numberPresenceUserStore } from "../Stores/MucRoomsStore";
import { v4 as uuidv4 } from "uuid";
import { localUserStore } from "../Connexion/LocalUserStore";
import Axios from "axios";
import { PUSHER_URL } from "../Enum/EnvironmentVariable";
import { layoutManagerActionStore } from "../Stores/LayoutManagerStore";
import { get } from "svelte/store";
import LL from "../i18n/i18n-svelte";

export const USER_STATUS_AVAILABLE = "available";
export const USER_STATUS_DISCONNECTED = "disconnected";
export type User = {
    nick: string;
    roomId: string;
    uuid: string;
    isModerator: boolean;
    status: string;
    isInSameMap: boolean;
};
export type UserList = Map<string, User>;
export type UsersStore = Readable<UserList>;

export type Teleport = {
    state: boolean;
    to: string | null;
};
export type TeleportStore = Readable<Teleport>;

export class MucRoom {
    private presenceStore: Writable<UserList>;
    private teleportStore: Writable<Teleport>;
    private nickCount: number = 0;

    constructor(
        private connection: RoomConnection,
        public readonly name: string,
        private roomJid: JID,
        private jid: string,
        private isPersistent: boolean = true
    ) {
        this.presenceStore = writable<UserList>(new Map<string, User>());
        this.teleportStore = writable<Teleport>({ state: false, to: null });
    }

    private getPlayerName() {
        return (gameManager.getPlayerName() ?? "unknown") + (this.nickCount > 0 ? `[${this.nickCount}]` : "");
    }

    public goTo(type: string, playUri: string, uuid: string) {
        this.teleportStore.set({ state: true, to: uuid });
        if (type === "room") {
            Axios.get(`${PUSHER_URL}/room/access`, { params: { token: localUserStore.getAuthToken(), playUri, uuid } })
                .then((_) => {
                    window.location.assign(`${playUri}#moveToUuid=${uuid}`);
                })
                .catch((error) => {
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
        } else if (type === "user") {
            this.connection.emitAskPosition(uuid, playUri);
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
                id: window.location.href.split("#")[0].toString(),
            }),
            //add uuid of the user to identify and target them on teleport
            xml("user", {
                uuid: localUserStore.getLocalUser()?.uuid,
                deleteSubscribeOnDisconnect: !this.isPersistent?"true":"false"
            })
        );
        this.connection.emitXmlMessage(messagePresence);
        console.warn("[XMPP]", ">> Presence sent");
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
                    nick: this.getPlayerName()
                },
                xml("event", { node: "urn:xmpp:mucsub:nodes:subscribers" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:messages" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:config"} ),
                xml("event", { node: "urn:xmpp:mucsub:nodes:presence" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:affiliations" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:system" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:subject" })
            )
        );
        this.connection.emitXmlMessage(messageMucSubscribe);
        console.warn("[XMPP]", ">> Subscribe sent");
    }

    private sendUnsubscribe() {
        const messageMucSubscribe = xml(
            "iq",
            {
                type: "set",
                to: jid(this.roomJid.local, this.roomJid.domain).toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(
                "unsubscribe",
                {
                    xmlns: "urn:xmpp:mucsub:0"
                },
            )
        );
        this.connection.emitXmlMessage(messageMucSubscribe);
        console.warn("[XMPP]", ">> Unsubscribe sent");
    }

    public disconnect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, this.getPlayerName());
        const messageMucSubscribe = xml(
            "presence",
            { to: to.toString(), from: this.jid, type: "unavailable"},
            xml("user", {
                uuid: localUserStore.getLocalUser()?.uuid,
                deleteSubscribeOnDisconnect: !this.isPersistent?"true":"false"
            })
        );
        console.log("[XMPP]", ">> Presence unavailable sent");
        this.connection.emitXmlMessage(messageMucSubscribe);
        if(!this.isPersistent){
            this.sendUnsubscribe();
        }
        return messageMucSubscribe;
    }

    onMessage(xml: ElementExt): void {
        let handledMessage = false;

        console.warn('[XMPP] << Message received : '+xml.getName());

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
                const userJID = jid(x.getChild("item")?.getAttr("jid"));
                userJID.setResource('');
                const roomId = xml.getChild("room")?.getAttr("id");
                const uuid = xml.getChild("user")?.getAttr("uuid");
                const role = x.getChild("item")?.getAttr("role");
                const affiliation = jid(x.getChild("item")?.getAttr("affiliation"));
                const deleteSubscribeOnDisconnect = xml.getChild("user")?.getAttr("deleteSubscribeOnDisconnect");
                if(deleteSubscribeOnDisconnect !== undefined && deleteSubscribeOnDisconnect === "true" && type === "unavailable"){
                    this.deleteUser(userJID.toString());
                } else {
                    this.updateUser(
                        userJID.toString(),
                        from.resource,
                        roomId,
                        uuid,
                        ['moderator','owner'].includes(role),
                        type === "unavailable" ? USER_STATUS_DISCONNECTED : USER_STATUS_AVAILABLE
                    );
                }
                //handledMessage = true;
            }
        }
        // Manage registered subscriptions old and new one
        else if (xml.getName() === "iq" && xml.getAttr("type") === "result") {
            const subscriptions = xml.getChild("subscriptions")?.getChildren("subscription");
            if (subscriptions) {
                subscriptions.forEach((subscription) => {
                    const userJID = jid(subscription.getAttr("jid"));
                    userJID.setResource('');
                    const nick = subscription.getAttr("nick");
                    this.updateUser(userJID.toString(), nick);
                });
                handledMessage = true;
            } else {
                const subscription = xml.getChild("subscribe");
                if (subscription) {
                    const userJID = subscription.getAttr("nick").split("@ejabberd")[0] + "@ejabberd";
                    const nick = subscription.getAttr("nick");
                    this.updateUser(userJID, nick);
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
        }
    }

    private getStatus(jid: string|JID) {
        return get(this.presenceStore).get(jid.toString())?.status ?? USER_STATUS_DISCONNECTED;
    }

    private getIsModerator(jid: string|JID) {
        return get(this.presenceStore).get(jid.toString())?.isModerator ?? false;
    }

    private getRoomId(jid: string|JID) {
        return get(this.presenceStore).get(jid.toString())?.roomId ?? '';
    }

    private getUuid(jid: string|JID) {
        return get(this.presenceStore).get(jid.toString())?.uuid ?? '';
    }

    private updateUser(jid: string|JID, nick: string, roomId: string|null = null, uuid: string|null = null, isModerator: boolean|null = null, status: string|null = null) {
        const user = localUserStore.getLocalUser();
        if (
            (MucRoom.encode(user?.email) ?? MucRoom.encode(user?.uuid)) + "@ejabberd" !== jid &&
            nick !== this.getPlayerName()
        ) {
            this.presenceStore.update((list) => {
                list.set(jid.toString(), {
                    nick,
                    roomId: roomId ?? this.getRoomId(jid),
                    uuid: uuid ?? this.getUuid(jid),
                    isModerator: isModerator ?? this.getIsModerator(jid),
                    status: status ?? this.getStatus(jid),
                    isInSameMap: (roomId ?? this.getRoomId(jid)) === getRoomId(),
                });
                numberPresenceUserStore.set(list.size);
                return list;
            });
        }
    }

    private deleteUser(jid: string){
        this.presenceStore.update((list) => {
            list.delete(jid);
            return list;
        });
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
