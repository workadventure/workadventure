import * as Sentry from "@sentry/svelte";
import { MapStore, SearchableArrayStore } from "@workadventure/store-utils";
import { Readable, Writable, get, writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { Subscription } from "rxjs";
import { AvailabilityStatus } from "@workadventure/messages";
import {
    ChatMessage,
    ChatMessageContent,
    ChatMessageReaction,
    ChatMessageType,
    ChatRoom,
    ChatRoomMembership,
    ChatUser,
} from "../ChatConnection";
import LL from "../../../../i18n/i18n-svelte";
import { gameManager } from "../../../Phaser/Game/GameManager";
import { iframeListener } from "../../../Api/IframeListener";
import { RoomConnection } from "../../../Connection/RoomConnection";
import { SpaceInterface } from "../../../Space/SpaceInterface";
import { SpaceRegistryInterface } from "../../../Space/SpaceRegistry/SpaceRegistryInterface";
import { chatVisibilityStore } from "../../../Stores/ChatStore";
import { selectedRoom } from "../../Stores/ChatStore";
import { SpaceFilterInterface } from "../../../Space/SpaceFilter/SpaceFilter";

export class ProximityChatMessage implements ChatMessage {
    isQuotedMessage = undefined;
    quotedMessage = undefined;
    isDeleted = writable(false);
    isModified = writable(false);

    constructor(
        public id: string,
        public sender: ChatUser,
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

export class ProximityChatRoom implements ChatRoom {
    id = "proximity";
    name = writable("Proximity Chat");
    type: "direct" | "multiple" = "direct";
    hasUnreadMessages = writable(false);
    avatarUrl = undefined;
    messages: SearchableArrayStore<string, ChatMessage> = new SearchableArrayStore((item) => item.id);
    messageReactions: MapStore<string, MapStore<string, ChatMessageReaction>> = new MapStore();
    myMembership: ChatRoomMembership = "member";
    membersId: string[] = [];
    hasPreviousMessage = writable(false);
    isEncrypted = writable(false);
    typingMembers: Writable<Array<{ id: string; name: string | null; avatarUrl: string | null }>>;
    private _space: SpaceInterface | undefined;
    private _spaceWatcher: SpaceFilterInterface | undefined;
    private spaceMessageSubscription: Subscription | undefined;
    private spaceIsTypingSubscription: Subscription | undefined;

    private unknownUser = {
        chatId: "0",
        uuid: "0",
        availabilityStatus: writable(AvailabilityStatus.ONLINE),
        username: "Unknown",
        avatarUrl: undefined,
        roomName: undefined,
        playUri: undefined,
        color: undefined,
        id: undefined,
    } as ChatUser;

    constructor(
        private roomConnection: RoomConnection,
        private _userId: number,
        private spaceRegistry: SpaceRegistryInterface
    ) {
        this.typingMembers = writable([]);
    }

    sendMessage(message: string, action: ChatMessageType = "proximity", broadcast = true): void {
        // Create content message
        const newChatMessageContent = {
            body: message,
            url: undefined,
        };

        // Create message
        const newMessage = new ProximityChatMessage(
            uuidv4(),
            get(this._connection.connectedUsers).get(this._userId) ?? this.unknownUser,
            writable(newChatMessageContent),
            new Date(),
            true,
            action
        );

        // Add message to the list
        this.messages.push(newMessage);

        // Use the room connection to send the message to other users of the space
        const spaceName = get(this._connection.spaceName);
        if (broadcast && spaceName != undefined) {
            this.roomConnection.emitProximityPublicMessage(spaceName, message);
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

    addIncomingUser(userId: number, userUuid: string, userName: string, color?: string): void {
        this.sendMessage(get(LL).chat.timeLine.incoming({ userName }), "incoming", false);
        const playerWokaPictureStore = gameManager
            .getCurrentGameScene()
            .MapPlayersByKey.getNestedStore(userId, (item) => item.pictureStore);
        const newChatUser: ChatUser = {
            chatId: userId.toString(),
            uuid: userUuid,
            availabilityStatus: writable(AvailabilityStatus.ONLINE),
            username: userName,
            avatarUrl: get(playerWokaPictureStore) ?? undefined,
            roomName: undefined,
            playUri: undefined,
            color: color,
            id: undefined,
        };

        //if (userUuid === this._userUuid) return;
        this._connection.connectedUsers.update((users) => {
            users.set(userId, newChatUser);
            return users;
        });
        this.membersId.push(userId.toString());
    }

    addOutcomingUser(userId: number, userUuid: string, userName: string): void {
        this.sendMessage(get(LL).chat.timeLine.outcoming({ userName }), "outcoming", false);

        this._connection.connectedUsers.update((users) => {
            users.delete(userId);
            return users;
        });
        this.membersId = this.membersId.filter((id) => id !== userId.toString());
    }

    private addNewMessage(message: string, senderUserId: number): void {
        // Create content message
        const newChatMessageContent = {
            body: message,
            url: undefined,
        };

        const sender: ChatUser | undefined = get(this._connection.connectedUsers).get(senderUserId);
        // Create message
        const newMessage = new ProximityChatMessage(
            uuidv4(),
            sender ?? this.unknownUser,
            writable(newChatMessageContent),
            new Date(),
            false,
            "proximity"
        );

        // Add message to the list
        this.messages.push(newMessage);

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
    leaveRoom(): void {
        throw new Error("leaveRoom => Method not implemented.");
    }
    joinRoom(): void {
        throw new Error("joinRoom => Method not implemented.");
    }
    loadMorePreviousMessages(): Promise<void> {
        return Promise.resolve();
    }

    addExternalMessage(message: string, authorName?: string): void {
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
    }

    startTyping(): Promise<object> {
        this._space?.emitPublicMessage({
            $case: "spaceIsTyping",
            spaceIsTyping: {
                isTyping: true,
            },
        });

        return Promise.resolve({});
    }
    stopTyping(): Promise<object> {
        this._space?.emitPublicMessage({
            $case: "spaceIsTyping",
            spaceIsTyping: {
                isTyping: false,
            },
        });

        return Promise.resolve({});
    }

    private addTypingUser(senderUserId: number): void {
        const sender: ChatUser | undefined = get(this._connection.connectedUsers).get(senderUserId);
        if (sender == undefined) return;

        this.typingMembers.update((typingMembers) => {
            if (typingMembers.find((user) => user.id === sender.chatId) == undefined) {
                typingMembers.push({
                    id: sender.chatId,
                    name: sender.username ?? null,
                    avatarUrl: sender.avatarUrl ?? null,
                });
            }
            return typingMembers;
        });
    }

    private removeTypingUser(senderUserId: number): void {
        const sender: ChatUser | undefined = get(this._connection.connectedUsers).get(senderUserId);
        if (sender == undefined) return;

        this.typingMembers.update((typingMembers) => {
            return typingMembers.filter((user) => user.id !== sender.chatId);
        });
    }

    addExternalTypingUser(id: string, name: string, avatarUrl: string | null): void {
        this.typingMembers.update((typingMembers) => {
            if (typingMembers.find((user) => user.id === id) == undefined) {
                typingMembers.push({ id, name, avatarUrl });
            }
            return typingMembers;
        });
    }

    removeExternalTypingUser(id: string) {
        this.typingMembers.update((typingMembers) => {
            return typingMembers.filter((user) => user.id !== id);
        });
    }

    getSpaceName(): string | undefined {
        return get(this._connection.spaceName);
    }

    /*get space(): Space | undefined {
        return this._space;
    }*/

    public joinSpace(spaceName: string): void {
        this._space = this.spaceRegistry.joinSpace(spaceName);
        // TODO: turn "watch" into "createWatcher" that takes a filter in parameter. The name should be generated automatically and not exposed to the user.
        this._spaceWatcher = this._space.watch("all_users");

        this.spaceMessageSubscription?.unsubscribe();
        this.spaceMessageSubscription = this._space.observePublicEvent("spaceMessage").subscribe((event) => {
            this.addNewMessage(event.spaceMessage.message, event.sender);

            // if the proximity chat is not open, open it to see the message
            chatVisibilityStore.set(true);
            if (get(selectedRoom) == undefined) selectedRoom.set(this);
        });

        this.spaceIsTypingSubscription?.unsubscribe();
        this.spaceIsTypingSubscription = this._space.observePublicEvent("spaceIsTyping").subscribe((event) => {
            if (event.spaceIsTyping.isTyping) {
                this.addTypingUser(event.sender);
            } else {
                this.removeTypingUser(event.sender);
            }
        });
    }

    public leaveSpace(spaceName: string): void {
        if (!this._space) {
            console.error("Trying to leave a space that is not joined");
            Sentry.captureMessage("Trying to leave a space that is not joined");
            return;
        }
        if (this._space.getName() !== spaceName) {
            console.error("Trying to leave a space different from the one joined");
            Sentry.captureMessage("Trying to leave a space different from the one joined");
            return;
        }
        this._space.stopWatching("all_users");
        this.spaceRegistry.leaveSpace(spaceName);
        this.spaceMessageSubscription?.unsubscribe();
        this.spaceIsTypingSubscription?.unsubscribe();
    }
}
