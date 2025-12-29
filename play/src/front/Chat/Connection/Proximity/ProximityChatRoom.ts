import * as Sentry from "@sentry/svelte";
import Debug from "debug";
import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import type { Readable, Writable, Unsubscriber } from "svelte/store";
import { get, writable, readable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import type { Subscription } from "rxjs";
import type { CharacterTextureMessage } from "@workadventure/messages";
import { AvailabilityStatus, FilterType } from "@workadventure/messages";
import { ChatMessageTypes } from "@workadventure/shared-utils";
import { asError } from "catch-unknown";
import { eventToAbortReason } from "@workadventure/shared-utils/src/Abort/raceAbort";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type {
    AnyKindOfUser,
    ChatMessage,
    ChatMessageContent,
    ChatMessageReaction,
    ChatMessageType,
    ChatRoom,
} from "../ChatConnection";
import LL, { locale } from "../../../../i18n/i18n-svelte";
import { iframeListener } from "../../../Api/IframeListener";
import type { SpaceInterface, SpaceUserExtended } from "../../../Space/SpaceInterface";
import type { SpaceRegistryInterface } from "../../../Space/SpaceRegistry/SpaceRegistryInterface";
import { chatVisibilityStore } from "../../../Stores/ChatStore";
import { isAChatRoomIsVisible, navChat, shouldRestoreChatStateStore } from "../../Stores/ChatStore";
import { selectedRoomStore } from "../../Stores/SelectRoomStore";
import { mapExtendedSpaceUserToChatUser } from "../../UserProvider/ChatUserMapper";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { availabilityStatusStore, requestedCameraState, requestedMicrophoneState } from "../../../Stores/MediaStore";
import { localUserStore } from "../../../Connection/LocalUserStore";
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
        public type: ChatMessageType
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

type SoundManager = Pick<GameScene, "playBubbleInSound" | "playBubbleOutSound">;

export class ProximityChatRoom implements ChatRoom {
    id = "proximity";
    name = writable("Proximity Chat");
    type: "direct" | "multiple" = "direct";
    hasUnreadMessages = writable(false);
    unreadNotificationCount = writable(0);
    pictureStore = readable(undefined);
    messages: SearchableArrayStore<string, ChatMessage> = new SearchableArrayStore((item) => item.id);
    messageReactions: MapStore<string, MapStore<string, ChatMessageReaction>> = new MapStore();
    hasPreviousMessage = writable(false);
    isEncrypted = writable(false);
    typingMembers: Writable<Array<{ id: string; name: string | null; pictureStore: PictureStore }>>;
    private _space: SpaceInterface | undefined;
    private _spacePromise: Promise<SpaceInterface | undefined> = Promise.resolve(undefined);
    private spaceMessageSubscription: Subscription | undefined;
    private spaceIsTypingSubscription: Subscription | undefined;
    private observeUserJoinedSubscription: Subscription | undefined;
    private observeUserLeftSubscription: Subscription | undefined;
    // Users by spaceUserId
    private users: Map<string, SpaceUserExtended> | undefined;
    private usersUnsubscriber: Unsubscriber | undefined;
    private spaceWatcherUserJoinedObserver: Subscription | undefined;
    private spaceWatcherUserLeftObserver: Subscription | undefined;
    private newChatMessageWritingStatusStreamUnsubscriber: Subscription;
    private joinSpaceAbortController: AbortController | undefined;
    areNotificationsMuted = writable(false);
    isRoomFolder = false;
    lastMessageTimestamp = 0;
    hasUserInProximityChat = writable(false);
    currentMatrixRoom: ChatRoom | undefined;
    currentChatVisibility = false;

    private unknownUser = {
        chatId: "0",
        uuid: "0",
        availabilityStatus: writable(AvailabilityStatus.ONLINE),
        username: "Unknown",
        pictureStore: readable(undefined),
        roomName: undefined,
        playUri: undefined,
        color: undefined,
        spaceUserId: undefined,
    } as AnyKindOfUser;

    private scriptingOutputAudioStreamManager: ScriptingOutputAudioStreamManager | undefined;
    private scriptingInputAudioStreamManager: ScriptingInputAudioStreamManager | undefined;
    private startListeningToStreamInBubbleStreamUnsubscriber: Subscription;
    private stopListeningToStreamInBubbleStreamUnsubscriber: Subscription;
    private screenWakeRelease: undefined | (() => Promise<void>);

    constructor(
        private _spaceUserId: string,
        private spaceRegistry: SpaceRegistryInterface,
        iframeListenerInstance: Pick<typeof iframeListener, "newChatMessageWritingStatusStream">,
        private remotePlayersRepository: RemotePlayersRepository,
        private soundManager: SoundManager,
        private notifyNewMessage = (message: ProximityChatMessage) => {
            if (!localUserStore.getChatSounds() || get(this.areNotificationsMuted)) return;
            gameManager.getCurrentGameScene().playSound("new-message");
            notificationManager.createNotification(
                new MessageNotification(
                    message.sender.username ?? "unknown",
                    get(message.content).body,
                    this.id,
                    get(this.name)
                )
            );
        }
    ) {
        this.typingMembers = writable([]);

        this.newChatMessageWritingStatusStreamUnsubscriber =
            iframeListenerInstance.newChatMessageWritingStatusStream.subscribe((status) => {
                if (status === ChatMessageTypes.userWriting) {
                    this.startTyping().catch((e) => {
                        console.error("Error while sending typing status", e);
                    });
                } else if (status === ChatMessageTypes.userStopWriting) {
                    this.stopTyping().catch((e) => {
                        console.error("Error while sending typing status", e);
                    });
                }
            });

        this.startListeningToStreamInBubbleStreamUnsubscriber =
            iframeListener.startListeningToStreamInBubbleStream.subscribe((message) => {
                if (!this.scriptingInputAudioStreamManager) {
                    console.error("Trying to start listening to stream in bubble but no bubble has been joined yet");
                    return;
                }
                this.scriptingInputAudioStreamManager.startListeningToAudioStream(message.sampleRate).catch((e) => {
                    console.error("Error while starting listening to streams", e);
                    Sentry.captureException(e);
                });
            });

        this.stopListeningToStreamInBubbleStreamUnsubscriber =
            iframeListener.stopListeningToStreamInBubbleStream.subscribe(() => {
                if (!this.scriptingInputAudioStreamManager) {
                    console.error("Trying to stop listening to stream in bubble but no bubble has been joined yet");
                    return;
                }
                this.scriptingInputAudioStreamManager.stopListeningToAudioStream();
            });
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
            action
        );

        // Add message to the list
        this.messages.push(newMessage);

        this.lastMessageTimestamp = newMessage.date.getTime();

        // Use the room connection to send the message to other users of the space
        if (broadcast) {
            this._space?.emitPublicMessage({
                $case: "spaceMessage",
                spaceMessage: {
                    message: message,
                    characterTextures: spaceUser?.characterTextures ?? [],
                    name: chatUser.username ?? "unknown",
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
        /*const newChatUser = mapExtendedSpaceUserToChatUser(spaceUser);

        //if (userUuid === this._userUuid) return;
        this._connection.connectedUsers.update((users) => {
            users.set(userId, newChatUser);
            return users;
        });
        this.membersId.push(userId.toString());*/
    }

    private addOutcomingUser(spaceUser: SpaceUserExtended): void {
        this.sendMessage(get(LL).chat.timeLine.outcoming({ userName: spaceUser.name }), "outcoming", false);
        this.removeTypingUserbyID(spaceUser.spaceUserId.toString());

        /*this._connection.connectedUsers.update((users) => {
            users.delete(userId);
            return users;
        });
        this.membersId = this.membersId.filter((id) => id !== userId.toString());*/
    }

    /**
     * Add a message from a remote user to the proximity chat.
     */
    private addNewMessage(
        message: string,
        senderUserId: string,
        characterTextures: CharacterTextureMessage[],
        name: string
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
        let chatUser: AnyKindOfUser = this.unknownUser;
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
            "proximity"
        );

        // Add message to the list
        this.messages.push(newMessage);

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
    setTimelineAsRead(): void {
        console.info("setTimelineAsRead => Method not implemented yet!");
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
                username: authorName ?? this.unknownUser.username,
            },
            writable(newChatMessageContent),
            new Date(),
            false,
            "proximity"
        );

        // Add message to the list
        this.messages.push(newMessage);

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
        name: string | undefined
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
        if (sender === undefined) {
            return;
        }

        const id = sender.spaceUserId.toString();

        this.typingMembers.update((typingMembers) => {
            return typingMembers.filter((user) => user.id !== id);
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
        filterType: FilterType = FilterType.ALL_USERS
    ): Promise<void> {
        if (this.joinSpaceAbortController) {
            throw new Error("A space is already being joined");
        }
        if (this._space && !this._space.destroyed) {
            // Let's wait for the previous space to be left before joining a new one
            // This can happen for instance when we leave a bubble to jump right away into a meeting room.
            const space = this._space;
            await new Promise<void>((resolve) => {
                const subscription = space.onLeaveSpace.subscribe(() => {
                    resolve();
                    subscription.unsubscribe();
                });
            });
        }
        this.joinSpaceAbortController = new AbortController();
        this._space = await this.spaceRegistry.joinSpace(
            spaceName,
            filterType,
            propertiesToSync,
            this.joinSpaceAbortController.signal
        );

        // TODO: we need to move that elsewhere.
        // Set up manager of audio streams received by the scripting API (useful for bots)
        this.scriptingOutputAudioStreamManager = new ScriptingOutputAudioStreamManager(this._space);
        this.scriptingInputAudioStreamManager = new ScriptingInputAudioStreamManager(this._space);

        let hasUserInProximityChat = false;

        this.usersUnsubscriber = this._space.usersStore.subscribe((users) => {
            this.users = users;
            if (!hasUserInProximityChat && users.size > 1) {
                let name = "unknown";
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
                event.spaceMessage.name ?? ""
            );

            // if the proximity chat is not open, open it to see the message
            chatVisibilityStore.set(true);
            if (get(selectedRoomStore) == undefined) selectedRoomStore.set(this);
        });

        this.spaceIsTypingSubscription?.unsubscribe();
        this.spaceIsTypingSubscription = this._space.observePublicEvent("spaceIsTyping").subscribe((event) => {
            if (isBlackListed(event.sender)) {
                return;
            }
            if (event.spaceIsTyping.isTyping) {
                this.addTypingUser(event.sender, event.spaceIsTyping.characterTextures, event.spaceIsTyping.name);
            } else {
                this.removeTypingUser(event.sender);
            }
        });

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
                }
            }
        }

        if (!isMeetingRoomChat) {
            // Let's wait for the users to be loaded
            let users: SpaceUserExtended[] = [];
            try {
                users = await this.getFirstUsers(this._space, {
                    signal: this.joinSpaceAbortController.signal,
                });
            } catch (e) {
                this.usersUnsubscriber?.();
                this.spaceMessageSubscription?.unsubscribe();
                this.spaceIsTypingSubscription?.unsubscribe();
                if (this._space) {
                    this.spaceRegistry.leaveSpace(this._space).catch((error) => {
                        console.error("Error leaving space: ", error);
                        Sentry.captureException(error);
                    });
                }
                this._space = undefined;
                throw e;
            }

            const playersInSpace: MessageUserJoined[] = [];

            for (const spaceUser of users.values()) {
                const player = this.getRemotePlayerFromSpaceUserId(spaceUser.spaceUserId);
                if (player) {
                    playersInSpace.push(player);
                }
            }
            iframeListener.sendJoinProximityMeetingEvent(playersInSpace);
            this.soundManager.playBubbleInSound();
            faviconManager.pushNotificationFavicon();
            screenWakeLock
                .requestWakeLock()
                .then((release) => (this.screenWakeRelease = release))
                .catch((error) => console.error(error));

            // Note: by design, if someone comes talk to us, there should be only one new user in the space.
            // So we know for sure that there is only one new user.
            const peer = Array.from(users.values()).find((user) => user.spaceUserId !== this._spaceUserId);

            if (peer) {
                statusChanger.setUserNameInteraction(peer.name ?? "unknown");
                statusChanger.applyInteractionRules();
            }

            if (!isMeetingRoomChat) {
                this.addEnteringChatWithUsers(users);
            } else {
                this.sendMessage(get(LL).chat.timeLine.youJoinedMeetingRoom(), "incoming", false);
            }
        }

        this.spaceWatcherUserJoinedObserver = this._space.observeUserJoined.subscribe((spaceUser) => {
            debug("User joined space: ", spaceUser);
            if (spaceUser.spaceUserId === this._spaceUserId) {
                return;
            }
            this.addIncomingUser(spaceUser);
        });

        this.spaceWatcherUserLeftObserver = this._space.observeUserLeft.subscribe((spaceUser) => {
            this.addOutcomingUser(spaceUser);
        });

        // Now that we have the complete user list we can listen to incoming and outgoing users
        this.observeUserJoinedSubscription = this._space.observeUserJoined.subscribe((spaceUser) => {
            const player = this.getRemotePlayerFromSpaceUserId(spaceUser.spaceUserId);
            if (player) {
                iframeListener.sendParticipantJoinProximityMeetingEvent(player);
                this.soundManager.playBubbleInSound();
            }
        });

        this.observeUserLeftSubscription = this._space.observeUserLeft.subscribe((spaceUser) => {
            const player = this.getRemotePlayerFromSpaceUserId(spaceUser.spaceUserId);
            if (player) {
                iframeListener.sendParticipantLeaveProximityMeetingEvent(player);
                this.soundManager.playBubbleOutSound();
            }
        });

        this.joinSpaceAbortController = undefined;
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
                { once: true }
            );
        });
    }

    private getRemotePlayerFromSpaceUserId(spaceUserId: string) {
        const { /*roomUrl,*/ userId } = this.extractUserIdAndRoomUrlFromSpaceId(spaceUserId);
        // Technically, we should check the roomUrl is the same as the current one.
        // In practice, all users in this space are in the same room.
        return this.remotePlayersRepository.getPlayers().get(userId);
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

    public async leaveSpace(spaceName: string, isMeetingRoomChat: boolean = false): Promise<void> {
        if (this.joinSpaceAbortController) {
            this.joinSpaceAbortController.abort(new AbortError("Leave space called while joining a space"));
            this.joinSpaceAbortController = undefined;

            if (!this._space) {
                // We aborted the join before it completed, so we are done.
                return;
            }
        }
        const space = this._space;
        if (!space) {
            console.error("Trying to leave a space that is not joined");
            return;
        }
        if (space.getName() !== spaceName) {
            console.error("Trying to leave a space different from the one joined");
            return;
        }
        this._space = undefined;

        hideBubbleConfirmationModal();
        iframeListener.sendLeaveProximityMeetingEvent();
        faviconManager.pushOriginalFavicon();
        this.soundManager.playBubbleOutSound();
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
        return undefined;
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

    public destroy(): void {
        this.newChatMessageWritingStatusStreamUnsubscriber.unsubscribe();
        this.startListeningToStreamInBubbleStreamUnsubscriber.unsubscribe();
        this.stopListeningToStreamInBubbleStreamUnsubscriber.unsubscribe();
        this.spaceMessageSubscription?.unsubscribe();
        this.spaceIsTypingSubscription?.unsubscribe();

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
