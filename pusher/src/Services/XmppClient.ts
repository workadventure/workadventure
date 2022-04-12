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
const debug = require("@xmpp/debug");
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
        console.log("CONNECTING JABBERID ", clientSocket.jabberId);
        const userJid = jid(clientSocket.jabberId);
        this.clientID = userJid.local;
        this.clientDomain = userJid.domain;
        this.clientResource = userJid.resource;
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
        rej: (reason?: any) => void
    ): void {
        let status: "disconnected" | "connected" = "disconnected";
        const xmpp = client({
            service: "ws://ejabberd:5443/ws",
            domain: EJABBERD_DOMAIN,
            username: this.clientID,
            resource: this.clientResource ? this.clientResource : v4().toString(), //"pusher",
            password: this.clientPassword,
        });
        debug(xmpp); // Display XMPP logs if environment variable XMPP_DEBUG is set

        xmpp.on("error", (err: string) => {
            console.error("err", err);
            rej(err);
        });

        xmpp.on("offline", () => {
            console.log("XMPP connection is terminally disconnected");
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
                console.log("XMPP connection lost, will try to reconnect");

                const xmppConnectionStatusChangeMessage = new XmppConnectionStatusChangeMessage();
                xmppConnectionStatusChangeMessage.setStatus(XmppConnectionStatusChangeMessage.Status.DISCONNECTED);

                const serverToClientMessage = new ServerToClientMessage();
                serverToClientMessage.setXmppconnectionstatuschangemessage(xmppConnectionStatusChangeMessage);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(serverToClientMessage.serializeBinary().buffer, true);
                }
            }
        });
        xmpp.on("online", async (address: JID) => {
            console.log("CONNECTED TO XMPP SERVER");
            status = "connected";
            await xmpp.send(xml("presence"));

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
            console.log("NEW STATUS: ", status);
        });

        xmpp.start().catch((e: any) => {
            console.error("err2", e);
            xmpp.stop();
            rej(e);
        });

        xmpp.on("stanza", async (stanza: any) => {
            console.log("stanza", stanza.toString());

            const xmppMessage = new XmppMessage();
            xmppMessage.setStanza(stanza.toString());

            const subMessage = new SubMessage();
            subMessage.setXmppmessage(xmppMessage);

            this.clientSocket.emitInBatch(subMessage);
        });
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
                await xmpp.send(xml("presence", { type: "unavailable" }));
                await xmpp.stop();
                return xmpp;
            })
            .catch((e) => console.error(e))
            .cancel();
    }

    async send(stanza: string): Promise<void> {
        const client = await this.clientPromise;
        const ctx = parse(stanza);
        return client.send(ctx);
    }
}
