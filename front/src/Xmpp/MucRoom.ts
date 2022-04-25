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

export const USER_STATUS_AVAILABLE = "available";
export const USER_STATUS_DISCONNECTED = "disconnected";
export type User = {
    roomId: string;
    status: string;
    isInSameMap: boolean;
};
export type UserList = Map<string, User>;
export type UsersStore = Readable<UserList>;

export function goToWorkAdventureRoomId(roomId: string, mouseEvent: MouseEvent | undefined) {
    window.location.href = roomId;
    return mouseEvent;
}

export class MucRoom {
    private presenceStore: Writable<UserList>;

    constructor(
        private connection: RoomConnection,
        public readonly name: string,
        private roomJid: JID,
        private jid: string
    ) {
        this.presenceStore = writable<UserList>(new Map<string, User>());
    }

    public connect() {
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
            //add window location and have possibility to teleport on the user
            xml("room", {
                id: window.location.toString(),
            })
        );
        this.connection.emitXmlMessage(messagePresence);

        //create list of user
        /*const roster = xml("iq", {
                from: this.jid,
                type: 'set',
                id: 'roster_2'
            },
            xml("query", {
                    xmlns: 'jabber:iq:roster'
                },
                xml("item", {
                        jid: this.roomJid.domain,
                        name: gameManager.getPlayerName()
                    },
                    xml("group", "Servants")
                )
            ),
        );
        console.log('roster', roster);
        this.connection.emitXmlMessage(roster);*/

        //create MUC subscriber
        const toMucSubscriber = jid(this.roomJid.local, this.roomJid.domain);
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

        // We are receiving the presence from someone
        if (xml.getName() === "presence") {
            const from = jid(xml.getAttr("from"));
            const type = xml.getAttr("type");
            const me = jid(this.roomJid.local, this.roomJid.domain, gameManager.getPlayerName() ?? "unknown");

            //It's me and I want a profile details
            //TODO create profile details with XMPP connection
            if (from.toString() === me.toString()) {
                return;
            }

            const x = xml.getChild("x", "http://jabber.org/protocol/muc#user");

            if (x) {
                const roomId = xml.getChild("room")?.getAttr("id");
                this.presenceStore.update((list) => {
                    if (type === "unavailable") {
                        list.set(from.resource, {
                            roomId,
                            status: USER_STATUS_DISCONNECTED,
                            isInSameMap: roomId === getRoomId(),
                        });
                    } else {
                        list.set(from.resource, {
                            roomId,
                            status: USER_STATUS_AVAILABLE,
                            isInSameMap: roomId === getRoomId(),
                        });
                    }

                    //update size of presence users
                    numberPresenceUserStore.set(list.size);
                    return list;
                });

                handledMessage = true;
            }
        }

        if (!handledMessage) {
            console.warn("Unhandled message targeted at the room: ", xml.toString());
        }
    }

    public getPresenceStore(): UsersStore {
        return {
            subscribe: this.presenceStore.subscribe,
        };
    }
}
