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
import { EJABBERD_DOMAIN, EJABBERD_URI } from "../Enum/EnvironmentVariable";
import CancelablePromise from "cancelable-promise";

//eslint-disable-next-line @typescript-eslint/no-var-requires
const { client, xml, jid } = require("@xmpp/client");
//eslint-disable-next-line @typescript-eslint/no-var-requires
const parse = require("@xmpp/xml/lib/parse");

interface JID {
    _domain: string;
    _resource: string;
    _local: string;
}

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
    private clientID: string;
    private clientDomain: string;
    private clientResource: string;
    private clientPassword: string;
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private deleteSubscribeOnDisconnect = false;

    constructor(private clientSocket: ExSocketInterface, private initialMucRooms: MucRoomDefinitionInterface[]) {
        const clientJID = jid(clientSocket.jabberId);
        this.clientID = clientJID.local;
        this.clientDomain = clientJID.domain;
        this.clientResource = clientJID.resource;
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
                service: `ws://${EJABBERD_URI}/ws`,
                domain: EJABBERD_DOMAIN,
                username: this.clientID,
                resource: this.clientResource ? this.clientResource : v4().toString(), //"pusher",
                password: this.clientPassword,
                roomId: this.clientSocket.roomId,
            });

            xmpp.on("error", (err: unknown) => {
                console.error("XmppClient => receive => error", err);
                //console.error("XmppClient => receive => error =>", err);
                //rej(err);
                xmpp.stop();
                this.close();
            });

            xmpp.reconnect.on("reconnecting", () => {
                console.log("reconnecting");
            });

            xmpp.reconnect.on("reconnected", () => {
                console.log("reconnected");
            });

            xmpp.on("offline", () => {
                //xmpp.reconnect.stop();
                console.error("XmppClient => offline => status", status);
                status = "disconnected";
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
                console.error("XmppClient => disconnect => status", status);
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
                console.log("WebSocket Pusher <> Xmpp established");
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
                        //@ts-ignore
                        if (!definition.name || !definition.url || !definition.type) {
                            throw new Error("Name URL and type cannot be empty!");
                        }
                        mucRoomDefinitionMessage.setName(definition.name);
                        //@ts-ignore
                        mucRoomDefinitionMessage.setUrl(definition.url);
                        mucRoomDefinitionMessage.setType(definition.type);
                        return mucRoomDefinitionMessage;
                    })
                );

                const pusherToIframeMessage = new PusherToIframeMessage();
                pusherToIframeMessage.setXmppsettingsmessage(xmppSettings);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                }

                res(xmpp);
            });
            xmpp.on("status", (status: string) => {
                console.error("XmppClient => status => status", status);
                // FIXME: the client keeps trying to reconnect.... even if the pusher is disconnected!
            });

            xmpp.start()
                .then(() => {
                    console.log("XmppClient => start");
                })
                .catch((err: Error) => {
                    console.error("XmppClient => start => error");
                    //console.error("XmppClient => start => Error =>", err);
                    xmpp.stop();
                    rej(err);
                });

            xmpp.on("stanza", (stanza: unknown) => {
                const xmppMessage = new XmppMessage();
                // @ts-ignore
                const stanzaString = stanza.toString();
                xmppMessage.setStanza(stanzaString);

                if (
                    stanzaString.includes('deleteSubscribeOnDisconnect="true"') &&
                    !stanzaString.includes('type="unavailable"')
                ) {
                    this.deleteSubscribeOnDisconnect = true;
                } else if (
                    stanzaString.includes('deleteSubscribeOnDisconnect="true"') &&
                    stanzaString.includes('type="unavailable"')
                ) {
                    this.deleteSubscribeOnDisconnect = false;
                }

                const pusherToIframeMessage = new PusherToIframeMessage();
                pusherToIframeMessage.setXmppmessage(xmppMessage);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                }
            });

            res(xmpp);
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

    close(): CancelablePromise {
        console.log("> Disconnecting from xmppClient");
        return this.clientPromise
            .then(async (xmpp) => {
                //cancel promise
                this.clientPromise.cancel();
                //send presence unavailable to notify server and other users
                await xmpp.send(
                    xml(
                        "presence",
                        { type: "unavailable" },
                        xml("user", {
                            deleteSubscribeOnDisconnect: this.deleteSubscribeOnDisconnect ? "true" : "false",
                        })
                    )
                );
                await xmpp.stop();

                return xmpp;
            })
            .catch((err) => {
                console.error("> Disconnecting from xmppClient => error: ", err);
            });
    }

    start(): CancelablePromise {
        console.log("> Connecting from xmppClient");
        return (this.clientPromise = new CancelablePromise((res, rej, onCancel) => {
            this.createClient(res, rej);
            onCancel(() => {
                /*if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = undefined;
                }*/
            });
        }).catch((err) => {
            console.error("> Connecting from xmppClient => error: ", err);
            /*if(this.timeout){
                clearTimeout(this.timeout);
            }*/
            return this.close().then(() => {
                return this.start();
            });
        }));
    }

    async send(stanza: string): Promise<void> {
        const xmppSocket = await this.clientPromise;
        if (xmppSocket) {
            const ctx = parse(stanza);
            xmppSocket.send(ctx);
        }
    }
}
