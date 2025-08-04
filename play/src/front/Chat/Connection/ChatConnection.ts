import { Readable, Writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import { StateEvents } from "matrix-js-sdk";
import { RoomConnection } from "../../Connection/RoomConnection";

export type memberTypingInformation = { id: string; name: string | null; avatarUrl: string | null };
export interface ChatUser {
    chatId: string;
    uuid?: string;
    availabilityStatus: Readable<AvailabilityStatus>;
    username: string | undefined;
    avatarUrl: string | undefined;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceUserId: string | undefined;
}

export type PartialChatUser = Partial<ChatUser> & { chatId: string };

export type ChatRoomMembership = "ban" | "leave" | "knock" | "join" | "invite" | string;

export enum ChatPermissionLevel {
    USER = "USER",
    MODERATOR = "MODERATOR",
    ADMIN = "ADMIN",
}

export type ModerationAction = "ban" | "kick" | "invite" | "redact";

export interface ChatRoomMember {
    id: string;
    name: Readable<string>;
    membership: Readable<ChatRoomMembership>;
    permissionLevel: Readable<ChatPermissionLevel>;
}
export interface ChatRoom {
    readonly id: string;
    readonly name: Readable<string>;
    readonly type: "direct" | "multiple";
    readonly hasUnreadMessages: Readable<boolean>;
    readonly avatarUrl: string | undefined;
    readonly messages: Readable<readonly ChatMessage[]>;
    readonly sendMessage: (message: string) => void;
    readonly sendFiles: (files: FileList) => Promise<void>;
    readonly setTimelineAsRead: () => void;
    readonly hasPreviousMessage: Readable<boolean>;
    readonly loadMorePreviousMessages: () => Promise<void>;
    readonly isEncrypted: Readable<boolean>;
    readonly typingMembers: Readable<Array<{ id: string; name: string | null; avatarUrl: string | null }>>;
    readonly startTyping: () => Promise<object>;
    readonly stopTyping: () => Promise<object>;
    readonly isRoomFolder: boolean;
    readonly lastMessageTimestamp: number;
}

export interface ChatRoomMembershipManagement {
    readonly name: Readable<string>;
    readonly myMembership: Readable<ChatRoomMembership>;
    readonly members: Readable<ChatRoomMember[]>;
    readonly joinRoom: () => Promise<void>;
    readonly leaveRoom: () => Promise<void>;
}

export interface ChatRoomNotificationControl {
    readonly areNotificationsMuted: Readable<boolean>;
    readonly unmuteNotification: () => Promise<void>;
    readonly muteNotification: () => Promise<void>;
}

export interface ChatRoomModeration {
    readonly id: string;
    readonly inviteUsers: (userIds: string[]) => Promise<void>;
    readonly hasPermissionTo: (action: ModerationAction, member?: ChatRoomMember) => Readable<boolean>;
    readonly hasPermissionForRoomStateEvent: (eventType: keyof StateEvents) => Readable<boolean>;
    readonly kick: (userID: string) => Promise<void>;
    readonly ban: (userID: string) => Promise<void>;
    readonly unban: (userID: string) => Promise<void>;
    readonly changePermissionLevelFor: (member: ChatRoomMember, permissionLevel: ChatPermissionLevel) => Promise<void>;
    readonly getAllowedRolesToAssign: () => ChatPermissionLevel[];
    readonly canModifyRoleOf: (permissionLevel?: ChatPermissionLevel) => boolean;
}

//Readonly attributes
export interface ChatMessage {
    id: string;
    sender: ChatUser | undefined;
    content: Readable<ChatMessageContent>;
    isMyMessage: boolean;
    isQuotedMessage: boolean | undefined;
    date: Date | null;
    quotedMessage: ChatMessage | undefined;
    type: ChatMessageType;
    reactions: MapStore<string, ChatMessageReaction>;
    remove: () => void;
    edit: (newContent: string) => Promise<void>;
    isDeleted: Readable<boolean>;
    isModified: Readable<boolean>;
    addReaction: (reaction: string) => Promise<void>;
    canDelete: Readable<boolean>;
}

export interface ChatMessageReaction {
    key: string;
    users: MapStore<string, ChatUser>;
    react: () => void;
    reacted: Readable<boolean>;
}

export type ChatMessageType = "proximity" | "text" | "incoming" | "outcoming" | "image" | "file" | "audio" | "video";
export type ChatMessageContent = {
    /**
     * The body can contain HTML. It will be run against DOMPurify before being outputted to the user.
     */
    body: string;
    url: string | undefined;
};
export const historyVisibilityOptions = ["joined", "invited", "world_readable"] as const;
export type historyVisibility = (typeof historyVisibilityOptions)[number];

export interface RoomFolder extends ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration {
    id: string;
    name: Readable<string>;
    rooms: Readable<ChatRoom[]>;
    folders: Readable<RoomFolder[]>;
    invitations: Readable<ChatRoom[]>;
    suggestedRooms: Readable<{ name: string; id: string; avatarUrl: string }[]>;
    joinableRooms: Readable<{ name: string; id: string; avatarUrl: string }[]>;
    hasChildRoomsError: Writable<boolean>;
}

export interface CreateRoomOptions {
    name?: string;
    visibility?: "private" | "public" | "restricted";
    is_direct?: boolean;
    historyVisibility?: historyVisibility;
    invite?: { value: string; label: string }[];
    preset?: "private_chat" | "public_chat" | "trusted_private_chat";
    encrypt?: boolean;
    parentSpaceID?: string;
    description?: string;
    suggested?: boolean;
}

export type ConnectionStatus = "ONLINE" | "ON_ERROR" | "CONNECTING" | "OFFLINE";

export type userId = number;
export type chatId = string;
export type ChatSpaceRoom = ChatRoom;
export interface ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus>;
    directRooms: Readable<ChatRoom[]>;
    rooms: Readable<(ChatRoom & ChatRoomMembershipManagement)[]>;
    invitations: Readable<ChatRoom[]>;
    folders: Readable<RoomFolder[]>;
    createRoom: (roomOptions: CreateRoomOptions) => Promise<{ room_id: string }>;
    createFolder: (roomOptions: CreateRoomOptions) => Promise<{ room_id: string }>;
    createDirectRoom(userChatId: string): Promise<(ChatRoom & ChatRoomMembershipManagement) | undefined>;
    roomCreationInProgress: Readable<boolean>;
    getDirectRoomFor(userChatId: string): (ChatRoom & ChatRoomMembershipManagement) | undefined;
    searchAccessibleRooms(searchText: string): Promise<
        {
            id: string;
            name: string | undefined;
        }[]
    >;

    joinRoom(roomId: string): Promise<ChatRoom | undefined>;

    destroy(): Promise<void>;
    searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined>;
    isEncryptionRequiredAndNotSet: Readable<boolean>;
    initEndToEndEncryption(): Promise<void>;
    isGuest: Readable<boolean>;
    hasUnreadMessages: Readable<boolean>;
    clearListener: () => void;
    directRoomsUsers: Readable<ChatUser[]>;
    isUserExist: (address: string) => Promise<boolean>;
    getRoomByID(roomId: string): ChatRoom;
    retrySendingEvents: () => Promise<void>;
    shouldRetrySendingEvents: Readable<boolean>;
}

export type Connection = Pick<RoomConnection, "queryChatMembers" | "emitPlayerChatID" | "emitBanPlayerMessage">;
