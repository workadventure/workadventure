import { ExSocketInterface } from "_Model/Websocket/ExSocketInterface";
import {v4} from "uuid";
import {
    MucRoomDefinitionMessage,
    ServerToClientMessage,
    SubMessage,
    XmppMessage,
    XmppSettingsMessage
} from "../Messages/generated/messages_pb";
import {MucRoomDefinitionInterface} from "./AdminApi/MucRoomDefinitionInterface";

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
    private clientPromise!: Promise<XmppSocket>;
    private clientID: string;
    constructor(private clientSocket: ExSocketInterface, initialMucRooms: MucRoomDefinitionInterface[]) {
        this.clientID = clientSocket.userUuid + "@ejabberd";
        this.clientPromise = new Promise((res, rej) => {
            const xmpp = client({
                service: "ws://ejabberd:5443/ws",
                username: clientSocket.userUuid,
                resource: v4().toString(), //"pusher",
                password: "abc",
            });
            debug(xmpp); // Display XMPP logs if environment variable XMPP_DEBUG is set

            xmpp.on("error", (err: string) => {
                console.error("err", err);
                rej(err);
            });

            xmpp.on("offline", () => {
                console.log("offline");
            });
            xmpp.on("online", async (address: JID) => {
                this.address = address;

                await xmpp.send(xml("presence"));

                const xmppSettings = new XmppSettingsMessage();
                xmppSettings.setJid(address.toString());
                xmppSettings.setConferencedomain('conference.ejabberd');
                xmppSettings.setRoomsList(initialMucRooms.map((definition) => {
                    const mucRoomDefinitionMessage = new MucRoomDefinitionMessage();
                    mucRoomDefinitionMessage.setName(definition.name);
                    mucRoomDefinitionMessage.setUrl(definition.uri);
                    return mucRoomDefinitionMessage;
                }));

                const serverToClientMessage = new ServerToClientMessage();
                serverToClientMessage.setXmppsettingsmessage(xmppSettings);

                if (!this.clientSocket.disconnecting) {
                    this.clientSocket.send(serverToClientMessage.serializeBinary().buffer, true);
                }

                res(xmpp);
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
        return this.clientPromise.then(async (xmpp) => {
            await xmpp.send(xml("presence", { type: "unavailable" }));
            await xmpp.stop();
            return xmpp;
        });
    }

    async send(stanza: string): Promise<void> {
        const client = await this.clientPromise;
        const ctx = parse(stanza);
        return client.send(ctx);
    }
}
