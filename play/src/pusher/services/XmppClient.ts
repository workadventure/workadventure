import type { ExSocketInterface } from "../models/Websocket/ExSocketInterface";
import { v4 as uuidV4 } from "uuid";
import {
    ErrorMessage,
    MucRoomDefinitionMessage,
    PusherToIframeMessage,
    XmppConnectionNotAuthorizedMessage,
    XmppConnectionStatusChangeMessage,
    XmppMessage,
    XmppSettingsMessage,
} from "../../messages/generated/messages_pb";
import type { MucRoomDefinitionInterface } from "../../messages/JsonMessages/MucRoomDefinitionInterface";
import { EJABBERD_DOMAIN, EJABBERD_WS_URI } from "../enums/EnvironmentVariable";
import CancelablePromise from "cancelable-promise";
import jid, { JID } from "@xmpp/jid";
import type { Client } from "@xmpp/client";
import { client, xml } from "@xmpp/client";
import { Element } from "@xmpp/xml";
import SASLError from "@xmpp/sasl/lib/SASLError";
import StreamError from "@xmpp/connection/lib/StreamError";
import Debug from "debug";

const debug = Debug("xmppClient");

class ElementExt extends Element {}

//eslint-disable-next-line @typescript-eslint/no-var-requires
const parse = require("@xmpp/xml/lib/parse");

export class XmppClient {
    private address!: JID;
    private clientPromise!: CancelablePromise<Client>;
    private clientJID: JID;
    private clientID: string;
    private clientDomain: string;
    private clientResource: string;
    private clientPassword: string;
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private xmppSocket: Client | undefined;
    private isAuthorized = true;

    constructor(private clientSocket: ExSocketInterface, private initialMucRooms: MucRoomDefinitionInterface[]) {
        this.clientJID = jid(clientSocket.jabberId);
        this.clientID = this.clientJID.local;
        this.clientDomain = this.clientJID.domain;
        this.clientResource = this.clientJID.resource;
        this.clientPassword = clientSocket.jabberPassword;
        this.start();
    }

    // FIXME: complete a scenario where ejabberd is STOPPED when a user enters the room and then started

    private createClient(res: (value: Client | PromiseLike<Client>) => void, rej: (reason?: unknown) => void): void {
        if (!this.isAuthorized) return;
        try {
            let status: "disconnected" | "connected" = "disconnected";
            const xmpp = client({
                service: `${EJABBERD_WS_URI}`,
                domain: EJABBERD_DOMAIN,
                username: this.clientID,
                resource: this.clientResource ? this.clientResource : uuidV4().toString(), //"pusher",
                password: this.clientPassword,
            });
            this.xmppSocket = xmpp;

            xmpp.on("error", (err: unknown) => {
                if (err instanceof SASLError)
                    debug("XmppClient => createClient => receive => error", err.name, err.condition);
                else {
                    debug("XmppClient => createClient => receive => error", err);
                }
                this.sendErrorToIframe(err as string);
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
                        this.start();
                    }, 10_000);
                }
            });

            xmpp.on("disconnect", () => {
                debug("XmppClient => createClient => disconnect => status", status, this.clientSocket.disconnecting);
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
                debug("XmppClient => createClient => online");
                xmpp.reconnect.stop();
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
            });
            xmpp.on("status", (status: string) => {
                debug("XmppClient => createClient => status => status", status);
                // FIXME: the client keeps trying to reconnect.... even if the pusher is disconnected!
            });

            xmpp.start()
                .then(() => {
                    debug("XmppClient => createClient => start");
                    res(xmpp);
                })
                .catch((err: Error) => {
                    //throw err;
                    if (err instanceof SASLError || err instanceof StreamError) {
                        this.isAuthorized = err.condition !== "not-authorized";
                        if (!this.isAuthorized) {
                            const pusherToIframeMessage = new PusherToIframeMessage();
                            pusherToIframeMessage.setXmppconnectionnotauthorized(
                                new XmppConnectionNotAuthorizedMessage()
                            );

                            if (!this.clientSocket.disconnecting) {
                                this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                            }
                        }
                    }
                    this.sendErrorToIframe(err.toString());
                    rej(err);
                });

            xmpp.on("stanza", (stanza: unknown) => {
                // @ts-ignore
                const stanzaString = stanza.toString();

                const elementExtParsed = parse(stanzaString) as ElementExt;
                if (elementExtParsed) {
                    const canContinue = this.xmlRestrictionsToIframe(elementExtParsed);

                    if (canContinue) {
                        this.sendToChat(stanzaString);
                    }
                }
            });
        } catch (err) {
            console.error("XmppClient => createClient => Error", err);
            rej(err);
        }
    }

    sendToChat(stanza: string): void {
        const xmppMessage = new XmppMessage();
        xmppMessage.setStanza(stanza);

        const pusherToIframeMessage = new PusherToIframeMessage();
        pusherToIframeMessage.setXmppmessage(xmppMessage);

        if (!this.clientSocket.disconnecting) {
            this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
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
        debug("xmppClient => close");
        this.clientPromise.cancel();
    }

    start(): CancelablePromise {
        debug("xmppClient => start");
        return (this.clientPromise = new CancelablePromise((res, rej, onCancel) => {
            this.createClient(res, rej);
            onCancel(() => {
                (async (): Promise<void> => {
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
                })();
            });
        }).catch((err) => {
            if (err instanceof SASLError) {
                debug("clientPromise => receive => error", err.name, err.condition);
            } else {
                debug("clientPromise => receive => error", err);
            }
            this.sendErrorToIframe(err.toString());
            this.clientPromise.cancel();
        }));
    }

    private xmlRestrictionsToIframe(xml: ElementExt): boolean {
        if (xml.getChild("ping")) {
            this.sendPong(xml.getAttr("from"), xml.getAttr("to"), xml.getAttr("id"));
            return false;
        }
        return true;
    }

    private xmlRestrictionsToEjabberd(element: ElementExt): null | ElementExt {
        // Test body message length
        if (element.getName() === "message" && element.getChild("body")) {
            const message = element.getChildText("body") ?? "";
            if (message.length > 10_000) {
                return null;
            }
        } else if (element.getName() === "iq" && element.getChild("query", "urn:xmpp:mam:2")) {
            // Test if current world is not premium, if not restrict the history
            if (this.clientSocket.maxHistoryChat > 0) {
                const query = element.getChild("query", "urn:xmpp:mam:2");
                const x = query?.getChild("x", "jabber:x:data");
                const end = x?.getChildByAttr("var", "end")?.getChildText("value");
                if (end) {
                    const endDate = new Date(end);
                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() - this.clientSocket.maxHistoryChat);
                    if (endDate <= maxDate) {
                        this.sendToChat(
                            xml(
                                "iq",
                                {
                                    type: "result",
                                    id: element.getAttr("id"),
                                    from: element.getAttr("to"),
                                    to: element.getAttr("from"),
                                },
                                xml(
                                    "fin",
                                    {
                                        xmlns: "urn:xmpp:mam:2",
                                        complete: false,
                                    },
                                    xml(
                                        "set",
                                        {
                                            xmlns: "http://jabber.org/protocol/rsm",
                                        },
                                        xml("count", {}, "0")
                                    )
                                )
                            ).toString()
                        );
                        return null;
                    } else {
                        x?.append(
                            xml(
                                "field",
                                {
                                    var: "start",
                                },
                                xml("value", {}, maxDate.toISOString())
                            )
                        );
                        this.sendToChat(
                            xml(
                                "iq",
                                {
                                    type: "result",
                                    id: uuidV4(),
                                    from: element.getAttr("to"),
                                    to: element.getAttr("from"),
                                },
                                xml("fin", {
                                    xmlns: "urn:xmpp:mam:2",
                                    complete: false,
                                    maxHistoryDate: maxDate.toISOString(),
                                })
                            ).toString()
                        );
                    }
                }
            }
            // If getting error on MaxHistoryChat
            else if (this.clientSocket.maxHistoryChat < 0) {
                this.sendToChat(
                    xml(
                        "iq",
                        {
                            type: "result",
                            id: element.getAttr("id"),
                            from: element.getAttr("to"),
                            to: element.getAttr("from"),
                        },
                        xml(
                            "fin",
                            {
                                xmlns: "urn:xmpp:mam:2",
                                complete: this.clientSocket.maxHistoryChat !== -1,
                                disabled: this.clientSocket.maxHistoryChat !== -1,
                            },
                            xml(
                                "set",
                                {
                                    xmlns: "http://jabber.org/protocol/rsm",
                                },
                                xml("count", {}, "0")
                            )
                        )
                    ).toString()
                );
            }
        }
        return element;
    }

    sendPong(to: string, from: string, id: string): void {
        this.sendToEjabberd(xml("iq", { from, to, id, type: "result" }).toString());
    }

    async sendToEjabberd(stanza: string): Promise<void> {
        const ctx = parse(stanza);
        if (ctx) {
            const restricted = this.xmlRestrictionsToEjabberd(ctx);
            if (restricted) {
                await this.xmppSocket?.send(restricted as Element);
            }
        }
        return;
    }

    sendErrorToIframe(message: string): void {
        const errorMessage = new ErrorMessage();
        errorMessage.setMessage(message);

        const pusherToIframeMessage = new PusherToIframeMessage();
        pusherToIframeMessage.setErrormessage(errorMessage);

        if (!this.clientSocket.disconnecting) {
            this.clientSocket.send(pusherToIframeMessage.serializeBinary().buffer, true);
        }
    }
}
