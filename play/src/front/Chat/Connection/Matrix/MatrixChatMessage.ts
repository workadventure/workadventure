import type { MatrixEvent, Room } from "matrix-js-sdk";
import { Direction, EventType, MatrixEventEvent, MsgType, RelationType } from "matrix-js-sdk";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { MapStore } from "@workadventure/store-utils";
import type { ChatMessage, ChatMessageContent, ChatMessageType, ChatUser } from "../ChatConnection";
import { chatUserFactory } from "./MatrixChatUser";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import { MatrixChatRelation } from "./MatrixChatRelation";
import { resolveImageMediaFromEvent } from "./MatrixMediaResolver";

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
    private imageMediaCleanup: () => void = () => undefined;
    private imageMediaAbortController: AbortController | undefined;
    private readonly decryptedListener = () => this.updateMessageContentOnDecryptedEvent();

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

        event.on(MatrixEventEvent.Decrypted, this.decryptedListener);
        this.loadImageMediaIfNeeded();

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
        this.loadImageMediaIfNeeded();
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

        if (this.type === "image") {
            return {
                body: content.body,
                url: this.room.client.mxcUrlToHttp(content.url ?? content.file?.url) ?? undefined,
                thumbnailUrl: this.room.client.mxcUrlToHttp(content.info?.thumbnail_url) ?? undefined,
                mediaState: content.file !== undefined ? "loading" : "ready",
            };
        }

        if (this.type !== "text") {
            return { body: content.body, url: this.room.client.mxcUrlToHttp(content.url) ?? undefined };
        }

        return { body: content.body, url: undefined };
    }

    private loadImageMediaIfNeeded() {
        if (this.type !== "image") {
            return;
        }
        this.imageMediaAbortController?.abort();
        this.imageMediaCleanup();

        const abortController = new AbortController();
        this.imageMediaAbortController = abortController;

        this.resolveImageMedia(abortController.signal).catch(() => undefined);
    }

    private async resolveImageMedia(signal: AbortSignal): Promise<void> {
        this.content.update((content) => ({ ...content, mediaState: "loading", mediaErrorKind: undefined }));

        try {
            const media = await resolveImageMediaFromEvent(this.event, this.room.client, signal);
            if (signal.aborted) {
                media.cleanup();
                return;
            }

            this.imageMediaCleanup = media.cleanup;
            this.content.update((content) => ({
                ...content,
                url: media.sourceUrl,
                thumbnailUrl: media.thumbnailUrl ?? media.sourceUrl,
                mediaErrorKind: media.error,
                mediaState: media.error ? "error" : "ready",
            }));
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
            this.content.update((content) => ({
                ...content,
                mediaState: "error",
                mediaErrorKind: "download",
            }));
        }
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

    destroy() {
        this.event.off(MatrixEventEvent.Decrypted, this.decryptedListener);
        this.imageMediaAbortController?.abort();
        this.imageMediaCleanup();
    }
}
