const { client, xml, jid } = require("@xmpp/client");

class XmppClient {
    private xmpp: any;
    private address: object | null = null;
    constructor() {
        this.xmpp = client({
            service: "ws://ejabberd:5443/ws",
            host: "ejabberd",
            username: "admin",
            password: "password",
        });

        this.xmpp.on("error", (err: string) => {
            console.error(err);
        });

        this.xmpp.on("offline", () => {
            console.log("offline");
        });
        this.xmpp.on("online", (address: object) => {
            // Makes itself available
            console.log("online", address);
            this.address = address;
            this.xmpp.send(xml("presence"));

            // Sends a chat message to itself
        });

        this.xmpp.on("stanza", async (stanza: any) => {
            console.log("stanza", stanza);
            if (stanza.is("presence")) {
            }
        });

        this.xmpp.start().catch(console.error);
    }

    async test() {
        const message = xml("message", { type: "chat", to: this.address }, xml("body", {}, "hello world"));
        await this.xmpp.send(message);
    }
}

export const xmppClient = new XmppClient();
