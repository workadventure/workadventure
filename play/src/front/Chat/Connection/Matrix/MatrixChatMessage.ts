import { Direction, EventType, MatrixEvent, MatrixEventEvent, MsgType, RelationType, Room } from "matrix-js-sdk";
import { writable, Writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { MapStore } from "@workadventure/store-utils";
import { ChatMessage, ChatMessageContent, ChatMessageType, ChatUser } from "../ChatConnection";
import { chatUserFactory } from "./MatrixChatUser";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import { MatrixChatRelation } from "./MatrixChatRelation";

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
    reactions: MapStore<string, MatrixChatMessageReaction>;
    relations: MatrixChatRelation | undefined;
    readonly canDelete: Writable<boolean>;

    constructor(private event: MatrixEvent, private room: Room, isQuotedMessage?: boolean) {
        this.id = event.getId() ?? uuidv4();
        this.type = this.mapMatrixMessageTypeToChatMessage();
        this.date = event.getDate();
        this.sender = this.getSender();
        this.isMyMessage = this.room.client.getUserId() === event.getSender();
        this.content = this.initMessageContent();
        this.isQuotedMessage = isQuotedMessage;
        this.isDeleted = writable(this.getIsDeleted());
        this.isModified = writable(this.getIsModified());
        this.reactions = new MapStore<string, MatrixChatMessageReaction>();

        const myRoomMember = room.getMember(room.client.getSafeUserId());
        const senderRoomMember = room.getMember(this.sender?.chatId || "");

        let myPowerLevel = 0;
        let senderPowerLevel = 0;

        if (myRoomMember) {
            myPowerLevel = myRoomMember.powerLevelNorm;
        }

        if (senderRoomMember) {
            senderPowerLevel = senderRoomMember.powerLevelNorm;
        }

        const hasSufficientPowerLevel =
            this.room
                .getLiveTimeline()
                .getState(Direction.Backward)
                ?.hasSufficientPowerLevelFor("redact", myPowerLevel) ?? false;

        this.canDelete = writable(this.isMyMessage || (hasSufficientPowerLevel && myPowerLevel > senderPowerLevel));

        event.on(MatrixEventEvent.Decrypted, () => {
            this.updateMessageContentOnDecryptedEvent();
        });

        this.initReactions();
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

    private initMessageContent(): Writable<ChatMessageContent> {
        return writable(this.getMessageContent());
    }

    private updateMessageContentOnDecryptedEvent() {
        this.content.set(this.getMessageContent());
    }

    private getMessageContent(): ChatMessageContent {
        const unsigned = this.event.getUnsigned();
        const relation = unsigned["m.relations"];
        if (this.event.isDecryptionFailure()) {
            return { body: "🔐 Failed to decrypt", url: undefined };
        }
        if (relation) {
            if (relation["m.replace"]) {
                return { body: relation["m.replace"].content?.["m.new_content"]?.body, url: undefined };
            }
        }

        const content = this.event.getOriginalContent();
        const quotedMessage = this.getQuotedMessage();

        if (quotedMessage !== undefined && content.formatted_body) {
            this.quotedMessage = quotedMessage;
            return {
                body: content.formatted_body.replace(/^(<mx-reply>).*(<\/mx-reply>)/, ""),
                url: undefined,
            };
        }

        if (this.type !== "text") {
            return {
                body: content.body,
                url: this.room.client.mxcUrlToHttp(this.event.getOriginalContent().url) ?? undefined,
            };
        }

        return { body: content.body, url: undefined };
    }

    public initReactions() {
        this.reactions.clear();
        const reactionByKey = this.room
            .getUnfilteredTimelineSet()
            .relations.getChildEventsForEvent(this.id, RelationType.Annotation, EventType.Reaction);
        if (!reactionByKey) return;
        if (!this.relations) {
            this.relations = new MatrixChatRelation(this, reactionByKey);
        }
        const sortedReactionByKey = reactionByKey.getSortedAnnotationsByKey() ?? [];
        sortedReactionByKey.forEach(([reactionKey, events]) => {
            events.forEach((event) => {
                this.reactions.set(reactionKey, new MatrixChatMessageReaction(this.room, event));
            });
        });
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

    public getFormattedBody(): string {
        const content = this.event.getOriginalContent();
        return content.formatted_body;
    }

    public mxcUrlToHttp(url: string) {
        return this.room.client.mxcUrlToHttp(url);
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
        try {
            await this.room.client.sendEvent(this.room.roomId, EventType.RoomMessage, {
                msgtype: MsgType.Text,
                "m.relates_to": { rel_type: RelationType.Replace, event_id: this.id },
                "m.new_content": { msgtype: MsgType.Text, body: newContent },
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
                "m.relates_to": { key: reaction, rel_type: RelationType.Annotation, event_id: this.id },
            });
        } catch (error) {
            console.error(error);
        }
    }
}
