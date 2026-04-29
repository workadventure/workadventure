import type {
    IContent,
    IPushRule,
    IRoomTimelineData,
    MatrixEvent,
    Room,
    RoomMember,
    RoomState,
    StateEvents,
} from "matrix-js-sdk";
import {
    ConditionKind,
    Direction,
    EventStatus,
    EventType,
    MsgType,
    NotificationCountType,
    PushRuleActionName,
    PushRuleKind,
    ReceiptType,
    RoomMemberEvent,
    RoomEvent,
    RoomStateEvent,
    TimelineWindow,
    EventTimeline,
} from "matrix-js-sdk";
import { KnownMembership } from "matrix-js-sdk/lib/@types/membership";
import type { Readable, Writable } from "svelte/store";
import { derived, get, readable, readonly, writable } from "svelte/store";
import type { MediaEventContent, MediaEventInfo } from "matrix-js-sdk/lib/@types/media";
import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import Debug from "debug";
import type {
    ChatRoom,
    ChatRoomInitializationState,
    ChatRoomMember,
    ChatRoomMembership,
    ChatRoomMembershipManagement,
    ChatRoomModeration,
    ChatRoomNotificationControl,
    memberTypingInformation,
} from "../ChatConnection";
import { ChatPermissionLevel } from "../ChatConnection";
import { isAChatRoomIsVisible, navChat, selectedChatMessageToReply, botsChatIds } from "../../Stores/ChatStore";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { MessageNotification } from "../../../Notification/MessageNotification";
import { notificationManager } from "../../../Notification/NotificationManager";
import type { LazyPictureStore, PictureStore } from "../../../Stores/PictureStore";
import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
import { chatVisibilityStore } from "../../../Stores/ChatStore";
import type { UserProviderMerger } from "../../UserProviderMerger/UserProviderMerger";
import { MatrixChatMessage } from "./MatrixChatMessage";
import { MatrixChatMessageReaction } from "./MatrixChatMessageReaction";
import { matrixSecurity } from "./MatrixSecurity";
import { hasValidViaEntries } from "./MatrixSpaceRelations";
import { resolveChatUserColor } from "./services/WaMatrixProfileService";
import { MatrixChatRoomMember } from "./MatrixChatRoomMember";
import { matrixAvatarProfile } from "./services/MatrixAvatarProfile";

type EventId = string;

type ModerationAction = "ban" | "kick" | "invite" | "redact";

const debug = Debug("MatrixChatRoom");

export class MatrixChatRoom
    implements ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration, ChatRoomNotificationControl
{
    readonly id: string;
    readonly name: Writable<string>;
    private readonly roomTypeStore: Writable<"multiple" | "direct">;
    readonly type: Readable<"multiple" | "direct">;
    readonly hasUnreadMessages: Writable<boolean>;
    readonly unreadNotificationCount: Writable<number>;
    readonly initializationState: Writable<ChatRoomInitializationState> = writable("idle");
    readonly initializationError: Writable<Error | undefined> = writable(undefined);
    pictureStore: LazyPictureStore;
    readonly avatarFallbackColor: Readable<string | undefined>;
    messages: SearchableArrayStore<string, MatrixChatMessage>;
    members: Writable<MatrixChatRoomMember[]>;
    /** Same stores as {@link members}, for {@link ChatRoom.membersForMessageAvatars} (timeline avatars). */
    readonly membersForMessageAvatars: Readable<readonly ChatRoomMember[]>;
    readonly peerWaDisplayNameIfDifferent: Readable<string | undefined>;
    myMembership: Writable<ChatRoomMembership>;
    hasPreviousMessage: Writable<boolean>;
    timelineWindow: TimelineWindow;
    inMemoryEventsContent: Map<EventId, IContent>;
    isEncrypted!: Writable<boolean>;
    typingMembers: Readable<Array<{ id: string; name: string | null; pictureStore: PictureStore }>>;
    isRoomFolder = false;
    areNotificationsMuted = writable(false);
    currentRoomMember: Readable<MatrixChatRoomMember | undefined>;
    readonly isCurrentUserRoomAdmin: Readable<boolean>;
    private notSentEvents: MapStore<string, MatrixEvent> = new MapStore<string, MatrixEvent>();
    shouldRetrySendingEvents = derived(this.notSentEvents, (notSentEvents) => notSentEvents.size > 0);

    private handleRoomTimeline = this.onRoomTimeline.bind(this);
    private handleRoomName = this.onRoomName.bind(this);
    private handleRoomRedaction = this.onRoomRedaction.bind(this);
    private handleStateEvent = this.onRoomStateEvent.bind(this);
    private handleNewMember = this.onRoomNewMember.bind(this);
    private handleRoomStateMembers = this.onRoomStateMembers.bind(this);
    private handleMyMembership = this.onRoomMyMembership.bind(this);
    private updateUnreadNotificationCount = this.onRoomUpdateUnreadNotificationCount.bind(this);
    /**
     * Filled when {@link gameManager.getCurrentGameScene().userProviderMerger} resolves.
     * Reactive so DM {@link avatarFallbackColor} recomputes when the merger was not ready at construction time.
     */
    private readonly userProviderMergerStore = writable<UserProviderMerger | undefined>(undefined);
    private dmMergerUsersByRoomUnsub: (() => void) | undefined;
    private dmMergerRoomTypeUnsub: (() => void) | undefined;
    private initializationPromise: Promise<void> | undefined;
    private membersInitializationPromise: Promise<void> | undefined;
    private membersInitialized = false;
    private initializedEventHandlersStarted = false;
    private directRoomPeerAvatarStore: LazyPictureStore | undefined;
    private directRoomPeerAvatarMember: RoomMember | undefined;
    // Keep full MatrixChatRoomMember objects lazy. Space-level UI permissions still need the current user's
    // power level before a room is opened, so we only observe the Matrix SDK RoomMember without avatar/profile work.
    private currentUserRoomMember: RoomMember | undefined;
    private currentUserPermissionLevel: Writable<ChatPermissionLevel | undefined> = writable(undefined);
    private handleCurrentUserRoomMemberPowerLevel = this.onCurrentUserRoomMemberPowerLevel.bind(this);

    constructor(
        private matrixRoom: Room,
        private notifyNewMessage = (message: MatrixChatMessage) => {
            // Only notify for "live" messages (after initial sync). Avoids notifying for messages loaded on room open (plan: live vs historical).
            if (!this.matrixRoom.client.isInitialSyncComplete()) {
                return;
            }

            const canPlaySound = localUserStore.getChatSounds();
            const isRoomIsDisplayed = get(selectedRoomStore)?.id === this.id && get(chatVisibilityStore);
            const isNotificationIsMuted = get(this.areNotificationsMuted);
            if (canPlaySound && !isRoomIsDisplayed && !isNotificationIsMuted) {
                gameManager.getCurrentGameScene().playSound("new-message");
            }

            if (isNotificationIsMuted || isRoomIsDisplayed) {
                return;
            }

            const messageBody = get(message.content).body;
            const username = message.sender?.username ?? "unknown";
            const roomName = get(this.name);

            notificationManager.createNotification(new MessageNotification(username, messageBody, this.id, roomName));

            // Show proximity notification when unread count increases
            const numberOfChar = 60;
            const messageToDisplay =
                messageBody.length > numberOfChar ? messageBody.slice(0, numberOfChar) + "..." : messageBody;
            chatNotificationStore.addNotification(username, messageToDisplay, this, message.id);
        }
    ) {
        this.id = matrixRoom.roomId;
        this.name = writable(matrixRoom.name);
        this.roomTypeStore = writable(this.getMatrixRoomType());
        this.type = readonly(this.roomTypeStore);
        this.hasUnreadMessages = writable(matrixRoom.getUnreadNotificationCount() > 0);
        this.unreadNotificationCount = writable(matrixRoom.getUnreadNotificationCount());
        const roomAvatarStore: PictureStore = readable(
            matrixRoom.getAvatarUrl(matrixRoom.client.baseUrl, 24, 24, "scale") ?? undefined
        );
        this.messages = new SearchableArrayStore((item: MatrixChatMessage) => item.id);
        this.sendMessage = this.sendMessage.bind(this);
        this.myMembership = writable(matrixRoom.getMyMembership());
        this.setCurrentUserRoomMember(matrixRoom.getMember(matrixRoom.client.getSafeUserId()) ?? undefined);

        this.members = writable([]);
        this.membersForMessageAvatars = this.members;
        this.directRoomPeerAvatarMember = this.getDirectRoomPeerRoomMember();
        if (this.directRoomPeerAvatarMember) {
            this.directRoomPeerAvatarStore = matrixAvatarProfile.createLazyAvatarStore(
                this.directRoomPeerAvatarMember.userId,
                () =>
                    matrixAvatarProfile.resolveAvatarUrl(
                        this.directRoomPeerAvatarMember!.userId,
                        this.directRoomPeerAvatarMember!,
                        this.matrixRoom.client.baseUrl,
                        this.matrixRoom.client,
                        get(this.userProviderMergerStore)
                    )
            );
        }

        /** Channel: room avatar. DM: room avatar or peer Matrix avatar, with load delegated to the peer lazy store. */
        const roomPictureStore = derived(
            [this.roomTypeStore, roomAvatarStore],
            ([roomType, roomAvatar], set: (value: string | undefined) => void) => {
                if (roomType !== "direct") {
                    set(roomAvatar);
                    return;
                }
                if (!this.directRoomPeerAvatarStore) {
                    set(roomAvatar);
                    return;
                }
                if (roomAvatar) {
                    set(roomAvatar);
                    return;
                }
                return this.directRoomPeerAvatarStore.subscribe(set);
            },
            undefined
        );
        this.pictureStore = {
            subscribe: roomPictureStore.subscribe,
            load: async () => {
                if (!get(roomAvatarStore) && this.directRoomPeerAvatarStore) {
                    await this.directRoomPeerAvatarStore.load();
                }
            },
            refresh: async () => {
                if (!get(roomAvatarStore) && this.directRoomPeerAvatarStore) {
                    await this.directRoomPeerAvatarStore.refresh();
                }
            },
            invalidate: () => {
                if (!get(roomAvatarStore) && this.directRoomPeerAvatarStore) {
                    this.directRoomPeerAvatarStore.invalidate();
                }
            },
        };

        this.avatarFallbackColor = derived([this.roomTypeStore, this.userProviderMergerStore], ([roomType, merger]) => {
            if (roomType !== "direct") {
                return undefined;
            }
            const other = this.directRoomPeerAvatarMember;
            if (!other) {
                return undefined;
            }
            let mergerColor: string | undefined;
            if (merger) {
                const byRoom = get(merger.usersByRoomStore);
                for (const [, { users }] of byRoom) {
                    const u = users.find((user) => user.chatId === other.userId);
                    if (u?.color) {
                        mergerColor = u.color;
                        break;
                    }
                }
            }
            return resolveChatUserColor(other.userId, mergerColor, this.matrixRoom.client);
        });

        this.peerWaDisplayNameIfDifferent = derived(
            [this.roomTypeStore, this.members],
            ([roomType, members], set: (value: string | undefined) => void) => {
                if (roomType !== "direct") {
                    set(undefined);
                    return () => {};
                }
                const myUserId = this.matrixRoom.client.getUserId();
                const other = members.find((m) => m.id !== myUserId);
                if (!other) {
                    set(undefined);
                    return () => {};
                }
                return other.waDisplayNameIfDifferent.subscribe((v) => set(v));
            },
            undefined as string | undefined
        );

        this.hasPreviousMessage = writable(false);

        this.currentRoomMember = derived(
            this.members,
            (members) => members.filter((member) => member.id === this.matrixRoom.myUserId)[0]
        );

        this.isCurrentUserRoomAdmin = derived(
            this.members,
            (members, set) => {
                const me = members.find((m) => m.id === this.matrixRoom.myUserId);
                if (!me) {
                    set(false);
                    return () => {};
                }
                return me.permissionLevel.subscribe((level) => {
                    set(level === ChatPermissionLevel.ADMIN);
                });
            },
            false
        );

        this.timelineWindow = new TimelineWindow(matrixRoom.client, matrixRoom.getLiveTimeline().getTimelineSet());
        this.isEncrypted = writable(matrixRoom.hasEncryptionStateEvent());

        this.typingMembers = derived(
            this.members,
            (members, set: (value: memberTypingInformation[]) => void) => {
                const typingByUser = new Map<string, memberTypingInformation>();
                const sync = () => set(Array.from(typingByUser.values()));
                const unsubscribers = members.map((member) =>
                    member.isTypingInformation.subscribe((memberInformation) => {
                        if (memberInformation && memberInformation.id !== this.matrixRoom.client.getUserId()) {
                            typingByUser.set(memberInformation.id, memberInformation);
                        } else {
                            typingByUser.delete(member.id);
                        }
                        sync();
                    })
                );
                sync();
                return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
            },
            []
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

        this.startHandlingChatRoomShellEvents();

        gameManager
            .getCurrentGameScene()
            .userProviderMerger.then((merger) => {
                this.userProviderMergerStore.set(merger);
                get(this.members).forEach((m) => m.setUserProviderMergerContext(merger));

                const syncDmMergerAvatarSub = () => {
                    this.dmMergerUsersByRoomUnsub?.();
                    this.dmMergerUsersByRoomUnsub = undefined;
                    if (get(this.roomTypeStore) !== "direct") {
                        return;
                    }
                    this.dmMergerUsersByRoomUnsub = merger.usersByRoomStore.subscribe(() => {
                        this.directRoomPeerAvatarStore?.refresh().catch((error) => {
                            console.warn("Failed to refresh Matrix direct room avatar", error);
                        });
                        const myUserId = this.matrixRoom.client.getUserId();
                        get(this.members)
                            .filter((mem) => mem.id !== myUserId)
                            .forEach((mem) => mem.refreshAvatarFromRoomMember());
                    });
                };
                syncDmMergerAvatarSub();
                this.dmMergerRoomTypeUnsub?.();
                this.dmMergerRoomTypeUnsub = this.roomTypeStore.subscribe(syncDmMergerAvatarSub);
            })
            .catch(() => {
                /* chat list can work without merger */
            });

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

    async ensureInitialized(): Promise<void> {
        return this.ensureTimelineInitialized();
    }

    async ensureMembersInitialized(): Promise<void> {
        if (this.membersInitialized) {
            return;
        }
        if (this.membersInitializationPromise) {
            return this.membersInitializationPromise;
        }

        this.debugInitialization("members");
        this.membersInitializationPromise = Promise.resolve()
            .then(() => {
                this.initializeMembers();
                this.startHandlingChatRoomInitializedEvents();
                this.membersInitialized = true;
            })
            .catch((error: unknown) => {
                this.membersInitializationPromise = undefined;
                throw error;
            });

        return this.membersInitializationPromise;
    }

    async ensureTimelineInitialized(): Promise<void> {
        if (get(this.initializationState) === "ready") {
            return;
        }
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationState.set("loading");
        this.initializationError.set(undefined);
        this.debugInitialization("timeline");
        this.initializationPromise = (async () => {
            await this.ensureMembersInitialized();
            await matrixSecurity.restoreRoomsMessages();
            await this.initMatrixRoomMessagesAndReactions();
            this.initializationState.set("ready");
        })().catch((error: unknown) => {
            const initializationError = error instanceof Error ? error : new Error(String(error));
            this.initializationError.set(initializationError);
            this.initializationState.set("error");
            this.initializationPromise = undefined;
            throw initializationError;
        });

        return this.initializationPromise;
    }

    private debugInitialization(type: "members" | "timeline"): void {
        debug("init %s room=%s roomId=%s", type, get(this.name), this.id);
    }

    private initializeMembers(): void {
        if (get(this.members).length > 0) {
            return;
        }
        const merger = get(this.userProviderMergerStore);
        const members = this.matrixRoom.getMembers().map((member) => {
            const wrappedMember = new MatrixChatRoomMember(
                member,
                this.matrixRoom.client.baseUrl,
                this.matrixRoom.client
            );
            if (merger) {
                wrappedMember.setUserProviderMergerContext(merger);
            }
            return wrappedMember;
        });
        this.members.set(members);
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
        const messages = result.filter((message): message is MatrixChatMessage => message !== undefined);
        this.messages.push(...messages);
        this.hasPreviousMessage.set(this.timelineWindow.canPaginate(Direction.Backward));
    }

    private getDirectRoomPeerRoomMember(): RoomMember | undefined {
        if (get(this.roomTypeStore) !== "direct") {
            return undefined;
        }
        const myUserId = this.matrixRoom.client.getUserId();
        return this.getMembersForRoomTypeHeuristics().find((member) => member.userId !== myUserId);
    }

    private async readEventsToAddMessagesAndReactions(
        event: MatrixEvent,
        messages: SearchableArrayStore<string, MatrixChatMessage>
    ): Promise<MatrixChatMessage | undefined> {
        if (event.isEncrypted()) {
            await this.matrixRoom.client.decryptEventIfNeeded(event).catch(() => {
                console.error("Failed to decrypt");
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

    private startHandlingChatRoomShellEvents() {
        this.matrixRoom.on(RoomEvent.Timeline, this.handleRoomTimeline);
        this.matrixRoom.on(RoomEvent.Name, this.handleRoomName);
        this.matrixRoom.on(RoomStateEvent.Events, this.handleStateEvent);
        this.matrixRoom.on(RoomEvent.MyMembership, this.handleMyMembership);
        this.matrixRoom.on(RoomEvent.UnreadNotifications, this.updateUnreadNotificationCount);
        this.matrixRoom.currentState.on(RoomStateEvent.Members, this.handleRoomStateMembers);
    }

    private startHandlingChatRoomInitializedEvents() {
        if (this.initializedEventHandlersStarted) {
            return;
        }
        this.initializedEventHandlersStarted = true;
        this.matrixRoom.on(RoomEvent.Redaction, this.handleRoomRedaction);
        this.matrixRoom.on(RoomStateEvent.NewMember, this.handleNewMember);
    }

    protected onRoomMyMembership(room: Room) {
        this.myMembership.set(room.getMyMembership());
        this.refreshRoomType();
    }

    private onRoomNewMember(event: MatrixEvent, state: RoomState, member: RoomMember) {
        const newWrapper = new MatrixChatRoomMember(member, this.matrixRoom.client.baseUrl, this.matrixRoom.client);
        const merger = get(this.userProviderMergerStore);
        if (merger) {
            newWrapper.setUserProviderMergerContext(merger);
        }
        this.members.update((members) => [...members, newWrapper]);
        this.refreshRoomType();
    }

    /** Room member state updates (e.g. avatar_url) without a separate RoomMember "name" event. */
    private onRoomStateMembers(event: MatrixEvent, _state: RoomState, member: RoomMember) {
        if (event.getType() !== EventType.RoomMember) {
            return;
        }
        this.refreshRoomType();
        const myUserId = this.matrixRoom.client.getUserId();
        if (member.userId === myUserId) {
            this.setCurrentUserRoomMember(member);
            return;
        }
        if (member.userId === this.directRoomPeerAvatarMember?.userId) {
            this.directRoomPeerAvatarMember = member;
            this.directRoomPeerAvatarStore?.invalidate();
        }
        get(this.members)
            .filter((m) => m.id === member.userId)
            .forEach((m) => m.refreshAvatarFromRoomMember());
    }
    private onRoomStateEvent(event: MatrixEvent, state: RoomState, lastStateEvent: MatrixEvent | null) {
        if (event.getType() === EventType.SpaceParent) {
            this.refreshRoomType();
        }
        if (get(this.isEncrypted)) return;
        const isEncrypted = !!state.getStateEvents(EventType.RoomEncryption)[0];
        if (isEncrypted) this.isEncrypted.set(isEncrypted);
    }
    /**
     * Strict "newly arrived" rule (see Element Web / matrix-js-sdk): only treat as live when
     * !removed, data.liveEvent === true, and !toStartOfTimeline. Use this for notifications,
     * unread, and any reaction to "new" timeline events.
     */
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
        if (removed) {
            return;
        }
        // Event age when it arrived at the device; defensive guard for delayed sync (source of truth remains data.liveEvent).
        const ageOfEvent = event.getAge();
        if (
            !MatrixChatRoom.isNewLiveTimelineEvent(removed, data, toStartOfTimeline) ||
            (ageOfEvent !== undefined && ageOfEvent >= 2000)
        ) {
            return;
        }

        if (room !== undefined) {
            (async () => {
                if (event.isEncrypted()) {
                    await this.matrixRoom.client.decryptEventIfNeeded(event);
                }
                this.hasUnreadMessages.set(room.getUnreadNotificationCount() > 0);
                this.unreadNotificationCount.set(room.getUnreadNotificationCount());
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

    private onRoomUpdateUnreadNotificationCount(
        unreadNotifications?: Partial<Record<NotificationCountType, number>>,
        threadId?: string
    ) {
        this.hasUnreadMessages.set(this.matrixRoom.getUnreadNotificationCount() > 0);
        this.unreadNotificationCount.set(this.matrixRoom.getUnreadNotificationCount());
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
        await this.ensureTimelineInitialized();
        if (get(this.hasPreviousMessage)) {
            const existingEventsBeforePagination = this.timelineWindow.getEvents();
            await this.timelineWindow.paginate(Direction.Backward, 8);
            this.timelineWindow.unpaginate(existingEventsBeforePagination.length, false);
            const tempMatrixChatMessages: Promise<MatrixChatMessage | undefined>[] = [];
            this.timelineWindow.getEvents().forEach((event) => {
                tempMatrixChatMessages.push(this.readEventsToAddMessagesAndReactions(event, this.messages));
            });

            const result = await Promise.all(tempMatrixChatMessages);

            const messages = result.filter((message): message is MatrixChatMessage => message !== undefined);
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
        this.unreadNotificationCount.set(0);
        // Read receipt must target the live timeline; getLastLiveEvent() matches the data.liveEvent semantics used in onRoomTimeline.
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
            console.error("Unable to join", error);
            return Promise.reject(new Error("Failed to leave room"));
        }
    }

    async leaveRoom(): Promise<void> {
        try {
            await this.matrixRoom.client.leave(this.id);
            return;
        } catch (error) {
            console.error("Unable to leave", error);
            throw new Error("Failed to leave room", { cause: error });
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

    /**
     * True when this room is linked to a Matrix space (`m.space.parent`), e.g. map area chats created
     * under the room-area folder. Those rooms must stay "multiple" in the WA UI even with only two
     * members (user + admin bot); the old `members.length === 2` heuristic would wrongly list them as DMs.
     */
    private hasMatrixSpaceParent(): boolean {
        const events =
            this.matrixRoom
                .getLiveTimeline()
                ?.getState(EventTimeline.FORWARDS)
                ?.getStateEvents(EventType.SpaceParent) ?? [];
        return events.some((ev) => Boolean(ev.getStateKey()) && hasValidViaEntries(ev.getContent()));
    }

    /** `m.room.create` content `is_direct` (Matrix-native DM flag). */
    private isRoomCreatedAsDirect(): boolean {
        const events =
            this.matrixRoom.getLiveTimeline()?.getState(EventTimeline.FORWARDS)?.getStateEvents(EventType.RoomCreate) ??
            [];
        const ev = events.find((e) => e.getStateKey() === "") ?? events[0];
        return ev?.getContent()?.is_direct === true;
    }

    /**
     * Members that still participate or may join (`join` / `invite`). Left and banned users are
     * excluded so DM vs group heuristics match what users see in the conversation.
     */
    private getMembersForRoomTypeHeuristics(): RoomMember[] {
        return this.matrixRoom
            .getMembers()
            .filter(
                (member) => member.membership === KnownMembership.Join || member.membership === KnownMembership.Invite
            );
    }

    private getMatrixRoomType(): "direct" | "multiple" {
        if (this.hasMatrixSpaceParent()) {
            return "multiple";
        }

        const dmInviter = this.matrixRoom.getDMInviter();
        if (dmInviter) {
            return "direct";
        }

        const members = this.getMembersForRoomTypeHeuristics();
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

        if (isDirectBasedOnRoomData || members.length === 2 || this.isRoomCreatedAsDirect()) {
            return "direct";
        }

        return "multiple";
    }

    private refreshRoomType(): void {
        const next = this.getMatrixRoomType();
        if (next !== get(this.roomTypeStore)) {
            this.roomTypeStore.set(next);
        }
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
            console.error("failed to mute notification", error);
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
            console.error("failed to mute notification", error);
        }
    }

    destroy() {
        this.dmMergerUsersByRoomUnsub?.();
        this.dmMergerUsersByRoomUnsub = undefined;
        this.currentUserRoomMember?.off(RoomMemberEvent.PowerLevel, this.handleCurrentUserRoomMemberPowerLevel);
        this.currentUserRoomMember = undefined;
        this.matrixRoom.currentState.off(RoomStateEvent.Members, this.handleRoomStateMembers);
        this.matrixRoom.off(RoomEvent.Timeline, this.handleRoomTimeline);
        this.matrixRoom.off(RoomEvent.Name, this.handleRoomName);
        this.matrixRoom.off(RoomEvent.Redaction, this.handleRoomRedaction);
        this.matrixRoom.off(RoomStateEvent.Events, this.handleStateEvent);
        this.matrixRoom.off(RoomEvent.MyMembership, this.handleMyMembership);
        this.matrixRoom.off(RoomStateEvent.NewMember, this.handleNewMember);
        this.matrixRoom.off(RoomEvent.UnreadNotifications, this.updateUnreadNotificationCount);
        get(this.members).forEach((member) => {
            member.destroy();
        });
        this.messages.forEach((message) => {
            message.relations?.destroy();
            message.destroy();
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
        const currentRoomMember = get(this.currentRoomMember);
        if (!currentRoomMember) {
            return derived(
                [this.currentUserPermissionLevel, otherUserPermissionLevel],
                ([$currentUserPermission, $otherUserPermission]) => {
                    if (!$currentUserPermission) return false;

                    const currentUserPowerLevel = MatrixChatRoomMember.getPowerLevel($currentUserPermission);
                    const otherUserPowerLevel = MatrixChatRoomMember.getPowerLevel($otherUserPermission);
                    const hasSufficientPowerLevel =
                        this.matrixRoom
                            .getLiveTimeline()
                            .getState(Direction.Backward)
                            ?.hasSufficientPowerLevelFor(action, currentUserPowerLevel) ?? false;

                    return hasSufficientPowerLevel && currentUserPowerLevel > otherUserPowerLevel;
                }
            );
        }

        return derived(
            [currentRoomMember.permissionLevel, otherUserPermissionLevel],
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
        return derived([this.currentUserPermissionLevel, this.myMembership], () => {
            return (
                this.matrixRoom
                    .getLiveTimeline()
                    .getState(EventTimeline.FORWARDS)
                    ?.maySendStateEvent(eventType, this.matrixRoom.client.getSafeUserId()) ?? false
            );
        });
    }

    private setCurrentUserRoomMember(member: RoomMember | undefined): void {
        if (this.currentUserRoomMember === member) {
            if (member) {
                this.currentUserPermissionLevel.set(MatrixChatRoomMember.getPermissionLevel(member.powerLevelNorm));
            }
            return;
        }

        this.currentUserRoomMember?.off(RoomMemberEvent.PowerLevel, this.handleCurrentUserRoomMemberPowerLevel);
        this.currentUserRoomMember = member;

        if (!member) {
            this.currentUserPermissionLevel.set(undefined);
            return;
        }

        this.currentUserPermissionLevel.set(MatrixChatRoomMember.getPermissionLevel(member.powerLevelNorm));
        member.on(RoomMemberEvent.PowerLevel, this.handleCurrentUserRoomMemberPowerLevel);
    }

    private onCurrentUserRoomMemberPowerLevel(_event: MatrixEvent, member: RoomMember): void {
        this.currentUserPermissionLevel.set(MatrixChatRoomMember.getPermissionLevel(member.powerLevelNorm));
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
        }
    }

    public getAllowedRolesToAssign(): ChatPermissionLevel[] {
        const allowedRolesToAssign: ChatPermissionLevel[] = [];

        const currentRoomMember = get(this.currentRoomMember);
        if (!currentRoomMember) {
            return allowedRolesToAssign;
        }
        const currentRoomMemberPermissionLevel = get(currentRoomMember.permissionLevel);

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
        const currentRoomMember = get(this.currentRoomMember);
        if (!currentRoomMember) {
            return false;
        }
        const currentRoomMemberPermissionLevel = get(currentRoomMember.permissionLevel);
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
