import { Agent, JXT } from "stanza";
import { IQ, MAMResult, Message, Presence, ReceivedMessage } from "stanza/protocol";

// 1. Declare our new custom stanza extension type
export interface WaUserInfo {
    jid: string;
    roomPlayUri: string;
    roomName: string;
    name: string;
    userUuid: string;
    userColor: string;
    userWoka: string;
    userIsMember: boolean;
    userAvailabilityStatus: number;
    userVisitCardUrl: string;
}

export interface WaMessageReply {
    to: string;
    id: string;
    senderName: string;
    body: string;
    links?: string;
}

export interface WaMessageReactions {
    id: string;
    reaction: Array<string>;
}

export interface WaReceivedReactions extends ReceivedMessage {
    reactions: WaMessageReactions;
}

export interface WaReceivedArchive extends ReceivedMessage {
    archive: MAMResult;
}

export interface Remove {
    id: string;
}

export interface WaLink {
    url: string;
    description?: string;
}

export interface WaSubscriptions {
    usersNick: string[];
    usersJid: string[];
}

// 2. Begin injecting our plugin's type information into StanzaJS.
declare module "stanza" {
    // 3. Declare a new method for the StanzaJS agent
    export interface Agent {
        sendUserInfo(jid: string, id: string, data: WaUserInfo): void;
        sendGroupChatMessage(msg: Message): void;
    }

    // 4. Declare our event types. (Event names are the fields in AgentEvents.)
    export interface AgentEvents {
        userInfo: Presence & { userInfo: WaUserInfo };
        jid: Message & { jid: string };
        messageReply: Message & { messageReply: WaMessageReply };
        remove: Message & { remove: Remove };
        reactions: Message & { reactions: WaMessageReactions };
        subscriptions: IQ & { subscriptions: WaSubscriptions };
    }

    // 5. Stanza definitions MUST be placed in the Stanzas namespace
    namespace Stanzas {
        // 6. Attach our new definition to Message stanzas
        export interface Presence {
            userInfo?: WaUserInfo;
        }

        export interface Message {
            jid?: string;
            messageReply?: WaMessageReply;
            remove?: Remove;
            reactions?: WaMessageReactions;
        }

        export interface IQ {
            subscriptions?: WaSubscriptions;
        }
    }
}

// 7. Create a plugin function
export default function (client: Agent, stanzas: JXT.Registry) {
    // 8. Create and register our custom `mystanza` stanza definition
    stanzas.define([
        {
            element: "userInfo",
            fields: {
                jid: JXT.attribute("jid"),
                roomPlayUri: JXT.attribute("roomPlayUri"),
                roomName: JXT.attribute("roomName"),
                name: JXT.attribute("name"),
                userUuid: JXT.attribute("userUuid"),
                userColor: JXT.attribute("userColor"),
                userWoka: JXT.attribute("userWoka"),
                userIsMember: JXT.booleanAttribute("userIsMember"),
                userAvailabilityStatus: JXT.integerAttribute("userAvailabilityStatus"),
                userVisitCardUrl: JXT.attribute("userVisitCardUrl"),
            },
            namespace: "https://workadventu.re/chat/user",
            path: "presence.userInfo",
        },
        {
            element: "jid",
            fields: {
                jid: JXT.childText(null, "jid"),
            },
            namespace: "jabber:client",
            path: "message",
        },
        {
            element: "messageReply",
            fields: {
                to: JXT.attribute("to"),
                id: JXT.attribute("id"),
                senderName: JXT.attribute("senderName"),
                body: JXT.childText(null, "body"),
                links: JXT.childText(null, "links"),
            },
            namespace: "urn:xmpp:reply:0",
            path: "message.messageReply",
        },
        {
            element: "remove",
            fields: {
                id: JXT.attribute("id"),
            },
            namespace: "urn:xmpp:message-delete:0",
            path: "message.remove",
        },
        {
            element: "reactions",
            fields: {
                id: JXT.attribute("id"),
                reaction: JXT.multipleChildText(null, "reaction"),
                store: JXT.namespacedAttribute("", "urn:xmpp:hints", "store"),
            },
            namespace: "urn:xmpp:reactions:0",
            path: "message.reactions",
        },
        {
            element: "subscriptions",
            fields: {
                usersJid: JXT.multipleChildAttribute(null, "subscription", "jid"),
                usersNick: JXT.multipleChildAttribute(null, "subscription", "nick"),
            },
            namespace: "urn:xmpp:mucsub:0",
            path: "iq.subscriptions",
        },
    ]);

    // 9. Add API to the StanzaJS agent for sending `mystanza` data
    client.sendUserInfo = (jid: string, id: string, data: WaUserInfo) => {
        return client.sendPresence({
            to: jid,
            id,
            userInfo: data,
        });
    };

    client.sendGroupChatMessage = (msg: Message) => {
        return client.sendMessage({
            type: "groupchat",
            ...msg,
        });
    };

    // 10. Listen for incoming `mystanza` data and emit our own event
    client.on("presence", (msg) => {
        if (msg.userInfo) {
            // @ts-ignore
            client.emit("userInfo", msg);
        }
    });
    client.on("message", (message) => {
        if (message.reactions) {
            // @ts-ignore
            client.emit("chat:reactions", message as WaReceivedReactions);
        } else if (message.hasSubject) {
            // @ts-ignore
            client.emit("chat:subject", message);
        } else if (message.archive) {
            // @ts-ignore
            client.emit("message:archive", message as WaReceivedArchive);
        } else {
            if (!message.chatState) {
                // @ts-ignore
                client.emit("chat:message", message);
            }
        }
    });
}
