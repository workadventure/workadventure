import * as Sentry from "@sentry/svelte";
import Debug from "debug";
import { ForwardableStore, MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import type { Readable, Writable, Unsubscriber } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import type { Subscription } from "rxjs";
import type { CharacterTextureMessage } from "@workadventure/messages";
import { AvailabilityStatus, FilterType } from "@workadventure/messages";
import { asError } from "catch-unknown";
import { eventToAbortReason } from "@workadventure/shared-utils/src/Abort/raceAbort";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { abortAny } from "@workadventure/shared-utils/src/Abort/AbortAny";
import { type WAMSettings, WAMSettingsUtils } from "@workadventure/map-editor";
import type {
    AnyKindOfUser,
    ChatConversation,
    ChatMessage,
    ChatMessageContent,
    ChatMessageReaction,
    ChatPollCreateOptions,
    ChatPollCreationCapability,
    ChatPollItem,
    ChatMessageType,
    ChatQuestionCreateOptions,
    ChatQuestionCreationCapability,
    ChatQuestionItem,
    ChatRoom,
} from "../ChatConnection";
import LL, { locale } from "../../../../i18n/i18n-svelte";
import { iframeListener } from "../../../Api/IframeListener";
import type { SpaceInterface, SpaceUserExtended } from "../../../Space/SpaceInterface";
import type { MeetingParticipant } from "../../../Stores/MeetingInvitationStore";
import type { SpaceRegistryInterface } from "../../../Space/SpaceRegistry/SpaceRegistryInterface";
import { chatVisibilityStore } from "../../../Stores/ChatStore";
import { isAChatRoomIsVisible, navChat, shouldRestoreChatStateStore } from "../../Stores/ChatStore";
import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import { mapExtendedSpaceUserToChatUser } from "../../UserProvider/ChatUserMapper";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { availabilityStatusStore, requestedCameraState, requestedMicrophoneState } from "../../../Stores/MediaStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
import { MessageNotification } from "../../../Notification/MessageNotification";
import { notificationManager } from "../../../Notification/NotificationManager";
import { blackListManager } from "../../../WebRtc/BlackListManager";
import { isMediaBreakpointUp } from "../../../Utils/BreakpointsUtils";
import { ScriptingOutputAudioStreamManager } from "../../../WebRtc/AudioStream/ScriptingOutputAudioStreamManager";
import { ScriptingInputAudioStreamManager } from "../../../WebRtc/AudioStream/ScriptingInputAudioStreamManager";
import type { MessageUserJoined } from "../../../Connection/ConnexionModels";
import type { RemotePlayersRepository } from "../../../Phaser/Game/RemotePlayersRepository";
import { hideBubbleConfirmationModal } from "../../../Rules/StatusRules/statusChangerFunctions";
import { statusChanger } from "../../../Components/ActionBar/AvailabilityStatus/statusChanger";
import type { GameScene } from "../../../Phaser/Game/GameScene";
import { faviconManager } from "../../../WebRtc/FaviconManager";
import { screenWakeLock } from "../../../Utils/ScreenWakeLock";
import type { PictureStore } from "../../../Stores/PictureStore";
import { CharacterLayerManager } from "../../../Phaser/Entity/CharacterLayerManager";
import { BubbleNotification as BasicNotification } from "../../../Notification/BubbleNotification";
import { DEFAULT_PROXIMITY_SPACE_NAME, type ProximityChatRoomKind } from "./ProximityChatRoomManager";
import { ProximityChatQuestion } from "./ProximityChatQuestion";
import { canCreateProximityContent } from "./ProximityCreationPermissions";
import { ProximityChatPoll } from "./ProximityChatPoll";
import { muteProximityChatNotifications, unmuteProximityChatNotifications } from "./ProximityNotificationControl";
import { getNewRemoteProximityPolls, getProximityPollNotificationMessage } from "./ProximityPollNotification";
import {
    getProximityPollDefinitionMetadataKey,
    isProximityPollDeleted,
    parseProximityPollMetadata,
    type ProximityPollDefinitionMetadata,
} from "./ProximityPollMetadata";
import {
    getProximityQAQuestionMetadataKey,
    isProximityQAQuestionDeleted,
    parseProximityQAMetadata,
    type ProximityQAQuestionMetadata,
} from "./ProximityQAMetadata";
import { getUnreadRemoteQuestionIds } from "./ProximityQAUnread";
import { createProximityTimelineItemsStore } from "./ProximityTimelineItemsStore";

const debug = Debug("ProximityChatRoom");

export class ProximityChatMessage implements ChatMessage {
    isQuotedMessage = undefined;
    quotedMessage = undefined;
    isDeleted = writable(false);
    isModified = writable(false);
    canDelete = writable(false);
    reactions: MapStore<string, ChatMessageReaction> = new MapStore();
    constructor(
        public id: string,
        public sender: AnyKindOfUser,
        public content: Readable<ChatMessageContent>,
        public date: Date,
        public isMyMessage: boolean,
        public type: ChatMessageType,
    ) {}

    remove(): void {
        console.info("Function not implemented.");
    }
    edit(newContent: string): Promise<void> {
        console.info("Function not implemented.", newContent);
        return Promise.resolve();
    }
    addReaction(reaction: string): Promise<void> {
        console.info("Function not implemented.", reaction);
        return Promise.resolve();
    }
}

type SoundManager = Pick<
    GameScene,
    "playBubbleInSound" | "playBubbleOutSound" | "playMeetingInSound" | "playMeetingOutSound"
>;

const MAX_PARTICIPANTS_FOR_SOUND_NOTIFICATIONS = 5;

export class ProximityChatRoom implements ChatRoom {
    id: string;
    conversationKind = "room" as const;
    name: Writable<string>;
    kind: Writable<ProximityChatRoomKind>;
    type = readable<"direct" | "multiple">("multiple");
    hasUnreadMessages = writable(false);
    unreadMessagesCount = writable(0);
    unreadNotificationCount = writable(0);
    initializationState = readable<"ready">("ready");
    initializationError = readable<Error | undefined>(undefined);
    pictureStore = readable(undefined);
    avatarFallbackColor = readable(undefined);
    messages: SearchableArrayStore<string, ChatMessage> = new SearchableArrayStore((item) => item.id);
    /** Space users of the current space (forwarded from _space.usersStore on join, empty map on leave). */
    public readonly spaceUsersStore = new ForwardableStore<Map<string, SpaceUserExtended>>(new Map());
    private readonly spaceMetadataStore = writable<Map<string, unknown>>(new Map());
    readonly pollItems: Readable<readonly ChatPollItem[]> = derived(
        [this.spaceMetadataStore, this.spaceUsersStore],
        ([$metadata, $users]) => this.createPollItems($metadata, $users),
    );
    readonly canModerateQuestions: Readable<boolean> = derived(this.spaceUsersStore, (users) =>
        this.computeCanModerateQuestions(users),
    );
    readonly canDeleteQuestions: Readable<boolean> = derived(this.spaceUsersStore, (users) =>
        this.computeCanDeleteAnyQuestion(users),
    );
    readonly qaItems: Readable<readonly ChatQuestionItem[]> = derived(
        [this.spaceMetadataStore, this.spaceUsersStore, this.canModerateQuestions, this.canDeleteQuestions],
        ([$metadata, $users, $canModerateQuestions, $canDeleteQuestions]) =>
            this.createQuestionItems($metadata, $users, $canModerateQuestions, $canDeleteQuestions),
    );
    private readonly unreadQuestionIdsStore = writable<ReadonlySet<string>>(new Set());
    readonly unreadQuestionCount: Readable<number> = derived(this.unreadQuestionIdsStore, (ids) => ids.size);
    timelineItems = createProximityTimelineItemsStore(this.messages, this.pollItems);
    readonly pollCreation: ChatPollCreationCapability;
    readonly questionCreation: ChatQuestionCreationCapability;
    messageReactions: MapStore<string, MapStore<string, ChatMessageReaction>> = new MapStore();
    hasPreviousMessage = writable(false);
    isEncrypted = writable(false);
    typingMembers: Writable<Array<{ id: string; name: string | null; pictureStore: PictureStore }>>;
    private _space: SpaceInterface | undefined;
    private spaceMessageSubscription: Subscription | undefined;
    private spaceIsTypingSubscription: Subscription | undefined;
    private spaceMetadataSubscription: Subscription | undefined;
    private roomSidePanelUnsubscriber: Unsubscriber;
    private selectedRoomUnsubscriber: Unsubscriber;
    private readonly proximityPolls = new Map<string, ProximityChatPoll>();
    private readonly proximityQuestions = new Map<string, ProximityChatQuestion>();
    private observeUserJoinedSubscription: Subscription | undefined;
    private observeUserLeftSubscription: Subscription | undefined;
    // Users by spaceUserId
    private users: Map<string, SpaceUserExtended> | undefined;
    private usersUnsubscriber: Unsubscriber | undefined;
    private spaceWatcherUserJoinedObserver: Subscription | undefined;
    private spaceWatcherUserLeftObserver: Subscription | undefined;
    private joinSpaceAbortController: AbortController | undefined;
    areNotificationsMuted = writable(false);
    isRoomFolder = false;
    lastMessageTimestamp = 0;
    hasUserInProximityChat = writable(false);
    isJoined = writable(false);
    isChatDisabled = writable(false);
    intentionallyClosed = writable(false);
    hasUserMessages = writable(false);
    readonly joinedMemberCount = derived(this.spaceUsersStore, (users) => users.size);
    /** Participants currently in the same meeting/space (reactive list from space users). */
    private _currentMeetingParticipantsStore = writable<MeetingParticipant[]>([]);
    public readonly currentMeetingParticipantsStore: Readable<MeetingParticipant[]> =
        this._currentMeetingParticipantsStore;

    ensureInitialized(): Promise<void> {
        return Promise.resolve();
    }
    ensureTimelineInitialized(): Promise<void> {
        return Promise.resolve();
    }
    ensureMembersInitialized(): Promise<void> {
        return Promise.resolve();
    }
    currentMatrixRoom: ChatConversation | undefined;
    currentChatVisibility = false;

    private unknownUser = {
        chatId: "0",
        uuid: "0",
        availabilityStatus: writable(AvailabilityStatus.ONLINE),
        username: get(LL).chat.question.unknownAuthor(),
        pictureStore: readable(undefined),
        roomName: undefined,
        playUri: undefined,
        color: undefined,
        spaceUserId: undefined,
    } as AnyKindOfUser;

    private isDefaultProximityRoom(): boolean {
        return this.spaceName === DEFAULT_PROXIMITY_SPACE_NAME;
    }

    private get unknownUserName(): string {
        return this.unknownUser.username ?? get(LL).chat.question.unknownAuthor();
    }

    private scriptingOutputAudioStreamManager: ScriptingOutputAudioStreamManager | undefined;
    private scriptingInputAudioStreamManager: ScriptingInputAudioStreamManager | undefined;
    private screenWakeRelease: undefined | (() => Promise<void>);

    constructor(
        public readonly spaceName: string,
        displayName: string,
        kind: ProximityChatRoomKind,
        private _spaceUserId: string,
        private spaceRegistry: SpaceRegistryInterface,
        _iframeListenerInstance: Pick<typeof iframeListener, "newChatMessageWritingStatusStream">,
        private remotePlayersRepository: RemotePlayersRepository,
        private soundManager: SoundManager,
        private wamSettings: WAMSettings | undefined,
        private tags: string[],
        private notifyNewMessage = (message: ProximityChatMessage) => {
            const canPlaySound = localUserStore.getChatSounds();
            const isRoomIsDisplayed = get(selectedRoomStore)?.id === this.id && get(chatVisibilityStore);
            const isNotificationIsMuted = get(this.areNotificationsMuted);

            if (canPlaySound && !isRoomIsDisplayed && !isNotificationIsMuted) {
                gameManager.getCurrentGameScene().playSound("new-message");
            }

            if (isNotificationIsMuted || isRoomIsDisplayed) {
                return;
            }

            notificationManager.createNotification(
                new MessageNotification(
                    message.sender.username ?? this.unknownUserName,
                    get(message.content).body,
                    this.id,
                    get(this.name),
                ),
            );
        },
    ) {
        this.id = `proximity:${spaceName}`;
        this.name = writable(displayName);
        this.kind = writable(kind);
        this.typingMembers = writable([]);
        this.pollCreation = {
            canCreate: derived(this.isChatDisabled, canCreateProximityContent),
            supportedKinds: ["open", "closed"],
            limits: {
                questionMaxLength: 340,
                answerMaxLength: 240,
                minAnswers: 2,
                maxAnswers: 20,
            },
            create: (options) => this.createPoll(options),
        };
        this.questionCreation = {
            canCreate: derived(this.isChatDisabled, canCreateProximityContent),
            maxLength: 500,
            create: (options) => this.createQuestion(options),
        };

        this.roomSidePanelUnsubscriber = roomSidePanelStore.subscribe(() =>
            this.markQuestionsAsReadIfQuestionsSectionOpen(),
        );
        this.selectedRoomUnsubscriber = selectedRoomStore.subscribe(() =>
            this.markQuestionsAsReadIfQuestionsSectionOpen(),
        );
    }

    sendMessage(message: string, action: ChatMessageType = "proximity", broadcast = true): void {
        // Create content message
        const newChatMessageContent = {
            body: message,
            url: undefined,
        };

        const spaceUser = this.users?.get(this._spaceUserId);
        let chatUser: AnyKindOfUser = this.unknownUser;
        if (spaceUser) {
            chatUser = mapExtendedSpaceUserToChatUser(spaceUser);
        }

        // Create message
        const newMessage = new ProximityChatMessage(
            uuidv4(),
            chatUser,
            writable(newChatMessageContent),
            new Date(),
            true,
            action,
        );

        // Add message to the list
        this.messages.push(newMessage);
        if (action === "proximity") {
            this.hasUserMessages.set(true);
        }

        this.lastMessageTimestamp = newMessage.date.getTime();

        // Use the room connection to send the message to other users of the space
        if (broadcast) {
            this._space?.emitPublicMessage({
                $case: "spaceMessage",
                spaceMessage: {
                    message: message,
                    characterTextures: spaceUser?.characterTextures ?? [],
                    name: chatUser.username ?? this.unknownUserName,
                },
            });
        }

        if (action === "proximity") {
            // Send local message to WorkAdventure scripting API
            try {
                iframeListener.sendUserInputChat(message, undefined);
            } catch (e) {
                console.error("Error while sending message to WorkAdventure scripting API", e);
            }
        }
    }

    private addEnteringChatWithUsers(users: SpaceUserExtended[]) {
        let userNames: string;
        if (Intl.ListFormat) {
            const formatter = new Intl.ListFormat(get(locale), { style: "long", type: "conjunction" });
            userNames = formatter.format(users.map((user) => user.name));
        } else {
            // For old browsers
            userNames = users.map((user) => user.name).join(", ");
        }
        this.sendMessage(get(LL).chat.timeLine.newDiscussion({ userNames }), "incoming", false);
    }

    private addIncomingUser(spaceUser: SpaceUserExtended): void {
        this.sendMessage(get(LL).chat.timeLine.incoming({ userName: spaceUser.name }), "incoming", false);
    }

    private addOutcomingUser(spaceUser: SpaceUserExtended): void {
        this.sendMessage(get(LL).chat.timeLine.outcoming({ userName: spaceUser.name }), "outcoming", false);
        this.removeTypingUserbyID(spaceUser.spaceUserId.toString());
    }

    /**
     * Add a message from a remote user to the proximity chat.
     */
    private addNewMessage(
        message: string,
        senderUserId: string,
        characterTextures: CharacterTextureMessage[],
        name: string,
    ): void {
        // Ignore messages from the current user
        if (senderUserId === this._spaceUserId) {
            return;
        }

        // Create content message
        const newChatMessageContent = {
            body: message,
            url: undefined,
        };

        const spaceUser = this.users?.get(senderUserId);
        let chatUser: AnyKindOfUser = { ...this.unknownUser, spaceUserId: senderUserId };
        if (spaceUser) {
            chatUser = mapExtendedSpaceUserToChatUser(spaceUser);
        }

        if (characterTextures.length > 0) {
            chatUser.pictureStore = readable<string | undefined>(undefined, (set) => {
                CharacterLayerManager.wokaBase64(characterTextures)
                    .then((wokaBase64) => {
                        set(wokaBase64);
                    })
                    .catch((e) => {
                        Sentry.captureException(e);
                        console.warn("Error while getting woka base64", e);
                    });
            });
        }

        if (name) {
            chatUser.username = name;
        }

        // Create message
        const newMessage = new ProximityChatMessage(
            uuidv4(),
            chatUser,
            writable(newChatMessageContent),
            new Date(),
            false,
            "proximity",
        );

        // Add message to the list
        this.messages.push(newMessage);
        this.hasUserMessages.set(true);

        this.lastMessageTimestamp = newMessage.date.getTime();

        this.notifyNewMessage(newMessage);

        if (get(selectedRoomStore) !== this) {
            this.hasUnreadMessages.set(true);
            this.unreadNotificationCount.set(get(this.unreadNotificationCount) + 1);
        }
        // Send bubble message to WorkAdventure scripting API
        try {
            iframeListener.sendUserInputChat(message, senderUserId);
        } catch (e) {
            console.error("Error while sending message to WorkAdventure scripting API", e);
        }
    }

    sendFiles(files: FileList): Promise<void> {
        return Promise.resolve();
    }

    private createPoll(options: ChatPollCreateOptions): Promise<void> {
        const currentVoterId = this.getCurrentVoterId(this.users ?? new Map());
        const pollId = uuidv4();
        const definition: ProximityPollDefinitionMetadata = {
            id: pollId,
            question: options.question,
            kind: options.kind,
            answers: options.answers.map((answer) => ({
                id: uuidv4(),
                text: answer,
            })),
            maxSelections: 1,
            senderId: currentVoterId,
            senderName: this.users?.get(this._spaceUserId)?.name,
            createdAt: Date.now(),
        };

        this.emitPollMetadataUpdate(new Map([[getProximityPollDefinitionMetadataKey(pollId), definition]]));
        return Promise.resolve();
    }

    private createQuestion(options: ChatQuestionCreateOptions): Promise<void> {
        const body = options.body.trim();
        if (body.length === 0) {
            return Promise.resolve();
        }

        const currentVoterId = this.getCurrentVoterId(this.users ?? new Map());
        const questionId = uuidv4();
        const definition: ProximityQAQuestionMetadata = {
            id: questionId,
            body,
            senderId: currentVoterId,
            senderName: this.getCurrentUserName(),
            createdAt: Date.now(),
        };

        this.emitPollMetadataUpdate(new Map([[getProximityQAQuestionMetadataKey(questionId), definition]]));
        return Promise.resolve();
    }

    private notifyNewPolls(previousMetadata: Map<string, unknown>, nextMetadata: Map<string, unknown>): void {
        const currentVoterId = this.getCurrentVoterId(this.users ?? new Map());
        const newPolls = getNewRemoteProximityPolls(previousMetadata, nextMetadata, currentVoterId);
        if (newPolls.length === 0) {
            return;
        }

        if (get(selectedRoomStore) !== this) {
            this.hasUnreadMessages.set(true);
            this.unreadNotificationCount.set(get(this.unreadNotificationCount) + newPolls.length);
        }

        if (!get(this.intentionallyClosed)) {
            chatVisibilityStore.set(true);
            chatNotificationStore.clearRoom(this.id);
            return;
        }

        this.unreadMessagesCount.set(get(this.unreadMessagesCount) + newPolls.length);
        for (const poll of newPolls) {
            chatNotificationStore.addNotification(
                poll.senderName ?? this.unknownUserName,
                getProximityPollNotificationMessage(poll, get(LL).chat.poll.title()),
                this,
                poll.id,
            );
        }
    }

    private notifyNewQuestions(previousMetadata: Map<string, unknown>, nextMetadata: Map<string, unknown>): void {
        const currentVoterId = this.getCurrentVoterId(this.users ?? new Map());
        const newQuestionIds = getUnreadRemoteQuestionIds(previousMetadata, nextMetadata, currentVoterId);
        const newQuestions = parseProximityQAMetadata(nextMetadata).questions.filter((question) =>
            newQuestionIds.includes(question.id),
        );
        if (newQuestions.length === 0) {
            return;
        }

        if (this.isQuestionsSectionOpen()) {
            this.markQuestionsAsRead();
        } else {
            this.addUnreadQuestionIds(newQuestionIds);
        }

        if (!get(this.canModerateQuestions)) {
            return;
        }

        if (get(selectedRoomStore) !== this) {
            this.hasUnreadMessages.set(true);
            this.unreadNotificationCount.set(get(this.unreadNotificationCount) + newQuestions.length);
        }

        if (!get(this.intentionallyClosed)) {
            chatVisibilityStore.set(true);
            chatNotificationStore.clearRoom(this.id);
            return;
        }

        this.unreadMessagesCount.set(get(this.unreadMessagesCount) + newQuestions.length);
        for (const question of newQuestions) {
            chatNotificationStore.addNotification(
                question.senderName ?? this.unknownUserName,
                get(LL).chat.question.notification({ question: question.body }),
                this,
                question.id,
                true,
                "questions",
            );
        }
    }

    private createPollItems(
        metadata: Map<string, unknown>,
        users: Map<string, SpaceUserExtended>,
    ): readonly ChatPollItem[] {
        const parsedMetadata = parseProximityPollMetadata(metadata);
        const activePollIds = new Set<string>();

        const pollItems = parsedMetadata.polls
            .filter((poll) => !isProximityPollDeleted(poll, parsedMetadata.deletions))
            .map((poll) => {
                activePollIds.add(poll.id);
                const sender = this.findPollSender(poll, users);
                const end = parsedMetadata.ends.find(
                    (candidateEnd) => candidateEnd.pollId === poll.id && candidateEnd.senderId === poll.senderId,
                );
                const existingPoll = this.proximityPolls.get(poll.id);

                if (existingPoll) {
                    existingPoll.update({
                        votes: parsedMetadata.votes,
                        end,
                        currentVoterId: this.getCurrentVoterId(users),
                        sender,
                    });
                    return existingPoll;
                }

                const proximityPoll = new ProximityChatPoll({
                    definition: poll,
                    votes: parsedMetadata.votes,
                    end,
                    currentVoterId: this.getCurrentVoterId(users),
                    sender,
                    updateMetadata: (update) => this.emitPollMetadataUpdate(update),
                });

                this.proximityPolls.set(poll.id, proximityPoll);
                return proximityPoll;
            });
        this.deleteInactivePolls(activePollIds);
        return pollItems;
    }

    private createQuestionItems(
        metadata: Map<string, unknown>,
        users: Map<string, SpaceUserExtended>,
        canMarkAnswered: boolean,
        canDeleteAny: boolean,
    ): readonly ChatQuestionItem[] {
        const parsedMetadata = parseProximityQAMetadata(metadata);
        const activeQuestionIds = new Set<string>();
        const currentVoterId = this.getCurrentVoterId(users);

        const questionItems = parsedMetadata.questions
            .filter((question) => !isProximityQAQuestionDeleted(question, parsedMetadata.deletions))
            .map((question) => {
                activeQuestionIds.add(question.id);
                const sender = this.findQuestionSender(question, users);
                const answer = parsedMetadata.answers.find(
                    (candidateAnswer) => candidateAnswer.questionId === question.id,
                );
                const existingQuestion = this.proximityQuestions.get(question.id);

                if (existingQuestion) {
                    existingQuestion.update({
                        upvotes: parsedMetadata.upvotes,
                        answer,
                        currentVoterId,
                        sender,
                        canMarkAnswered,
                        canDeleteAny,
                    });
                    return existingQuestion;
                }

                const proximityQuestion = new ProximityChatQuestion({
                    definition: question,
                    upvotes: parsedMetadata.upvotes,
                    answer,
                    currentVoterId,
                    sender,
                    canMarkAnswered,
                    canDeleteAny,
                    updateMetadata: (update) => this.emitPollMetadataUpdate(update),
                });

                this.proximityQuestions.set(question.id, proximityQuestion);
                return proximityQuestion;
            })
            .sort((left, right) => {
                const leftState = get(left.state);
                const rightState = get(right.state);
                return (
                    rightState.upvoteCount - leftState.upvoteCount ||
                    (left.date?.getTime() ?? 0) - (right.date?.getTime() ?? 0)
                );
            });

        this.deleteInactiveQuestions(activeQuestionIds);
        return questionItems;
    }

    private deleteInactivePolls(activePollIds: Set<string>): void {
        for (const pollId of this.proximityPolls.keys()) {
            if (!activePollIds.has(pollId)) {
                this.proximityPolls.delete(pollId);
            }
        }
    }

    private deleteInactiveQuestions(activeQuestionIds: Set<string>): void {
        for (const questionId of this.proximityQuestions.keys()) {
            if (!activeQuestionIds.has(questionId)) {
                this.proximityQuestions.delete(questionId);
            }
        }
    }

    private findPollSender(
        poll: ProximityPollDefinitionMetadata,
        users: Map<string, SpaceUserExtended>,
    ): AnyKindOfUser | undefined {
        for (const user of users.values()) {
            if (this.getUserVoterId(user) === poll.senderId) {
                return mapExtendedSpaceUserToChatUser(user);
            }
        }

        return {
            ...this.unknownUser,
            chatId: poll.senderId,
            uuid: poll.senderId,
            username: poll.senderName ?? this.unknownUserName,
            spaceUserId: poll.senderId,
        };
    }

    private findQuestionSender(
        question: ProximityQAQuestionMetadata,
        users: Map<string, SpaceUserExtended>,
    ): AnyKindOfUser | undefined {
        for (const user of users.values()) {
            if (this.getUserVoterId(user) === question.senderId) {
                return mapExtendedSpaceUserToChatUser(user);
            }
        }

        return {
            ...this.unknownUser,
            chatId: question.senderId,
            uuid: question.senderId,
            username: question.senderName ?? this.unknownUserName,
            spaceUserId: question.senderId,
        };
    }

    private getCurrentVoterId(users: Map<string, SpaceUserExtended>): string {
        const user = users.get(this._spaceUserId);

        if (!user) {
            return this._spaceUserId;
        }

        return this.getUserVoterId(user);
    }

    private getCurrentUserName(): string | undefined {
        return (
            this.users?.get(this._spaceUserId)?.name ??
            this._space?.getSpaceUserBySpaceUserId(this._spaceUserId)?.name ??
            localUserStore.getDisplayNameForMatrixProfile() ??
            localUserStore.getName() ??
            undefined
        );
    }

    private getUserVoterId(user: SpaceUserExtended): string {
        return user.uuid || user.spaceUserId;
    }

    private computeCanModerateQuestions(users: Map<string, SpaceUserExtended>): boolean {
        const user = this.getCurrentSpaceUser(users);

        return this.isCurrentUserAdmin(user) || user?.megaphoneState === true;
    }

    private computeCanDeleteAnyQuestion(users: Map<string, SpaceUserExtended>): boolean {
        return this.isCurrentUserAdmin(this.getCurrentSpaceUser(users));
    }

    private getCurrentSpaceUser(users: Map<string, SpaceUserExtended>): SpaceUserExtended | undefined {
        return users.get(this._spaceUserId) ?? this._space?.getSpaceUserBySpaceUserId(this._spaceUserId);
    }

    private isCurrentUserAdmin(user: SpaceUserExtended | undefined): boolean {
        return (user?.tags ?? this.tags).includes("admin");
    }

    private addUnreadQuestionIds(questionIds: string[]): void {
        this.unreadQuestionIdsStore.update((currentIds) => new Set([...currentIds, ...questionIds]));
    }

    private markQuestionsAsRead(): void {
        if (get(this.unreadQuestionIdsStore).size === 0) {
            return;
        }

        this.unreadQuestionIdsStore.set(new Set());
    }

    private markQuestionsAsReadIfQuestionsSectionOpen(): void {
        if (this.isQuestionsSectionOpen()) {
            this.markQuestionsAsRead();
        }
    }

    private isQuestionsSectionOpen(): boolean {
        const sidePanelState = get(roomSidePanelStore);
        return sidePanelState.isOpen && sidePanelState.activeSection === "questions" && get(selectedRoomStore) === this;
    }

    private emitPollMetadataUpdate(metadata: Map<string, unknown>): void {
        this._space?.setMetadata(metadata);
        this._space?.emitUpdateSpaceMetadata(metadata);
    }

    setTimelineAsRead(): void {
        console.info("setTimelineAsRead => Method not implemented yet!");
    }

    muteNotification(): Promise<void> {
        return muteProximityChatNotifications(this.areNotificationsMuted);
    }

    unmuteNotification(): Promise<void> {
        return unmuteProximityChatNotifications(this.areNotificationsMuted);
    }

    loadMorePreviousMessages(): Promise<void> {
        return Promise.resolve();
    }

    addExternalMessage(type: "local" | "bubble", message: string, authorName?: string): void {
        // Create content message
        const newChatMessageContent = {
            body: message,
            url: undefined,
        };

        // Create message
        const newMessage = new ProximityChatMessage(
            uuidv4(),
            {
                ...this.unknownUser,
                username: authorName ?? this.unknownUserName,
            },
            writable(newChatMessageContent),
            new Date(),
            false,
            "proximity",
        );

        // Add message to the list
        this.messages.push(newMessage);
        this.hasUserMessages.set(true);

        // If type is bubble, we need to forward the message to the other users
        if (type === "bubble") {
            this._space?.emitPublicMessage({
                $case: "spaceMessage",
                spaceMessage: {
                    message: message,
                    characterTextures: [],
                },
            });
        }
    }

    startTyping(): Promise<object> {
        this._space?.emitPublicMessage({
            $case: "spaceIsTyping",
            spaceIsTyping: {
                isTyping: true,
                characterTextures: [],
            },
        });
        return Promise.resolve({});
    }
    stopTyping(): Promise<object> {
        this._space?.emitPublicMessage({
            $case: "spaceIsTyping",
            spaceIsTyping: {
                isTyping: false,
                characterTextures: [],
            },
        });

        return Promise.resolve({});
    }

    private addTypingUser(
        senderUserId: string,
        characterTextures: CharacterTextureMessage[],
        name: string | undefined,
    ): void {
        this.typingMembers.update((typingMembers) => {
            if (typingMembers.find((user) => user.id === senderUserId) == undefined) {
                typingMembers.push({
                    id: senderUserId,
                    name: name ?? null,
                    pictureStore: readable<string | undefined>(undefined, (set) => {
                        CharacterLayerManager.wokaBase64(characterTextures)
                            .then((wokaBase64) => {
                                set(wokaBase64);
                            })
                            .catch((e) => {
                                Sentry.captureException(e);
                                console.warn("Error while getting woka base64", e);
                            });
                    }),
                });
            }
            return typingMembers;
        });
    }

    private removeTypingUser(senderUserId: string): void {
        const sender = this.users?.get(senderUserId);
        let userIdToRemove = senderUserId;
        if (sender !== undefined) {
            userIdToRemove = sender.spaceUserId.toString();
        }

        this.typingMembers.update((typingMembers) => {
            return typingMembers.filter((user) => user.id !== userIdToRemove);
        });
    }

    private removeTypingUserbyID(id: string) {
        this.typingMembers.update((typingMembers) => {
            return typingMembers.filter((user) => user.id !== id);
        });
    }

    addExternalTypingUser(id: string, name: string, avatarUrl: string | null): void {
        this.typingMembers.update((typingMembers) => {
            if (typingMembers.find((user) => user.id === id) == undefined) {
                typingMembers.push({ id, name, pictureStore: readable(avatarUrl ?? undefined) });
            }
            return typingMembers;
        });
    }

    removeExternalTypingUser(id: string) {
        this.typingMembers.update((typingMembers) => {
            return typingMembers.filter((user) => user.id !== id);
        });
    }

    public setDisplayName(displayName: string): void {
        this.name.set(displayName);
    }

    public async joinSpace(
        spaceName: string,
        propertiesToSync: string[],
        isMeetingRoomChat: boolean = false,
        filterType: FilterType = FilterType.ALL_USERS,
        disableChat: boolean = false,
        signal?: AbortSignal,
    ): Promise<SpaceInterface> {
        if (spaceName !== this.spaceName && !this.isDefaultProximityRoom()) {
            throw new Error(`Cannot join proximity room "${this.spaceName}" with different space "${spaceName}"`);
        }
        if (this._space && !this._space.destroyed) {
            if (this._space.getName() !== spaceName && this.isDefaultProximityRoom()) {
                await this.leaveSpace(this._space.getName(), isMeetingRoomChat);
            } else {
                return this._space;
            }
        }
        if (this.joinSpaceAbortController) {
            this.joinSpaceAbortController.abort(new AbortError("A space is already being joined"));
            this.joinSpaceAbortController = undefined;
            this.scriptingOutputAudioStreamManager?.close();
            this.scriptingInputAudioStreamManager?.close();
        }

        this.joinSpaceAbortController = new AbortController();
        const joinSignal =
            signal !== undefined
                ? abortAny([this.joinSpaceAbortController.signal, signal])
                : this.joinSpaceAbortController.signal;

        try {
            this._space = await this.spaceRegistry.joinSpace(spaceName, filterType, propertiesToSync, joinSignal, {
                canRecord: WAMSettingsUtils.canStartRecording(this.wamSettings, this.tags, localUserStore.isLogged()),
            });
        } catch (e) {
            this.joinSpaceAbortController = undefined;
            throw e;
        }

        const spaceForThisJoin = this._space;
        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        this.isChatDisabled.set(disableChat);
        this.intentionallyClosed.set(false);
        this.isJoined.set(true);

        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        let hasUserInProximityChat = false;

        this.spaceUsersStore.forward(this._space.usersStore);
        this.spaceMetadataStore.set(new Map(this._space.getMetadata()));
        this.spaceMetadataSubscription?.unsubscribe();
        this.spaceMetadataSubscription = this._space.observeMetadata.subscribe((metadata) => {
            const previousMetadata = get(this.spaceMetadataStore);
            const nextMetadata = new Map(metadata);
            this.notifyNewPolls(previousMetadata, nextMetadata);
            this.notifyNewQuestions(previousMetadata, nextMetadata);
            this.spaceMetadataStore.set(nextMetadata);
        });

        this.usersUnsubscriber = this._space.usersStore.subscribe((users) => {
            this.users = users;
            this._currentMeetingParticipantsStore.set(this.mapSpaceUsersToMeetingParticipants(users));
            if (!hasUserInProximityChat && users.size > 1) {
                let name = this.unknownUserName;
                // Let's find the first user that is not us
                for (const user of users.values()) {
                    if (user.spaceUserId !== this._spaceUserId) {
                        name = user.name;
                        break;
                    }
                }

                const notificationText = get(LL).notification.discussion({
                    name,
                });
                notificationManager.createNotification(new BasicNotification(notificationText));
            }
            hasUserInProximityChat = users.size > 1;
            this.hasUserInProximityChat.set(users.size > 1);
        });

        const isBlackListed = (sender: string) => {
            const uuid = this.users?.get(sender)?.uuid;
            return uuid && blackListManager.isBlackListed(uuid);
        };

        this.spaceMessageSubscription?.unsubscribe();
        this.spaceMessageSubscription = this._space.observePublicEvent("spaceMessage").subscribe((event) => {
            if (isBlackListed(event.sender)) {
                return;
            }

            this.addNewMessage(
                event.spaceMessage.message,
                event.sender,
                event.spaceMessage.characterTextures ?? [],
                event.spaceMessage.name ?? "",
            );

            // Get the last message to use for notification
            const lastMessage = this.messages.length > 0 ? this.messages[this.messages.length - 1] : undefined;

            // if the proximity chat is not open, open it to see the message
            if (!get(this.intentionallyClosed)) {
                chatVisibilityStore.set(true);
                chatNotificationStore.clearRoom(this.id);
            } else {
                const previousCount = get(this.unreadMessagesCount);
                this.unreadMessagesCount.set(previousCount + 1);

                // Show proximity notification when unread count increases
                if (lastMessage && lastMessage.sender) {
                    const userName = lastMessage.sender.username ?? this.unknownUserName;
                    const messageBody = get(lastMessage.content).body;
                    const numberOfChar = 60;
                    const messageToDisplay =
                        messageBody.length > numberOfChar ? messageBody.slice(0, numberOfChar) + "..." : messageBody;
                    chatNotificationStore.addNotification(userName, messageToDisplay, this, lastMessage.id);
                }
            }
            if (get(selectedRoomStore) == undefined) selectedRoomStore.set(this);
        });

        this.spaceIsTypingSubscription?.unsubscribe();
        this.spaceIsTypingSubscription = this._space.observePublicEvent("spaceIsTyping").subscribe((event) => {
            if (isBlackListed(event.sender) || disableChat) {
                return;
            }
            if (event.spaceIsTyping.isTyping) {
                this.addTypingUser(event.sender, event.spaceIsTyping.characterTextures, event.spaceIsTyping.name);
            } else {
                this.removeTypingUser(event.sender);
            }
        });
        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        this.saveChatState();

        const actualStatus = get(availabilityStatusStore);
        if (!isAChatRoomIsVisible()) {
            selectedRoomStore.set(this);
            navChat.switchToChat();
            if (
                !get(requestedMicrophoneState) &&
                !get(requestedCameraState) &&
                (actualStatus === AvailabilityStatus.ONLINE || actualStatus === AvailabilityStatus.AWAY)
            ) {
                // If the user is not on the mobile, open the chat
                // The user experience is disrupted by the chat on mobile
                if (!isMediaBreakpointUp("md")) {
                    chatVisibilityStore.set(true);
                    chatNotificationStore.clearRoom(this.id);
                }
            }
        }
        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        let users: SpaceUserExtended[] = [];
        if (!isMeetingRoomChat) {
            // Let's wait for the users to be loaded
            try {
                users = await this.getFirstUsers(this._space, {
                    signal: joinSignal,
                });
            } catch (e) {
                await this.cleanupJoinAttemptAndLeave(spaceForThisJoin);
                throw e;
            }
            await this.throwIfAborted(joinSignal, spaceForThisJoin);

            const playersInSpace = this.mapSpaceUsersToRemotePlayers(users);
            if (this.isDefaultProximityRoom()) {
                iframeListener.sendJoinProximityMeetingEvent(playersInSpace);
            }
            faviconManager.pushNotificationFavicon();
            screenWakeLock
                .requestWakeLock()
                .then((release) => (this.screenWakeRelease = release))
                .catch((error) => console.error(error));

            // Note: by design, if someone comes talk to us, there should be only one new user in the space.
            // So we know for sure that there is only one new user.
            const peer = Array.from(users.values()).find((user) => user.spaceUserId !== this._spaceUserId);

            if (peer) {
                statusChanger.setUserNameInteraction(peer.name ?? this.unknownUserName);
                statusChanger.applyInteractionRules();
            }
        }
        await this.throwIfAborted(joinSignal, spaceForThisJoin);
        if (!isMeetingRoomChat) {
            this.addEnteringChatWithUsers(users);
            this.soundManager.playBubbleInSound();
        } else {
            this.sendMessage(get(LL).chat.timeLine.youJoinedMeetingRoom(), "incoming", false);
            this.soundManager.playMeetingInSound();
        }
        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        this.spaceWatcherUserJoinedObserver = this._space.observeUserJoined.subscribe((spaceUser) => {
            debug("User joined space: ", spaceUser);
            if (spaceUser.spaceUserId === this._spaceUserId || isMeetingRoomChat) {
                return;
            }
            this.addIncomingUser(spaceUser);
        });

        this.spaceWatcherUserLeftObserver = this._space.observeUserLeft.subscribe((spaceUser) => {
            if (isMeetingRoomChat) return;
            this.addOutcomingUser(spaceUser);
        });
        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        // Now that we have the complete user list we can listen to incoming and outgoing users
        this.observeUserJoinedSubscription = this._space.observeUserJoined.subscribe((spaceUser) => {
            const player = this.getRemotePlayerFromSpaceUserId(spaceUser.spaceUserId);
            if (player) {
                iframeListener.sendParticipantJoinMeetingEvent(spaceName, player);
                if (this.isDefaultProximityRoom()) {
                    iframeListener.sendParticipantJoinProximityMeetingEvent(player);
                }
                if (!isMeetingRoomChat) {
                    if (this.users && this.users.size <= MAX_PARTICIPANTS_FOR_SOUND_NOTIFICATIONS) {
                        this.soundManager.playBubbleInSound();
                    }
                    return;
                }

                if (this.users && this.users.size <= MAX_PARTICIPANTS_FOR_SOUND_NOTIFICATIONS) {
                    this.soundManager.playMeetingInSound();
                }
            }
        });

        this.observeUserLeftSubscription = this._space.observeUserLeft.subscribe((spaceUser) => {
            const player = this.getRemotePlayerFromSpaceUserId(spaceUser.spaceUserId);
            if (player) {
                iframeListener.sendParticipantLeaveMeetingEvent(spaceName, player);
                if (this.isDefaultProximityRoom()) {
                    iframeListener.sendParticipantLeaveProximityMeetingEvent(player);
                }
                if (!isMeetingRoomChat) {
                    if (this.users && this.users.size <= MAX_PARTICIPANTS_FOR_SOUND_NOTIFICATIONS) {
                        this.soundManager.playBubbleOutSound();
                    }
                    return;
                }

                if (this.users && this.users.size <= MAX_PARTICIPANTS_FOR_SOUND_NOTIFICATIONS) {
                    this.soundManager.playMeetingOutSound();
                }
            }
            this.removeTypingUserbyID(spaceUser.spaceUserId);
        });
        await this.throwIfAborted(joinSignal, spaceForThisJoin);

        const playersInMeeting = this.mapSpaceUsersToRemotePlayers(Array.from((this.users ?? new Map()).values()));
        iframeListener.sendJoinMeetingEvent(spaceName, get(this.name), get(this.kind), playersInMeeting);

        this.joinSpaceAbortController = undefined;
        return this._space;
    }

    /**
     * Leaves the given space (so it is not leaked) and, only if that space is still the current one,
     * clears all state and subscriptions. If a newer join has already overwritten this._space,
     * we only leave the aborted join's space and do not touch the current instance state.
     */
    private async cleanupJoinAttemptAndLeave(space: SpaceInterface | undefined): Promise<void> {
        if (space) {
            try {
                await this.spaceRegistry.leaveSpace(space);
            } catch (error) {
                console.error("Error leaving space after abort: ", error);
                Sentry.captureException(error);
            }
        }
        if (this._space !== space) {
            return;
        }
        this.usersUnsubscriber?.();
        this.usersUnsubscriber = undefined;
        this.spaceMessageSubscription?.unsubscribe();
        this.spaceMessageSubscription = undefined;
        this.spaceIsTypingSubscription?.unsubscribe();
        this.spaceIsTypingSubscription = undefined;
        this.spaceMetadataSubscription?.unsubscribe();
        this.spaceMetadataSubscription = undefined;
        this.spaceWatcherUserJoinedObserver?.unsubscribe();
        this.spaceWatcherUserJoinedObserver = undefined;
        this.spaceWatcherUserLeftObserver?.unsubscribe();
        this.spaceWatcherUserLeftObserver = undefined;
        this.observeUserJoinedSubscription?.unsubscribe();
        this.observeUserJoinedSubscription = undefined;
        this.observeUserLeftSubscription?.unsubscribe();
        this.observeUserLeftSubscription = undefined;
        this.scriptingOutputAudioStreamManager?.close();
        this.scriptingOutputAudioStreamManager = undefined;
        this.scriptingInputAudioStreamManager?.close();
        this.scriptingInputAudioStreamManager = undefined;
        this.spaceUsersStore.forward(readable(new Map()));
        this.spaceMetadataStore.set(new Map());
        this.unreadQuestionIdsStore.set(new Set());
        this._space = undefined;
        this.isJoined.set(false);
        this.isChatDisabled.set(false);
        this.joinSpaceAbortController = undefined;
        this._currentMeetingParticipantsStore.set([]);
    }

    /**
     * Maps the space users map to the public MeetingParticipant list (for current meeting participants).
     */
    private mapSpaceUsersToMeetingParticipants(users: Map<string, SpaceUserExtended>): MeetingParticipant[] {
        return Array.from(users.values()).map((user) => ({
            spaceUserId: user.spaceUserId,
            name: user.name,
            uuid: user.uuid,
            pictureStore: user.pictureStore,
            playUri: user.playUri,
            roomName: user.roomName,
            tags: user.tags ?? [],
            cameraState: user.cameraState ?? false,
            microphoneState: user.microphoneState ?? false,
            screenSharingState: user.screenSharingState ?? false,
        }));
    }

    /**
     * If joinSignal is aborted, cleans up join state (for the given space only), leaves that space, and throws AbortError.
     * spaceForThisJoin is the space this join attempt created; it is used so we never clear state that a newer join has set.
     */
    private async throwIfAborted(joinSignal: AbortSignal, spaceForThisJoin: SpaceInterface | undefined): Promise<void> {
        if (!joinSignal.aborted) {
            return;
        }
        await this.cleanupJoinAttemptAndLeave(spaceForThisJoin);
        throw new AbortError(
            typeof joinSignal.reason === "object" && joinSignal.reason instanceof Error
                ? joinSignal.reason.message
                : "Join space aborted",
        );
    }

    /**
     * Wait for some users (that are not us) to be in the space, and return them.
     */
    private async getFirstUsers(space: SpaceInterface, options: { signal: AbortSignal }): Promise<SpaceUserExtended[]> {
        const users = await space.getUsers({ signal: options.signal });

        const otherUsers = Array.from(users.values()).filter((user) => user.spaceUserId !== this._spaceUserId);
        if (otherUsers.length > 0) {
            return otherUsers;
        }

        return new Promise<SpaceUserExtended[]>((resolve, reject) => {
            const onAbort = (event: Event) => {
                reject(asError(eventToAbortReason(event)));
            };
            const subscription = space.observeUserJoined.subscribe((user) => {
                if (user.spaceUserId !== this._spaceUserId) {
                    resolve([user]);
                    subscription.unsubscribe();
                    options.signal.removeEventListener("abort", onAbort);
                }
            });
            options.signal.addEventListener(
                "abort",
                (event: Event) => {
                    subscription.unsubscribe();
                    reject(asError(eventToAbortReason(event)));
                },
                { once: true },
            );
        });
    }

    private getRemotePlayerFromSpaceUserId(spaceUserId: string) {
        const { /*roomUrl,*/ userId } = this.extractUserIdAndRoomUrlFromSpaceId(spaceUserId);
        // Technically, we should check the roomUrl is the same as the current one.
        // In practice, all users in this space are in the same room.
        return this.remotePlayersRepository.getPlayers().get(userId);
    }

    private mapSpaceUsersToRemotePlayers(spaceUsers: SpaceUserExtended[]): MessageUserJoined[] {
        const playersInSpace: MessageUserJoined[] = [];

        for (const spaceUser of spaceUsers.values()) {
            const player = this.getRemotePlayerFromSpaceUserId(spaceUser.spaceUserId);
            if (player) {
                playersInSpace.push(player);
            }
        }

        return playersInSpace;
    }

    private extractUserIdAndRoomUrlFromSpaceId(spaceId: string): { roomUrl: string; userId: number } {
        const lastUnderscoreIndex = spaceId.lastIndexOf("_");
        if (lastUnderscoreIndex === -1) {
            throw new Error("Invalid spaceId format: no underscore found");
        }
        const userId = parseInt(spaceId.substring(lastUnderscoreIndex + 1));
        if (isNaN(userId)) {
            throw new Error("Invalid userId format: not a number");
        }
        const roomUrl = spaceId.substring(0, lastUnderscoreIndex);
        return { roomUrl, userId };
    }

    public async leaveSpace(spaceName: string, isMeetingRoomChat: boolean = false): Promise<boolean> {
        // Capture space before aborting so we still run full leave (UI + leaveSpace) even if
        // joinSpace's cleanup runs first and clears this._space.
        const space = this._space;
        if (this.joinSpaceAbortController) {
            this.joinSpaceAbortController.abort(new AbortError("Leave space called while joining a space"));
            this.joinSpaceAbortController = undefined;

            if (!space) {
                // We aborted the join before it completed (no space yet), so we are done.
                return false;
            }
        }
        if (!space) {
            console.error("Trying to leave a space that is not joined");
            return false;
        }
        if (space.getName() !== spaceName) {
            console.error(
                "Trying to leave a space different from the one joined : " + space.getName() + " !== " + spaceName,
            );
            return false;
        }

        this.isChatDisabled.set(false);
        this.intentionallyClosed.set(false);
        this.unreadMessagesCount.set(0);
        chatNotificationStore.clearRoom(this.id);

        this.spaceUsersStore.forward(readable(new Map()));
        this.spaceMetadataStore.set(new Map());
        this.unreadQuestionIdsStore.set(new Set());
        this._space = undefined;
        this.isJoined.set(false);
        this._currentMeetingParticipantsStore.set([]);

        hideBubbleConfirmationModal();
        iframeListener.sendLeaveMeetingEvent(spaceName);
        if (this.isDefaultProximityRoom()) {
            iframeListener.sendLeaveProximityMeetingEvent();
        }
        faviconManager.pushOriginalFavicon();

        if (!isMeetingRoomChat) {
            this.soundManager.playBubbleOutSound();
        } else {
            this.soundManager.playMeetingOutSound();
        }

        if (this.screenWakeRelease) {
            this.screenWakeRelease().catch((error) => console.error(error));
            this.screenWakeRelease = undefined;
        }

        if (this.users) {
            if (this.users.size > 2) {
                if (isMeetingRoomChat) {
                    this.sendMessage(get(LL).chat.timeLine.youleftMeetingRoom(), "outcoming", false);
                } else {
                    this.sendMessage(get(LL).chat.timeLine.youLeft(), "outcoming", false);
                }
            } else {
                for (const user of this.users.values()) {
                    if (user.spaceUserId === this._spaceUserId) {
                        continue;
                    }
                    if (isMeetingRoomChat) {
                        this.sendMessage(get(LL).chat.timeLine.youleftMeetingRoom(), "outcoming", false);
                    } else {
                        this.sendMessage(get(LL).chat.timeLine.outcoming({ userName: user.name }), "outcoming", false);
                    }
                }
            }
            this.typingMembers.set([]);
        }
        this.hasUserInProximityChat.set(false);

        this.restoreChatState();

        this.spaceWatcherUserJoinedObserver?.unsubscribe();
        this.spaceWatcherUserLeftObserver?.unsubscribe();
        this.spaceWatcherUserJoinedObserver = undefined;
        this.spaceWatcherUserLeftObserver = undefined;
        this.observeUserJoinedSubscription?.unsubscribe();
        this.observeUserLeftSubscription?.unsubscribe();
        this.observeUserJoinedSubscription = undefined;
        this.observeUserLeftSubscription = undefined;
        if (this.usersUnsubscriber) {
            this.usersUnsubscriber();
        }
        this.users = undefined;

        this.spaceMessageSubscription?.unsubscribe();
        this.spaceIsTypingSubscription?.unsubscribe();
        this.spaceMetadataSubscription?.unsubscribe();
        this.spaceMetadataSubscription = undefined;

        this.scriptingOutputAudioStreamManager?.close();
        this.scriptingInputAudioStreamManager?.close();
        this.scriptingOutputAudioStreamManager = undefined;
        this.scriptingInputAudioStreamManager = undefined;

        try {
            await this.spaceRegistry.leaveSpace(space);
        } catch (error) {
            console.error("Error leaving space: ", error);
            Sentry.captureException(error);
        }
        return true;
    }

    private restoreChatState() {
        if (get(selectedRoomStore) == this && get(shouldRestoreChatStateStore)) {
            selectedRoomStore.set(this.currentMatrixRoom);
        }

        chatVisibilityStore.set(this.currentChatVisibility);
        shouldRestoreChatStateStore.set(false);
    }

    private saveChatState() {
        const currentChatVisibility = get(chatVisibilityStore);
        const currentRoom = get(selectedRoomStore);
        this.currentChatVisibility = currentChatVisibility;
        this.currentMatrixRoom = currentRoom;
        shouldRestoreChatStateStore.set(true);
    }

    public dispatchSound(url: URL): Promise<void> {
        if (!this._space) {
            console.error("Trying to dispatch sound in a space that is not joined");
            return Promise.resolve();
        }
        return this._space.dispatchSound(url);
    }

    public async startScriptingAudioStream(sampleRate: number): Promise<void> {
        await this.getOrCreateScriptingOutputAudioStreamManager().startStream(sampleRate);
    }

    public async appendScriptingAudioData(float32Array: Float32Array): Promise<void> {
        await this.getOrCreateScriptingOutputAudioStreamManager().appendPCMData(float32Array);
    }

    public stopScriptingAudioStream(): void {
        this.scriptingOutputAudioStreamManager?.stopStream();
    }

    public async resetScriptingAudioBuffer(): Promise<void> {
        await this.getOrCreateScriptingOutputAudioStreamManager().resetAudioBuffer();
    }

    public async startListeningToScriptingAudioStream(sampleRate: number, meetingId?: string): Promise<void> {
        await this.getOrCreateScriptingInputAudioStreamManager().startListeningToAudioStream(sampleRate, meetingId);
    }

    public stopListeningToScriptingAudioStream(): void {
        this.scriptingInputAudioStreamManager?.stopListeningToAudioStream();
    }

    private getOrCreateScriptingOutputAudioStreamManager(): ScriptingOutputAudioStreamManager {
        if (!this._space) {
            throw new Error("Trying to start a scripting audio stream in a space that is not joined");
        }
        if (!this.scriptingOutputAudioStreamManager) {
            this.scriptingOutputAudioStreamManager = new ScriptingOutputAudioStreamManager(this._space);
        }
        return this.scriptingOutputAudioStreamManager;
    }

    private getOrCreateScriptingInputAudioStreamManager(): ScriptingInputAudioStreamManager {
        if (!this._space) {
            throw new Error("Trying to listen to scripting audio streams in a space that is not joined");
        }
        if (!this.scriptingInputAudioStreamManager) {
            this.scriptingInputAudioStreamManager = new ScriptingInputAudioStreamManager(this._space);
        }
        return this.scriptingInputAudioStreamManager;
    }

    /**
     * Returns the name of the currently joined space, or undefined if not in any space.
     */
    public getCurrentSpaceName(): string | undefined {
        return this._space?.getName();
    }

    /**
     * Returns the currently joined space, or undefined if not in any space.
     */
    public getCurrentSpace(): SpaceInterface | undefined {
        return this._space;
    }

    public destroy(): void {
        this.spaceMessageSubscription?.unsubscribe();
        this.spaceIsTypingSubscription?.unsubscribe();
        this.spaceMetadataSubscription?.unsubscribe();
        this.roomSidePanelUnsubscriber();
        this.selectedRoomUnsubscriber();

        this.scriptingOutputAudioStreamManager?.close();
        this.scriptingInputAudioStreamManager?.close();
        this.spaceWatcherUserJoinedObserver?.unsubscribe();
        this.spaceWatcherUserLeftObserver?.unsubscribe();
        this.observeUserJoinedSubscription?.unsubscribe();
        this.observeUserLeftSubscription?.unsubscribe();
        if (this.usersUnsubscriber) {
            this.usersUnsubscriber();
        }
    }
}
