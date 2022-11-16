import { XmppSettingsMessage } from "../Messages/ts-proto-generated/protos/messages";
import { EJABBERD_WS_URI } from "../Enum/EnvironmentVariable";
import CancelablePromise from "cancelable-promise";
import Debug from "debug";
import { mucRoomsStore, xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
import { MucRoom } from "./MucRoom";
import { get } from "svelte/store";
import { activeThreadStore } from "../Stores/ActiveThreadStore";
import { userStore } from "../Stores/LocalUserStore";
import * as Stanza from "stanza";
import WaCustomPlugin, { WaReceivedArchive, WaReceivedReactions } from "./Lib/Plugin";
import * as StanzaProtocol from "stanza/protocol";
import { JSONData } from "stanza/jxt";
import { ChatStateMessage, JID } from "stanza";
import { ParsedJID } from "stanza/JID";

const debug = Debug("xmppClient");

export class XmppClient {
    private address!: ParsedJID;
    private readonly conferenceDomain: string;
    private clientPromise!: CancelablePromise<Stanza.Agent>;
    private clientJID: ParsedJID;
    private readonly clientID: string;
    private readonly clientDomain: string;
    private readonly clientResource: string;
    private readonly clientPassword: string;
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private xmppSocket: Stanza.Agent | undefined;
    private isAuthorized = true;

    private status: "disconnected" | "connected" | "online" = "disconnected";

    public isClosed = false;
    private rooms = new Map<string, MucRoom>();

    private nickCount = 0;

    constructor(private xmppSettingsMessages: XmppSettingsMessage) {
        this.clientJID = JID.parse(xmppSettingsMessages.jabberId);
        this.clientID = this.clientJID.local ?? "";
        this.clientDomain = this.clientJID.domain;
        this.clientResource = this.clientJID.resource ?? "";
        this.clientPassword = xmppSettingsMessages.jabberPassword;
        this.conferenceDomain = xmppSettingsMessages.conferenceDomain;
        void this.start();
    }

    private forwardToRoom(type: string, from: string, xml: JSONData) {
        const roomJID = JID.toBare(from);

        const mucRoom = this.rooms.get(roomJID.toString());
        let handledMessage = false;
        if (mucRoom) {
            switch (type) {
                case "presence": {
                    handledMessage = mucRoom.onPresence(xml as StanzaProtocol.ReceivedPresence);
                    break;
                }
                case "message": {
                    handledMessage = mucRoom.onMessage(
                        xml as StanzaProtocol.ReceivedMessage,
                        xml.delay as StanzaProtocol.Delay
                    );
                    break;
                }
                case "reactions": {
                    handledMessage = mucRoom.onReactions(xml as WaReceivedReactions);
                    break;
                }
                case "archive": {
                    handledMessage = mucRoom.onMessage(
                        xml.item.message as StanzaProtocol.ReceivedMessage,
                        xml.item.delay as StanzaProtocol.Delay
                    );
                    break;
                }
                case "chatState": {
                    handledMessage = mucRoom.onChatState(xml as ChatStateMessage);
                    break;
                }
            }
            if (!handledMessage) {
                console.warn(type, "XML Message forwarded to room but not interpreted", xml);
            }
        } else {
            console.warn(type, "XML Message received but no associated room found", xml);
        }
    }

    private createClient(
        res: (value: Stanza.Agent | PromiseLike<Stanza.Agent>) => void,
        rej: (reason?: unknown) => void
    ): void {
        if (!this.isAuthorized) {
            rej("not authorized");
        } else if (this.xmppSocket) {
            res(this.xmppSocket);
        }

        const client = Stanza.createClient({
            credentials: {
                // Bypass the no-escape function implemented in stanza ParseJID.local
                username: this.clientID.replace(/@/g, "\\40"),
                password: this.clientPassword,
            },
            resource: this.clientResource,
            server: this.clientDomain,
            transports: {
                websocket: EJABBERD_WS_URI,
            },
        });

        this.xmppSocket = client;

        client.use(WaCustomPlugin);

        client.on("connected", () => {
            this.status = "connected";
        });
        client.on("disconnected", () => {
            this.status = "disconnected";
            console.log("disconnected");
            xmppServerConnectionStatusStore.set(false);
            mucRoomsStore.reset();
            this.rooms.clear();

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
        client.on("auth:success", () => {
            this.status = "online";
        });

        client.on("--transport-disconnected", () => {
            console.error("--transport-disconnected");
        });

        client.on("session:started", () => {
            for (const { name, url, type, subscribe } of this.xmppSettingsMessages.rooms) {
                if (name && url && type) {
                    this.joinMuc(name, url, type, subscribe);
                }
            }

            xmppServerConnectionStatusStore.set(true);
            res(client);
        });

        client.on("presence", (presence: StanzaProtocol.ReceivedPresence) => {
            if (!presence.legacyCapabilities) {
                this.forwardToRoom("presence", presence.from, presence);
            }
        });
        // @ts-ignore
        client.on("chat:message", (message: StanzaProtocol.ReceivedMessage) => {
            this.forwardToRoom("message", message.from, message);
        });
        // @ts-ignore
        client.on("chat:subject", (message: StanzaProtocol.ReceivedMessage) => {
            // Nothing to do
        });
        // @ts-ignore
        client.on("message:archive", (message: WaReceivedArchive) => {
            this.forwardToRoom("archive", message.from, message.archive);
        });
        // @ts-ignore
        client.on("chat:reactions", (message: WaReceivedReactions) => {
            this.forwardToRoom("reactions", message.from, message);
        });
        client.on("chat:state", (state: ChatStateMessage) => {
            this.forwardToRoom("chatState", state.from, state);
        });

        client.on("subscribe", (subscribe: StanzaProtocol.ReceivedPresence) => {
            console.log("subscribe", subscribe);
        });
        client.on("subscribed", (subscribe: StanzaProtocol.ReceivedPresence) => {
            console.log("subscribed", subscribe);
        });

        client.on("raw:outgoing", (message) => {
            if (message.includes("subscribe")) {
                //console.warn(message);
            }
        });

        client.on("*", (message) => {
            //console.log(message);
        });

        client.on("iq:set:roster", (message) => {
            //console.warn(message);
        });

        client.on("raw:incoming", (message) => {
            //if (message.includes("iq")) {
            //console.warn(message);
            //}
        });

        client.on("auth:failed", () => {
            console.error("auth:failed");
            this.isAuthorized = false;
            rej("auth:failed");
        });
        client.on("stream:error", (error) => {
            console.error(error);
            //rej(error);
        });
        client.on("presence:error", (error) => {
            console.error(error);
        });
        client.on("muc:error", (error) => {
            console.error(error);
        });
        client.on("message:error", (error) => {
            console.error(error);
        });

        client.connect();

        /*
        try {
            let status: "disconnected" | "connected" = "disconnected";
            const xmpp = client({
                service: `${EJABBERD_WS_URI}`,
                domain: EJABBERD_DOMAIN,
                username: this.clientID,
                resource: this.clientResource, //"pusher",
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
                // define if MUC must persistent or not
                // if persistent, send subscribe MUC
                // Admin can create presence and subscribe MUC with members
                this.address = address;
            });
            xmpp.on("status", (status: string) => {
                debug("XmppClient => createClient => status => status", status);
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
         */
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
                debug("clientPromise => onCancel => from xmppClient");
                if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = undefined;
                }
                this.xmppSocket?.disconnect();
                this.isClosed = true;
            });
        }).catch((err) => {
            debug("clientPromise => receive => error", err);
            console.trace("clientPromise => receive => error", err);
            this.clientPromise.cancel();
        }));
    }

    private xmlRestrictionsToEjabberd(element: string): void {
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
    }

    /**
     * @deprecated to be deleted
     */
    send(stanza: string): void {
        try {
            console.error("XMPPClient.send is Deprecated");
            //void this.xmppSocket?.send(stanza);
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
        const roomUrl = JID.parse(JID.create({ local: waRoomUrl, domain: this.conferenceDomain }));
        let room = this.rooms.get(roomUrl.bare);
        if (!room) {
            room = new MucRoom(this, name, roomUrl, type, subscribe);
            this.rooms.set(roomUrl.bare, room);
            mucRoomsStore.addMucRoom(room);

            room.connect();
        }
        return room;
    }

    public leaveMuc(name: string): void {
        const roomUrl = JID.parse(JID.create({ local: name, domain: this.conferenceDomain }));
        const room = this.rooms.get(roomUrl.bare);
        if (room === undefined) {
            console.error('Cannot leave MUC room "' + name + '", room does not exist.');
            return;
        }
        if (room.closed) {
            room.sendDisconnect();
        } else {
            this.removeMuc(room);
        }
    }

    public removeMuc(room: MucRoom) {
        const roomUrl = room.url;

        const activeThread = get(activeThreadStore);
        if (activeThread && activeThread.url === roomUrl.toString()) {
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

    public getMyJID(): string {
        return this.clientJID.full;
    }

    public getMyJIDBare(): string {
        return this.clientJID.bare;
    }

    public getMyPersonalJID(): string {
        return JID.create({ local: this.clientID, domain: this.clientDomain, resource: this.getPlayerName() });
    }

    public getMyResource(): string {
        return this.clientResource;
    }

    public get socket(): Stanza.Agent {
        if (!this.xmppSocket) {
            throw new Error("No socket to Ejabberd");
        }
        return this.xmppSocket;
    }
}
