import { ExSocketInterface } from "_Model/Websocket/ExSocketInterface";
import { uuid } from "uuidv4";
import { v4 } from "uuid";

const { client, xml, jid } = require("@xmpp/client");

interface JID {
    _domain: string;
    _resource: string;
    _local: string;
}

export interface XmppSocket {
    send: Function;
    stop: Function;
}

class XmppClient {
    private address!: JID;
    private clientPromise!: Promise<XmppSocket>;
    constructor() {
        /*this.clientPromise = new Promise((res, rej) => {
            const xmpp = client({
                service: "ws://ejabberd:5443/ws",
                host: "ejabberd",
                resource: "pusher1",
                username: "admin",
                password: "password",
            });

            xmpp.on("error", (err: string) => {
                console.error(err);
                rej(err);
            });

            xmpp.on("offline", () => {
                console.log("offline");
            });
            xmpp.on("online", async (address: JID) => {
                console.log("online", address);
                this.address = address;
                await xmpp.send(xml("presence"));
                res(xmpp);

            });

            xmpp.on("stanza", async (stanza: any) => {
                console.log("stanza", stanza);
                if (stanza.attrs.type && stanza.attrs.type === "error") {
                    console.log('error', stanza.getChild("error"));
                } else if(stanza.is("message")) {
                    console.log('message', stanza.getChild("body").text());
                } else if (stanza.is('presence')) {
                    console.log('presence', stanza.getChild('x'))
                }
            });

            xmpp.start().catch((e:any) => {
                rej(e);
            });
        })*/
    }

    sendMessage() {
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
    }

    close() {
        return this.clientPromise.then(async (xmpp) => {
            await xmpp.send(xml("presence", { type: "unavailable" }));
            return xmpp.stop();
        });
    }

    joinRoom(clientData: ExSocketInterface, roomUrl: string): Promise<XmppSocket> {
        return new Promise((res, rej) => {
            const xmpp = client({
                service: "ws://ejabberd:5443/ws",
                resource: v4(),
                username: clientData.userUuid,
                password: "abc",
            });

            xmpp.on("error", (err: string) => {
                console.error("err", err);
                rej(err);
            });

            xmpp.on("offline", () => {
                console.log("offline");
            });
            xmpp.on("online", async (address: JID) => {
                console.log("online", address);
                await xmpp.send(xml("presence"));
                res(xmpp);
            });

            xmpp.start().catch((e: any) => {
                console.error("err2", e);
                rej(e);
            });
        });
    }
}

export const xmppClient = new XmppClient();
