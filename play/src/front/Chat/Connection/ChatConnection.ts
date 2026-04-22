import type { Readable, Writable } from "svelte/store";
import type { AvailabilityStatus } from "@workadventure/messages";
import type { MapStore } from "@workadventure/store-utils";
import type { MatrixClient, StateEvents } from "matrix-js-sdk";
import type { ComponentType, SvelteComponent } from "svelte";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { PictureStore } from "../../Stores/PictureStore";

export type memberTypingInformation = { id: string; name: string | null; pictureStore: PictureStore };
export type ChatUser = {
    chatId: string;
    uuid?: string;
    availabilityStatus: Readable<AvailabilityStatus>;
    username: string | undefined;
    pictureStore: PictureStore | undefined;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceUserId: string | undefined;
};

export type AdminUser = {
    chatId?: string;
    uuid: string;
    availabilityStatus: Readable<AvailabilityStatus>;
    username: string | undefined;
    pictureStore: PictureStore | undefined;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceUserId: string | undefined;
};

export type AnyKindOfUser = ChatUser | AdminUser;

export type PartialChatUser = Partial<ChatUser> & { chatId: string };
export type PartialAdminUser = Partial<AdminUser> & { uuid: string };
export type PartialAnyKindOfUser = PartialChatUser | PartialAdminUser;

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
    pictureStore?: PictureStore;
    /** User list / merger color for Avatar letter & image background (Matrix rooms). */
    readonly avatarFallbackColor?: Readable<string | undefined>;
    /**
     * Matrix: WorkAdventure name (own user: account_data; others: merger) shown in parens only when it differs from the Matrix display name.
     */
    readonly waDisplayNameIfDifferent?: Readable<string | undefined>;
}
export interface ChatConversation {
    readonly id: string;
    readonly name: Readable<string>;
    /** Reactive: DM vs group can change (e.g. after ban/leave changes active member count). */
    readonly type: Readable<"direct" | "multiple">;
    readonly conversationKind: "room" | "thread";
    readonly parentRoom?: ChatRoom;
    readonly hasUnreadMessages: Readable<boolean>;
    readonly unreadNotificationCount: Readable<number>;
    readonly pictureStore: PictureStore;
    /** Direct rooms: peer user color from the same source as the user list (UserProviderMerger), for Avatar background. */
    readonly avatarFallbackColor: Readable<string | undefined>;
    /**
     * Matrix rooms: member picture stores (Matrix profile first, then WOKA fallback — same as DM rows).
     * When set, timelines resolve the sender avatar from the matching member id.
     * Distinct from {@link ChatRoomMembershipManagement.members} typing on folder/room management APIs.
     */
    readonly membersForMessageAvatars?: Readable<readonly ChatRoomMember[]>;
    /** Direct Matrix rooms: peer WA display name when it differs from Matrix name (for DM row subtitle). */
    readonly peerWaDisplayNameIfDifferent?: Readable<string | undefined>;
    readonly messages: Readable<readonly ChatMessage[]>;
    readonly timelineItems: Readable<readonly ChatTimelineItem[]>;
    readonly sendMessage: (message: string) => void;
    readonly sendFiles: (files: FileList) => Promise<void>;
    readonly setTimelineAsRead: () => void;
    readonly hasPreviousMessage: Readable<boolean>;
    readonly loadMorePreviousMessages: () => Promise<void>;
    readonly isEncrypted: Readable<boolean>;
    readonly typingMembers: Readable<Array<{ id: string; name: string | null; pictureStore: PictureStore }>>;
    readonly startTyping: () => Promise<object>;
    readonly stopTyping: () => Promise<object>;
    readonly isRoomFolder: boolean;
    readonly lastMessageTimestamp: number;
    readonly getMessageById?: (messageId: string) => Promise<ChatMessage | undefined>;
}

export interface ChatRoom extends ChatConversation {
    readonly conversationKind: "room";
    readonly openThread?: (rootMessageId: string) => Promise<ChatThread | undefined>;
    readonly threads?: Readable<readonly ChatThreadSummary[]>;
}

export interface ChatThread extends ChatConversation {
    readonly conversationKind: "thread";
    readonly parentRoom: ChatRoom;
    readonly rootMessage: Readable<ChatMessage | undefined>;
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
    /** True when the current user is room admin (Matrix power level). Used to gate invite / kick / ban / role changes in the UI. */
    readonly isCurrentUserRoomAdmin: Readable<boolean>;
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
    sender: AnyKindOfUser | undefined;
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
    threadSummary?: Readable<ChatThreadSummary | null>;
    openThread?: () => Promise<ChatThread | undefined>;
}

export interface ChatMessageReaction {
    readonly key: string;
    readonly users: MapStore<string, ChatUser>;
    readonly react: () => void;
    readonly reacted: Readable<boolean>;
    readonly component: { component: ComponentType<SvelteComponent>; props: Record<string, unknown> };
}

export type ChatPollKind = "open" | "closed";

export type ChatThreadSummary = {
    rootMessageId: string;
    rootMessagePreview?: string;
    rootMessageSenderName?: string;
    replyCount: number;
    lastReplyPreview?: string;
    lastReplySenderName?: string;
    currentUserParticipated: boolean;
    lastActivityTimestamp: number;
};

export type ChatPollCreateOptions = {
    question: string;
    answers: string[];
    kind: ChatPollKind;
    threadId?: string;
};

export type ChatPollCreationLimits = {
    questionMaxLength: number;
    answerMaxLength: number;
    minAnswers: number;
    maxAnswers: number;
};

export interface ChatPollCreationCapability {
    readonly canCreate: Readable<boolean>;
    readonly supportedKinds: readonly ChatPollKind[];
    readonly limits: ChatPollCreationLimits;
    readonly create: (options: ChatPollCreateOptions) => Promise<void>;
}

export interface ChatRoomPollCreation {
    readonly pollCreation: ChatPollCreationCapability;
}

export type ChatPollAnswer = {
    id: string;
    text: string;
    votes: number;
    percentage: number;
    isWinning: boolean;
};

export type ChatPollState = {
    question: string;
    kind: ChatPollKind;
    answers: ChatPollAnswer[];
    maxSelections: number;
    isEnded: boolean;
    hasVoted: boolean;
    myAnswerIds: string[];
    resultsVisible: boolean;
    totalVotes: number;
    spoiledVotes: number;
    closingMessage?: string;
    undecryptableRelationsCount: number;
};

export interface ChatPollItem {
    id: string;
    sender: AnyKindOfUser | undefined;
    date: Date | null;
    state: Readable<ChatPollState>;
    canVote: Readable<boolean>;
    canEnd: Readable<boolean>;
    canDelete: Readable<boolean>;
    vote: (answerIds: string[]) => Promise<void>;
    end: () => Promise<void>;
    remove: () => Promise<void>;
}

export type ChatTimelineItem =
    | {
          kind: "message";
          id: string;
          date: Date | null;
          message: ChatMessage;
      }
    | {
          kind: "system";
          id: string;
          date: Date | null;
          message: ChatMessage;
      }
    | {
          kind: "poll";
          id: string;
          date: Date | null;
          poll: ChatPollItem;
      };

export type ChatMessageType = "proximity" | "text" | "incoming" | "outcoming" | "image" | "file" | "audio" | "video";
export type ChatMessageContent = {
    /**
     * The body can contain HTML. It will be run against DOMPurify before being outputted to the user.
     */
    body: string;
    url: string | undefined;
    thumbnailUrl?: string;
    mediaState?: "ready" | "loading" | "error";
    mediaErrorKind?: "download" | "decrypt";
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

/** Snapshot for the Matrix chat settings UI (Matrix profile vs local game state). */
export type MatrixUserSettingsDiagnostics = {
    matrixUserId: string;
    homeserverUrl: string;
    profileDisplayName: string | undefined;
    profileAvatarMxc: string | undefined;
    profileAvatarPreviewUrl: string | undefined;
    localDisplayName: string | undefined;
    /** True when the in-game name or custom WOKA is not reflected on the Matrix profile. */
    profileNeedsSync: boolean;
};

/** Read-only snapshot for another Matrix user (debug tooling). */
export type MatrixPeerProfileDiagnostics = {
    matrixUserId: string;
    homeserverUrl: string;
    profileDisplayName: string | undefined;
    profileAvatarMxc: string | undefined;
    profileAvatarPreviewUrl: string | undefined;
};

/**
 * Matrix-specific operations exposed by the Matrix chat backend.
 * Use {@link hasMatrixChatCapabilities} to narrow a {@link ChatConnectionInterface}.
 */
export interface MatrixChatCapabilities {
    getMatrixClient(): MatrixClient | undefined;
    syncMatrixGlobalProfileFromLocalWokaAndName(forceSync: boolean): Promise<void>;
    getMatrixUserSettingsDiagnostics(): Promise<MatrixUserSettingsDiagnostics | undefined>;
    getMatrixPeerProfileDiagnostics(matrixUserId: string): Promise<MatrixPeerProfileDiagnostics | undefined>;
}

export type userId = number;
export type ChatId = string & { __chatIdBrand: never };
export type UserUuid = string & { __userUuidBrand: never };
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
    nbUnreadRoomsMessages: Readable<number>;
    nbUnreadDirectRoomsMessages: Readable<number>;
    nbUnreadInvitationsMessages: Readable<number>;

    /**
     * Matrix backend only — see {@link MatrixChatCapabilities}.
     * Prefer `hasMatrixChatCapabilities(connection)` before calling.
     */
    getMatrixClient?: () => MatrixClient | undefined;
    syncMatrixGlobalProfileFromLocalWokaAndName?: (forceSync: boolean) => Promise<void>;
    getMatrixUserSettingsDiagnostics?: () => Promise<MatrixUserSettingsDiagnostics | undefined>;
    getMatrixPeerProfileDiagnostics?: (matrixUserId: string) => Promise<MatrixPeerProfileDiagnostics | undefined>;
}

/** Chat connection backed by Matrix (narrows with {@link hasMatrixChatCapabilities}). */
export type MatrixChatConnectionLike = ChatConnectionInterface & MatrixChatCapabilities;

export function hasMatrixChatCapabilities(connection: ChatConnectionInterface): connection is MatrixChatConnectionLike {
    return typeof connection.getMatrixClient === "function";
}

export function hasChatRoomPollCreation(room: ChatRoom): room is ChatRoom & ChatRoomPollCreation {
    const candidate = room as ChatRoom & Partial<ChatRoomPollCreation>;
    return (
        candidate.pollCreation !== undefined &&
        typeof candidate.pollCreation.create === "function" &&
        typeof candidate.pollCreation.canCreate?.subscribe === "function" &&
        Array.isArray(candidate.pollCreation.supportedKinds)
    );
}

export type Connection = Pick<RoomConnection, "queryChatMembers" | "emitPlayerChatID" | "emitBanPlayerMessage">;
