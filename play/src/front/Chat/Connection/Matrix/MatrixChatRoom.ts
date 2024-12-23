import {
    ConditionKind,
    Direction,
    EventStatus,
    EventType,
    IContent,
    IPushRule,
    IRoomTimelineData,
    MatrixEvent,
    MsgType,
    NotificationCountType,
    PushRuleActionName,
    PushRuleKind,
    ReceiptType,
    Room,
    RoomEvent,
    RoomState,
    RoomStateEvent,
    TimelineWindow,
} from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { get, Writable, writable } from "svelte/store";
import { MediaEventContent, MediaEventInfo } from "matrix-js-sdk/lib/@types/media";
import { KnownMembership } from "matrix-js-sdk/lib/@types/membership";
import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import { ChatRoom, ChatRoomMember, ChatRoomMembership } from "../ChatConnection";
import { isAChatRoomIsVisible, navChat, selectedChatMessageToReply, selectedRoomStore } from "../../Stores/ChatStore";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { MatrixChatMessage } from "./MatrixChatMessage";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import { matrixSecurity } from "./MatrixSecurity";
import { NotificationType } from "../../../WebRtc/MediaManager";
import { mediaManager } from "../../../WebRtc/MediaManager";

type EventId = string;

export class MatrixChatRoom implements ChatRoom {
    readonly id: string;
    readonly name: Writable<string>;
    readonly type: "multiple" | "direct";
    readonly hasUnreadMessages: Writable<boolean>;
    avatarUrl: string | undefined;
    messages: SearchableArrayStore<string, MatrixChatMessage>;
    myMembership: ChatRoomMembership;
    membersId: string[];
    members: ChatRoomMember[];
    messageReactions: MapStore<string, MapStore<string, MatrixChatMessageReaction>>;
    hasPreviousMessage: Writable<boolean>;
    timelineWindow: TimelineWindow;
    inMemoryEventsContent: Map<EventId, IContent>;
    isEncrypted!: Writable<boolean>;
    typingMembers: Writable<Array<{ id: string; name: string | null; avatarUrl: string | null }>>;
    isRoomFolder = false;
    areNotificationsMuted = writable(false);

    private handleRoomTimeline = this.onRoomTimeline.bind(this);
    private handleRoomName = this.onRoomName.bind(this);
    private handleRoomRedaction = this.onRoomRedaction.bind(this);
    private handleStateEvent = this.onRoomStateEvent.bind(this);

    constructor(
        private matrixRoom: Room,
        private playNewMessageSound = () => {
            if (!localUserStore.getChatSounds() || get(this.areNotificationsMuted)) return;
            gameManager.getCurrentGameScene().playSound("new-message");
        }
    ) {
        this.id = matrixRoom.roomId;
        this.name = writable(matrixRoom.name);
        this.type = this.getMatrixRoomType();
        this.hasUnreadMessages = writable(matrixRoom.getUnreadNotificationCount() > 0);
        this.avatarUrl = matrixRoom.getAvatarUrl(matrixRoom.client.baseUrl, 24, 24, "scale") ?? undefined;
        this.messages = new SearchableArrayStore((item: MatrixChatMessage) => item.id);
        this.messageReactions = new MapStore<string, MapStore<string, MatrixChatMessageReaction>>();
        this.sendMessage = this.sendMessage.bind(this);
        this.myMembership = matrixRoom.getMyMembership();
        this.membersId = [
            ...matrixRoom.getMembersWithMembership(KnownMembership.Invite).map((member) => member.userId),
            ...matrixRoom.getMembersWithMembership(KnownMembership.Join).map((member) => member.userId),
        ];

        this.members = [
            ...matrixRoom.getMembers().map((member) => ({
                id: member.userId,
                name: member.name ?? member.userId,
                membership: member.membership ?? "join",
            })),
        ];

        this.hasPreviousMessage = writable(false);
        this.timelineWindow = new TimelineWindow(matrixRoom.client, matrixRoom.getLiveTimeline().getTimelineSet());
        this.isEncrypted = writable(matrixRoom.hasEncryptionStateEvent());
        this.typingMembers = writable([]);

        this.isRoomFolder = matrixRoom.isSpaceRoom();
        this.inMemoryEventsContent = new Map<EventId, MatrixEvent>();

        this.areNotificationsMuted.set(
            this.matrixRoom.client
                .getAccountData("m.push_rules")
                ?.getContent()
                .global.override.some((rule: IPushRule) => {
                    if (rule.actions.includes(PushRuleActionName.DontNotify) && rule.rule_id === this.id) {
                        return true;
                    }
                    return false;
                })
        );

        (async () => {
            await matrixSecurity.restoreRoomsMessages();
        })()
            .catch((error) => {
                console.error(error);
                Sentry.captureMessage("Failed to init client crypto configuration");
            })
            .then(async () => {
                await this.initMatrixRoomMessagesAndReactions();
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureMessage("Failed to init Matrix room messages");
            });

        //Necessary to keep matrix event content for local event deletions after initialization
        this.startHandlingChatRoomEvents();

        this.matrixRoom
            .getPendingEvents()
            .filter((ev: MatrixEvent) => ev.status === EventStatus.NOT_SENT)
            .forEach((event) => {
                this.matrixRoom.client.resendEvent(event, this.matrixRoom).catch((error) => {
                    this.matrixRoom.client.cancelPendingEvent(event);
                    console.error(error);
                });
            });
    }

    private async initMatrixRoomMessagesAndReactions() {
        if (this.matrixRoom.hasEncryptionStateEvent()) {
            await this.matrixRoom.decryptAllEvents();
        }
        await this.timelineWindow.load();
        const events = this.timelineWindow.getEvents();

        const decryptMessagesPromises: Promise<MatrixChatMessage | undefined>[] = [];

        events.forEach((event) => {
            decryptMessagesPromises.push(this.readEventsToAddMessagesAndReactions(event, this.messageReactions));
        });

        const result = await Promise.all(decryptMessagesPromises);
        const messages = result.filter((message) => message !== undefined) as MatrixChatMessage[];
        this.messages.push(...messages);

        this.hasPreviousMessage.set(this.timelineWindow.canPaginate(Direction.Backward));
    }

    private async readEventsToAddMessagesAndReactions(
        event: MatrixEvent,
        messageReactions: MapStore<string, MapStore<string, MatrixChatMessageReaction>>
    ): Promise<MatrixChatMessage | undefined> {
        if (event.isEncrypted()) {
            await this.matrixRoom.client.decryptEventIfNeeded(event).catch(() => {
                console.error("Failed to decrypt");
                Sentry.captureMessage("Failed to decrypt event");
            });
        }
        if (event.getType() === "m.room.message" && !this.isEventReplacingExistingOne(event)) {
            this.addEventContentInMemory(event);
            return new MatrixChatMessage(event, this.matrixRoom);
        }
        if (event.getType() === "m.reaction") {
            this.handleNewMessageReaction(event, messageReactions);
            this.addEventContentInMemory(event);
        }
        return undefined;
    }

    private startHandlingChatRoomEvents() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.matrixRoom.on(RoomEvent.Timeline, this.handleRoomTimeline);
        this.matrixRoom.on(RoomEvent.Name, this.handleRoomName);
        this.matrixRoom.on(RoomEvent.Redaction, this.handleRoomRedaction);
        this.matrixRoom.on(RoomStateEvent.Events, this.handleStateEvent);
    }

    private onRoomStateEvent(event: MatrixEvent, state: RoomState, lastStateEvent: MatrixEvent | null) {
        if (get(this.isEncrypted)) return;
        const isEncrypted = !!state.getStateEvents(EventType.RoomEncryption)[0];
        if (isEncrypted) this.isEncrypted.set(isEncrypted);
    }
    private onRoomTimeline(
        event: MatrixEvent,
        room: Room | undefined,
        toStartOfTimeline: boolean | undefined,
        _: boolean,
        data: IRoomTimelineData
    ) {
        //get age give the age of the event when the event arrived at the device
        const ageOfEvent = event.getAge();

        //Only get realtime event
        if (toStartOfTimeline || !data || !data.liveEvent || (ageOfEvent && ageOfEvent >= 2000)) {
            return;
        }

        if (room !== undefined) {
            (async () => {
                if (event.isEncrypted()) {
                    await this.matrixRoom.client.decryptEventIfNeeded(event);
                }
                this.hasUnreadMessages.set(room.getUnreadNotificationCount() > 0);
                if (event.getType() === "m.room.message") {
                    if (this.isEventReplacingExistingOne(event)) {
                        this.handleMessageModification(event);
                    } else {
                        this.handleNewMessage(event);
                        const senderID = event.getSender();
                        if (senderID !== this.matrixRoom.client.getSafeUserId() && !get(this.areNotificationsMuted)) {
                            this.playNewMessageSound();
                            console.log("createNotification", senderID, NotificationType.message, this.id);
                            mediaManager.createNotification(senderID ?? "unknown", NotificationType.message, this.id);
                            if (!isAChatRoomIsVisible() && get(selectedRoomStore)?.id !== "proximity") {
                                selectedRoomStore.set(this);
                                navChat.switchToChat();
                            }
                        }
                    }
                }
                if (event.getType() === "m.reaction") {
                    this.handleNewMessageReaction(event, this.messageReactions);
                }
                this.membersId = [
                    ...room.getMembersWithMembership(KnownMembership.Invite).map((member) => member.userId),
                    ...room.getMembersWithMembership(KnownMembership.Join).map((member) => member.userId),
                ];
            })().catch((error) => console.error(error));
        }
    }

    private onRoomName(room: Room) {
        this.name.set(room.name);
    }

    private onRoomRedaction(event: MatrixEvent) {
        this.handleDeletion(event);
    }

    private handleNewMessage(event: MatrixEvent) {
        this.messages.push(new MatrixChatMessage(event, this.matrixRoom));
        this.addEventContentInMemory(event);
    }

    private handleNewMessageReaction(
        event: MatrixEvent,
        messageReactions: MapStore<string, MapStore<string, MatrixChatMessageReaction>>
    ) {
        const reactionEvent = this.getReactionEvent(event);
        if (reactionEvent !== undefined) {
            this.addEventContentInMemory(event);
            const { messageId, reactionKey } = reactionEvent;
            const existingMessageWithReactions = messageReactions.get(messageId);
            if (existingMessageWithReactions) {
                const existingMessageReaction = existingMessageWithReactions.get(reactionKey);
                if (existingMessageReaction) {
                    existingMessageReaction.addUser(event.getSender(), event.getId());
                    return;
                }
                existingMessageWithReactions.set(reactionKey, new MatrixChatMessageReaction(this.matrixRoom, event));
                return;
            }
            const newMessageReactionMap = new MapStore<string, MatrixChatMessageReaction>();
            newMessageReactionMap.set(reactionKey, new MatrixChatMessageReaction(this.matrixRoom, event));
            messageReactions.set(messageId, newMessageReactionMap);
        }
    }

    private handleMessageModification(event: MatrixEvent) {
        const eventRelation = event.getRelation();
        if (eventRelation) {
            const event_id = eventRelation.event_id;
            if (event_id) {
                const messageToUpdate = this.messages.get(event_id);
                if (messageToUpdate !== undefined) {
                    messageToUpdate.modifyContent(event.getOriginalContent()["m.new_content"].body);
                }
            }
        }
    }

    private handleDeletion(redactionEvent: MatrixEvent) {
        const sourceEventId = redactionEvent.getAssociatedId();
        if (sourceEventId !== undefined) {
            const sourceEvent = this.matrixRoom.findEventById(sourceEventId);
            if (sourceEvent !== undefined) {
                const sourceEventType = sourceEvent.getType();
                switch (sourceEventType) {
                    case "m.room.message":
                        this.handleMessageDeletion(sourceEventId);
                        break;
                    case "m.reaction":
                        this.handleReactionDeletion(redactionEvent, sourceEventId);
                        break;
                }
            }
        }
    }

    private handleMessageDeletion(deletedMessageId: string) {
        const messageToUpdate = this.messages.get(deletedMessageId);
        if (messageToUpdate !== undefined) {
            messageToUpdate.markAsRemoved();
            this.removeEventContentInMemory(deletedMessageId);
        }
    }

    private handleReactionDeletion(redactionEvent: MatrixEvent, reactionEventId: string) {
        const reactionEventContent = this.inMemoryEventsContent.get(reactionEventId);
        const sender = redactionEvent.getSender();
        if (sender === undefined) {
            console.error("Redaction sender is undefined");
            return;
        }
        if (reactionEventContent === undefined) {
            console.error("No reaction event in memory to proceed deletion");
            return;
        }
        const relation = reactionEventContent["m.relates_to"];
        if (relation === undefined) {
            console.error("The event has no relation content,");
            return;
        }
        const reactionKey = relation.key;
        const reactionSourceMessageId = relation.event_id;
        if (reactionKey === undefined || reactionSourceMessageId === undefined) {
            console.error("Reaction (emoji) is undefined or event_id (message_id) is undefined");
            return;
        }
        const messageReaction = this.messageReactions.get(reactionSourceMessageId);
        if (messageReaction === undefined) {
            console.error("Unable to find the message reaction");
            return;
        }
        const chatReaction = messageReaction.get(reactionKey);
        if (chatReaction === undefined) {
            console.error("Unable to find the chat reaction");
            return;
        }
        chatReaction.removeUser(sender);
        this.inMemoryEventsContent.delete(reactionEventId);
    }

    private isEventReplacingExistingOne(event: MatrixEvent): boolean {
        const eventRelation = event.getRelation();
        return eventRelation?.rel_type === "m.replace";
    }

    async loadMorePreviousMessages() {
        if (get(this.hasPreviousMessage)) {
            const existingEventsBeforePagination = this.timelineWindow.getEvents();
            await this.timelineWindow.paginate(Direction.Backward, 8);
            this.timelineWindow.unpaginate(existingEventsBeforePagination.length, false);
            const tempMatrixChatMessages: Promise<MatrixChatMessage | undefined>[] = [];
            this.timelineWindow.getEvents().forEach((event) => {
                tempMatrixChatMessages.push(this.readEventsToAddMessagesAndReactions(event, this.messageReactions));
            });

            const result = await Promise.all(tempMatrixChatMessages);

            const messages = result.filter((message) => message !== undefined) as MatrixChatMessage[];
            this.messages.unshift(...messages);
            this.hasPreviousMessage.set(this.timelineWindow.canPaginate(Direction.Backward));
            if (messages.length === 0) {
                await this.loadMorePreviousMessages();
            }
        }
    }

    private getReactionEvent(event: MatrixEvent) {
        const relation = event.getRelation();
        if (relation) {
            if (relation.rel_type === "m.annotation") {
                const targetEventId = relation.event_id;
                const reactionKey = relation.key;
                if (targetEventId !== undefined && reactionKey !== undefined) {
                    return { messageId: targetEventId, reactionKey };
                }
            }
        }
        return;
    }

    setTimelineAsRead() {
        this.matrixRoom.setUnreadNotificationCount(NotificationCountType.Highlight, 0);
        this.matrixRoom.setUnreadNotificationCount(NotificationCountType.Total, 0);
        this.hasUnreadMessages.set(false);
        //TODO check doc with liveEvent
        this.matrixRoom.client
            .sendReadReceipt(this.matrixRoom.getLastLiveEvent() ?? null, ReceiptType.Read)
            .catch((error) => console.error(error));
    }

    sendMessage(message: string) {
        this.matrixRoom.client
            .sendMessage(this.matrixRoom.roomId, this.getMessageContent(message))
            .then(() => {
                selectedChatMessageToReply.set(null);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    private getMessageContent(message: string): RoomMessageEventContent {
        const content: RoomMessageEventContent = { body: message, msgtype: MsgType.Text, formatted_body: message };
        this.applyReplyContentIfReplyTo(content);
        return content;
    }

    private applyReplyContentIfReplyTo(content: IContent) {
        const selectedChatMessageIDToReply = get(selectedChatMessageToReply)?.id;
        if (selectedChatMessageIDToReply !== undefined) {
            content["m.relates_to"] = { "m.in_reply_to": { event_id: selectedChatMessageIDToReply } };
        }
    }

    async joinRoom(): Promise<void> {
        try {
            await this.matrixRoom.client.joinRoom(this.id);
            return;
        } catch (error) {
            Sentry.captureMessage("Failed to leave room");
            console.error("Unable to join", error);
            return Promise.reject(new Error("Failed to leave room"));
        }
    }

    async leaveRoom(): Promise<void> {
        try {
            await this.matrixRoom.client.leave(this.id);
            return;
        } catch (error) {
            Sentry.captureMessage("Failed to leave room");
            console.error("Unable to leave", error);
            throw new Error("Failed to leave room");
        }
    }
    async inviteUsers(userIds: string[]): Promise<void> {
        const userInvitationPromises = userIds.map((userId) => this.matrixRoom.client.invite(this.id, userId));
        try {
            await Promise.all(userInvitationPromises);
        } catch (error) {
            console.error(error);
            throw error;
        }
        return;
    }

    private getMatrixRoomType(): "direct" | "multiple" {
        const dmInviter = this.matrixRoom.getDMInviter();
        if (dmInviter) {
            return "direct";
        }

        const members = this.matrixRoom.getMembers();
        const isDirectBasedOnInviter = members.some((member) => member.getDMInviter() !== undefined);
        if (isDirectBasedOnInviter) {
            return "direct";
        }

        if (members.length > 2) {
            return "multiple";
        }

        const directRoomsPerUsers = this.matrixRoom.client.getAccountData(EventType.Direct)?.getContent();

        const isDirectBasedOnRoomData = members.some(
            (member) => directRoomsPerUsers && directRoomsPerUsers[member.userId]?.includes(this.id)
        );

        if (isDirectBasedOnRoomData) {
            return "direct";
        }

        return "multiple";
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
            const uploadResponse = await this.matrixRoom.client.uploadContent(file);
            const content: Omit<MediaEventContent, "info"> & {
                info: Partial<MediaEventInfo>;
                formatted_body?: string;
                "m.new_content"?: never;
                "m.relates_to"?: never;
            } = {
                body: file.name,
                formatted_body: file.name,
                info: {
                    size: file.size,
                },
                msgtype: this.getMessageTypeFromFile(file),
                url: uploadResponse.content_uri,

                // set more specifically later
            };
            this.applyReplyContentIfReplyTo(content);

            return this.matrixRoom.client.sendMessage(this.matrixRoom.roomId, content);
        } catch (error) {
            console.error(error);
            return;
        }
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
    setNotificationSilent(isSilent: boolean) {
        if (get(this.areNotificationsMuted) === isSilent) return;
        this.areNotificationsMuted.set(isSilent);
    }

    async muteNotification() {
        try {
            const roomRule = this.matrixRoom.client.getRoomPushRule("global", this.id);
            if (roomRule) {
                await this.matrixRoom.client.deletePushRule("global", PushRuleKind.RoomSpecific, this.id);
            }

            await this.matrixRoom.client.addPushRule("global", PushRuleKind.Override, this.id, {
                conditions: [
                    {
                        kind: ConditionKind.EventMatch,
                        key: "room_id",
                        pattern: this.id,
                    },
                ],
                actions: [PushRuleActionName.DontNotify],
            });
            this.areNotificationsMuted.set(true);
        } catch (error) {
            console.error("failed to mute notification");
            Sentry.captureMessage(`Failed to mute notification :${error}`);
        }
    }

    async unmuteNotification() {
        try {
            const overrideMuteRule = this.matrixRoom.client.pushRules?.global.override?.find(
                (rule) => rule.rule_id === this.id
            );
            if (overrideMuteRule) {
                await this.matrixRoom.client.deletePushRule("global", PushRuleKind.Override, overrideMuteRule.rule_id);
            }
            this.areNotificationsMuted.set(false);
        } catch (error) {
            console.error("failed to mute notification");
            Sentry.captureMessage(`Failed to mute notification :${error}`);
        }
    }

    destroy() {
        //eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.matrixRoom.off(RoomEvent.Timeline, this.handleRoomTimeline);
        this.matrixRoom.off(RoomEvent.Name, this.handleRoomName);
        this.matrixRoom.off(RoomEvent.Redaction, this.handleRoomRedaction);
        this.matrixRoom.off(RoomStateEvent.Events, this.handleStateEvent);
    }

    startTyping(): Promise<object> {
        const isTypingTime = 30000;
        return this.matrixRoom.client.sendTyping(this.id, true, isTypingTime);
    }

    stopTyping(): Promise<object> {
        const isTypingTime = 30000;
        return this.matrixRoom.client.sendTyping(this.id, false, isTypingTime);
    }

    public get lastMessageTimestamp(): number {
        return this.matrixRoom.getLastActiveTimestamp();
    }
}
