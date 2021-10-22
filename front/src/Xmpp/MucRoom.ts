import type {RoomConnection} from "../Connexion/RoomConnection";
import xml from "@xmpp/xml";
import jid, {JID} from "@xmpp/jid";
import {gameManager} from "../Phaser/Game/GameManager";
import type {Readable, Writable} from "svelte/store";
import {writable} from "svelte/store";

type UserList = Set<string>;
export type UsersStore = Readable<UserList>;

export class MucRoom {

    private presenceStore: Writable<UserList>;

    constructor(private connection: RoomConnection, public readonly name: string, private roomJid: JID, private jid: string) {
        this.presenceStore = writable<UserList>(new Set<string>());
    }

    public connect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, gameManager.getPlayerName() ?? 'unknown');
        const message = xml(
            "presence",
            { to: to.toString(), from: this.jid },
            xml("x", { xmlns: "http://jabber.org/protocol/muc" })
        );

        this.connection.emitXmlMessage(message);
    }

    public disconnect() {
        const to = jid(this.roomJid.local, this.roomJid.domain, gameManager.getPlayerName() ?? 'unknown');
        const message = xml(
            "presence",
            { to: to.toString(), from: this.jid, type: 'unavailable' }
        );
    }

    onMessage(xml: xml.Element): void {
        let handledMessage = false;

        // We are receiving the presence from someone
        if (xml.getName() === 'presence') {
            const from = jid(xml.getAttr('from'));
            const type = xml.getAttr('type');

            const x = xml.getChild('x', 'http://jabber.org/protocol/muc#user');

            if (x) {
                this.presenceStore.update((list) => {
                    if (type === 'unavailable') {
                        list.delete(from.resource);
                        console.log('USER LEFT', from.resource);
                    } else {
                        list.add(from.resource);
                        console.log('USER ENTERED', from.resource);
                    }
                    return list;
                });

                handledMessage = true;
            }

        }

        if (!handledMessage) {
            console.log('Unhandled message targeted at the room: ', xml.toString());
        }
    }

    public getPresenceStore(): UsersStore {
        return {
            subscribe: this.presenceStore.subscribe
        }
    }
}
