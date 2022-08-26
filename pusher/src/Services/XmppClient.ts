import { ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
import { v4 } from "uuid";
import {
    MucRoomDefinitionMessage,
    PusherToIframeMessage,
    XmppConnectionStatusChangeMessage,
    XmppMessage,
    XmppSettingsMessage,
} from "../Messages/generated/messages_pb";
import { MucRoomDefinitionInterface } from "../Messages/JsonMessages/MucRoomDefinitionInterface";
import { EJABBERD_DOMAIN, EJABBERD_WS_URI } from "../Enum/EnvironmentVariable";
import CancelablePromise from "cancelable-promise";
import jid, { JID } from "@xmpp/jid";
import { client, xml } from "@xmpp/client";

//eslint-disable-next-line @typescript-eslint/no-var-requires
const parse = require("@xmpp/xml/lib/parse");

export interface XmppSocket {
    send: Function;
    stop: Function;
}

interface XmlElement {
    name: string;
    attrs: { string: string };
    children: XmlElement[];
}

export class XmppClient {
    private address!: JID;
    private clientPromise!: CancelablePromise<XmppSocket>;
    private clientJID: JID;
    private clientID: string;
    private clientDomain: string;
    private clientResource: string;
    private clientPassword: string;
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private xmppSocket: XmppSocket | undefined;
    private pingInterval: NodeJS.Timer | null = null;

    constructor(private clientSocket: ExSocketInterface, private initialMucRooms: MucRoomDefinitionInterface[]) {
        this.clientJID = jid(clientSocket.jabberId);
        this.clientID = this.clientJID.local;
        this.clientDomain = this.clientJID.domain;
        this.clientResource = this.clientJID.resource;
        this.clientPassword = clientSocket.jabberPassword;
        this.start();
    }

    // FIXME: complete a scenario where ejabberd is STOPPED when a user enters the room and then started

    private createClient(
        res: (value: XmppSocket | PromiseLike<XmppSocket>) => void,
        rej: (reason?: unknown) => void
    ): void {
        try {
            let status: "disconnected" | "connected" = "disconnected";
            const xmpp = client({
                service: `${EJABBERD_WS_URI}`,
                domain: EJABBERD_DOMAIN,
                username: this.clientID,
                resource: this.clientResource ? this.clientResource : v4().toString(), //"pusher",
                password: this.clientPassword,
            });
            this.xmppSocket = xmpp;

            xmpp.on("error", (err: unknown) => {
                console.info("XmppClient => createClient => receive => error", err);
                //console.error("XmppClient => receive => error =>", err);
                this.close();
            });

            xmpp.reconnect.on("reconnecting", () => {
                console.info("XmppClient => createClient => reconnecting");
            });

            xmpp.reconnect.on("reconnected", () => {
                console.info("XmppClient => createClient => reconnected");
            });

            xmpp.on("offline", () => {
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }
                console.info("XmppClient => createClient => offline => status", status);
                status = "disconnected";

                //close en restart connexion
                this.close();

                // This can happen when the first connection failed for some reason.
                // We should probably retry regularly (every 10 seconds)
                if (this.timeout) {
                    clearTimeout(this.timeout);
                }
                this.timeout = setTimeout(() => {
                    this.start();
                }, 10_000);
            });

            xmpp.on("disconnect", () => {
                console.info(
                    "XmppClient => createClient => disconnect => status",
                    status,
                    this.clientSocket.disconnecting
                );
                if (status !== "disconnected") {
                    status = "disconnected";

                    const xmppConnectionStatusChangeMessage = new XmppConnectionStatusChangeMessage();
                    xmppConnectionStatusChangeMessage.setStatus(XmppConnectionStatusChangeMessage.Status.DISCONNECTED);

                    const pusherToIframeMessage = new PusherToIframeMessage();
                    pusherToIframeMessage.setXmppconnectionstatuschangemessage(xmppConnectionStatusChangeMessage);

                    if (!this.clientSocket.disconnecting) {
                        this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                    }
                }
            });
            xmpp.on("online", (address: JID) => {
                console.info("XmppClient => createClient => online");
                status = "connected";
                //TODO
                // define if MUC must persistent or not
                // if persistent, send subscribe MUC
                // Admin can create presence and subscribe MUC with members
                this.address = address;
                const xmppSettings = new XmppSettingsMessage();
                xmppSettings.setJid(address.toString());
                xmppSettings.setConferencedomain("conference.ejabberd");
                xmppSettings.setRoomsList(
                    this.initialMucRooms.map((definition: MucRoomDefinitionInterface) => {
                        const mucRoomDefinitionMessage = new MucRoomDefinitionMessage();
                        if (!definition.name || !definition.url || !definition.type) {
                            throw new Error("Name URL and type cannot be empty!");
                        }
                        mucRoomDefinitionMessage.setName(definition.name);
                        mucRoomDefinitionMessage.setUrl(definition.url);
                        mucRoomDefinitionMessage.setType(definition.type);
                        mucRoomDefinitionMessage.setSubscribe(definition.subscribe);
                        return mucRoomDefinitionMessage;
                    })
                );

                const pusherToIframeMessage = new PusherToIframeMessage();
                pusherToIframeMessage.setXmppsettingsmessage(xmppSettings);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                }

                this.pingInterval = setInterval(() => this.ping(), 30_000);
            });
            xmpp.on("status", (status: string) => {
                console.error("XmppClient => createClient => status => status", status);
                // FIXME: the client keeps trying to reconnect.... even if the pusher is disconnected!
            });

            xmpp.start()
                .then(() => {
                    console.log("XmppClient => createClient => start");
                    res(xmpp);
                })
                .catch((err: Error) => {
                    console.error("XmppClient => createClient => start => error", err);
                    //throw err;
                    rej(err);
                });

            xmpp.on("stanza", (stanza: unknown) => {
                const xmppMessage = new XmppMessage();
                // @ts-ignore
                const stanzaString = stanza.toString();
                xmppMessage.setStanza(stanzaString);

                const pusherToIframeMessage = new PusherToIframeMessage();
                pusherToIframeMessage.setXmppmessage(xmppMessage);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                }
            });
        } catch (err) {
            console.error("XmppClient => createClient => Error", err);
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

    close(): void {
        //cancel promise
        console.info("xmppClient => close");
        this.clientPromise.cancel();
    }

    start(): CancelablePromise {
        console.info("xmppClient => start");
        return (this.clientPromise = new CancelablePromise((res, rej, onCancel) => {
            this.createClient(res, rej);
            onCancel(() => {
                (async (): Promise<void> => {
                    console.info("clientPromise => onCancel => from xmppClient");
                    if (this.timeout) {
                        clearTimeout(this.timeout);
                        this.timeout = undefined;
                    }

                    //send present unavailable
                    try {
                        await this.xmppSocket?.send(xml("presence", { type: "unavailable" }));

                        //stop xmpp socket client
                        this.xmppSocket?.stop();
                    } catch (err) {
                        console.info("XmppClient => onCancel => presence => err", err);
                    }
                })();
            });
        }).catch((err) => {
            console.error("> Connecting from xmppClient => error: ", err);
            this.clientPromise.cancel();
        }));
    }

    send(stanza: string): Promise<void> {
        const ctx = parse(stanza);
        return this.xmppSocket?.send(ctx);
    }

    ping(): void {
        this.xmppSocket?.send(
            xml(
                "iq",
                {
                    from: this.clientJID,
                    to: EJABBERD_DOMAIN,
                    id: v4(),
                    type: "get",
                },
                xml("ping", { xmlns: "urn:xmpp:ping" })
            )
        );
        // TODO catch pong
    }
}
