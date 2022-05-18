import { ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
import { v4 } from "uuid";
import {
    MucRoomDefinitionMessage,
    ServerToClientMessage,
    SubMessage,
    XmppConnectionStatusChangeMessage,
    XmppMessage,
    XmppSettingsMessage,
} from "../Messages/generated/messages_pb";
import { MucRoomDefinitionInterface } from "../Messages/JsonMessages/MucRoomDefinitionInterface";
import { EJABBERD_DOMAIN } from "../Enum/EnvironmentVariable";
import CancelablePromise from "cancelable-promise";

const { client, xml, jid } = require("@xmpp/client");
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

    constructor(private clientSocket: ExSocketInterface, private initialMucRooms: MucRoomDefinitionInterface[]) {
        const clientJID = jid(clientSocket.jabberId);
        this.clientID = clientJID.local;
        this.clientDomain = clientJID.domain;
        this.clientResource = clientJID.resource;
        this.clientPassword = clientSocket.jabberPassword;
        this.clientPromise = new CancelablePromise((res, rej, onCancel) => {
            this.createClient(res, rej);
            onCancel(() => {
                if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = undefined;
                }
            });
        });
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

            xmpp.on("error", (err: string) => {
                console.error("XmppClient => receive => error =>", err);
                rej(err);
            });

            xmpp.on("offline", () => {
                status = "disconnected";
                // This can happen when the first connection failed for some reason.
                // We should probably retry regularly (every 10 seconds)
                this.timeout = setTimeout(() => {
                    this.createClient(res, rej);
                }, 10000);
            });

            xmpp.on("disconnect", () => {
                if (status !== "disconnected") {
                    status = "disconnected";

                    const xmppConnectionStatusChangeMessage = new XmppConnectionStatusChangeMessage();
                    xmppConnectionStatusChangeMessage.setStatus(XmppConnectionStatusChangeMessage.Status.DISCONNECTED);

                    const serverToClientMessage = new ServerToClientMessage();
                    serverToClientMessage.setXmppconnectionstatuschangemessage(xmppConnectionStatusChangeMessage);

                    if (!this.clientSocket.disconnecting) {
                        this.clientSocket.send(serverToClientMessage.serializeBinary().buffer, true);
                    }
                }
            });
            xmpp.on("online", (address: JID) => {
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
                        if (!definition.name || !definition.uri) {
                            throw new Error("Name and Uri cannot be empty!");
                        }
                        mucRoomDefinitionMessage.setName(definition.name);
                        mucRoomDefinitionMessage.setUrl(definition.uri);
                        return mucRoomDefinitionMessage;
                    })
                );

                const serverToClientMessage = new ServerToClientMessage();
                serverToClientMessage.setXmppsettingsmessage(xmppSettings);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(serverToClientMessage.serializeBinary().buffer, true);
                }

                res(xmpp);
            });
            xmpp.on("status", async (status: string) => {
                // FIXME: the client keeps trying to reconnect.... even if the pusher is disconnected!
            });

            // @ts-ignore
            xmpp.start()
                .then(() => {
                    console.log("XmppClient => start");
                })
                .catch((err: Error) => {
                    console.error("XmppClient => start => Error =>", err);
                    xmpp.stop();
                    rej(err);
                });

            xmpp.on("stanza", (stanza: unknown) => {
                const xmppMessage = new XmppMessage();
                // @ts-ignore
                xmppMessage.setStanza(stanza.toString());

                const subMessage = new SubMessage();
                subMessage.setXmppmessage(xmppMessage);

                this.clientSocket.emitInBatch(subMessage);
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

    close() {
        this.clientPromise
            .then(async (xmpp) => {
                //send presence unavailable to notify server
                await xmpp.send(xml("presence", { type: "unavailable" }));
                await xmpp.stop();

                //cancel promise
                this.clientPromise.cancel();

                return xmpp;
            })
            .catch((e) => console.error(e));
    }

    async send(stanza: string): Promise<void> {
        const xmppSocket = await this.clientPromise;
        const ctx = parse(stanza);
        xmppSocket.send(ctx);
    }
}
