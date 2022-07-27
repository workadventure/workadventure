import type { ChatConnection } from "../Connection/ChatConnection";
import xml from "@xmpp/xml";
import jid, { JID } from "@xmpp/jid";
import type { Readable, Writable } from "svelte/store";
import { writable } from "svelte/store";
import ElementExt from "./Lib/ElementExt";
import { v4 as uuidv4 } from "uuid";
import Timeout = NodeJS.Timeout;
import {get} from "svelte/store";

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

enum messageType {
  message = 1,
  reply,
  react,
}

type ReactMessage = {
  id: string;
  message: string;
  from: string;
  emoji: string;
  operation: number;
};

type ReplyMessage = {
  id: string;
  senderName: string;
  body: string;
};

enum reactAction {
  add = 1,
  delete = -1,
}

export type Message = {
  body: string;
  name: string;
  time: Date;
  id: string;
  delivered: boolean;
  error: boolean;
  from: string;
  type: messageType;
  targetMessageReply?: ReplyMessage;
  targetMessageReact?: Map<string, number>;
};
export type MessagesList = Message[];
export type MessagesStore = Readable<MessagesList>;

const _VERBOSE = true;

export class SingleRoom {
  private messageStore: Writable<Message[]>;
  private messageReactStore: Writable<Map<string, ReactMessage[]>>;
  public lastMessageSeen: Date;
  private countMessagesToSee: Writable<number>;
  private sendTimeOut: Timeout | undefined;

  constructor(
    private connection: ChatConnection,
    public readonly user: User,
    private userJID: JID,
    private myJID: string
  ) {
    this.messageStore = writable<Message[]>(new Array(0));
    this.messageReactStore = writable<Map<string, ReactMessage[]>>(
        new Map<string, ReactMessage[]>()
    );
    this.lastMessageSeen = new Date();
    this.countMessagesToSee = writable<number>(0);
  }

  public connect() {
    //this.sendSubscribe();
  }

  public getPlayerName(){
    return this.user.name;
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

  public sendMessage(text: string) {
    const idMessage = uuidv4();
    const message = xml(
        "message",
        {
          type: "chat",
          to: jid(this.user.uuid, this.userJID.domain).toString(),
          from: this.myJID,
          id: idMessage,
        },
        xml("body", {}, text),
        xml("x", {xmlns: 'http://jabber.org/protocol/muc#user'})
    );
    console.log(message.toString());
    this.connection.emitXmlMessage(message);

    this.messageStore.update((messages) => {
      messages.push({
        name: this.getPlayerName(),
        body: text,
        time: new Date(),
        id: idMessage,
        delivered: false,
        error: false,
        from: this.myJID,
        type: messageType.message,
      });
      return messages;
    });

    this.manageResendMessage();
  }

  public replyMessage(text: string, messageReply: Message) {
    const idMessage = uuidv4();
    const messageReplying = xml(
        "message",
        {
          type: "chat",
          to: jid(this.userJID.local, this.userJID.domain).toString(),
          from: this.myJID,
          id: idMessage,
        },
        xml("body", {}, text),
        xml("reply", {
          to: messageReply.from,
          id: messageReply.id,
          xmlns: "urn:xmpp:reply:0",
          senderName: messageReply.name,
          body: messageReply.body,
        })
    );
    this.connection.emitXmlMessage(messageReplying);

    this.messageStore.update((messages) => {
      messages.push({
        name: this.getPlayerName(),
        body: text,
        time: new Date(),
        id: idMessage,
        delivered: false,
        error: false,
        from: this.myJID,
        type: messageType.reply,
        targetMessageReply: {
          id: messageReply.id,
          senderName: messageReply.name,
          body: messageReply.body,
        },
      });
      return messages;
    });

    this.manageResendMessage();
  }

  public haveSelected(messageId: string, emojiStr: string) {
    const messages = get(this.messageReactStore).get(messageId);
    if (!messages) return false;

    return messages.reduce((value, message) => {
      if (
          message.emoji == emojiStr &&
          jid(message.from).getLocal() == jid(this.myJID).getLocal()
      ) {
        value = message.operation == reactAction.add ? true : false;
      }
      return value;
    }, false);
  }

  public sendReactMessage(emoji: string, messageReact: Message) {
    //define action, delete or not
    let action = reactAction.add;
    if (this.haveSelected(messageReact.id, emoji)) {
      action = reactAction.delete;
    }

    const idMessage = uuidv4();
    const newReactMessage = {
      id: idMessage,
      message: messageReact.id,
      from: this.myJID,
      emoji,
      operation: action,
    };

    const messageReacted = xml(
        "message",
        {
          type: "groupchat",
          to: jid(this.userJID.local, this.userJID.domain).toString(),
          from: this.myJID,
          id: idMessage,
        },
        xml("body", {}, emoji),
        xml("reaction", {
          to: messageReact.from,
          from: this.myJID,
          id: messageReact.id,
          xmlns: "urn:xmpp:reaction:0",
          reaction: emoji,
          action,
        })
    );
    console.log("this.jid", jid(this.myJID));
    this.connection.emitXmlMessage(messageReacted);

    this.messageReactStore.update((reactMessages) => {
      //create or get list of react message
      let newReactMessages = new Array<ReactMessage>();
      if (reactMessages.has(newReactMessage.message)) {
        newReactMessages = reactMessages.get(
            newReactMessage.message
        ) as ReactMessage[];
      }
      //check if already exist
      if (!newReactMessages.find((react) => react.id === newReactMessage.id)) {
        newReactMessages.push(newReactMessage);
        reactMessages.set(newReactMessage.message, newReactMessages);
      }
      return reactMessages;
    });

    this.manageResendMessage();
  }

  private manageResendMessage() {
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
    if (_VERBOSE) console.warn("[XMPP]", "[SR]","Message sent");
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

        if (xml.getChild("reaction") != undefined) {
          //define action, delete or not
          const newReactMessage = {
            id: idMessage,
            message: xml.getChild("reaction")?.getAttr("id"),
            from: xml.getChild("reaction")?.getAttr("from"),
            emoji: body,
            operation: xml.getChild("reaction")?.getAttr("action"),
          };

          //update list of message
          this.messageReactStore.update((reactMessages) => {
            //create or get list of react message
            let newReactMessages = new Array<ReactMessage>();
            if (reactMessages.has(newReactMessage.message)) {
              newReactMessages = reactMessages.get(
                  newReactMessage.message
              ) as ReactMessage[];
            }
            //check if already exist
            if (
                !newReactMessages.find((react) => react.id === newReactMessage.id)
            ) {
              newReactMessages.push(newReactMessage);
              reactMessages.set(newReactMessage.message, newReactMessages);
            }
            return reactMessages;
          });
        } else {
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
              const message: Message = {
                name,
                body,
                time: delay,
                id: idMessage,
                delivered: true,
                error: false,
                from: from.toString(),
                type: xml.getChild("reply")
                    ? messageType.message
                    : messageType.reply,
              };
              if (xml.getChild("reply") != undefined) {
                message.targetMessageReply = {
                  ...(xml.getChild("reply")?.attrs as ReplyMessage),
                };
              }
              messages.push(message);
            }
            return messages;
          });
        }
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
    return this.userJID.local + "@" + this.userJID.domain.toString();
  }

  public reset(): void {
    this.messageStore.set([]);
  }
}
