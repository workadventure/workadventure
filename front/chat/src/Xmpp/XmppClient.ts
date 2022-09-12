import jid from "@xmpp/jid";
import { Observable, Subject } from "rxjs";
import { MucRoom } from "./MucRoom";
import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
import type { MucRoomDefinitionInterface } from "../Messages/JsonMessages/MucRoomDefinitionInterface";
import ElementExt from "./Lib/ElementExt";
import { XmppConnectionStatusChangeMessage_Status as Status } from "../Messages/ts-proto-generated/protos/messages";
import { ChatConnection } from "../Connection/ChatConnection";
import { activeThreadStore } from "../Stores/ActiveThreadStore";
import { get } from "svelte/store";
import { userStore } from "../Stores/LocalUserStore";

export class XmppClient {
    private jid: string | undefined;
    private conferenceDomain: string | undefined;
    private subscriptions = new Map<string, Subject<ElementExt>>();
    private rooms = new Map<string, MucRoom>();

    private nickCount = 0;

    constructor(private connection: ChatConnection) {
        connection.xmppSettingsMessageStream.subscribe((settings) => {
            if (settings === undefined) {
                return;
            }
            this.jid = settings.jid;
            this.conferenceDomain = settings.conferenceDomain;

            this.onConnect(settings.rooms);
        });

        connection.xmppMessageStream.subscribe((xml) => {
            let handledMessage = false;
            const id = xml.getAttr("id");

            if (id) {
                this.subscriptions.get(id)?.next(xml);
                handledMessage = true;
            }

            const from = xml.getAttr("from");

            if (from) {
                const fromJid = jid(from);
                const roomJid = jid(fromJid.local, fromJid.domain);

                const room = this.rooms.get(roomJid.toString());
                if (room) {
                    room.onMessage(xml);
                    handledMessage = true;
                }
            }
            if (!handledMessage) {
                console.warn("Unhandled XMPP message: ", xml.toString());
            }
        });

        connection.xmppConnectionStatusChangeMessageStream.subscribe((status) => {
            switch (status) {
                case Status.DISCONNECTED: {
                    console.log("Disconnected from xmpp server");
                    //if connection manager is not closed or be closing,
                    //continue with the same WebSocket and wait information from server
                    //if (!connectionManager.isClose) {
                    //  break;
                    //}

                    //close reset mucroom, close connection and try to restart
                    xmppServerConnectionStatusStore.set(false);
                    mucRoomsStore.reset();
                    connection.close();
                    break;
                }
                case Status.UNRECOGNIZED: {
                    throw new Error("xmppConnectionStatusChangeMessageStream => Unexpected status received");
                }
                default: {
                    console.info("xmppConnectionStatusChangeMessageStream => Xmpp server connected => status", status);
                    //const _exhaustiveCheck: never = status;
                }
            }
        });
    }

    private onConnect(initialRoomDefinitions: MucRoomDefinitionInterface[]) {
        xmppServerConnectionStatusStore.set(true);

        for (const { name, url, type, subscribe } of initialRoomDefinitions) {
            if (name && url) {
                this.joinMuc(name, url, type, subscribe);
            }
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

        this.connection.emitXmlMessage(message);

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

    public joinMuc(name: string, waRoomUrl: string, type: string, subscribe: boolean): MucRoom {
        if (this.jid === undefined || this.conferenceDomain === undefined) {
            throw new Error(
                "joinRoom called before we received the XMPP connection details. There is a race condition."
            );
        }

        const roomUrl = jid(waRoomUrl, this.conferenceDomain);
        const room = new MucRoom(this.connection, name, roomUrl, type, subscribe, this.jid);
        this.rooms.set(roomUrl.toString(), room);
        mucRoomsStore.addMucRoom(room);

        room.connect();

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
        room.sendDisconnect();
    }

    public removeMuc(room: MucRoom) {
        if (this.jid === undefined || this.conferenceDomain === undefined) {
            throw new Error(
                "leaveMuc called before we received the XMPP connection details. There is a race condition."
            );
        }
        const roomUrl = room.getUrl();

        const activeThread = get(activeThreadStore);
        if (activeThread && activeThread.getUrl() === roomUrl.toString()) {
            activeThreadStore.reset();
        }

        this.rooms.delete(roomUrl.toString());
        mucRoomsStore.removeMucRoom(room);
    }

    public close() {
        for (const [, room] of this.rooms) {
            room.sendDisconnect();
            mucRoomsStore.removeMucRoom(room);
        }
    }

    public getPlayerName() {
        return (get(userStore).name ?? "unknown") + (this.nickCount > 0 ? `[${this.nickCount}]` : "");
    }

    public incrementNickCount() {
        this.nickCount++;
    }
}
