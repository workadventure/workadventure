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

    constructor(
        private connection: RoomConnection,
        public readonly name: string,
        private roomJid: JID,
        private jid: string
    ) {
        this.presenceStore = writable<UserList>(new Map<string, User>());
        this.teleportStore = writable<Teleport>({ state: false, to: null });
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
        const toMucSubscriber = jid(this.roomJid.local, this.roomJid.domain);

        // Get all subscribed users of the room, need to be called in first place before we get al presence state
        const messageMucListAllUsers = xml(
            "iq",
            {
                type: "get",
                to: toMucSubscriber.toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml("subscriptions", {
                xmlns: "urn:xmpp:mucsub:0",
            })
        );
        this.connection.emitXmlMessage(messageMucListAllUsers);

        const to = jid(this.roomJid.local, this.roomJid.domain, gameManager.getPlayerName() ?? "unknown");
        const messagePresence = xml(
            "presence",
            {
                to: to.toString(),
                from: this.jid,
                /*type:'subscribe', //check presence documentation https://www.ietf.org/archive/id/draft-ietf-xmpp-3921bis-01.html#sub
                persistent: true*/
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
            })
        );
        this.connection.emitXmlMessage(messagePresence);

        // Create MUC subscriber
        const messageMucSubscribe = xml(
            "iq",
            {
                type: "set",
                to: toMucSubscriber.toString(),
                from: this.jid,
                id: uuidv4(),
            },
            xml(
                "subscribe",
                {
                    xmlns: "urn:xmpp:mucsub:0",
                    nick: gameManager.getPlayerName(),
                },
                xml("event", { node: "urn:xmpp:mucsub:nodes:messages" }),
                xml("event", { node: "urn:xmpp:mucsub:nodes:presence" })
            )
        );
        this.connection.emitXmlMessage(messageMucSubscribe);
    }

    public disconnect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, gameManager.getPlayerName() ?? "unknown");
        return xml("presence", { to: to.toString(), from: this.jid, type: "unavailable" });
    }

    onMessage(xml: ElementExt): void {
        let handledMessage = false;
        const me = jid(this.roomJid.local, this.roomJid.domain, gameManager.getPlayerName() ?? "unknown");

        // We are receiving the presence from someone
        if (xml.getName() === "presence") {
            const from = jid(xml.getAttr("from"));
            const type = xml.getAttr("type");

            //It's me (are you sure ?) and I want a profile details
            //TODO create profile details with XMPP connection
            if (from.toString() === me.toString()) {
                return;
            }

            const x = xml.getChild("x", "http://jabber.org/protocol/muc#user");

            if (x) {
                const jid = x.getChild("item")?.getAttr("jid").split("/")[0];
                const roomId = xml.getChild("room")?.getAttr("id");
                const uuid = xml.getChild("user")?.getAttr("uuid");
                this.presenceStore.update((list) => {
                    list.set(jid, {
                        nick: from.resource,
                        roomId,
                        uuid,
                        status: type === "unavailable" ? USER_STATUS_DISCONNECTED : USER_STATUS_AVAILABLE,
                        isInSameMap: roomId === getRoomId(),
                    });

                    //update size of presence users
                    numberPresenceUserStore.set(list.size);
                    return list;
                });

                handledMessage = true;
            }
        } else if (xml.getName() === "iq") {
            const subscriptions = xml.getChild("subscriptions")?.getChildren("subscription");
            const roomId = xml.getChild("room")?.getAttr("id");
            if (subscriptions) {
                subscriptions.forEach((subscription) => {
                    const user = localUserStore.getLocalUser();
                    const jid = subscription.getAttr("jid");
                    if ((MucRoom.encode(user?.email) ?? MucRoom.encode(user?.uuid)) + "@ejabberd" !== jid) {
                        this.presenceStore.update((list) => {
                            list.set(jid, {
                                nick: subscription.getAttr("nick"),
                                roomId,
                                uuid: "",
                                status: USER_STATUS_DISCONNECTED,
                                isInSameMap: roomId === getRoomId(),
                            });
                            numberPresenceUserStore.set(list.size);
                            return list;
                        });
                    }
                });
                handledMessage = true;
            }
        }

        if (!handledMessage) {
            console.warn("Unhandled message targeted at the room: ", xml.toString());
            console.warn("Message name : ", xml.getName());
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
            .replace("\\/g", "\\5c")
            .replace(" /g", "\\20")
            .replace("*/g", "\\22")
            .replace("&/g", "\\26")
            .replace("'/g", "\\27")
            .replace("//g", "\\2f")
            .replace(":/g", "\\3a")
            .replace("</g", "\\3c")
            .replace(">/g", "\\3e")
            .replace("@/g", "\\40");
    }
}
