import type { IContent, IRoomTimelineData, MatrixEvent, Room } from "matrix-js-sdk";
import {
    Direction,
    EventType,
    MsgType,
    NotificationCountType,
    ReceiptType,
    RoomEvent,
    TimelineWindow,
} from "matrix-js-sdk";
import type { Readable, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { MediaEventContent, MediaEventInfo } from "matrix-js-sdk/lib/@types/media";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import type { Thread } from "matrix-js-sdk/lib/models/thread";
import { SearchableArrayStore } from "@workadventure/store-utils";
import type {
    ChatMessage,
    ChatRoomMember,
    ChatThread,
    ChatTimelineItem,
    memberTypingInformation,
} from "../ChatConnection";
import { selectedChatMessageToReply } from "../../Stores/ChatStore";
import type { PictureStore } from "../../../Stores/PictureStore";
import type { MatrixChatMessage } from "./MatrixChatMessage";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import type { MatrixChatRoom } from "./MatrixChatRoom";
import { applyThreadRelationToContent, isThreadReplyEvent } from "./MatrixThreadUtils";

export class MatrixChatThread implements ChatThread {
    readonly id: string;
    readonly conversationKind = "thread" as const;
    readonly parentRoom: MatrixChatRoom;
    readonly name: Readable<string>;
    readonly type: Readable<"multiple" | "direct">;
    readonly hasUnreadMessages: Writable<boolean>;
    readonly unreadNotificationCount: Writable<number>;
    readonly pictureStore: PictureStore;
    readonly avatarFallbackColor: Readable<string | undefined>;
    readonly membersForMessageAvatars: Readable<readonly ChatRoomMember[]> | undefined;
    readonly peerWaDisplayNameIfDifferent: Readable<string | undefined> | undefined;
    readonly isEncrypted: Readable<boolean>;
    readonly typingMembers: Readable<memberTypingInformation[]>;
    readonly isRoomFolder = false;
    readonly rootMessage: Writable<MatrixChatMessage | undefined>;
    readonly messages: Readable<readonly ChatMessage[]>;
    readonly timelineItems: Readable<readonly ChatTimelineItem[]>;
    readonly hasPreviousMessage = writable(false);
    readonly timelineWindow: TimelineWindow;

    private readonly replyMessages = new SearchableArrayStore((item: MatrixChatMessage) => item.id);
    private readonly inMemoryEventsContent = new Map<string, IContent>();
    private readonly handleRoomTimeline = this.onRoomTimeline.bind(this);
    private readonly handleRoomRedaction = this.onRoomRedaction.bind(this);
    private readonly updateUnreadNotificationCount = this.onThreadUpdateUnreadNotificationCount.bind(this);

    constructor(private readonly thread: Thread, parentRoom: MatrixChatRoom) {
        this.id = thread.id;
        this.parentRoom = parentRoom;
        this.type = parentRoom.type;
        this.name = derived([parentRoom.name], ([$roomName]) => `${$roomName} · Thread`);
        this.hasUnreadMessages = writable(this.getUnreadNotificationCount() > 0);
        this.unreadNotificationCount = writable(this.getUnreadNotificationCount());
        this.pictureStore = parentRoom.pictureStore;
        this.avatarFallbackColor = parentRoom.avatarFallbackColor;
        this.membersForMessageAvatars = parentRoom.membersForMessageAvatars;
        this.peerWaDisplayNameIfDifferent = parentRoom.peerWaDisplayNameIfDifferent;
        this.isEncrypted = parentRoom.isEncrypted;
        this.typingMembers = parentRoom.typingMembers;
        this.rootMessage = writable(undefined);
        this.messages = derived([this.rootMessage, this.replyMessages], ([$rootMessage, $replyMessages]) => {
            return $rootMessage ? [$rootMessage, ...$replyMessages] : [...$replyMessages];
        });
        this.timelineItems = derived(this.messages, ($messages) =>
            $messages.map(
                (message): ChatTimelineItem => ({
                    kind: "message",
                    id: message.id,
                    date: message.date,
                    message,
                })
            )
        );
        this.timelineWindow = new TimelineWindow(parentRoom.getMatrixRoom().client, thread.getUnfilteredTimelineSet());

        this.initializeRootMessage();
        this.startHandlingThreadEvents();

        this.initMatrixThreadMessages()
            .catch((error) => console.error("Failed to init Matrix thread messages:", error))
            .finally(() => {
                this.parentRoom.refreshThreadSummary(this.id);
            });
    }

    private initializeRootMessage(): void {
        const rootEvent = this.thread.rootEvent ?? this.parentRoom.getMatrixRoom().findEventById(this.id);
        if (!rootEvent) {
            return;
        }

        const message = this.parentRoom.createChatMessageFromEvent(rootEvent);
        message.openThread = undefined;
        message.threadSummary.set(null);
        this.rootMessage.set(message);
    }

    private async initMatrixThreadMessages(): Promise<void> {
        const matrixRoom = this.parentRoom.getMatrixRoom();
        if (matrixRoom.hasEncryptionStateEvent()) {
            await matrixRoom.decryptAllEvents();
        }

        await this.timelineWindow.load();
        const events = this.timelineWindow.getEvents();
        const messages = await Promise.all(events.map((event) => this.readEventsToAddMessagesAndReactions(event)));
        this.replyMessages.push(...messages.filter((message): message is MatrixChatMessage => message !== undefined));
        this.hasPreviousMessage.set(this.timelineWindow.canPaginate(Direction.Backward));
    }

    private async readEventsToAddMessagesAndReactions(event: MatrixEvent): Promise<MatrixChatMessage | undefined> {
        if (event.isEncrypted()) {
            await this.parentRoom
                .getMatrixRoom()
                .client.decryptEventIfNeeded(event)
                .catch(() => {
                    console.error("Failed to decrypt");
                });
        }

        if (event.getType() === EventType.RoomMessage && !this.isEventReplacingExistingOne(event)) {
            this.addEventContentInMemory(event);
            if (this.shouldTrackThreadMessage(event)) {
                return this.parentRoom.createChatMessageFromEvent(event);
            }
            return undefined;
        }

        if (event.getType() === EventType.Reaction) {
            this.handleNewMessageReaction(event);
            this.addEventContentInMemory(event);
        }

        return undefined;
    }

    private startHandlingThreadEvents() {
        const matrixRoom = this.parentRoom.getMatrixRoom();
        matrixRoom.on(RoomEvent.Timeline, this.handleRoomTimeline);
        matrixRoom.on(RoomEvent.Redaction, this.handleRoomRedaction);
        matrixRoom.on(RoomEvent.UnreadNotifications, this.updateUnreadNotificationCount);
    }

    private stopHandlingThreadEvents() {
        const matrixRoom = this.parentRoom.getMatrixRoom();
        matrixRoom.off(RoomEvent.Timeline, this.handleRoomTimeline);
        matrixRoom.off(RoomEvent.Redaction, this.handleRoomRedaction);
        matrixRoom.off(RoomEvent.UnreadNotifications, this.updateUnreadNotificationCount);
    }

    private static isNewLiveTimelineEvent(
        removed: boolean,
        data: IRoomTimelineData | undefined,
        toStartOfTimeline: boolean | undefined
    ): boolean {
        return !removed && !!data?.liveEvent && !toStartOfTimeline;
    }

    private onRoomTimeline(
        event: MatrixEvent,
        room: Room | undefined,
        toStartOfTimeline: boolean | undefined,
        removed: boolean,
        data: IRoomTimelineData
    ) {
        if (!room || !MatrixChatThread.isNewLiveTimelineEvent(removed, data, toStartOfTimeline)) {
            return;
        }

        const ageOfEvent = event.getAge();
        if (ageOfEvent !== undefined && ageOfEvent >= 2000) {
            return;
        }

        (async () => {
            if (event.isEncrypted()) {
                await room.client.decryptEventIfNeeded(event);
            }

            if (event.getType() === EventType.RoomMessage) {
                if (this.isEventReplacingExistingOne(event)) {
                    this.handleMessageModification(event);
                } else if (this.shouldTrackThreadMessage(event)) {
                    this.handleNewMessage(event);
                }
            }

            if (event.getType() === EventType.Reaction && this.isReactionForThisThread(event)) {
                this.handleNewMessageReaction(event);
            }
        })().catch((error) => console.error(error));
    }

    private onRoomRedaction(event: MatrixEvent) {
        const sourceEventId = event.getAssociatedId();
        if (!sourceEventId) {
            return;
        }

        const sourceEvent = this.parentRoom.getMatrixRoom().findEventById(sourceEventId);
        if (sourceEventId !== this.id && sourceEvent?.threadRootId !== this.id) {
            return;
        }

        this.handleDeletion(event);
        this.parentRoom.refreshThreadSummary(this.id);
    }

    private onThreadUpdateUnreadNotificationCount() {
        const unreadCount = this.getUnreadNotificationCount();
        this.hasUnreadMessages.set(unreadCount > 0);
        this.unreadNotificationCount.set(unreadCount);
    }

    private getUnreadNotificationCount(): number {
        return this.parentRoom.getMatrixRoom().getThreadUnreadNotificationCount(this.id);
    }

    private shouldTrackThreadMessage(event: MatrixEvent): boolean {
        if (event.getId() === this.id) {
            return false;
        }

        return isThreadReplyEvent(event) && event.threadRootId === this.id;
    }

    private isReactionForThisThread(event: MatrixEvent): boolean {
        const reactionEvent = this.getReactionEvent(event);
        if (!reactionEvent) {
            return false;
        }

        if (reactionEvent.messageId === this.id) {
            return true;
        }

        return this.replyMessages.get(reactionEvent.messageId) !== undefined;
    }

    private handleNewMessage(event: MatrixEvent) {
        const message = this.parentRoom.createChatMessageFromEvent(event);
        message.openThread = undefined;
        this.replyMessages.push(message);
        this.addEventContentInMemory(event);
        this.parentRoom.refreshThreadSummary(this.id);
    }

    private handleNewMessageReaction(event: MatrixEvent) {
        const reactionEvent = this.getReactionEvent(event);

        if (!reactionEvent) {
            return;
        }

        this.addEventContentInMemory(event);
        const { messageId, reactionKey } = reactionEvent;
        const message = this.getMessageFromThread(messageId);
        if (!message) {
            return;
        }

        const existingReaction = message.reactions.get(reactionKey);
        if (existingReaction) {
            existingReaction.addUser(event.getSender(), event.getId());
            return;
        }

        message.reactions.set(reactionKey, new MatrixChatMessageReaction(this.parentRoom.getMatrixRoom(), event));
    }

    private handleMessageModification(event: MatrixEvent) {
        const eventRelation = event.getRelation();
        if (!eventRelation?.event_id) {
            return;
        }

        const messageToUpdate = this.getMessageFromThread(eventRelation.event_id);
        if (messageToUpdate !== undefined) {
            messageToUpdate.modifyContent(event.getOriginalContent()["m.new_content"].body);
            this.parentRoom.refreshThreadSummary(this.id);
        }
    }

    private handleDeletion(redactionEvent: MatrixEvent) {
        const sourceEventId = redactionEvent.getAssociatedId();
        if (sourceEventId === undefined) {
            return;
        }

        const sourceEvent = this.parentRoom.getMatrixRoom().findEventById(sourceEventId);
        if (sourceEvent?.getType() === EventType.RoomMessage) {
            this.handleMessageDeletion(sourceEventId);
        }
        if (sourceEvent?.getType() === EventType.Reaction) {
            this.handleReactionDeletion(redactionEvent, sourceEventId);
        }
    }

    private handleMessageDeletion(deletedMessageId: string) {
        const messageToUpdate = this.getMessageFromThread(deletedMessageId);
        if (messageToUpdate !== undefined) {
            messageToUpdate.markAsRemoved();
            this.removeEventContentInMemory(deletedMessageId);
        }
    }

    private handleReactionDeletion(redactionEvent: MatrixEvent, reactionEventId: string) {
        const reactionEventContent = this.inMemoryEventsContent.get(reactionEventId);
        const sender = redactionEvent.getSender();
        if (sender === undefined || reactionEventContent === undefined) {
            return;
        }

        const relation = reactionEventContent["m.relates_to"];
        if (!relation?.key || !relation.event_id) {
            return;
        }

        const messageReaction = this.getMessageFromThread(relation.event_id)?.reactions;
        const chatReaction = messageReaction?.get(relation.key);
        if (!chatReaction) {
            return;
        }

        chatReaction.removeUser(sender);
        this.inMemoryEventsContent.delete(reactionEventId);
    }

    private getMessageFromThread(messageId: string): MatrixChatMessage | undefined {
        const rootMessage = get(this.rootMessage);
        if (rootMessage?.id === messageId) {
            return rootMessage;
        }

        return this.replyMessages.get(messageId);
    }

    private isEventReplacingExistingOne(event: MatrixEvent): boolean {
        const eventRelation = event.getRelation();
        return eventRelation?.rel_type === "m.replace";
    }

    async loadMorePreviousMessages() {
        if (!get(this.hasPreviousMessage)) {
            return;
        }

        const existingEventsBeforePagination = this.timelineWindow.getEvents();
        await this.timelineWindow.paginate(Direction.Backward, 8);
        this.timelineWindow.unpaginate(existingEventsBeforePagination.length, false);
        const paginatedEvents = this.timelineWindow.getEvents();
        const messages = await Promise.all(
            paginatedEvents.map((event) => this.readEventsToAddMessagesAndReactions(event))
        );
        this.replyMessages.unshift(
            ...messages.filter((message): message is MatrixChatMessage => message !== undefined)
        );
        this.hasPreviousMessage.set(this.timelineWindow.canPaginate(Direction.Backward));

        if (messages.length === 0) {
            await this.loadMorePreviousMessages();
        }
    }

    private getReactionEvent(event: MatrixEvent) {
        const relation = event.getRelation();
        if (relation?.rel_type === "m.annotation" && relation.event_id !== undefined && relation.key !== undefined) {
            return { messageId: relation.event_id, reactionKey: relation.key };
        }
        return undefined;
    }

    setTimelineAsRead() {
        const latestEvent = this.thread.replyToEvent ?? this.thread.rootEvent ?? null;

        this.parentRoom.getMatrixRoom().setThreadUnreadNotificationCount(this.id, NotificationCountType.Highlight, 0);
        this.parentRoom.getMatrixRoom().setThreadUnreadNotificationCount(this.id, NotificationCountType.Total, 0);
        this.hasUnreadMessages.set(false);
        this.unreadNotificationCount.set(0);

        this.parentRoom
            .getMatrixRoom()
            .client.sendReadReceipt(latestEvent, ReceiptType.Read)
            .catch((error) => console.error(error));
    }

    sendMessage(message: string) {
        this.parentRoom
            .getMatrixRoom()
            .client.sendMessage(this.parentRoom.id, this.id, this.getMessageContent(message))
            .then(() => {
                selectedChatMessageToReply.set(null);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    async sendFiles(files: FileList) {
        try {
            await Promise.allSettled(Array.from(files).map((file) => this.sendFile(file)));
        } catch (error) {
            console.error(error);
        }
    }

    private async sendFile(file: File) {
        try {
            const uploadResponse = await this.parentRoom.getMatrixRoom().client.uploadContent(file);
            const content = {
                body: file.name,
                formatted_body: file.name,
                info: {
                    size: file.size,
                },
                msgtype: this.getMessageTypeFromFile(file),
                url: uploadResponse.content_uri,
            } as RoomMessageEventContent &
                Omit<MediaEventContent, "info"> & {
                    info: Partial<MediaEventInfo>;
                };
            this.applyThreadRelationContent(content);

            return this.parentRoom.getMatrixRoom().client.sendMessage(this.parentRoom.id, this.id, content);
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    private getMessageContent(message: string): RoomMessageEventContent {
        const content: RoomMessageEventContent = { body: message, msgtype: MsgType.Text, formatted_body: message };
        this.applyThreadRelationContent(content);
        return content;
    }

    private applyThreadRelationContent(content: IContent) {
        const replyToEventId = get(selectedChatMessageToReply)?.id ?? undefined;
        const fallbackEventId = this.thread.replyToEvent?.getId() ?? this.id;
        applyThreadRelationToContent(content, this.id, fallbackEventId, replyToEventId);
    }

    private getMessageTypeFromFile(file: File) {
        if (file.type.startsWith("image/")) {
            return MsgType.Image;
        } else if (file.type.indexOf("audio/") === 0) {
            return MsgType.Audio;
        } else if (file.type.indexOf("video/") === 0) {
            return MsgType.Video;
        } else {
            return MsgType.File;
        }
    }

    private addEventContentInMemory(event: MatrixEvent) {
        this.inMemoryEventsContent.set(event.getId() ?? "", structuredClone(event.getContent()));
    }

    private removeEventContentInMemory(eventId: string) {
        this.inMemoryEventsContent.delete(eventId);
    }

    startTyping(): Promise<object> {
        return this.parentRoom.startTyping();
    }

    stopTyping(): Promise<object> {
        return this.parentRoom.stopTyping();
    }

    public get lastMessageTimestamp(): number {
        const lastReplyTimestamp = this.thread.replyToEvent?.getDate()?.getTime();
        return (
            lastReplyTimestamp ?? this.thread.rootEvent?.getDate()?.getTime() ?? this.parentRoom.lastMessageTimestamp
        );
    }

    public async getMessageById(messageId: string): Promise<MatrixChatMessage | undefined> {
        const message = this.getMessageFromThread(messageId);
        if (message) {
            return message;
        }

        const timeline = await this.parentRoom
            .getMatrixRoom()
            .client.getEventTimeline(this.thread.getUnfilteredTimelineSet(), messageId);
        const event = timeline?.getEvents().find((ev) => ev.getId() === messageId);
        if (!event) {
            return undefined;
        }

        const matrixMessage = this.parentRoom.createChatMessageFromEvent(event);
        matrixMessage.openThread = undefined;
        return matrixMessage;
    }

    destroy() {
        this.stopHandlingThreadEvents();
        get(this.rootMessage)?.destroy();
        this.replyMessages.forEach((message) => {
            message.relations?.destroy();
            message.destroy();
        });
        this.replyMessages.clear();
    }
}
