import { v4 as uuid } from "uuid";
import { XmppSettingsMessage } from "../Messages/ts-proto-generated/protos/messages";
import { EJABBERD_DOMAIN, EJABBERD_WS_URI } from "../Enum/EnvironmentVariable";
import CancelablePromise from "cancelable-promise";
import jid, { JID } from "@xmpp/jid";
import { Client, client, xml } from "@xmpp/client/dist/xmpp";
import { Element } from "@xmpp/xml";
import SASLError from "@xmpp/sasl/lib/SASLError";
import StreamError from "@xmpp/connection/lib/StreamError";
import Debug from "debug";
import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
import { connectionNotAuthorized } from "../Stores/ChatStore";
import { Subject } from "rxjs";
import { MucRoom } from "./MucRoom";
import { get } from "svelte/store";
import { activeThreadStore } from "../Stores/ActiveThreadStore";
import { userStore } from "../Stores/LocalUserStore";

// @ts-ignore
import parse from "@xmpp/xml/lib/parse";
import { getEnvConfig } from "@geprog/vite-plugin-env-config/dist/getEnvConfig";

const debug = Debug("xmppClient");

class ElementExt extends Element {}

export class XmppClient {
    private address!: JID;
    private readonly conferenceDomain: string;
    private clientPromise!: CancelablePromise<Client>;
    private clientJID: JID;
    private readonly clientID: string;
    private clientDomain: string;
    private readonly clientResource: string;
    private readonly clientPassword: string;
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private xmppSocket: Client | undefined;
    private isAuthorized = true;

    public isClosed = false;
    private subscriptions = new Map<string, Subject<ElementExt>>();
    private rooms = new Map<string, MucRoom>();

    private nickCount = 0;

    constructor(private xmppSettingsMessages: XmppSettingsMessage) {
        this.conferenceDomain = xmppSettingsMessages.conferenceDomain;
        this.clientJID = jid(xmppSettingsMessages.jabberId);
        this.clientID = this.clientJID.local;
        this.clientDomain = this.clientJID.domain;
        this.clientResource = this.clientJID.resource;
        this.clientPassword = xmppSettingsMessages.jabberPassword;
        void this.start();
    }

    // FIXME: complete a scenario where ejabberd is STOPPED when a user enters the room and then started

    private createClient(res: (value: Client | PromiseLike<Client>) => void, rej: (reason?: unknown) => void): void {
        if (!this.isAuthorized) return;
        try {
            let status: "disconnected" | "connected" = "disconnected";
            console.log(
                "Create client config : EJABBERD_WS_URI [",
                EJABBERD_WS_URI,
                "] - EJABBERD_WS_URI [",
                EJABBERD_DOMAIN,
                "]"
            );

            const xmpp = client({
                service: `${EJABBERD_WS_URI}`,
                domain: EJABBERD_DOMAIN,
                username: this.clientID,
                resource: this.clientResource ? this.clientResource : uuid().toString(), //"pusher",
                password: this.clientPassword,
            });
            this.xmppSocket = xmpp;

            xmpp.on("error", (err) => {
                if (err instanceof SASLError)
                    debug("XmppClient => createClient => receive => error", err.name, err.condition);
                else {
                    debug("XmppClient => createClient => receive => error", err);
                }
                console.trace("XmppClient => createClient => receive => error", err);
                //console.error("XmppClient => receive => error =>", err);
                this.close();
            });

            xmpp.reconnect.on("reconnecting", () => {
                debug("XmppClient => createClient => reconnecting");
            });

            xmpp.reconnect.on("reconnected", () => {
                debug("XmppClient => createClient => reconnected");
            });

            xmpp.on("offline", () => {
                debug("XmppClient => createClient => offline => status", status);
                status = "disconnected";

                //close en restart connexion
                this.close();

                // This can happen when the first connection failed for some reason.
                // We should probably retry regularly (every 10 seconds)
                if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = undefined;
                }
                if (this.isAuthorized) {
                    this.timeout = setTimeout(() => {
                        void this.start();
                    }, 10_000);
                }
            });

            xmpp.on("disconnect", () => {
                debug("XmppClient => createClient => disconnect => status", status);
                if (status !== "disconnected") {
                    console.log("Disconnected from xmpp server");
                    //if connection manager is not closed or be closing,
                    //continue with the same WebSocket and wait information from server
                    //if (!connectionManager.isClose) {
                    //  break;
                    //}

                    //close reset mucroom, close connection and try to restart
                    xmppServerConnectionStatusStore.set(false);
                    mucRoomsStore.reset();
                    //connection.close();
                }
            });
            xmpp.on("online", (address: JID) => {
                debug("XmppClient => createClient => online");
                xmpp.reconnect.stop();
                status = "connected";
                //TODO
                // define if MUC must persistent or not
                // if persistent, send subscribe MUC
                // Admin can create presence and subscribe MUC with members
                this.address = address;
            });
            xmpp.on("status", (status: string) => {
                debug("XmppClient => createClient => status => status", status);
                // FIXME: the client keeps trying to reconnect.... even if the pusher is disconnected!
            });

            xmpp.start()
                .then(() => {
                    debug("XmppClient => createClient => start");
                    xmppServerConnectionStatusStore.set(true);

                    for (const { name, url, type, subscribe } of this.xmppSettingsMessages.rooms) {
                        if (name && url) {
                            this.joinMuc(name, url, type, subscribe);
                        }
                    }
                    res(xmpp);
                })
                .catch((err: Error) => {
                    //throw err;
                    if (err instanceof SASLError || err instanceof StreamError) {
                        this.isAuthorized = err.condition !== "not-authorized";
                        if (!this.isAuthorized) {
                            connectionNotAuthorized.set(true);
                        }
                    }
                    rej(err);
                });

            xmpp.on("stanza", (stanza: unknown) => {
                // @ts-ignore
                const stanzaString = stanza.toString();

                const elementExtParsed = parse(stanzaString) as ElementExt;

                if (elementExtParsed) {
                    if (elementExtParsed.getChild("ping")) {
                        void this.sendPong(
                            elementExtParsed.getAttr("from"),
                            elementExtParsed.getAttr("to"),
                            elementExtParsed.getAttr("id")
                        );
                    } else {
                        let handledMessage = false;
                        const id = elementExtParsed.getAttr("id");

                        if (id) {
                            this.subscriptions.get(id)?.next(elementExtParsed);
                            handledMessage = true;
                        }

                        const from = elementExtParsed.getAttr("from");

                        if (from) {
                            const fromJid = jid(from);
                            const roomJid = jid(fromJid.local, fromJid.domain);

                            const room = this.rooms.get(roomJid.toString());
                            if (room) {
                                room.onMessage(elementExtParsed);
                                handledMessage = true;
                            }
                        }
                        if (!handledMessage) {
                            console.warn("Unhandled XMPP message: ", xml.toString());
                        }
                    }
                }
            });
        } catch (err) {
            console.trace("XmppClient => createClient => Error", err);
            rej(err);
        }
    }

    /*sendMessage() {
        return this.clientPromise.then((xmpp) => {
            const message = xml("message", { type: "chat", to: this.address }, xml("body", {}, "hello world"));
            return xmpp.send(message);
        });
    }

    getRoster() {
        return this.clientPromise.then((xmpp) => {
            const from = "admin@" + this.address._domain + "/" + this.address._resource;
            const message = xml("iq", { type: "get", from: from }, xml("query", { xmlns: "jabber:iq:roster" }));
            console.log("my message", message);
            return xmpp.send(message);
        });
    }*/

    start(): CancelablePromise {
        debug("xmppClient => start");
        return (this.clientPromise = new CancelablePromise((res, rej, onCancel) => {
            this.createClient(res, rej);
            onCancel(() => {
                void (async (): Promise<void> => {
                    debug("clientPromise => onCancel => from xmppClient");
                    if (this.timeout) {
                        clearTimeout(this.timeout);
                        this.timeout = undefined;
                    }

                    //send present unavailable
                    try {
                        if (this.xmppSocket?.status === "online") {
                            await this.xmppSocket?.send(xml("presence", { type: "unavailable" }));
                        }
                    } catch (err) {
                        console.info("XmppClient => onCancel => presence => err", err);
                    }
                    try {
                        //stop xmpp socket client
                        await this.xmppSocket?.close();
                    } catch (errClose) {
                        console.info("XmppClient => onCancel => xmppSocket => errClose", errClose);
                        try {
                            //stop xmpp socket client
                            await this.xmppSocket?.stop();
                        } catch (errStop) {
                            console.info("XmppClient => onCancel => xmppSocket => errStop", errStop);
                        }
                    }
                    this.isClosed = true;
                })();
            });
        }).catch((err) => {
            if (err instanceof SASLError) {
                debug("clientPromise => receive => error", err.name, err.condition);
            } else {
                debug("clientPromise => receive => error", err);
            }

            console.trace("clientPromise => receive => error", err);
            this.clientPromise.cancel();
        }));
    }

    private xmlRestrictionsToEjabberd(element: ElementExt): null | ElementExt {
        // TODO IMPLEMENT RESTRICTIONS
        // Test body message length
        // if (element.getName() === "message" && element.getChild("body")) {
        //     const message = element.getChildText("body") ?? "";
        //     if (message.length > 10_000) {
        //         return null;
        //     }
        // } else if (element.getName() === "iq" && element.getChild("query", "urn:xmpp:mam:2")) {
        //     // Test if current world is not premium, if not restrict the history
        //     if (this.clientSocket.maxHistoryChat > 0) {
        //         const query = element.getChild("query", "urn:xmpp:mam:2");
        //         const x = query?.getChild("x", "jabber:x:data");
        //         const end = x?.getChildByAttr("var", "end")?.getChildText("value");
        //         if (end) {
        //             const endDate = new Date(end);
        //             const maxDate = new Date();
        //             maxDate.setDate(maxDate.getDate() - this.clientSocket.maxHistoryChat);
        //             if (endDate <= maxDate) {
        //                 this.sendToChat(
        //                     xml(
        //                         "iq",
        //                         {
        //                             type: "result",
        //                             id: element.getAttr("id"),
        //                             from: element.getAttr("to"),
        //                             to: element.getAttr("from"),
        //                         },
        //                         xml(
        //                             "fin",
        //                             {
        //                                 xmlns: "urn:xmpp:mam:2",
        //                                 complete: false,
        //                             },
        //                             xml(
        //                                 "set",
        //                                 {
        //                                     xmlns: "http://jabber.org/protocol/rsm",
        //                                 },
        //                                 xml("count", {}, "0")
        //                             )
        //                         )
        //                     ).toString()
        //                 );
        //                 return null;
        //             } else {
        //                 x?.append(
        //                     xml(
        //                         "field",
        //                         {
        //                             var: "start",
        //                         },
        //                         xml("value", {}, maxDate.toISOString())
        //                     )
        //                 );
        //                 this.sendToChat(
        //                     xml(
        //                         "iq",
        //                         {
        //                             type: "result",
        //                             id: uuidV4(),
        //                             from: element.getAttr("to"),
        //                             to: element.getAttr("from"),
        //                         },
        //                         xml("fin", {
        //                             xmlns: "urn:xmpp:mam:2",
        //                             complete: false,
        //                             maxHistoryDate: maxDate.toISOString(),
        //                         })
        //                     ).toString()
        //                 );
        //             }
        //         }
        //     }
        //     // If getting error on MaxHistoryChat
        //     else if (this.clientSocket.maxHistoryChat < 0) {
        //         this.sendToChat(
        //             xml(
        //                 "iq",
        //                 {
        //                     type: "result",
        //                     id: element.getAttr("id"),
        //                     from: element.getAttr("to"),
        //                     to: element.getAttr("from"),
        //                 },
        //                 xml(
        //                     "fin",
        //                     {
        //                         xmlns: "urn:xmpp:mam:2",
        //                         complete: this.clientSocket.maxHistoryChat !== -1,
        //                         disabled: this.clientSocket.maxHistoryChat !== -1,
        //                     },
        //                     xml(
        //                         "set",
        //                         {
        //                             xmlns: "http://jabber.org/protocol/rsm",
        //                         },
        //                         xml("count", {}, "0")
        //                     )
        //                 )
        //             ).toString()
        //         );
        //     }
        // }
        return element;
    }

    async sendPong(to: string, from: string, id: string): Promise<void> {
        await this.sendToEjabberd(xml("iq", { from, to, id, type: "result" }).toString());
    }

    async sendToEjabberd(stanza: string): Promise<void> {
        const ctx = parse(stanza);
        try {
            if (ctx) {
                const restricted = this.xmlRestrictionsToEjabberd(ctx);
                if (restricted) {
                    await this.xmppSocket?.send(restricted);
                }
            }
        } catch (e: unknown) {
            console.error("An error occurred while sending a message to XMPP server: ", e);
            try {
                this.close();
            } catch (e2: unknown) {
                console.error("An error occurred while closing connection to XMPP server: ", e2);
            }
        }
        return;
    }

    send(stanza: ElementExt): void {
        try {
            void this.xmppSocket?.send(stanza);
        } catch (e: unknown) {
            console.error("An error occurred while sending a message to XMPP server: ", e);
            try {
                this.close();
            } catch (e2: unknown) {
                console.error("An error occurred while closing connection to XMPP server: ", e2);
            }
        }
    }

    public joinMuc(name: string, waRoomUrl: string, type: string, subscribe: boolean): MucRoom {
        const roomUrl = jid(waRoomUrl, this.conferenceDomain);
        const room = new MucRoom(this, name, roomUrl, type, subscribe, this.clientJID.toString());
        this.rooms.set(roomUrl.toString(), room);
        mucRoomsStore.addMucRoom(room);

        room.connect();

        return room;
    }

    public leaveMuc(name: string): void {
        const roomUrl = jid(name, this.conferenceDomain);
        const room = this.rooms.get(roomUrl.toString());
        if (room === undefined) {
            console.error('Cannot leave MUC room "' + name + '", room does not exist.');
            return;
        }
        room.sendDisconnect();
    }

    public removeMuc(room: MucRoom) {
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
        this.clientPromise.cancel();
    }

    public getPlayerName() {
        return (get(userStore).name ?? "unknown") + (this.nickCount > 0 ? `[${this.nickCount}]` : "");
    }

    public incrementNickCount() {
        this.nickCount++;
    }
}
