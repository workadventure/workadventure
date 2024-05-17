import { Readable, Writable } from "svelte/store";
import { AtLeast } from "@workadventure/map-editor";
import { AvailabilityStatus, PartialSpaceUser } from "@workadventure/messages";
import { MapStore } from "@workadventure/store-utils";
import { RoomConnection } from "../../Connection/RoomConnection";
import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";

export interface ChatUser {
    id: string;
    uuid?: string;
    availabilityStatus: Writable<AvailabilityStatus>;
    username: string | undefined;
    avatarUrl: string | null;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceId: number | undefined;
}

export type ChatRoomMembership = "ban" | "join" | "knock" | "leave" | "invite" | string;
export interface ChatRoom {
    id: string;
    name: Readable<string>;
    type: "direct" | "multiple";
    hasUnreadMessages: Readable<boolean>;
    avatarUrl: string | undefined;
    messages: Readable<readonly ChatMessage[]>;
    messageReactions: MapStore<string, MapStore<string, ChatMessageReaction>>;
    sendMessage: (message: string) => void;
    sendFiles: (files: FileList) => Promise<void>;
    myMembership: ChatRoomMembership;
    setTimelineAsRead: () => void;
    membersId: string[];
    leaveRoom: () => void;
    joinRoom: () => void;
    hasPreviousMessage: Readable<boolean>;
    loadMorePreviousMessages: () => Promise<void>;
    isEncrypted: Readable<boolean>;
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
    remove: () => void;
    edit: (newContent: string) => Promise<void>;
    isDeleted: Readable<boolean>;
    isModified: Readable<boolean>;
    addReaction: (reaction: string) => Promise<void>;
}

export interface ChatMessageReaction {
    key: string;
    users: MapStore<string, ChatUser>;
    react: () => void;
    reacted: Readable<boolean>;
}

export type ChatMessageType = "text" | "image" | "file" | "audio" | "video";
export type ChatMessageContent = { body: string; url: string | undefined };
export const historyVisibilityOptions = ["world_readable", "joined", "invited"] as const;
export type historyVisibility = (typeof historyVisibilityOptions)[number];

export interface CreateRoomOptions {
    name?: string;
    visibility?: "private" | "public";
    is_direct?: boolean;
    historyVisibility?: historyVisibility;
    invite?: { value: string; label: string }[];
    preset?: "private_chat" | "public_chat" | "trusted_private_chat";
    encrypt?: boolean;
}

export type ConnectionStatus = "ONLINE" | "ON_ERROR" | "CONNECTING" | "OFFLINE";

export interface ChatConnectionInterface {
    connectionStatus: Readable<ConnectionStatus>;
    userConnected: Readable<Map<string, ChatUser>>;
    userDisconnected: Readable<Map<string, ChatUser>>;
    directRooms: Readable<ChatRoom[]>;
    rooms: Readable<ChatRoom[]>;
    invitations: Readable<ChatRoom[]>;
    addUserFromSpace(user: SpaceUserExtended): void;
    updateUserFromSpace(user: PartialSpaceUser): void;
    disconnectSpaceUser(userId: number): void;
    sendBan: (uuid: string, username: string) => void;
    createRoom: (roomOptions: CreateRoomOptions) => Promise<{ room_id: string }>;
    createDirectRoom(userChatId: string): Promise<ChatRoom | undefined>;
    getDirectRoomFor(uuserChatId: string): ChatRoom | undefined;
    searchUsers(searchText: string): Promise<void>;
    searchAccesibleRooms(searchText: string): Promise<
        {
            id: string;
            name: string | undefined;
        }[]
    >;
    joinRoom(roomId: string): Promise<ChatRoom | undefined>;
    destroy(): void;
    searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined>;
}

export type Connection = AtLeast<RoomConnection, "queryChatMembers">;
