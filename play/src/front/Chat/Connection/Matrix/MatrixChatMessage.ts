import type { MatrixEvent, Room } from "matrix-js-sdk";
import { Direction, EventType, MatrixEventEvent, MsgType, RelationType } from "matrix-js-sdk";
import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { MapStore } from "@workadventure/store-utils";
import type {
    ChatMessage,
    ChatMessageContent,
    ChatMessageType,
    ChatThread,
    ChatThreadSummary,
    ChatUser,
} from "../ChatConnection";
import { chatUserFactoryFromRoom } from "./MatrixChatUser";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import { MatrixChatRelation } from "./MatrixChatRelation";
import { resolveAttachmentMediaFromEvent, resolveImageMediaFromEvent } from "./MatrixMediaResolver";
import { shouldRenderQuotedReply } from "./MatrixThreadUtils";

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
    readonly canReact: Readable<boolean>;
    readonly canEdit: Readable<boolean>;
    readonly canDelete: Writable<boolean>;
    threadSummary = writable<ChatThreadSummary | null>(null);
    openThread: (() => Promise<ChatThread | undefined>) | undefined;
    private imageMediaCleanup: () => void = () => undefined;
    private imageMediaAbortController: AbortController | undefined;
    private attachmentMediaCleanup: () => void = () => undefined;
    private attachmentMediaAbortController: AbortController | undefined;
    private readonly decryptedListener = () => this.updateMessageContentOnDecryptedEvent();
    // Fired when an m.replace edit is applied to this event; re-render so the edit shows.
    private readonly replacedListener = () => this.modifyContent();
    // Fired when the first relation container is created for this event. initReactions() returns early
    // when the message had no reactions at construction (so it never subscribed to reaction updates); this
    // re-runs it so reactions that arrive later via aggregation/pagination still appear.
    private readonly relationsCreatedListener = (relationType: string) => {
        if (relationType === RelationType.Annotation) {
            this.initReactions();
        }
    };

    constructor(
        private event: MatrixEvent,
        private room: Room,
        isQuotedMessage?: boolean,
        canReactStore?: Readable<boolean>,
        canSendMessagesStore?: Readable<boolean>
    ) {
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

        this.canDelete = writable(this.computeCanDelete());
        this.canReact =
            canReactStore ??
            readable(
                this.room
                    .getLiveTimeline()
                    .getState(Direction.Backward)
                    ?.maySendEvent(EventType.Reaction, room.client.getSafeUserId()) ?? false
            );
        this.canEdit = derived(
            canSendMessagesStore ??
                readable(
                    this.room
                        .getLiveTimeline()
                        .getState(Direction.Backward)
                        ?.maySendEvent(EventType.RoomMessage, room.client.getSafeUserId()) ?? false
                ),
            (canSendMessages) => this.isMyMessage && this.type === "text" && canSendMessages
        );

        event.on(MatrixEventEvent.Decrypted, this.decryptedListener);
        event.on(MatrixEventEvent.Replaced, this.replacedListener);
        event.on(MatrixEventEvent.RelationsCreated, this.relationsCreatedListener);
        this.loadImageMediaIfNeeded();
        this.loadAttachmentMediaIfNeeded();

        this.initReactions();
    }

    private getSender() {
        const senderUserId = this.event.getSender();
        return senderUserId ? chatUserFactoryFromRoom(this.room, senderUserId) : undefined;
    }

    private initMessageContent(): Writable<ChatMessageContent> {
        return writable(this.getMessageContent());
    }

    private updateMessageContentOnDecryptedEvent() {
        this.content.set(this.getMessageContent());
        this.loadImageMediaIfNeeded();
        this.loadAttachmentMediaIfNeeded();
    }

    private getMessageContent(): ChatMessageContent {
        if (this.event.isDecryptionFailure()) {
            return { body: "🔐 Failed to decrypt", url: undefined };
        }

        // getContent() returns the effective content: the latest edit's `m.new_content` when the event has
        // been replaced, and the decrypted content in E2EE rooms. The previous code read the raw
        // `m.replace` bundle from unsigned, which in E2EE rooms is the *wire* (encrypted) content, so edited
        // messages rendered with an empty body and lost msgtype/formatting/media. Live edits now re-render
        // via the MatrixEventEvent.Replaced listener.
        const content = this.event.getContent();
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

        if (this.type === "file" || this.type === "audio" || this.type === "video") {
            return {
                body: content.body,
                url: this.room.client.mxcUrlToHttp(content.url ?? content.file?.url) ?? undefined,
                mediaState: content.file !== undefined ? "loading" : "ready",
            };
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

    private loadAttachmentMediaIfNeeded() {
        if (this.type !== "file" && this.type !== "audio" && this.type !== "video") {
            return;
        }
        const rawContent = this.event.getOriginalContent();
        if (typeof rawContent !== "object" || rawContent === null || rawContent.file === undefined) {
            return;
        }
        this.attachmentMediaAbortController?.abort();
        this.attachmentMediaCleanup();

        const abortController = new AbortController();
        this.attachmentMediaAbortController = abortController;

        this.resolveAttachmentMedia(abortController.signal).catch(() => undefined);
    }

    private async resolveAttachmentMedia(signal: AbortSignal): Promise<void> {
        this.content.update((content) => ({ ...content, mediaState: "loading", mediaErrorKind: undefined }));

        try {
            const media = await resolveAttachmentMediaFromEvent(this.event, this.room.client, signal);
            if (signal.aborted) {
                media.cleanup();
                return;
            }

            this.attachmentMediaCleanup = media.cleanup;
            this.content.update((content) => ({
                ...content,
                url: media.sourceUrl,
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
                this.reactions.set(reactionKey, new MatrixChatMessageReaction(this.room, event, this.canReact));
            });
        });
    }

    private getQuotedMessage() {
        if (!shouldRenderQuotedReply(this.event)) {
            return;
        }

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

    private computeCanDelete(): boolean {
        const currentUserId = this.room.client.getSafeUserId();
        const senderUserId = this.event.getSender();
        if (!currentUserId || !senderUserId || this.event.status || this.event.isRedacted()) {
            return false;
        }

        const roomState = this.room.getLiveTimeline().getState(Direction.Backward);
        const canSendRedactionEvent = roomState?.maySendEvent(EventType.RoomRedaction, currentUserId) ?? false;
        if (!canSendRedactionEvent) {
            return false;
        }

        if (currentUserId === senderUserId) {
            return true;
        }

        const myRoomMember = this.room.getMember(currentUserId);
        const senderRoomMember = this.room.getMember(senderUserId);
        const myPowerLevel = myRoomMember?.powerLevelNorm ?? 0;
        const senderPowerLevel = senderRoomMember?.powerLevelNorm ?? 0;
        const hasSufficientPowerLevel = roomState?.hasSufficientPowerLevelFor("redact", myPowerLevel) ?? false;

        return hasSufficientPowerLevel && myPowerLevel > senderPowerLevel;
    }

    public refreshCanDelete() {
        this.canDelete.set(this.computeCanDelete());
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
        if (!get(this.canEdit)) {
            throw new Error("Missing permission to edit this message");
        }
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

    // Re-render from the (now SDK-replaced) event rather than a caller-supplied body string: getContent()
    // resolves the edit's m.new_content and preserves msgtype/formatting/media instead of the old
    // body-only update that dropped the URL of edited image/file messages.
    public modifyContent() {
        this.content.set(this.getMessageContent());
        this.isModified.set(true);
        this.loadImageMediaIfNeeded();
        this.loadAttachmentMediaIfNeeded();
    }

    public markAsRemoved() {
        this.isDeleted.set(true);
    }

    async addReaction(reaction: string) {
        if (!get(this.canReact)) {
            throw new Error("Missing permission to send reactions in this room");
        }
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
        this.event.off(MatrixEventEvent.Replaced, this.replacedListener);
        this.event.off(MatrixEventEvent.RelationsCreated, this.relationsCreatedListener);
        this.imageMediaAbortController?.abort();
        this.imageMediaCleanup();
        this.attachmentMediaAbortController?.abort();
        this.attachmentMediaCleanup();
    }

    public getMatrixEvent(): MatrixEvent {
        return this.event;
    }
}
