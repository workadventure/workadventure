import { EventType, IEventRelation, MatrixEvent, Room } from "matrix-js-sdk";
import { writable, Writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage, ChatMessageContent, ChatMessageType, ChatUser } from "../ChatConnection";
import { chatUserFactory } from "./MatrixChatUser";

export class MatrixChatMessage implements ChatMessage {
    id: string;
    content: Writable<ChatMessageContent>;
    sender: ChatUser | undefined;
    isMyMessage: boolean;
    date: Date | null;
    isQuotedMessage: boolean | undefined;
    quotedMessage: ChatMessage | undefined;
    type: ChatMessageType;
    isDeleted: Writable<boolean>;
    isModified: Writable<boolean>;

    constructor(private event: MatrixEvent, private room: Room, isQuotedMessage?: boolean) {
        this.id = event.getId() ?? uuidv4();
        this.type = this.mapMatrixMessageTypeToChatMessage();
        this.date = event.getDate();
        this.sender = this.getSender();
        this.isMyMessage = this.room.client.getUserId() === event.getSender();
        this.content = this.getMessageContent();
        this.isQuotedMessage = isQuotedMessage;
        this.isDeleted = writable(this.getIsDeleted());
        this.isModified = writable(this.getIsModified());
    }

    private getSender() {
        let messageUser;
        const senderUserId = this.event.getSender();
        if (senderUserId) {
            const matrixUser = this.room.client.getUser(senderUserId);
            messageUser = matrixUser ? chatUserFactory(matrixUser, this.room.client) : undefined;
        }
        return messageUser;
    }

    private getMessageContent(): Writable<ChatMessageContent> {
        const unsigned = this.event.getUnsigned();
        const relation = unsigned["m.relations"];
        if (relation) {
            if (relation["m.replace"]) {
                return writable({ body: relation["m.replace"].content?.["m.new_content"].body, url: undefined });
            }
        }

        const content = this.event.getOriginalContent();
        const quotedMessage = this.getQuotedMessage();
        if (quotedMessage !== undefined) {
            this.quotedMessage = quotedMessage;
            return writable({
                body: content.formatted_body.replace(/^(<mx-reply>).*(<\/mx-reply>)/, ""),
                url: undefined,
            });
        }

        if (this.type !== "text") {
            return writable({
                body: content.body,
                url: this.room.client.mxcUrlToHttp(this.event.getOriginalContent().url) ?? undefined,
            });
        }

        return writable({ body: content.body, url: undefined });
    }

    private getQuotedMessage() {
        const replyEventId = this.event.replyEventId;
        if (replyEventId) {
            const replyToEvent = this.room.findEventById(replyEventId);
            if (replyToEvent) {
                return new MatrixChatMessage(replyToEvent, this.room, true);
            }
        }
        return;
    }

    private getIsDeleted() {
        return this.event.isRedacted();
    }

    private getIsModified() {
        return this.event.replacingEventId() !== undefined;
    }

    private mapMatrixMessageTypeToChatMessage() {
        const matrixMessageType = this.event.getOriginalContent().msgtype;
        switch (matrixMessageType) {
            case "m.text":
                return "text";
            case "m.image":
                return "image";
            case "m.file":
                return "file";
            case "m.audio":
                return "audio";
            case "m.video":
                return "video";
        }
        return "text";
    }

    remove() {
        this.room.client.redactEvent(this.room.roomId, this.id).catch((error) => console.error(error));
    }

    async edit(newContent: string): Promise<void> {
        const editRelation: IEventRelation = { rel_type: "m.replace", event_id: this.id };
        try {
            await this.room.client.sendEvent(this.room.roomId, EventType.RoomMessage, {
                msgtype: "m.text",
                "m.relates_to": editRelation,
                "m.new_content": { msgtype: "m.text", body: newContent },
                body: newContent,
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    public modifyContent(newContent: string) {
        this.content.set({ body: newContent, url: undefined });
        this.isModified.set(true);
    }

    public markAsRemoved() {
        this.isDeleted.set(true);
    }

    async addReaction(reaction: string) {
        try {
            await this.room.client.sendEvent(this.room.roomId, EventType.Reaction, {
                "m.relates_to": { key: reaction, rel_type: "m.annotation", event_id: this.id },
            });
        } catch (error) {
            console.error(error);
        }
    }
}
