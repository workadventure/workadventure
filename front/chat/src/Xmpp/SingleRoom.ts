import type { ChatConnection } from "../Connection/ChatConnection";
import xml from "@xmpp/xml";
import jid, { JID } from "@xmpp/jid";
import type { Readable, Writable } from "svelte/store";
import { writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { v4 as uuidv4 } from "uuid";
import Timeout = NodeJS.Timeout;

export type User = {
  name: string;
  playUri: string;
  uuid: string;
  status: string;
  active: boolean;
  isInSameMap: boolean;
  color: string;
  woka: string;
  unreads: boolean;
  isAdmin: boolean;
  chatState: string;
};

export type Message = {
  body: string;
  name: string;
  time: Date;
  id: string;
  delivered: boolean;
  error: boolean;
};
export type MessagesList = Message[];
export type MessagesStore = Readable<MessagesList>;

const _VERBOSE = true;

export class SingleRoom {
  private messageStore: Writable<Message[]>;
  public lastMessageSeen: Date;
  private countMessagesToSee: Writable<number>;
  private sendTimeOut: Timeout | undefined;

  constructor(
    private connection: ChatConnection,
    public readonly user: User,
    private roomJid: JID,
    private jid: string
  ) {
    this.messageStore = writable<Message[]>(new Array(0));
    this.lastMessageSeen = new Date();
    this.countMessagesToSee = writable<number>(0);
  }

  public connect() {
    //this.sendSubscribe();
  }

  public getPlayerName(){
    return this.user.name;
  }

  public sendMessage(text: string) {
    const idMessage = uuidv4();
    const message = xml(
      "message",
      {
        type: "chat",
        to: jid(this.roomJid.local, this.roomJid.domain).toString(),
        from: this.jid,
        id: idMessage,
      },
        xml("body", {}, text),
        xml("x", {xmlns: "http://jabber.org/protocol/muc#user",})
    );
    this.connection.emitXmlMessage(message);

    this.messageStore.update((messages) => {
      messages.push({
        name: this.user.name,
        body: text,
        time: new Date(),
        id: idMessage,
        delivered: false,
        error: false,
      });
      return messages;
    });

    this.lastMessageSeen = new Date();
    this.countMessagesToSee.set(0);

    if (this.sendTimeOut) {
      clearTimeout(this.sendTimeOut);
    }
    this.sendTimeOut = setTimeout(() => {
      this.messageStore.update((messages) => {
        messages = messages.map((message) =>
          !message.delivered ? { ...message, error: true } : message
        );
        return messages;
      });
    }, 10_000);
    if (_VERBOSE) console.warn("[XMPP]","[SR]", "Message sent");
  }

  public deleteMessage(idMessage: string) {
    this.messageStore.update((messages) => {
      return messages.filter((message) => message.id !== idMessage);
    });
    return true;
  }

  public sendBack(idMessage: string) {
    this.messageStore.update((messages) => {
      this.sendMessage(
          messages.find((message) => message.id === idMessage)?.body ?? ""
      );
      return messages.filter((message) => message.id !== idMessage);
    });
    return true;
  }

  onMessage(xml: ElementExt): void {
    let handledMessage = false;
    if (_VERBOSE) console.warn("[XMPP]","[SR]", "<< Message received", xml.getName());

    if (
      xml.getName() === "message" &&
      xml.getAttr("type") === "chat" &&
      !xml.getChild("subject")
    ) {
      const from = jid(xml.getAttr("from"));
      const idMessage = xml.getAttr("id");
      const name = from.resource;
      const state = xml.getChildByAttr(
        "xmlns",
        "http://jabber.org/protocol/chatstates"
      );
      if (!state) {
        let delay = xml.getChild("delay")?.getAttr("stamp");
        if (delay) {
          delay = new Date(delay);
        } else {
          delay = new Date();
        }
        const body = xml.getChildText("body") ?? "";
        this.messageStore.update((messages) => {
          if (messages.find((message) => message.id === idMessage)) {
            this.countMessagesToSee.set(0);
            this.lastMessageSeen = new Date();
            messages = messages.map((message) =>
              message.id === idMessage
                ? { ...message, delivered: true }
                : message
            );
          } else {
            if (delay > this.lastMessageSeen) {
              this.countMessagesToSee.update((last) => last + 1);
            }
            messages.push({
              name,
              body,
              time: delay,
              id: idMessage,
              delivered: true,
              error: false,
            });
          }
          return messages;
        });
        handledMessage = true;
      }
    }

    if (!handledMessage) {
      console.warn("[XMPP]","[SR]","Unhandled message targeted at the room: ", xml.toString());
      console.warn("[XMPP]","[SR]","Message name : ", xml.getName());
    }
  }

  public getMessagesStore(): MessagesStore {
    return this.messageStore;
  }

  public getCountMessagesToSee() {
    return this.countMessagesToSee;
  }

  public getUrl(): string {
    return this.roomJid.local + "@" + this.roomJid.domain.toString();
  }

  public reset(): void {
    this.messageStore.set([]);
  }
}
