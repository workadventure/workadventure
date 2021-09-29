import { ExSocketInterface } from "_Model/Websocket/ExSocketInterface";
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

export class XmppClient {
    private address!: JID;
    private clientPromise!: Promise<XmppSocket>;
    private clientID: string;
    constructor(clientData: ExSocketInterface) {
        this.clientID = clientData.userUuid + "@ejabberd";
        this.clientPromise = new Promise((res, rej) => {
            const xmpp = client({
                service: "ws://ejabberd:5443/ws",
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
                xmpp.stop();
                rej(e);
            });

            xmpp.on("stanza", async (stanza: any) => {
                console.log("stanza", stanza);
            });
        });
    }

    joinRoom(resource: string): Promise<XmppSocket> {
        return this.clientPromise.then(async (xmpp) => {
            console.log("join room");
            const message = xml(
                "presence",
                { to: "testRoom@ejabberd", from: this.clientID },
                xml("x", "http://jabber.org/protocol/muc")
            );
            await xmpp.send(message);
            return xmpp;
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
}
