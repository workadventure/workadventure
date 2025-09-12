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
    RoomMember,
    RoomState,
    RoomStateEvent,
    TimelineWindow,
    StateEvents,
    EventTimeline,
} from "matrix-js-sdk";
import * as Sentry from "@sentry/svelte";
import { derived, get, readable, Readable, Writable, writable } from "svelte/store";
import { MediaEventContent, MediaEventInfo } from "matrix-js-sdk/lib/@types/media";
import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import {
    ChatPermissionLevel,
    ChatRoom,
    ChatRoomMember,
    ChatRoomMembership,
    ChatRoomMembershipManagement,
    ChatRoomModeration,
    ChatRoomNotificationControl,
    memberTypingInformation,
} from "../ChatConnection";
import { isAChatRoomIsVisible, navChat, selectedChatMessageToReply, botsChatIds } from "../../Stores/ChatStore";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { MessageNotification } from "../../../Notification/MessageNotification";
import { notificationManager } from "../../../Notification/NotificationManager";
import { MatrixChatMessage } from "./MatrixChatMessage";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import { matrixSecurity } from "./MatrixSecurity";
import { MatrixChatRoomMember } from "./MatrixChatRoomMember";

type EventId = string;

type ModerationAction = "ban" | "kick" | "invite" | "redact";

export class MatrixChatRoom
    implements ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration, ChatRoomNotificationControl
{
    readonly id: string;
    readonly name: Writable<string>;
    readonly type: "multiple" | "direct";
    readonly hasUnreadMessages: Writable<boolean>;
    avatarUrl: string | undefined;
    messages: SearchableArrayStore<string, MatrixChatMessage>;
    members: Writable<MatrixChatRoomMember[]>;
    myMembership: Writable<ChatRoomMembership>;
    hasPreviousMessage: Writable<boolean>;
    timelineWindow: TimelineWindow;
    inMemoryEventsContent: Map<EventId, IContent>;
    isEncrypted!: Writable<boolean>;
    typingMembers: Readable<Array<{ id: string; name: string | null; avatarUrl: string | null }>>;
    isRoomFolder = false;
    areNotificationsMuted = writable(false);
    currentRoomMember: Readable<MatrixChatRoomMember>;
    private notSentEvents: MapStore<string, MatrixEvent> = new MapStore<string, MatrixEvent>();
    shouldRetrySendingEvents = derived(this.notSentEvents, (notSentEvents) => notSentEvents.size > 0);

    private handleRoomTimeline = this.onRoomTimeline.bind(this);
    private handleRoomName = this.onRoomName.bind(this);
    private handleRoomRedaction = this.onRoomRedaction.bind(this);
    private handleStateEvent = this.onRoomStateEvent.bind(this);
    private handleNewMember = this.onRoomNewMember.bind(this);
    private handleMyMembership = this.onRoomMyMembership.bind(this);

    constructor(
        private matrixRoom: Room,
        private notifyNewMessage = (message: MatrixChatMessage) => {
            if (!localUserStore.getChatSounds() || get(this.areNotificationsMuted)) return;
            gameManager.getCurrentGameScene().playSound("new-message");
            notificationManager.createNotification(
                new MessageNotification(
                    message.sender?.username ?? "unknown",
                    get(message.content).body,
                    this.id,
                    get(this.name)
                )
            );
        }
    ) {
        this.id = matrixRoom.roomId;
        this.name = writable(matrixRoom.name);
        this.type = this.getMatrixRoomType();
        this.hasUnreadMessages = writable(matrixRoom.getUnreadNotificationCount() > 0);
        this.avatarUrl = matrixRoom.getAvatarUrl(matrixRoom.client.baseUrl, 24, 24, "scale") ?? undefined;
        this.messages = new SearchableArrayStore((item: MatrixChatMessage) => item.id);
        this.sendMessage = this.sendMessage.bind(this);
        this.myMembership = writable(matrixRoom.getMyMembership());

        this.members = writable([
            ...matrixRoom
                .getMembers()
                .map((member) => new MatrixChatRoomMember(member, this.matrixRoom.client.baseUrl)),
        ]);

        this.hasPreviousMessage = writable(false);

        this.currentRoomMember = derived(
            this.members,
            (members) => members.filter((member) => member.id === this.matrixRoom.myUserId)[0]
        );

        this.timelineWindow = new TimelineWindow(matrixRoom.client, matrixRoom.getLiveTimeline().getTimelineSet());
        this.isEncrypted = writable(matrixRoom.hasEncryptionStateEvent());

        this.typingMembers = derived(
            get(this.members).map((member) => member.isTypingInformation),
            (membersInformation) => {
                return membersInformation.filter(
                    (member) => member !== null && member.id !== this.matrixRoom.client.getUserId()
                ) as memberTypingInformation[];
            }
        );
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
                Sentry.captureMessage(`Failed to init Matrix room messages : ${error}`);
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
            decryptMessagesPromises.push(this.readEventsToAddMessagesAndReactions(event, this.messages));
        });

        const result = await Promise.all(decryptMessagesPromises);
        const messages = result.filter((message) => message !== undefined);
        this.messages.push(...messages);
        this.hasPreviousMessage.set(this.timelineWindow.canPaginate(Direction.Backward));
    }

    private async readEventsToAddMessagesAndReactions(
        event: MatrixEvent,
        messages: SearchableArrayStore<string, MatrixChatMessage>
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
            this.handleNewMessageReaction(event, messages);
            this.addEventContentInMemory(event);
        }
        return undefined;
    }

    private startHandlingChatRoomEvents() {
        this.matrixRoom.on(RoomEvent.Timeline, this.handleRoomTimeline);
        this.matrixRoom.on(RoomEvent.Name, this.handleRoomName);
        this.matrixRoom.on(RoomEvent.Redaction, this.handleRoomRedaction);
        this.matrixRoom.on(RoomStateEvent.Events, this.handleStateEvent);
        this.matrixRoom.on(RoomEvent.MyMembership, this.handleMyMembership);
        this.matrixRoom.on(RoomStateEvent.NewMember, this.handleNewMember);
    }

    protected onRoomMyMembership(room: Room) {
        this.myMembership.set(room.getMyMembership());
    }

    private onRoomNewMember(event: MatrixEvent, state: RoomState, member: RoomMember) {
        this.members.update((members) => [
            ...members,
            new MatrixChatRoomMember(member, this.matrixRoom.client.baseUrl),
        ]);
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
                    const eventId = event.getId();

                    if (event.status === EventStatus.NOT_SENT) {
                        if (eventId && !this.notSentEvents.has(eventId)) {
                            this.notSentEvents.set(eventId, event);
                        }
                        return;
                    }

                    if (eventId && this.notSentEvents.has(eventId)) {
                        this.notSentEvents.delete(eventId);
                    }

                    if (this.isEventReplacingExistingOne(event)) {
                        this.handleMessageModification(event);
                    } else {
                        this.handleNewMessage(event);
                    }
                }
                if (event.getType() === "m.reaction") {
                    this.handleNewMessageReaction(event, this.messages);
                }
            })().catch((error) => console.error(error));
        }
    }

    public async retrySendingEvents(): Promise<void> {
        if (this.notSentEvents.size === 0) return Promise.resolve();

        const promises = Array.from(this.notSentEvents.values()).map((event) => {
            const eventId = event.getId();
            return this.matrixRoom.client
                .resendEvent(event, this.matrixRoom)
                .catch((error: unknown) => {
                    this.matrixRoom.client.cancelPendingEvent(event);
                    console.error("Failed to resend event", eventId, error);
                    Sentry.captureException(error);
                })
                .finally(() => {
                    if (eventId) {
                        this.notSentEvents.delete(eventId);
                    }
                });
        });

        await Promise.allSettled(promises);
    }

    private onRoomName(room: Room) {
        this.name.set(room.name);
    }

    private onRoomRedaction(event: MatrixEvent) {
        this.handleDeletion(event);
    }

    private handleNewMessage(event: MatrixEvent) {
        const message = new MatrixChatMessage(event, this.matrixRoom);
        this.messages.push(message);
        const senderID = event.getSender();
        if (senderID) {
            if (get(botsChatIds).includes(senderID)) {
                return;
            }
        }
        if (senderID !== this.matrixRoom.client.getSafeUserId() && !get(this.areNotificationsMuted)) {
            this.notifyNewMessage(message);
            if (!isAChatRoomIsVisible() && get(selectedRoomStore)?.id !== "proximity") {
                selectedRoomStore.set(this);
                navChat.switchToChat();
            }
        }

        this.addEventContentInMemory(event);
    }

    private handleNewMessageReaction(event: MatrixEvent, messages: SearchableArrayStore<string, MatrixChatMessage>) {
        const reactionEvent = this.getReactionEvent(event);

        if (reactionEvent !== undefined) {
            this.addEventContentInMemory(event);
            const { messageId, reactionKey } = reactionEvent;
            const existingMessageWithReactions = messages.get(messageId);
            if (existingMessageWithReactions) {
                const existingMessageReaction = existingMessageWithReactions.reactions.get(reactionKey);
                if (existingMessageReaction) {
                    existingMessageReaction.addUser(event.getSender(), event.getId());
                    return;
                }
                existingMessageWithReactions.reactions.set(
                    reactionKey,
                    new MatrixChatMessageReaction(this.matrixRoom, event)
                );
                return;
            }
            //TODO : voir si reaction arrive avant le message
            // const newMessageReactionMap = new MapStore<string, MatrixChatMessageReaction>();
            // newMessageReactionMap.set(reactionKey, new MatrixChatMessageReaction(this.matrixRoom, event));
            // messages.reactions.set(messageId, newMessageReactionMap);
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

        const messageReaction = this.messages.get(reactionSourceMessageId)?.reactions;
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
                tempMatrixChatMessages.push(this.readEventsToAddMessagesAndReactions(event, this.messages));
            });

            const result = await Promise.all(tempMatrixChatMessages);

            const messages = result.filter((message) => message !== undefined);
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
        this.matrixRoom.off(RoomEvent.Timeline, this.handleRoomTimeline);
        this.matrixRoom.off(RoomEvent.Name, this.handleRoomName);
        this.matrixRoom.off(RoomEvent.Redaction, this.handleRoomRedaction);
        this.matrixRoom.off(RoomStateEvent.Events, this.handleStateEvent);
        this.matrixRoom.off(RoomStateEvent.NewMember, this.handleNewMember);
        get(this.members).forEach((member) => {
            member.destroy();
        });
        this.messages.forEach((message) => {
            message.relations?.destroy();
        });
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

    public hasPermissionTo(action: ModerationAction, member?: ChatRoomMember): Readable<boolean> {
        const otherUserPermissionLevel = member ? member.permissionLevel : readable(ChatPermissionLevel.USER);

        return derived(
            [get(this.currentRoomMember).permissionLevel, otherUserPermissionLevel],
            ([$currentRoomPermission, $otherUserPermission]) => {
                if (!$currentRoomPermission) return false;

                const currentRoomMemberPowerLevel = MatrixChatRoomMember.getPowerLevel($currentRoomPermission);
                const otherUserPowerLevel = MatrixChatRoomMember.getPowerLevel($otherUserPermission);

                const hasSufficientPowerLevel =
                    this.matrixRoom
                        .getLiveTimeline()
                        .getState(Direction.Backward)
                        ?.hasSufficientPowerLevelFor(action, currentRoomMemberPowerLevel) ?? false;

                return hasSufficientPowerLevel && currentRoomMemberPowerLevel > otherUserPowerLevel;
            }
        );
    }

    public hasPermissionForRoomStateEvent(eventType: keyof StateEvents): Readable<boolean> {
        return derived([get(this.currentRoomMember).permissionLevel], () => {
            return (
                this.matrixRoom
                    .getLiveTimeline()
                    .getState(EventTimeline.FORWARDS)
                    ?.maySendStateEvent(eventType, this.matrixRoom.client.getSafeUserId()) ?? false
            );
        });
    }

    public async changePermissionLevelFor(member: ChatRoomMember, permissionLevel: ChatPermissionLevel): Promise<void> {
        try {
            await this.matrixRoom.refreshLiveTimeline();

            const roomPowerLevelsState = this.matrixRoom
                .getLiveTimeline()
                .getState(Direction.Backward)
                ?.getStateEvents(EventType.RoomPowerLevels);

            if (!roomPowerLevelsState || roomPowerLevelsState.length === 0) {
                console.error("No room power levels state found");
                return;
            }

            const currentContent = roomPowerLevelsState[0].getContent();
            const newRoomPowerLevelsState = {
                ...currentContent,
                users: {
                    ...currentContent.users,
                    [member.id]: MatrixChatRoomMember.getPowerLevel(permissionLevel),
                },
            };

            await this.matrixRoom.client.sendStateEvent(this.id, EventType.RoomPowerLevels, newRoomPowerLevelsState);
        } catch (e) {
            console.error("Failed to change permission level : " + e);
            Sentry.captureMessage(`Failed to change Permission Level : ${e}`);
        }
    }

    public getAllowedRolesToAssign(): ChatPermissionLevel[] {
        const allowedRolesToAssign: ChatPermissionLevel[] = [];

        const currentRoomMemberPermissionLevel = get(get(this.currentRoomMember).permissionLevel);

        const currentRoomMemberPowerLevel = MatrixChatRoomMember.getPowerLevel(currentRoomMemberPermissionLevel);

        for (const permissionLevel of Object.values(ChatPermissionLevel)) {
            const permissionLevelPower = MatrixChatRoomMember.getPowerLevel(permissionLevel as ChatPermissionLevel);

            if (currentRoomMemberPowerLevel >= permissionLevelPower) {
                allowedRolesToAssign.push(permissionLevel as ChatPermissionLevel);
            }
        }

        return allowedRolesToAssign;
    }

    public canModifyRoleOf(permissionLevel?: ChatPermissionLevel): boolean {
        const currentRoomMemberPermissionLevel = get(get(this.currentRoomMember).permissionLevel);
        const currentRoomMemberPowerLevel = MatrixChatRoomMember.getPowerLevel(currentRoomMemberPermissionLevel);
        const memberPowerLevel = permissionLevel ? MatrixChatRoomMember.getPowerLevel(permissionLevel) : 0;

        const canModifyRoleOfThisMember = currentRoomMemberPowerLevel > memberPowerLevel;

        return canModifyRoleOfThisMember && currentRoomMemberPermissionLevel === ChatPermissionLevel.ADMIN;
    }

    public async kick(userID: string, reason?: string): Promise<void> {
        await this.matrixRoom.client.kick(this.id, userID, reason);
    }
    public async ban(userID: string, reason?: string): Promise<void> {
        await this.matrixRoom.client.ban(this.id, userID, reason);
    }
    public async unban(userID: string): Promise<void> {
        await this.matrixRoom.client.unban(this.id, userID);
    }

    public async getMessageById(messageId: string): Promise<MatrixChatMessage | undefined> {
        const message = this.messages.get(messageId);
        if (message) {
            return message;
        }
        const timeline = await this.matrixRoom.client.getEventTimeline(
            this.matrixRoom.getUnfilteredTimelineSet(),
            messageId
        );
        const event = timeline?.getEvents().find((ev) => ev.getId() === messageId);
        if (event) {
            return new MatrixChatMessage(event, this.matrixRoom);
        }
        return;
    }
}
