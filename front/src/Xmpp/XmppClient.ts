import jid from "@xmpp/jid";
import { Observable, Subject } from "rxjs";
import { MucRoom } from "./MucRoom";
import type { RoomConnection } from "../Connexion/RoomConnection";
import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
import type { MucRoomDefinitionInterface } from "../Network/ProtobufClientUtils";
import ElementExt from "./Lib/ElementExt";

export class XmppClient {
    private jid: string | undefined;
    private conferenceDomain: string | undefined;
    private subscriptions = new Map<string, Subject<ElementExt>>();
    private rooms = new Map<string, MucRoom>();

    constructor(private connection: RoomConnection) {}

    private onConnect(initialRoomDefinitions: MucRoomDefinitionInterface[]) {
        xmppServerConnectionStatusStore.set(true);

        for (const { name, url } of initialRoomDefinitions) {
            this.joinMuc(name, url);
        }
    }

    /**
     * Sends a message to the XMPP server.
     * Generates a unique ID and tracks messages coming back.
     *
     * IMPORTANT: it is the responsibility of the caller to free the subscription later.
     */
    private sendMessage(message: ElementExt): Observable<ElementExt> {
        let id = message.getAttr("id");
        if (!id) {
            id = this.generateId();
            message.setAttrs({
                id,
            });
        }

        //this.connection.emitXmlMessage(message);

        // FIXME: SUBSCRIBE IS ACTUALLY NOT ALWAYS BASED ON ID!
        // FIXME: SUBSCRIBE IS ACTUALLY NOT ALWAYS BASED ON ID!
        // FIXME: SUBSCRIBE IS ACTUALLY NOT ALWAYS BASED ON ID!
        // FIXME: SUBSCRIBE IS ACTUALLY NOT ALWAYS BASED ON ID!
        // FIXME: FIND A WAY TO TRACK ON DIFFERENT STRATEGIES (ROUTE BY ROOM, ETC...)
        // PLUS IT SEEMS ID IS RETURNED ONLY ONCE!
        const subject = new Subject<ElementExt>();
        this.subscriptions.set(id, subject);
        return subject.asObservable();
    }

    private generateId(): string {
        const length = 8;
        const arr = new Uint8Array(length / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, (dec: number) => {
            return dec.toString(16).padStart(2, "0");
        }).join("");
    }

    public joinMuc(name: string, waRoomUrl: string): MucRoom {
        if (this.jid === undefined || this.conferenceDomain === undefined) {
            throw new Error(
                "joinRoom called before we received the XMPP connection details. There is a race condition."
            );
        }

        const roomUrl = jid(waRoomUrl, this.conferenceDomain);
        const room = new MucRoom(this.connection, name, roomUrl, this.jid);
        room.connect();
        this.rooms.set(roomUrl.toString(), room);

        mucRoomsStore.addMucRoom(room);

        return room;
    }

    public leaveMuc(name: string): void {
        if (this.jid === undefined || this.conferenceDomain === undefined) {
            throw new Error(
                "leaveMuc called before we received the XMPP connection details. There is a race condition."
            );
        }

        const roomUrl = jid(name, this.conferenceDomain);
        const room = this.rooms.get(roomUrl.toString());
        if (room === undefined) {
            console.error('Cannot leave MUC room "' + name + '", room does not exist.');
            return;
        }
        room.disconnect();
        this.rooms.delete(roomUrl.toString());

        mucRoomsStore.removeMucRoom(room);
    }

    public close() {
        for (const [, room] of this.rooms) {
            room.disconnect();
            mucRoomsStore.removeMucRoom(room);
        }
    }
}
