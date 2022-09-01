/* eslint-disable */
import {
    CallOptions,
    ChannelCredentials,
    ChannelOptions,
    Client,
    ClientDuplexStream,
    ClientReadableStream,
    ClientUnaryCall,
    handleBidiStreamingCall,
    handleServerStreamingCall,
    handleUnaryCall,
    makeGenericClientConstructor,
    Metadata,
    ServiceError,
    UntypedServiceImplementation,
} from "@grpc/grpc-js";
import _m0 from "protobufjs/minimal";
import { BoolValue, Int32Value, StringValue, UInt32Value } from "../google/protobuf/wrappers";

export const protobufPackage = "workadventure";

export enum AvailabilityStatus {
    UNCHANGED = 0,
    ONLINE = 1,
    SILENT = 2,
    AWAY = 3,
    JITSI = 4,
    BBB = 5,
    DENY_PROXIMITY_MEETING = 6,
    UNRECOGNIZED = -1,
}

export function availabilityStatusFromJSON(object: any): AvailabilityStatus {
    switch (object) {
        case 0:
        case "UNCHANGED":
            return AvailabilityStatus.UNCHANGED;
        case 1:
        case "ONLINE":
            return AvailabilityStatus.ONLINE;
        case 2:
        case "SILENT":
            return AvailabilityStatus.SILENT;
        case 3:
        case "AWAY":
            return AvailabilityStatus.AWAY;
        case 4:
        case "JITSI":
            return AvailabilityStatus.JITSI;
        case 5:
        case "BBB":
            return AvailabilityStatus.BBB;
        case 6:
        case "DENY_PROXIMITY_MEETING":
            return AvailabilityStatus.DENY_PROXIMITY_MEETING;
        case -1:
        case "UNRECOGNIZED":
        default:
            return AvailabilityStatus.UNRECOGNIZED;
    }
}

export function availabilityStatusToJSON(object: AvailabilityStatus): string {
    switch (object) {
        case AvailabilityStatus.UNCHANGED:
            return "UNCHANGED";
        case AvailabilityStatus.ONLINE:
            return "ONLINE";
        case AvailabilityStatus.SILENT:
            return "SILENT";
        case AvailabilityStatus.AWAY:
            return "AWAY";
        case AvailabilityStatus.JITSI:
            return "JITSI";
        case AvailabilityStatus.BBB:
            return "BBB";
        case AvailabilityStatus.DENY_PROXIMITY_MEETING:
            return "DENY_PROXIMITY_MEETING";
        case AvailabilityStatus.UNRECOGNIZED:
        default:
            return "UNRECOGNIZED";
    }
}

export interface PositionMessage {
    x: number;
    y: number;
    direction: PositionMessage_Direction;
    moving: boolean;
}

export enum PositionMessage_Direction {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3,
    UNRECOGNIZED = -1,
}

export function positionMessage_DirectionFromJSON(object: any): PositionMessage_Direction {
    switch (object) {
        case 0:
        case "UP":
            return PositionMessage_Direction.UP;
        case 1:
        case "RIGHT":
            return PositionMessage_Direction.RIGHT;
        case 2:
        case "DOWN":
            return PositionMessage_Direction.DOWN;
        case 3:
        case "LEFT":
            return PositionMessage_Direction.LEFT;
        case -1:
        case "UNRECOGNIZED":
        default:
            return PositionMessage_Direction.UNRECOGNIZED;
    }
}

export function positionMessage_DirectionToJSON(object: PositionMessage_Direction): string {
    switch (object) {
        case PositionMessage_Direction.UP:
            return "UP";
        case PositionMessage_Direction.RIGHT:
            return "RIGHT";
        case PositionMessage_Direction.DOWN:
            return "DOWN";
        case PositionMessage_Direction.LEFT:
            return "LEFT";
        case PositionMessage_Direction.UNRECOGNIZED:
        default:
            return "UNRECOGNIZED";
    }
}

export interface PointMessage {
    x: number;
    y: number;
}

export interface ViewportMessage {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface CharacterLayerMessage {
    url: string;
    name: string;
    layer: string;
}

export interface CompanionMessage {
    name: string;
}

export interface PingMessage {}

export interface SetPlayerDetailsMessage {
    outlineColor: number | undefined;
    removeOutlineColor: boolean | undefined;
    showVoiceIndicator: boolean | undefined;
    availabilityStatus: AvailabilityStatus;
    setVariable: SetPlayerVariableMessage | undefined;
}

export interface UserMovesMessage {
    position: PositionMessage | undefined;
    viewport: ViewportMessage | undefined;
}

export interface WebRtcSignalToServerMessage {
    receiverId: number;
    signal: string;
}

export interface ReportPlayerMessage {
    reportedUserUuid: string;
    reportComment: string;
}

export interface EmotePromptMessage {
    emote: string;
}

export interface EmoteEventMessage {
    actorUserId: number;
    emote: string;
}

export interface FollowRequestMessage {
    leader: number;
}

export interface FollowConfirmationMessage {
    leader: number;
    follower: number;
}

export interface FollowAbortMessage {
    leader: number;
    follower: number;
}

export interface LockGroupPromptMessage {
    lock: boolean;
}

export interface ModifyAreaMessage {
    id: number;
    x?: number | undefined;
    y?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
}

export interface ClientToServerMessage {
    message?:
        | { $case: "userMovesMessage"; userMovesMessage: UserMovesMessage }
        | { $case: "viewportMessage"; viewportMessage: ViewportMessage }
        | { $case: "itemEventMessage"; itemEventMessage: ItemEventMessage }
        | { $case: "setPlayerDetailsMessage"; setPlayerDetailsMessage: SetPlayerDetailsMessage }
        | { $case: "webRtcSignalToServerMessage"; webRtcSignalToServerMessage: WebRtcSignalToServerMessage }
        | {
              $case: "webRtcScreenSharingSignalToServerMessage";
              webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage;
          }
        | { $case: "playGlobalMessage"; playGlobalMessage: PlayGlobalMessage }
        | { $case: "stopGlobalMessage"; stopGlobalMessage: StopGlobalMessage }
        | { $case: "reportPlayerMessage"; reportPlayerMessage: ReportPlayerMessage }
        | { $case: "emotePromptMessage"; emotePromptMessage: EmotePromptMessage }
        | { $case: "variableMessage"; variableMessage: VariableMessage }
        | { $case: "followRequestMessage"; followRequestMessage: FollowRequestMessage }
        | { $case: "followConfirmationMessage"; followConfirmationMessage: FollowConfirmationMessage }
        | { $case: "followAbortMessage"; followAbortMessage: FollowAbortMessage }
        | { $case: "lockGroupPromptMessage"; lockGroupPromptMessage: LockGroupPromptMessage }
        | { $case: "queryMessage"; queryMessage: QueryMessage }
        | { $case: "pingMessage"; pingMessage: PingMessage }
        | { $case: "askPositionMessage"; askPositionMessage: AskPositionMessage }
        | { $case: "editMapMessage"; editMapMessage: EditMapMessage };
}

export interface ItemEventMessage {
    itemId: number;
    event: string;
    stateJson: string;
    parametersJson: string;
}

export interface VariableMessage {
    name: string;
    value: string;
}

export interface SetPlayerVariableMessage {
    name: string;
    value: string;
    public: boolean;
    persist: boolean;
    ttl: number | undefined;
    scope: SetPlayerVariableMessage_Scope;
}

export enum SetPlayerVariableMessage_Scope {
    ROOM = 0,
    WORLD = 1,
    UNRECOGNIZED = -1,
}

export function setPlayerVariableMessage_ScopeFromJSON(object: any): SetPlayerVariableMessage_Scope {
    switch (object) {
        case 0:
        case "ROOM":
            return SetPlayerVariableMessage_Scope.ROOM;
        case 1:
        case "WORLD":
            return SetPlayerVariableMessage_Scope.WORLD;
        case -1:
        case "UNRECOGNIZED":
        default:
            return SetPlayerVariableMessage_Scope.UNRECOGNIZED;
    }
}

export function setPlayerVariableMessage_ScopeToJSON(object: SetPlayerVariableMessage_Scope): string {
    switch (object) {
        case SetPlayerVariableMessage_Scope.ROOM:
            return "ROOM";
        case SetPlayerVariableMessage_Scope.WORLD:
            return "WORLD";
        case SetPlayerVariableMessage_Scope.UNRECOGNIZED:
        default:
            return "UNRECOGNIZED";
    }
}

export interface XmppMessage {
    stanza: string;
}

/** A variable, along the tag describing who it is targeted at */
export interface VariableWithTagMessage {
    name: string;
    value: string;
    readableBy: string;
}

export interface PlayGlobalMessage {
    type: string;
    content: string;
    broadcastToWorld: boolean;
}

export interface StopGlobalMessage {
    id: string;
}

export interface QueryMessage {
    id: number;
    query?:
        | { $case: "jitsiJwtQuery"; jitsiJwtQuery: JitsiJwtQuery }
        | {
              $case: "joinBBBMeetingQuery";
              joinBBBMeetingQuery: JoinBBBMeetingQuery;
          };
}

export interface JitsiJwtQuery {
    jitsiRoom: string;
}

export interface JoinBBBMeetingQuery {
    meetingId: string;
    /**
     * Fix me Pusher linter fails because eslint-plugin version < 3.0
     * map<string, string> userdata = 3;
     */
    meetingName: string;
}

export interface AnswerMessage {
    id: number;
    answer?:
        | { $case: "error"; error: ErrorMessage }
        | { $case: "jitsiJwtAnswer"; jitsiJwtAnswer: JitsiJwtAnswer }
        | {
              $case: "joinBBBMeetingAnswer";
              joinBBBMeetingAnswer: JoinBBBMeetingAnswer;
          };
}

export interface JitsiJwtAnswer {
    jwt: string;
}

export interface JoinBBBMeetingAnswer {
    meetingId: string;
    clientURL: string;
}

export interface UserMovedMessage {
    userId: number;
    position: PositionMessage | undefined;
}

export interface MoveToPositionMessage {
    position: PositionMessage | undefined;
}

export interface SubMessage {
    message?:
        | { $case: "userMovedMessage"; userMovedMessage: UserMovedMessage }
        | { $case: "groupUpdateMessage"; groupUpdateMessage: GroupUpdateMessage }
        | { $case: "groupDeleteMessage"; groupDeleteMessage: GroupDeleteMessage }
        | { $case: "userJoinedMessage"; userJoinedMessage: UserJoinedMessage }
        | { $case: "userLeftMessage"; userLeftMessage: UserLeftMessage }
        | { $case: "itemEventMessage"; itemEventMessage: ItemEventMessage }
        | { $case: "emoteEventMessage"; emoteEventMessage: EmoteEventMessage }
        | { $case: "variableMessage"; variableMessage: VariableMessage }
        | { $case: "errorMessage"; errorMessage: ErrorMessage }
        | { $case: "playerDetailsUpdatedMessage"; playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage }
        | { $case: "pingMessage"; pingMessage: PingMessage }
        | { $case: "editMapMessage"; editMapMessage: EditMapMessage };
}

export interface BatchMessage {
    event: string;
    payload: SubMessage[];
}

export interface GroupUpdateMessage {
    groupId: number;
    position: PointMessage | undefined;
    groupSize: number | undefined;
    locked: boolean | undefined;
}

export interface GroupDeleteMessage {
    groupId: number;
}

export interface UserJoinedMessage {
    userId: number;
    name: string;
    characterLayers: CharacterLayerMessage[];
    position: PositionMessage | undefined;
    companion: CompanionMessage | undefined;
    visitCardUrl: string;
    userUuid: string;
    outlineColor: number;
    hasOutline: boolean;
    availabilityStatus: AvailabilityStatus;
    variables: { [key: string]: string };
}

export interface UserJoinedMessage_VariablesEntry {
    key: string;
    value: string;
}

export interface UserLeftMessage {
    userId: number;
}

/** ErrorMessage is only used to console.error the message in the front */
export interface ErrorMessage {
    message: string;
}

/** ErrorScreenMessage is used to show the ErrorScreen in the front */
export interface ErrorScreenMessage {
    type: string;
    code: string | undefined;
    title: string | undefined;
    subtitle: string | undefined;
    details: string | undefined;
    timeToRetry: number | undefined;
    canRetryManual: boolean | undefined;
    urlToRedirect: string | undefined;
    buttonTitle: string | undefined;
    image: string | undefined;
}

export interface ItemStateMessage {
    itemId: number;
    stateJson: string;
}

export interface GroupUsersUpdateMessage {
    groupId: number;
    userIds: number[];
}

export interface RoomJoinedMessage {
    /**
     * repeated UserJoinedMessage user = 1;
     * repeated GroupUpdateMessage group = 2;
     */
    item: ItemStateMessage[];
    currentUserId: number;
    tag: string[];
    variable: VariableMessage[];
    userRoomToken: string;
    /** We send the current skin of the current player. */
    characterLayer: CharacterLayerMessage[];
    activatedInviteUser: boolean;
    playerVariable: VariableMessage[];
}

export interface WebRtcStartMessage {
    userId: number;
    initiator: boolean;
    webrtcUserName: string;
    webrtcPassword: string;
}

export interface WebRtcDisconnectMessage {
    userId: number;
}

export interface WebRtcSignalToClientMessage {
    userId: number;
    signal: string;
    webrtcUserName: string;
    webrtcPassword: string;
}

export interface TeleportMessageMessage {
    map: string;
}

export interface SendUserMessage {
    type: string;
    message: string;
}

export interface WorldFullWarningMessage {}

export interface WorldFullWarningToRoomMessage {
    roomId: string;
}

export interface RefreshRoomPromptMessage {
    roomId: string;
}

export interface RefreshRoomMessage {
    roomId: string;
    versionNumber: number;
}

export interface WorldFullMessage {}

export interface TokenExpiredMessage {}

export interface InvalidTextureMessage {}

export interface WorldConnexionMessage {
    message: string;
}

export interface BanUserMessage {
    type: string;
    message: string;
}

export interface AskPositionMessage {
    userIdentifier: string;
    playUri: string;
}

/** Messages going from back and pusher to the front */
export interface ServerToClientMessage {
    message?:
        | { $case: "batchMessage"; batchMessage: BatchMessage }
        | { $case: "errorMessage"; errorMessage: ErrorMessage }
        | { $case: "roomJoinedMessage"; roomJoinedMessage: RoomJoinedMessage }
        | { $case: "webRtcStartMessage"; webRtcStartMessage: WebRtcStartMessage }
        | { $case: "webRtcSignalToClientMessage"; webRtcSignalToClientMessage: WebRtcSignalToClientMessage }
        | {
              $case: "webRtcScreenSharingSignalToClientMessage";
              webRtcScreenSharingSignalToClientMessage: WebRtcSignalToClientMessage;
          }
        | { $case: "webRtcDisconnectMessage"; webRtcDisconnectMessage: WebRtcDisconnectMessage }
        | { $case: "teleportMessageMessage"; teleportMessageMessage: TeleportMessageMessage }
        | { $case: "sendUserMessage"; sendUserMessage: SendUserMessage }
        | { $case: "banUserMessage"; banUserMessage: BanUserMessage }
        | { $case: "worldFullWarningMessage"; worldFullWarningMessage: WorldFullWarningMessage }
        | { $case: "worldFullMessage"; worldFullMessage: WorldFullMessage }
        | { $case: "refreshRoomMessage"; refreshRoomMessage: RefreshRoomMessage }
        | { $case: "worldConnexionMessage"; worldConnexionMessage: WorldConnexionMessage }
        | { $case: "tokenExpiredMessage"; tokenExpiredMessage: TokenExpiredMessage }
        | { $case: "followRequestMessage"; followRequestMessage: FollowRequestMessage }
        | { $case: "followConfirmationMessage"; followConfirmationMessage: FollowConfirmationMessage }
        | { $case: "followAbortMessage"; followAbortMessage: FollowAbortMessage }
        | { $case: "invalidTextureMessage"; invalidTextureMessage: InvalidTextureMessage }
        | { $case: "groupUsersUpdateMessage"; groupUsersUpdateMessage: GroupUsersUpdateMessage }
        | { $case: "errorScreenMessage"; errorScreenMessage: ErrorScreenMessage }
        | { $case: "answerMessage"; answerMessage: AnswerMessage }
        | { $case: "moveToPositionMessage"; moveToPositionMessage: MoveToPositionMessage };
}

export interface JoinRoomMessage {
    positionMessage: PositionMessage | undefined;
    name: string;
    characterLayer: CharacterLayerMessage[];
    userUuid: string;
    roomId: string;
    tag: string[];
    IPAddress: string;
    companion: CompanionMessage | undefined;
    visitCardUrl: string;
    userRoomToken: string;
    availabilityStatus: AvailabilityStatus;
    activatedInviteUser: boolean;
    isLogged: boolean;
}

export interface UserJoinedZoneMessage {
    userId: number;
    name: string;
    characterLayers: CharacterLayerMessage[];
    position: PositionMessage | undefined;
    fromZone: Zone | undefined;
    companion: CompanionMessage | undefined;
    visitCardUrl: string;
    userUuid: string;
    outlineColor: number;
    hasOutline: boolean;
    availabilityStatus: AvailabilityStatus;
    variables: { [key: string]: string };
}

export interface UserJoinedZoneMessage_VariablesEntry {
    key: string;
    value: string;
}

export interface UserLeftZoneMessage {
    userId: number;
    toZone: Zone | undefined;
}

export interface GroupUpdateZoneMessage {
    groupId: number;
    position: PointMessage | undefined;
    groupSize: number;
    fromZone: Zone | undefined;
    locked: boolean;
}

export interface GroupLeftZoneMessage {
    groupId: number;
    toZone: Zone | undefined;
}

export interface PlayerDetailsUpdatedMessage {
    userId: number;
    details: SetPlayerDetailsMessage | undefined;
}

export interface Zone {
    x: number;
    y: number;
}

export interface ZoneMessage {
    roomId: string;
    x: number;
    y: number;
}

export interface RoomMessage {
    roomId: string;
}

export interface PusherToBackMessage {
    message?:
        | { $case: "joinRoomMessage"; joinRoomMessage: JoinRoomMessage }
        | { $case: "userMovesMessage"; userMovesMessage: UserMovesMessage }
        | { $case: "itemEventMessage"; itemEventMessage: ItemEventMessage }
        | { $case: "setPlayerDetailsMessage"; setPlayerDetailsMessage: SetPlayerDetailsMessage }
        | { $case: "webRtcSignalToServerMessage"; webRtcSignalToServerMessage: WebRtcSignalToServerMessage }
        | {
              $case: "webRtcScreenSharingSignalToServerMessage";
              webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage;
          }
        | { $case: "reportPlayerMessage"; reportPlayerMessage: ReportPlayerMessage }
        | { $case: "sendUserMessage"; sendUserMessage: SendUserMessage }
        | { $case: "banUserMessage"; banUserMessage: BanUserMessage }
        | { $case: "emotePromptMessage"; emotePromptMessage: EmotePromptMessage }
        | { $case: "variableMessage"; variableMessage: VariableMessage }
        | { $case: "followRequestMessage"; followRequestMessage: FollowRequestMessage }
        | { $case: "followConfirmationMessage"; followConfirmationMessage: FollowConfirmationMessage }
        | { $case: "followAbortMessage"; followAbortMessage: FollowAbortMessage }
        | { $case: "lockGroupPromptMessage"; lockGroupPromptMessage: LockGroupPromptMessage }
        | { $case: "queryMessage"; queryMessage: QueryMessage }
        | { $case: "askPositionMessage"; askPositionMessage: AskPositionMessage }
        | { $case: "editMapWithKeyMessage"; editMapWithKeyMessage: EditMapWithKeyMessage };
}

export interface BatchToPusherMessage {
    payload: SubToPusherMessage[];
}

export interface SubToPusherMessage {
    message?:
        | { $case: "userJoinedZoneMessage"; userJoinedZoneMessage: UserJoinedZoneMessage }
        | { $case: "groupUpdateZoneMessage"; groupUpdateZoneMessage: GroupUpdateZoneMessage }
        | { $case: "userMovedMessage"; userMovedMessage: UserMovedMessage }
        | { $case: "groupLeftZoneMessage"; groupLeftZoneMessage: GroupLeftZoneMessage }
        | { $case: "userLeftZoneMessage"; userLeftZoneMessage: UserLeftZoneMessage }
        | { $case: "itemEventMessage"; itemEventMessage: ItemEventMessage }
        | { $case: "sendUserMessage"; sendUserMessage: SendUserMessage }
        | { $case: "banUserMessage"; banUserMessage: BanUserMessage }
        | { $case: "emoteEventMessage"; emoteEventMessage: EmoteEventMessage }
        | { $case: "errorMessage"; errorMessage: ErrorMessage }
        | { $case: "playerDetailsUpdatedMessage"; playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage };
}

export interface BatchToPusherRoomMessage {
    payload: SubToPusherRoomMessage[];
}

export interface SubToPusherRoomMessage {
    message?:
        | { $case: "variableMessage"; variableMessage: VariableWithTagMessage }
        | {
              $case: "errorMessage";
              errorMessage: ErrorMessage;
          }
        | { $case: "editMapMessage"; editMapMessage: EditMapMessage };
}

export interface EditMapMessage {
    message?: { $case: "modifyAreaMessage"; modifyAreaMessage: ModifyAreaMessage };
}

export interface EditMapWithKeyMessage {
    mapKey: string;
    editMapMessage: EditMapMessage | undefined;
}

export interface EmptyMapMessage {
    mapKey: string;
}

export interface UserJoinedRoomMessage {
    uuid: string;
    ipAddress: string;
    name: string;
}

export interface UserLeftRoomMessage {
    uuid: string;
}

export interface ServerToAdminClientMessage {
    message?:
        | { $case: "userJoinedRoom"; userJoinedRoom: UserJoinedRoomMessage }
        | {
              $case: "userLeftRoom";
              userLeftRoom: UserLeftRoomMessage;
          }
        | { $case: "errorMessage"; errorMessage: ErrorMessage };
}

export interface AdminPusherToBackMessage {
    message?: { $case: "subscribeToRoom"; subscribeToRoom: string };
}

/** A message sent by an administrator to a recipient */
export interface AdminMessage {
    message: string;
    recipientUuid: string;
    roomId: string;
    type: string;
}

/** A message sent by an administrator to everyone in a specific room */
export interface AdminRoomMessage {
    message: string;
    roomId: string;
    type: string;
}

/** A message sent by an administrator to absolutely everybody */
export interface AdminGlobalMessage {
    message: string;
}

export interface BanMessage {
    recipientUuid: string;
    roomId: string;
    type: string;
    message: string;
}

export interface RoomDescription {
    roomId: string;
    nbUsers: number;
}

export interface RoomsList {
    roomDescription: RoomDescription[];
}

export interface EmptyMessage {}

/**
 * *****************************************************µ************************
 * Start Chat Messages
 * ******************************************************************************
 */
export interface IframeToPusherMessage {
    message?:
        | { $case: "xmppMessage"; xmppMessage: XmppMessage }
        | {
              $case: "banUserByUuidMessage";
              banUserByUuidMessage: BanUserByUuidMessage;
          };
}

export interface PusherToIframeMessage {
    message?:
        | { $case: "xmppSettingsMessage"; xmppSettingsMessage: XmppSettingsMessage }
        | {
              $case: "xmppConnectionStatusChangeMessage";
              xmppConnectionStatusChangeMessage: XmppConnectionStatusChangeMessage;
          }
        | { $case: "xmppMessage"; xmppMessage: XmppMessage };
}

export interface MucRoomDefinitionMessage {
    url: string;
    name: string;
    type: string;
    subscribe: boolean;
}

export interface XmppSettingsMessage {
    jid: string;
    conferenceDomain: string;
    rooms: MucRoomDefinitionMessage[];
}

/**
 * Status of the connection to the XMPP server.
 * In case something goes wrong with the XMPP server, we are notified here.
 */
export interface XmppConnectionStatusChangeMessage {
    status: XmppConnectionStatusChangeMessage_Status;
}

export enum XmppConnectionStatusChangeMessage_Status {
    DISCONNECTED = 0,
    UNRECOGNIZED = -1,
}

export function xmppConnectionStatusChangeMessage_StatusFromJSON(
    object: any
): XmppConnectionStatusChangeMessage_Status {
    switch (object) {
        case 0:
        case "DISCONNECTED":
            return XmppConnectionStatusChangeMessage_Status.DISCONNECTED;
        case -1:
        case "UNRECOGNIZED":
        default:
            return XmppConnectionStatusChangeMessage_Status.UNRECOGNIZED;
    }
}

export function xmppConnectionStatusChangeMessage_StatusToJSON(
    object: XmppConnectionStatusChangeMessage_Status
): string {
    switch (object) {
        case XmppConnectionStatusChangeMessage_Status.DISCONNECTED:
            return "DISCONNECTED";
        case XmppConnectionStatusChangeMessage_Status.UNRECOGNIZED:
        default:
            return "UNRECOGNIZED";
    }
}

export interface BanUserByUuidMessage {
    playUri: string;
    uuidToBan: string;
    name: string;
    message: string;
    byUserEmail: string;
}

function createBasePositionMessage(): PositionMessage {
    return { x: 0, y: 0, direction: 0, moving: false };
}

export const PositionMessage = {
    encode(message: PositionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.x !== 0) {
            writer.uint32(8).int32(message.x);
        }
        if (message.y !== 0) {
            writer.uint32(16).int32(message.y);
        }
        if (message.direction !== 0) {
            writer.uint32(24).int32(message.direction);
        }
        if (message.moving === true) {
            writer.uint32(32).bool(message.moving);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PositionMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePositionMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.x = reader.int32();
                    break;
                case 2:
                    message.y = reader.int32();
                    break;
                case 3:
                    message.direction = reader.int32() as any;
                    break;
                case 4:
                    message.moving = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): PositionMessage {
        return {
            x: isSet(object.x) ? Number(object.x) : 0,
            y: isSet(object.y) ? Number(object.y) : 0,
            direction: isSet(object.direction) ? positionMessage_DirectionFromJSON(object.direction) : 0,
            moving: isSet(object.moving) ? Boolean(object.moving) : false,
        };
    },

    toJSON(message: PositionMessage): unknown {
        const obj: any = {};
        message.x !== undefined && (obj.x = Math.round(message.x));
        message.y !== undefined && (obj.y = Math.round(message.y));
        message.direction !== undefined && (obj.direction = positionMessage_DirectionToJSON(message.direction));
        message.moving !== undefined && (obj.moving = message.moving);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PositionMessage>, I>>(object: I): PositionMessage {
        const message = createBasePositionMessage();
        message.x = object.x ?? 0;
        message.y = object.y ?? 0;
        message.direction = object.direction ?? 0;
        message.moving = object.moving ?? false;
        return message;
    },
};

function createBasePointMessage(): PointMessage {
    return { x: 0, y: 0 };
}

export const PointMessage = {
    encode(message: PointMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.x !== 0) {
            writer.uint32(8).int32(message.x);
        }
        if (message.y !== 0) {
            writer.uint32(16).int32(message.y);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PointMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePointMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.x = reader.int32();
                    break;
                case 2:
                    message.y = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): PointMessage {
        return { x: isSet(object.x) ? Number(object.x) : 0, y: isSet(object.y) ? Number(object.y) : 0 };
    },

    toJSON(message: PointMessage): unknown {
        const obj: any = {};
        message.x !== undefined && (obj.x = Math.round(message.x));
        message.y !== undefined && (obj.y = Math.round(message.y));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PointMessage>, I>>(object: I): PointMessage {
        const message = createBasePointMessage();
        message.x = object.x ?? 0;
        message.y = object.y ?? 0;
        return message;
    },
};

function createBaseViewportMessage(): ViewportMessage {
    return { left: 0, top: 0, right: 0, bottom: 0 };
}

export const ViewportMessage = {
    encode(message: ViewportMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.left !== 0) {
            writer.uint32(8).int32(message.left);
        }
        if (message.top !== 0) {
            writer.uint32(16).int32(message.top);
        }
        if (message.right !== 0) {
            writer.uint32(24).int32(message.right);
        }
        if (message.bottom !== 0) {
            writer.uint32(32).int32(message.bottom);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ViewportMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseViewportMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.left = reader.int32();
                    break;
                case 2:
                    message.top = reader.int32();
                    break;
                case 3:
                    message.right = reader.int32();
                    break;
                case 4:
                    message.bottom = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ViewportMessage {
        return {
            left: isSet(object.left) ? Number(object.left) : 0,
            top: isSet(object.top) ? Number(object.top) : 0,
            right: isSet(object.right) ? Number(object.right) : 0,
            bottom: isSet(object.bottom) ? Number(object.bottom) : 0,
        };
    },

    toJSON(message: ViewportMessage): unknown {
        const obj: any = {};
        message.left !== undefined && (obj.left = Math.round(message.left));
        message.top !== undefined && (obj.top = Math.round(message.top));
        message.right !== undefined && (obj.right = Math.round(message.right));
        message.bottom !== undefined && (obj.bottom = Math.round(message.bottom));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ViewportMessage>, I>>(object: I): ViewportMessage {
        const message = createBaseViewportMessage();
        message.left = object.left ?? 0;
        message.top = object.top ?? 0;
        message.right = object.right ?? 0;
        message.bottom = object.bottom ?? 0;
        return message;
    },
};

function createBaseCharacterLayerMessage(): CharacterLayerMessage {
    return { url: "", name: "", layer: "" };
}

export const CharacterLayerMessage = {
    encode(message: CharacterLayerMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.url !== "") {
            writer.uint32(10).string(message.url);
        }
        if (message.name !== "") {
            writer.uint32(18).string(message.name);
        }
        if (message.layer !== "") {
            writer.uint32(26).string(message.layer);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): CharacterLayerMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseCharacterLayerMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.url = reader.string();
                    break;
                case 2:
                    message.name = reader.string();
                    break;
                case 3:
                    message.layer = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): CharacterLayerMessage {
        return {
            url: isSet(object.url) ? String(object.url) : "",
            name: isSet(object.name) ? String(object.name) : "",
            layer: isSet(object.layer) ? String(object.layer) : "",
        };
    },

    toJSON(message: CharacterLayerMessage): unknown {
        const obj: any = {};
        message.url !== undefined && (obj.url = message.url);
        message.name !== undefined && (obj.name = message.name);
        message.layer !== undefined && (obj.layer = message.layer);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<CharacterLayerMessage>, I>>(object: I): CharacterLayerMessage {
        const message = createBaseCharacterLayerMessage();
        message.url = object.url ?? "";
        message.name = object.name ?? "";
        message.layer = object.layer ?? "";
        return message;
    },
};

function createBaseCompanionMessage(): CompanionMessage {
    return { name: "" };
}

export const CompanionMessage = {
    encode(message: CompanionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.name !== "") {
            writer.uint32(10).string(message.name);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): CompanionMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseCompanionMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.name = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): CompanionMessage {
        return { name: isSet(object.name) ? String(object.name) : "" };
    },

    toJSON(message: CompanionMessage): unknown {
        const obj: any = {};
        message.name !== undefined && (obj.name = message.name);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<CompanionMessage>, I>>(object: I): CompanionMessage {
        const message = createBaseCompanionMessage();
        message.name = object.name ?? "";
        return message;
    },
};

function createBasePingMessage(): PingMessage {
    return {};
}

export const PingMessage = {
    encode(_: PingMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PingMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePingMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(_: any): PingMessage {
        return {};
    },

    toJSON(_: PingMessage): unknown {
        const obj: any = {};
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PingMessage>, I>>(_: I): PingMessage {
        const message = createBasePingMessage();
        return message;
    },
};

function createBaseSetPlayerDetailsMessage(): SetPlayerDetailsMessage {
    return {
        outlineColor: undefined,
        removeOutlineColor: undefined,
        showVoiceIndicator: undefined,
        availabilityStatus: 0,
        setVariable: undefined,
    };
}

export const SetPlayerDetailsMessage = {
    encode(message: SetPlayerDetailsMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.outlineColor !== undefined) {
            UInt32Value.encode({ value: message.outlineColor! }, writer.uint32(26).fork()).ldelim();
        }
        if (message.removeOutlineColor !== undefined) {
            BoolValue.encode({ value: message.removeOutlineColor! }, writer.uint32(34).fork()).ldelim();
        }
        if (message.showVoiceIndicator !== undefined) {
            BoolValue.encode({ value: message.showVoiceIndicator! }, writer.uint32(42).fork()).ldelim();
        }
        if (message.availabilityStatus !== 0) {
            writer.uint32(48).int32(message.availabilityStatus);
        }
        if (message.setVariable !== undefined) {
            SetPlayerVariableMessage.encode(message.setVariable, writer.uint32(58).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SetPlayerDetailsMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSetPlayerDetailsMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 3:
                    message.outlineColor = UInt32Value.decode(reader, reader.uint32()).value;
                    break;
                case 4:
                    message.removeOutlineColor = BoolValue.decode(reader, reader.uint32()).value;
                    break;
                case 5:
                    message.showVoiceIndicator = BoolValue.decode(reader, reader.uint32()).value;
                    break;
                case 6:
                    message.availabilityStatus = reader.int32() as any;
                    break;
                case 7:
                    message.setVariable = SetPlayerVariableMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): SetPlayerDetailsMessage {
        return {
            outlineColor: isSet(object.outlineColor) ? Number(object.outlineColor) : undefined,
            removeOutlineColor: isSet(object.removeOutlineColor) ? Boolean(object.removeOutlineColor) : undefined,
            showVoiceIndicator: isSet(object.showVoiceIndicator) ? Boolean(object.showVoiceIndicator) : undefined,
            availabilityStatus: isSet(object.availabilityStatus)
                ? availabilityStatusFromJSON(object.availabilityStatus)
                : 0,
            setVariable: isSet(object.setVariable) ? SetPlayerVariableMessage.fromJSON(object.setVariable) : undefined,
        };
    },

    toJSON(message: SetPlayerDetailsMessage): unknown {
        const obj: any = {};
        message.outlineColor !== undefined && (obj.outlineColor = message.outlineColor);
        message.removeOutlineColor !== undefined && (obj.removeOutlineColor = message.removeOutlineColor);
        message.showVoiceIndicator !== undefined && (obj.showVoiceIndicator = message.showVoiceIndicator);
        message.availabilityStatus !== undefined &&
            (obj.availabilityStatus = availabilityStatusToJSON(message.availabilityStatus));
        message.setVariable !== undefined &&
            (obj.setVariable = message.setVariable ? SetPlayerVariableMessage.toJSON(message.setVariable) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<SetPlayerDetailsMessage>, I>>(object: I): SetPlayerDetailsMessage {
        const message = createBaseSetPlayerDetailsMessage();
        message.outlineColor = object.outlineColor ?? undefined;
        message.removeOutlineColor = object.removeOutlineColor ?? undefined;
        message.showVoiceIndicator = object.showVoiceIndicator ?? undefined;
        message.availabilityStatus = object.availabilityStatus ?? 0;
        message.setVariable =
            object.setVariable !== undefined && object.setVariable !== null
                ? SetPlayerVariableMessage.fromPartial(object.setVariable)
                : undefined;
        return message;
    },
};

function createBaseUserMovesMessage(): UserMovesMessage {
    return { position: undefined, viewport: undefined };
}

export const UserMovesMessage = {
    encode(message: UserMovesMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.position !== undefined) {
            PositionMessage.encode(message.position, writer.uint32(10).fork()).ldelim();
        }
        if (message.viewport !== undefined) {
            ViewportMessage.encode(message.viewport, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserMovesMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserMovesMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.position = PositionMessage.decode(reader, reader.uint32());
                    break;
                case 2:
                    message.viewport = ViewportMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserMovesMessage {
        return {
            position: isSet(object.position) ? PositionMessage.fromJSON(object.position) : undefined,
            viewport: isSet(object.viewport) ? ViewportMessage.fromJSON(object.viewport) : undefined,
        };
    },

    toJSON(message: UserMovesMessage): unknown {
        const obj: any = {};
        message.position !== undefined &&
            (obj.position = message.position ? PositionMessage.toJSON(message.position) : undefined);
        message.viewport !== undefined &&
            (obj.viewport = message.viewport ? ViewportMessage.toJSON(message.viewport) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserMovesMessage>, I>>(object: I): UserMovesMessage {
        const message = createBaseUserMovesMessage();
        message.position =
            object.position !== undefined && object.position !== null
                ? PositionMessage.fromPartial(object.position)
                : undefined;
        message.viewport =
            object.viewport !== undefined && object.viewport !== null
                ? ViewportMessage.fromPartial(object.viewport)
                : undefined;
        return message;
    },
};

function createBaseWebRtcSignalToServerMessage(): WebRtcSignalToServerMessage {
    return { receiverId: 0, signal: "" };
}

export const WebRtcSignalToServerMessage = {
    encode(message: WebRtcSignalToServerMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.receiverId !== 0) {
            writer.uint32(8).int32(message.receiverId);
        }
        if (message.signal !== "") {
            writer.uint32(18).string(message.signal);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WebRtcSignalToServerMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWebRtcSignalToServerMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.receiverId = reader.int32();
                    break;
                case 2:
                    message.signal = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): WebRtcSignalToServerMessage {
        return {
            receiverId: isSet(object.receiverId) ? Number(object.receiverId) : 0,
            signal: isSet(object.signal) ? String(object.signal) : "",
        };
    },

    toJSON(message: WebRtcSignalToServerMessage): unknown {
        const obj: any = {};
        message.receiverId !== undefined && (obj.receiverId = Math.round(message.receiverId));
        message.signal !== undefined && (obj.signal = message.signal);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WebRtcSignalToServerMessage>, I>>(object: I): WebRtcSignalToServerMessage {
        const message = createBaseWebRtcSignalToServerMessage();
        message.receiverId = object.receiverId ?? 0;
        message.signal = object.signal ?? "";
        return message;
    },
};

function createBaseReportPlayerMessage(): ReportPlayerMessage {
    return { reportedUserUuid: "", reportComment: "" };
}

export const ReportPlayerMessage = {
    encode(message: ReportPlayerMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.reportedUserUuid !== "") {
            writer.uint32(10).string(message.reportedUserUuid);
        }
        if (message.reportComment !== "") {
            writer.uint32(18).string(message.reportComment);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ReportPlayerMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseReportPlayerMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.reportedUserUuid = reader.string();
                    break;
                case 2:
                    message.reportComment = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ReportPlayerMessage {
        return {
            reportedUserUuid: isSet(object.reportedUserUuid) ? String(object.reportedUserUuid) : "",
            reportComment: isSet(object.reportComment) ? String(object.reportComment) : "",
        };
    },

    toJSON(message: ReportPlayerMessage): unknown {
        const obj: any = {};
        message.reportedUserUuid !== undefined && (obj.reportedUserUuid = message.reportedUserUuid);
        message.reportComment !== undefined && (obj.reportComment = message.reportComment);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ReportPlayerMessage>, I>>(object: I): ReportPlayerMessage {
        const message = createBaseReportPlayerMessage();
        message.reportedUserUuid = object.reportedUserUuid ?? "";
        message.reportComment = object.reportComment ?? "";
        return message;
    },
};

function createBaseEmotePromptMessage(): EmotePromptMessage {
    return { emote: "" };
}

export const EmotePromptMessage = {
    encode(message: EmotePromptMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.emote !== "") {
            writer.uint32(18).string(message.emote);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EmotePromptMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEmotePromptMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 2:
                    message.emote = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): EmotePromptMessage {
        return { emote: isSet(object.emote) ? String(object.emote) : "" };
    },

    toJSON(message: EmotePromptMessage): unknown {
        const obj: any = {};
        message.emote !== undefined && (obj.emote = message.emote);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<EmotePromptMessage>, I>>(object: I): EmotePromptMessage {
        const message = createBaseEmotePromptMessage();
        message.emote = object.emote ?? "";
        return message;
    },
};

function createBaseEmoteEventMessage(): EmoteEventMessage {
    return { actorUserId: 0, emote: "" };
}

export const EmoteEventMessage = {
    encode(message: EmoteEventMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.actorUserId !== 0) {
            writer.uint32(8).int32(message.actorUserId);
        }
        if (message.emote !== "") {
            writer.uint32(18).string(message.emote);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EmoteEventMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEmoteEventMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.actorUserId = reader.int32();
                    break;
                case 2:
                    message.emote = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): EmoteEventMessage {
        return {
            actorUserId: isSet(object.actorUserId) ? Number(object.actorUserId) : 0,
            emote: isSet(object.emote) ? String(object.emote) : "",
        };
    },

    toJSON(message: EmoteEventMessage): unknown {
        const obj: any = {};
        message.actorUserId !== undefined && (obj.actorUserId = Math.round(message.actorUserId));
        message.emote !== undefined && (obj.emote = message.emote);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<EmoteEventMessage>, I>>(object: I): EmoteEventMessage {
        const message = createBaseEmoteEventMessage();
        message.actorUserId = object.actorUserId ?? 0;
        message.emote = object.emote ?? "";
        return message;
    },
};

function createBaseFollowRequestMessage(): FollowRequestMessage {
    return { leader: 0 };
}

export const FollowRequestMessage = {
    encode(message: FollowRequestMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.leader !== 0) {
            writer.uint32(8).int32(message.leader);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): FollowRequestMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseFollowRequestMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.leader = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): FollowRequestMessage {
        return { leader: isSet(object.leader) ? Number(object.leader) : 0 };
    },

    toJSON(message: FollowRequestMessage): unknown {
        const obj: any = {};
        message.leader !== undefined && (obj.leader = Math.round(message.leader));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<FollowRequestMessage>, I>>(object: I): FollowRequestMessage {
        const message = createBaseFollowRequestMessage();
        message.leader = object.leader ?? 0;
        return message;
    },
};

function createBaseFollowConfirmationMessage(): FollowConfirmationMessage {
    return { leader: 0, follower: 0 };
}

export const FollowConfirmationMessage = {
    encode(message: FollowConfirmationMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.leader !== 0) {
            writer.uint32(8).int32(message.leader);
        }
        if (message.follower !== 0) {
            writer.uint32(16).int32(message.follower);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): FollowConfirmationMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseFollowConfirmationMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.leader = reader.int32();
                    break;
                case 2:
                    message.follower = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): FollowConfirmationMessage {
        return {
            leader: isSet(object.leader) ? Number(object.leader) : 0,
            follower: isSet(object.follower) ? Number(object.follower) : 0,
        };
    },

    toJSON(message: FollowConfirmationMessage): unknown {
        const obj: any = {};
        message.leader !== undefined && (obj.leader = Math.round(message.leader));
        message.follower !== undefined && (obj.follower = Math.round(message.follower));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<FollowConfirmationMessage>, I>>(object: I): FollowConfirmationMessage {
        const message = createBaseFollowConfirmationMessage();
        message.leader = object.leader ?? 0;
        message.follower = object.follower ?? 0;
        return message;
    },
};

function createBaseFollowAbortMessage(): FollowAbortMessage {
    return { leader: 0, follower: 0 };
}

export const FollowAbortMessage = {
    encode(message: FollowAbortMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.leader !== 0) {
            writer.uint32(8).int32(message.leader);
        }
        if (message.follower !== 0) {
            writer.uint32(16).int32(message.follower);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): FollowAbortMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseFollowAbortMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.leader = reader.int32();
                    break;
                case 2:
                    message.follower = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): FollowAbortMessage {
        return {
            leader: isSet(object.leader) ? Number(object.leader) : 0,
            follower: isSet(object.follower) ? Number(object.follower) : 0,
        };
    },

    toJSON(message: FollowAbortMessage): unknown {
        const obj: any = {};
        message.leader !== undefined && (obj.leader = Math.round(message.leader));
        message.follower !== undefined && (obj.follower = Math.round(message.follower));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<FollowAbortMessage>, I>>(object: I): FollowAbortMessage {
        const message = createBaseFollowAbortMessage();
        message.leader = object.leader ?? 0;
        message.follower = object.follower ?? 0;
        return message;
    },
};

function createBaseLockGroupPromptMessage(): LockGroupPromptMessage {
    return { lock: false };
}

export const LockGroupPromptMessage = {
    encode(message: LockGroupPromptMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.lock === true) {
            writer.uint32(8).bool(message.lock);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): LockGroupPromptMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseLockGroupPromptMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.lock = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): LockGroupPromptMessage {
        return { lock: isSet(object.lock) ? Boolean(object.lock) : false };
    },

    toJSON(message: LockGroupPromptMessage): unknown {
        const obj: any = {};
        message.lock !== undefined && (obj.lock = message.lock);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<LockGroupPromptMessage>, I>>(object: I): LockGroupPromptMessage {
        const message = createBaseLockGroupPromptMessage();
        message.lock = object.lock ?? false;
        return message;
    },
};

function createBaseModifyAreaMessage(): ModifyAreaMessage {
    return { id: 0, x: undefined, y: undefined, width: undefined, height: undefined };
}

export const ModifyAreaMessage = {
    encode(message: ModifyAreaMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.id !== 0) {
            writer.uint32(8).int32(message.id);
        }
        if (message.x !== undefined) {
            writer.uint32(16).uint32(message.x);
        }
        if (message.y !== undefined) {
            writer.uint32(24).uint32(message.y);
        }
        if (message.width !== undefined) {
            writer.uint32(32).uint32(message.width);
        }
        if (message.height !== undefined) {
            writer.uint32(40).uint32(message.height);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ModifyAreaMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseModifyAreaMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.int32();
                    break;
                case 2:
                    message.x = reader.uint32();
                    break;
                case 3:
                    message.y = reader.uint32();
                    break;
                case 4:
                    message.width = reader.uint32();
                    break;
                case 5:
                    message.height = reader.uint32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ModifyAreaMessage {
        return {
            id: isSet(object.id) ? Number(object.id) : 0,
            x: isSet(object.x) ? Number(object.x) : undefined,
            y: isSet(object.y) ? Number(object.y) : undefined,
            width: isSet(object.width) ? Number(object.width) : undefined,
            height: isSet(object.height) ? Number(object.height) : undefined,
        };
    },

    toJSON(message: ModifyAreaMessage): unknown {
        const obj: any = {};
        message.id !== undefined && (obj.id = Math.round(message.id));
        message.x !== undefined && (obj.x = Math.round(message.x));
        message.y !== undefined && (obj.y = Math.round(message.y));
        message.width !== undefined && (obj.width = Math.round(message.width));
        message.height !== undefined && (obj.height = Math.round(message.height));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ModifyAreaMessage>, I>>(object: I): ModifyAreaMessage {
        const message = createBaseModifyAreaMessage();
        message.id = object.id ?? 0;
        message.x = object.x ?? undefined;
        message.y = object.y ?? undefined;
        message.width = object.width ?? undefined;
        message.height = object.height ?? undefined;
        return message;
    },
};

function createBaseClientToServerMessage(): ClientToServerMessage {
    return { message: undefined };
}

export const ClientToServerMessage = {
    encode(message: ClientToServerMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "userMovesMessage") {
            UserMovesMessage.encode(message.message.userMovesMessage, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "viewportMessage") {
            ViewportMessage.encode(message.message.viewportMessage, writer.uint32(34).fork()).ldelim();
        }
        if (message.message?.$case === "itemEventMessage") {
            ItemEventMessage.encode(message.message.itemEventMessage, writer.uint32(42).fork()).ldelim();
        }
        if (message.message?.$case === "setPlayerDetailsMessage") {
            SetPlayerDetailsMessage.encode(message.message.setPlayerDetailsMessage, writer.uint32(50).fork()).ldelim();
        }
        if (message.message?.$case === "webRtcSignalToServerMessage") {
            WebRtcSignalToServerMessage.encode(
                message.message.webRtcSignalToServerMessage,
                writer.uint32(58).fork()
            ).ldelim();
        }
        if (message.message?.$case === "webRtcScreenSharingSignalToServerMessage") {
            WebRtcSignalToServerMessage.encode(
                message.message.webRtcScreenSharingSignalToServerMessage,
                writer.uint32(66).fork()
            ).ldelim();
        }
        if (message.message?.$case === "playGlobalMessage") {
            PlayGlobalMessage.encode(message.message.playGlobalMessage, writer.uint32(74).fork()).ldelim();
        }
        if (message.message?.$case === "stopGlobalMessage") {
            StopGlobalMessage.encode(message.message.stopGlobalMessage, writer.uint32(82).fork()).ldelim();
        }
        if (message.message?.$case === "reportPlayerMessage") {
            ReportPlayerMessage.encode(message.message.reportPlayerMessage, writer.uint32(90).fork()).ldelim();
        }
        if (message.message?.$case === "emotePromptMessage") {
            EmotePromptMessage.encode(message.message.emotePromptMessage, writer.uint32(106).fork()).ldelim();
        }
        if (message.message?.$case === "variableMessage") {
            VariableMessage.encode(message.message.variableMessage, writer.uint32(114).fork()).ldelim();
        }
        if (message.message?.$case === "followRequestMessage") {
            FollowRequestMessage.encode(message.message.followRequestMessage, writer.uint32(122).fork()).ldelim();
        }
        if (message.message?.$case === "followConfirmationMessage") {
            FollowConfirmationMessage.encode(
                message.message.followConfirmationMessage,
                writer.uint32(130).fork()
            ).ldelim();
        }
        if (message.message?.$case === "followAbortMessage") {
            FollowAbortMessage.encode(message.message.followAbortMessage, writer.uint32(138).fork()).ldelim();
        }
        if (message.message?.$case === "lockGroupPromptMessage") {
            LockGroupPromptMessage.encode(message.message.lockGroupPromptMessage, writer.uint32(146).fork()).ldelim();
        }
        if (message.message?.$case === "queryMessage") {
            QueryMessage.encode(message.message.queryMessage, writer.uint32(162).fork()).ldelim();
        }
        if (message.message?.$case === "pingMessage") {
            PingMessage.encode(message.message.pingMessage, writer.uint32(170).fork()).ldelim();
        }
        if (message.message?.$case === "askPositionMessage") {
            AskPositionMessage.encode(message.message.askPositionMessage, writer.uint32(186).fork()).ldelim();
        }
        if (message.message?.$case === "editMapMessage") {
            EditMapMessage.encode(message.message.editMapMessage, writer.uint32(194).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ClientToServerMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseClientToServerMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 2:
                    message.message = {
                        $case: "userMovesMessage",
                        userMovesMessage: UserMovesMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 4:
                    message.message = {
                        $case: "viewportMessage",
                        viewportMessage: ViewportMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 5:
                    message.message = {
                        $case: "itemEventMessage",
                        itemEventMessage: ItemEventMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 6:
                    message.message = {
                        $case: "setPlayerDetailsMessage",
                        setPlayerDetailsMessage: SetPlayerDetailsMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 7:
                    message.message = {
                        $case: "webRtcSignalToServerMessage",
                        webRtcSignalToServerMessage: WebRtcSignalToServerMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 8:
                    message.message = {
                        $case: "webRtcScreenSharingSignalToServerMessage",
                        webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage.decode(
                            reader,
                            reader.uint32()
                        ),
                    };
                    break;
                case 9:
                    message.message = {
                        $case: "playGlobalMessage",
                        playGlobalMessage: PlayGlobalMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 10:
                    message.message = {
                        $case: "stopGlobalMessage",
                        stopGlobalMessage: StopGlobalMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 11:
                    message.message = {
                        $case: "reportPlayerMessage",
                        reportPlayerMessage: ReportPlayerMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 13:
                    message.message = {
                        $case: "emotePromptMessage",
                        emotePromptMessage: EmotePromptMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 14:
                    message.message = {
                        $case: "variableMessage",
                        variableMessage: VariableMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 15:
                    message.message = {
                        $case: "followRequestMessage",
                        followRequestMessage: FollowRequestMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 16:
                    message.message = {
                        $case: "followConfirmationMessage",
                        followConfirmationMessage: FollowConfirmationMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 17:
                    message.message = {
                        $case: "followAbortMessage",
                        followAbortMessage: FollowAbortMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 18:
                    message.message = {
                        $case: "lockGroupPromptMessage",
                        lockGroupPromptMessage: LockGroupPromptMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 20:
                    message.message = {
                        $case: "queryMessage",
                        queryMessage: QueryMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 21:
                    message.message = {
                        $case: "pingMessage",
                        pingMessage: PingMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 23:
                    message.message = {
                        $case: "askPositionMessage",
                        askPositionMessage: AskPositionMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 24:
                    message.message = {
                        $case: "editMapMessage",
                        editMapMessage: EditMapMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ClientToServerMessage {
        return {
            message: isSet(object.userMovesMessage)
                ? { $case: "userMovesMessage", userMovesMessage: UserMovesMessage.fromJSON(object.userMovesMessage) }
                : isSet(object.viewportMessage)
                ? { $case: "viewportMessage", viewportMessage: ViewportMessage.fromJSON(object.viewportMessage) }
                : isSet(object.itemEventMessage)
                ? { $case: "itemEventMessage", itemEventMessage: ItemEventMessage.fromJSON(object.itemEventMessage) }
                : isSet(object.setPlayerDetailsMessage)
                ? {
                      $case: "setPlayerDetailsMessage",
                      setPlayerDetailsMessage: SetPlayerDetailsMessage.fromJSON(object.setPlayerDetailsMessage),
                  }
                : isSet(object.webRtcSignalToServerMessage)
                ? {
                      $case: "webRtcSignalToServerMessage",
                      webRtcSignalToServerMessage: WebRtcSignalToServerMessage.fromJSON(
                          object.webRtcSignalToServerMessage
                      ),
                  }
                : isSet(object.webRtcScreenSharingSignalToServerMessage)
                ? {
                      $case: "webRtcScreenSharingSignalToServerMessage",
                      webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage.fromJSON(
                          object.webRtcScreenSharingSignalToServerMessage
                      ),
                  }
                : isSet(object.playGlobalMessage)
                ? {
                      $case: "playGlobalMessage",
                      playGlobalMessage: PlayGlobalMessage.fromJSON(object.playGlobalMessage),
                  }
                : isSet(object.stopGlobalMessage)
                ? {
                      $case: "stopGlobalMessage",
                      stopGlobalMessage: StopGlobalMessage.fromJSON(object.stopGlobalMessage),
                  }
                : isSet(object.reportPlayerMessage)
                ? {
                      $case: "reportPlayerMessage",
                      reportPlayerMessage: ReportPlayerMessage.fromJSON(object.reportPlayerMessage),
                  }
                : isSet(object.emotePromptMessage)
                ? {
                      $case: "emotePromptMessage",
                      emotePromptMessage: EmotePromptMessage.fromJSON(object.emotePromptMessage),
                  }
                : isSet(object.variableMessage)
                ? { $case: "variableMessage", variableMessage: VariableMessage.fromJSON(object.variableMessage) }
                : isSet(object.followRequestMessage)
                ? {
                      $case: "followRequestMessage",
                      followRequestMessage: FollowRequestMessage.fromJSON(object.followRequestMessage),
                  }
                : isSet(object.followConfirmationMessage)
                ? {
                      $case: "followConfirmationMessage",
                      followConfirmationMessage: FollowConfirmationMessage.fromJSON(object.followConfirmationMessage),
                  }
                : isSet(object.followAbortMessage)
                ? {
                      $case: "followAbortMessage",
                      followAbortMessage: FollowAbortMessage.fromJSON(object.followAbortMessage),
                  }
                : isSet(object.lockGroupPromptMessage)
                ? {
                      $case: "lockGroupPromptMessage",
                      lockGroupPromptMessage: LockGroupPromptMessage.fromJSON(object.lockGroupPromptMessage),
                  }
                : isSet(object.queryMessage)
                ? { $case: "queryMessage", queryMessage: QueryMessage.fromJSON(object.queryMessage) }
                : isSet(object.pingMessage)
                ? { $case: "pingMessage", pingMessage: PingMessage.fromJSON(object.pingMessage) }
                : isSet(object.askPositionMessage)
                ? {
                      $case: "askPositionMessage",
                      askPositionMessage: AskPositionMessage.fromJSON(object.askPositionMessage),
                  }
                : isSet(object.editMapMessage)
                ? { $case: "editMapMessage", editMapMessage: EditMapMessage.fromJSON(object.editMapMessage) }
                : undefined,
        };
    },

    toJSON(message: ClientToServerMessage): unknown {
        const obj: any = {};
        message.message?.$case === "userMovesMessage" &&
            (obj.userMovesMessage = message.message?.userMovesMessage
                ? UserMovesMessage.toJSON(message.message?.userMovesMessage)
                : undefined);
        message.message?.$case === "viewportMessage" &&
            (obj.viewportMessage = message.message?.viewportMessage
                ? ViewportMessage.toJSON(message.message?.viewportMessage)
                : undefined);
        message.message?.$case === "itemEventMessage" &&
            (obj.itemEventMessage = message.message?.itemEventMessage
                ? ItemEventMessage.toJSON(message.message?.itemEventMessage)
                : undefined);
        message.message?.$case === "setPlayerDetailsMessage" &&
            (obj.setPlayerDetailsMessage = message.message?.setPlayerDetailsMessage
                ? SetPlayerDetailsMessage.toJSON(message.message?.setPlayerDetailsMessage)
                : undefined);
        message.message?.$case === "webRtcSignalToServerMessage" &&
            (obj.webRtcSignalToServerMessage = message.message?.webRtcSignalToServerMessage
                ? WebRtcSignalToServerMessage.toJSON(message.message?.webRtcSignalToServerMessage)
                : undefined);
        message.message?.$case === "webRtcScreenSharingSignalToServerMessage" &&
            (obj.webRtcScreenSharingSignalToServerMessage = message.message?.webRtcScreenSharingSignalToServerMessage
                ? WebRtcSignalToServerMessage.toJSON(message.message?.webRtcScreenSharingSignalToServerMessage)
                : undefined);
        message.message?.$case === "playGlobalMessage" &&
            (obj.playGlobalMessage = message.message?.playGlobalMessage
                ? PlayGlobalMessage.toJSON(message.message?.playGlobalMessage)
                : undefined);
        message.message?.$case === "stopGlobalMessage" &&
            (obj.stopGlobalMessage = message.message?.stopGlobalMessage
                ? StopGlobalMessage.toJSON(message.message?.stopGlobalMessage)
                : undefined);
        message.message?.$case === "reportPlayerMessage" &&
            (obj.reportPlayerMessage = message.message?.reportPlayerMessage
                ? ReportPlayerMessage.toJSON(message.message?.reportPlayerMessage)
                : undefined);
        message.message?.$case === "emotePromptMessage" &&
            (obj.emotePromptMessage = message.message?.emotePromptMessage
                ? EmotePromptMessage.toJSON(message.message?.emotePromptMessage)
                : undefined);
        message.message?.$case === "variableMessage" &&
            (obj.variableMessage = message.message?.variableMessage
                ? VariableMessage.toJSON(message.message?.variableMessage)
                : undefined);
        message.message?.$case === "followRequestMessage" &&
            (obj.followRequestMessage = message.message?.followRequestMessage
                ? FollowRequestMessage.toJSON(message.message?.followRequestMessage)
                : undefined);
        message.message?.$case === "followConfirmationMessage" &&
            (obj.followConfirmationMessage = message.message?.followConfirmationMessage
                ? FollowConfirmationMessage.toJSON(message.message?.followConfirmationMessage)
                : undefined);
        message.message?.$case === "followAbortMessage" &&
            (obj.followAbortMessage = message.message?.followAbortMessage
                ? FollowAbortMessage.toJSON(message.message?.followAbortMessage)
                : undefined);
        message.message?.$case === "lockGroupPromptMessage" &&
            (obj.lockGroupPromptMessage = message.message?.lockGroupPromptMessage
                ? LockGroupPromptMessage.toJSON(message.message?.lockGroupPromptMessage)
                : undefined);
        message.message?.$case === "queryMessage" &&
            (obj.queryMessage = message.message?.queryMessage
                ? QueryMessage.toJSON(message.message?.queryMessage)
                : undefined);
        message.message?.$case === "pingMessage" &&
            (obj.pingMessage = message.message?.pingMessage
                ? PingMessage.toJSON(message.message?.pingMessage)
                : undefined);
        message.message?.$case === "askPositionMessage" &&
            (obj.askPositionMessage = message.message?.askPositionMessage
                ? AskPositionMessage.toJSON(message.message?.askPositionMessage)
                : undefined);
        message.message?.$case === "editMapMessage" &&
            (obj.editMapMessage = message.message?.editMapMessage
                ? EditMapMessage.toJSON(message.message?.editMapMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ClientToServerMessage>, I>>(object: I): ClientToServerMessage {
        const message = createBaseClientToServerMessage();
        if (
            object.message?.$case === "userMovesMessage" &&
            object.message?.userMovesMessage !== undefined &&
            object.message?.userMovesMessage !== null
        ) {
            message.message = {
                $case: "userMovesMessage",
                userMovesMessage: UserMovesMessage.fromPartial(object.message.userMovesMessage),
            };
        }
        if (
            object.message?.$case === "viewportMessage" &&
            object.message?.viewportMessage !== undefined &&
            object.message?.viewportMessage !== null
        ) {
            message.message = {
                $case: "viewportMessage",
                viewportMessage: ViewportMessage.fromPartial(object.message.viewportMessage),
            };
        }
        if (
            object.message?.$case === "itemEventMessage" &&
            object.message?.itemEventMessage !== undefined &&
            object.message?.itemEventMessage !== null
        ) {
            message.message = {
                $case: "itemEventMessage",
                itemEventMessage: ItemEventMessage.fromPartial(object.message.itemEventMessage),
            };
        }
        if (
            object.message?.$case === "setPlayerDetailsMessage" &&
            object.message?.setPlayerDetailsMessage !== undefined &&
            object.message?.setPlayerDetailsMessage !== null
        ) {
            message.message = {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: SetPlayerDetailsMessage.fromPartial(object.message.setPlayerDetailsMessage),
            };
        }
        if (
            object.message?.$case === "webRtcSignalToServerMessage" &&
            object.message?.webRtcSignalToServerMessage !== undefined &&
            object.message?.webRtcSignalToServerMessage !== null
        ) {
            message.message = {
                $case: "webRtcSignalToServerMessage",
                webRtcSignalToServerMessage: WebRtcSignalToServerMessage.fromPartial(
                    object.message.webRtcSignalToServerMessage
                ),
            };
        }
        if (
            object.message?.$case === "webRtcScreenSharingSignalToServerMessage" &&
            object.message?.webRtcScreenSharingSignalToServerMessage !== undefined &&
            object.message?.webRtcScreenSharingSignalToServerMessage !== null
        ) {
            message.message = {
                $case: "webRtcScreenSharingSignalToServerMessage",
                webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage.fromPartial(
                    object.message.webRtcScreenSharingSignalToServerMessage
                ),
            };
        }
        if (
            object.message?.$case === "playGlobalMessage" &&
            object.message?.playGlobalMessage !== undefined &&
            object.message?.playGlobalMessage !== null
        ) {
            message.message = {
                $case: "playGlobalMessage",
                playGlobalMessage: PlayGlobalMessage.fromPartial(object.message.playGlobalMessage),
            };
        }
        if (
            object.message?.$case === "stopGlobalMessage" &&
            object.message?.stopGlobalMessage !== undefined &&
            object.message?.stopGlobalMessage !== null
        ) {
            message.message = {
                $case: "stopGlobalMessage",
                stopGlobalMessage: StopGlobalMessage.fromPartial(object.message.stopGlobalMessage),
            };
        }
        if (
            object.message?.$case === "reportPlayerMessage" &&
            object.message?.reportPlayerMessage !== undefined &&
            object.message?.reportPlayerMessage !== null
        ) {
            message.message = {
                $case: "reportPlayerMessage",
                reportPlayerMessage: ReportPlayerMessage.fromPartial(object.message.reportPlayerMessage),
            };
        }
        if (
            object.message?.$case === "emotePromptMessage" &&
            object.message?.emotePromptMessage !== undefined &&
            object.message?.emotePromptMessage !== null
        ) {
            message.message = {
                $case: "emotePromptMessage",
                emotePromptMessage: EmotePromptMessage.fromPartial(object.message.emotePromptMessage),
            };
        }
        if (
            object.message?.$case === "variableMessage" &&
            object.message?.variableMessage !== undefined &&
            object.message?.variableMessage !== null
        ) {
            message.message = {
                $case: "variableMessage",
                variableMessage: VariableMessage.fromPartial(object.message.variableMessage),
            };
        }
        if (
            object.message?.$case === "followRequestMessage" &&
            object.message?.followRequestMessage !== undefined &&
            object.message?.followRequestMessage !== null
        ) {
            message.message = {
                $case: "followRequestMessage",
                followRequestMessage: FollowRequestMessage.fromPartial(object.message.followRequestMessage),
            };
        }
        if (
            object.message?.$case === "followConfirmationMessage" &&
            object.message?.followConfirmationMessage !== undefined &&
            object.message?.followConfirmationMessage !== null
        ) {
            message.message = {
                $case: "followConfirmationMessage",
                followConfirmationMessage: FollowConfirmationMessage.fromPartial(
                    object.message.followConfirmationMessage
                ),
            };
        }
        if (
            object.message?.$case === "followAbortMessage" &&
            object.message?.followAbortMessage !== undefined &&
            object.message?.followAbortMessage !== null
        ) {
            message.message = {
                $case: "followAbortMessage",
                followAbortMessage: FollowAbortMessage.fromPartial(object.message.followAbortMessage),
            };
        }
        if (
            object.message?.$case === "lockGroupPromptMessage" &&
            object.message?.lockGroupPromptMessage !== undefined &&
            object.message?.lockGroupPromptMessage !== null
        ) {
            message.message = {
                $case: "lockGroupPromptMessage",
                lockGroupPromptMessage: LockGroupPromptMessage.fromPartial(object.message.lockGroupPromptMessage),
            };
        }
        if (
            object.message?.$case === "queryMessage" &&
            object.message?.queryMessage !== undefined &&
            object.message?.queryMessage !== null
        ) {
            message.message = {
                $case: "queryMessage",
                queryMessage: QueryMessage.fromPartial(object.message.queryMessage),
            };
        }
        if (
            object.message?.$case === "pingMessage" &&
            object.message?.pingMessage !== undefined &&
            object.message?.pingMessage !== null
        ) {
            message.message = {
                $case: "pingMessage",
                pingMessage: PingMessage.fromPartial(object.message.pingMessage),
            };
        }
        if (
            object.message?.$case === "askPositionMessage" &&
            object.message?.askPositionMessage !== undefined &&
            object.message?.askPositionMessage !== null
        ) {
            message.message = {
                $case: "askPositionMessage",
                askPositionMessage: AskPositionMessage.fromPartial(object.message.askPositionMessage),
            };
        }
        if (
            object.message?.$case === "editMapMessage" &&
            object.message?.editMapMessage !== undefined &&
            object.message?.editMapMessage !== null
        ) {
            message.message = {
                $case: "editMapMessage",
                editMapMessage: EditMapMessage.fromPartial(object.message.editMapMessage),
            };
        }
        return message;
    },
};

function createBaseItemEventMessage(): ItemEventMessage {
    return { itemId: 0, event: "", stateJson: "", parametersJson: "" };
}

export const ItemEventMessage = {
    encode(message: ItemEventMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.itemId !== 0) {
            writer.uint32(8).int32(message.itemId);
        }
        if (message.event !== "") {
            writer.uint32(18).string(message.event);
        }
        if (message.stateJson !== "") {
            writer.uint32(26).string(message.stateJson);
        }
        if (message.parametersJson !== "") {
            writer.uint32(34).string(message.parametersJson);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ItemEventMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseItemEventMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.itemId = reader.int32();
                    break;
                case 2:
                    message.event = reader.string();
                    break;
                case 3:
                    message.stateJson = reader.string();
                    break;
                case 4:
                    message.parametersJson = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ItemEventMessage {
        return {
            itemId: isSet(object.itemId) ? Number(object.itemId) : 0,
            event: isSet(object.event) ? String(object.event) : "",
            stateJson: isSet(object.stateJson) ? String(object.stateJson) : "",
            parametersJson: isSet(object.parametersJson) ? String(object.parametersJson) : "",
        };
    },

    toJSON(message: ItemEventMessage): unknown {
        const obj: any = {};
        message.itemId !== undefined && (obj.itemId = Math.round(message.itemId));
        message.event !== undefined && (obj.event = message.event);
        message.stateJson !== undefined && (obj.stateJson = message.stateJson);
        message.parametersJson !== undefined && (obj.parametersJson = message.parametersJson);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ItemEventMessage>, I>>(object: I): ItemEventMessage {
        const message = createBaseItemEventMessage();
        message.itemId = object.itemId ?? 0;
        message.event = object.event ?? "";
        message.stateJson = object.stateJson ?? "";
        message.parametersJson = object.parametersJson ?? "";
        return message;
    },
};

function createBaseVariableMessage(): VariableMessage {
    return { name: "", value: "" };
}

export const VariableMessage = {
    encode(message: VariableMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.name !== "") {
            writer.uint32(10).string(message.name);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): VariableMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseVariableMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.name = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): VariableMessage {
        return {
            name: isSet(object.name) ? String(object.name) : "",
            value: isSet(object.value) ? String(object.value) : "",
        };
    },

    toJSON(message: VariableMessage): unknown {
        const obj: any = {};
        message.name !== undefined && (obj.name = message.name);
        message.value !== undefined && (obj.value = message.value);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<VariableMessage>, I>>(object: I): VariableMessage {
        const message = createBaseVariableMessage();
        message.name = object.name ?? "";
        message.value = object.value ?? "";
        return message;
    },
};

function createBaseSetPlayerVariableMessage(): SetPlayerVariableMessage {
    return { name: "", value: "", public: false, persist: false, ttl: undefined, scope: 0 };
}

export const SetPlayerVariableMessage = {
    encode(message: SetPlayerVariableMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.name !== "") {
            writer.uint32(10).string(message.name);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        if (message.public === true) {
            writer.uint32(24).bool(message.public);
        }
        if (message.persist === true) {
            writer.uint32(32).bool(message.persist);
        }
        if (message.ttl !== undefined) {
            Int32Value.encode({ value: message.ttl! }, writer.uint32(42).fork()).ldelim();
        }
        if (message.scope !== 0) {
            writer.uint32(48).int32(message.scope);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SetPlayerVariableMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSetPlayerVariableMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.name = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                case 3:
                    message.public = reader.bool();
                    break;
                case 4:
                    message.persist = reader.bool();
                    break;
                case 5:
                    message.ttl = Int32Value.decode(reader, reader.uint32()).value;
                    break;
                case 6:
                    message.scope = reader.int32() as any;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): SetPlayerVariableMessage {
        return {
            name: isSet(object.name) ? String(object.name) : "",
            value: isSet(object.value) ? String(object.value) : "",
            public: isSet(object.public) ? Boolean(object.public) : false,
            persist: isSet(object.persist) ? Boolean(object.persist) : false,
            ttl: isSet(object.ttl) ? Number(object.ttl) : undefined,
            scope: isSet(object.scope) ? setPlayerVariableMessage_ScopeFromJSON(object.scope) : 0,
        };
    },

    toJSON(message: SetPlayerVariableMessage): unknown {
        const obj: any = {};
        message.name !== undefined && (obj.name = message.name);
        message.value !== undefined && (obj.value = message.value);
        message.public !== undefined && (obj.public = message.public);
        message.persist !== undefined && (obj.persist = message.persist);
        message.ttl !== undefined && (obj.ttl = message.ttl);
        message.scope !== undefined && (obj.scope = setPlayerVariableMessage_ScopeToJSON(message.scope));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<SetPlayerVariableMessage>, I>>(object: I): SetPlayerVariableMessage {
        const message = createBaseSetPlayerVariableMessage();
        message.name = object.name ?? "";
        message.value = object.value ?? "";
        message.public = object.public ?? false;
        message.persist = object.persist ?? false;
        message.ttl = object.ttl ?? undefined;
        message.scope = object.scope ?? 0;
        return message;
    },
};

function createBaseXmppMessage(): XmppMessage {
    return { stanza: "" };
}

export const XmppMessage = {
    encode(message: XmppMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.stanza !== "") {
            writer.uint32(10).string(message.stanza);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): XmppMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseXmppMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.stanza = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): XmppMessage {
        return { stanza: isSet(object.stanza) ? String(object.stanza) : "" };
    },

    toJSON(message: XmppMessage): unknown {
        const obj: any = {};
        message.stanza !== undefined && (obj.stanza = message.stanza);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<XmppMessage>, I>>(object: I): XmppMessage {
        const message = createBaseXmppMessage();
        message.stanza = object.stanza ?? "";
        return message;
    },
};

function createBaseVariableWithTagMessage(): VariableWithTagMessage {
    return { name: "", value: "", readableBy: "" };
}

export const VariableWithTagMessage = {
    encode(message: VariableWithTagMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.name !== "") {
            writer.uint32(10).string(message.name);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        if (message.readableBy !== "") {
            writer.uint32(26).string(message.readableBy);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): VariableWithTagMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseVariableWithTagMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.name = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                case 3:
                    message.readableBy = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): VariableWithTagMessage {
        return {
            name: isSet(object.name) ? String(object.name) : "",
            value: isSet(object.value) ? String(object.value) : "",
            readableBy: isSet(object.readableBy) ? String(object.readableBy) : "",
        };
    },

    toJSON(message: VariableWithTagMessage): unknown {
        const obj: any = {};
        message.name !== undefined && (obj.name = message.name);
        message.value !== undefined && (obj.value = message.value);
        message.readableBy !== undefined && (obj.readableBy = message.readableBy);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<VariableWithTagMessage>, I>>(object: I): VariableWithTagMessage {
        const message = createBaseVariableWithTagMessage();
        message.name = object.name ?? "";
        message.value = object.value ?? "";
        message.readableBy = object.readableBy ?? "";
        return message;
    },
};

function createBasePlayGlobalMessage(): PlayGlobalMessage {
    return { type: "", content: "", broadcastToWorld: false };
}

export const PlayGlobalMessage = {
    encode(message: PlayGlobalMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.type !== "") {
            writer.uint32(10).string(message.type);
        }
        if (message.content !== "") {
            writer.uint32(18).string(message.content);
        }
        if (message.broadcastToWorld === true) {
            writer.uint32(24).bool(message.broadcastToWorld);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PlayGlobalMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePlayGlobalMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.type = reader.string();
                    break;
                case 2:
                    message.content = reader.string();
                    break;
                case 3:
                    message.broadcastToWorld = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): PlayGlobalMessage {
        return {
            type: isSet(object.type) ? String(object.type) : "",
            content: isSet(object.content) ? String(object.content) : "",
            broadcastToWorld: isSet(object.broadcastToWorld) ? Boolean(object.broadcastToWorld) : false,
        };
    },

    toJSON(message: PlayGlobalMessage): unknown {
        const obj: any = {};
        message.type !== undefined && (obj.type = message.type);
        message.content !== undefined && (obj.content = message.content);
        message.broadcastToWorld !== undefined && (obj.broadcastToWorld = message.broadcastToWorld);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PlayGlobalMessage>, I>>(object: I): PlayGlobalMessage {
        const message = createBasePlayGlobalMessage();
        message.type = object.type ?? "";
        message.content = object.content ?? "";
        message.broadcastToWorld = object.broadcastToWorld ?? false;
        return message;
    },
};

function createBaseStopGlobalMessage(): StopGlobalMessage {
    return { id: "" };
}

export const StopGlobalMessage = {
    encode(message: StopGlobalMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.id !== "") {
            writer.uint32(10).string(message.id);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): StopGlobalMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseStopGlobalMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): StopGlobalMessage {
        return { id: isSet(object.id) ? String(object.id) : "" };
    },

    toJSON(message: StopGlobalMessage): unknown {
        const obj: any = {};
        message.id !== undefined && (obj.id = message.id);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<StopGlobalMessage>, I>>(object: I): StopGlobalMessage {
        const message = createBaseStopGlobalMessage();
        message.id = object.id ?? "";
        return message;
    },
};

function createBaseQueryMessage(): QueryMessage {
    return { id: 0, query: undefined };
}

export const QueryMessage = {
    encode(message: QueryMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.id !== 0) {
            writer.uint32(8).int32(message.id);
        }
        if (message.query?.$case === "jitsiJwtQuery") {
            JitsiJwtQuery.encode(message.query.jitsiJwtQuery, writer.uint32(18).fork()).ldelim();
        }
        if (message.query?.$case === "joinBBBMeetingQuery") {
            JoinBBBMeetingQuery.encode(message.query.joinBBBMeetingQuery, writer.uint32(162).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): QueryMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseQueryMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.int32();
                    break;
                case 2:
                    message.query = {
                        $case: "jitsiJwtQuery",
                        jitsiJwtQuery: JitsiJwtQuery.decode(reader, reader.uint32()),
                    };
                    break;
                case 20:
                    message.query = {
                        $case: "joinBBBMeetingQuery",
                        joinBBBMeetingQuery: JoinBBBMeetingQuery.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): QueryMessage {
        return {
            id: isSet(object.id) ? Number(object.id) : 0,
            query: isSet(object.jitsiJwtQuery)
                ? { $case: "jitsiJwtQuery", jitsiJwtQuery: JitsiJwtQuery.fromJSON(object.jitsiJwtQuery) }
                : isSet(object.joinBBBMeetingQuery)
                ? {
                      $case: "joinBBBMeetingQuery",
                      joinBBBMeetingQuery: JoinBBBMeetingQuery.fromJSON(object.joinBBBMeetingQuery),
                  }
                : undefined,
        };
    },

    toJSON(message: QueryMessage): unknown {
        const obj: any = {};
        message.id !== undefined && (obj.id = Math.round(message.id));
        message.query?.$case === "jitsiJwtQuery" &&
            (obj.jitsiJwtQuery = message.query?.jitsiJwtQuery
                ? JitsiJwtQuery.toJSON(message.query?.jitsiJwtQuery)
                : undefined);
        message.query?.$case === "joinBBBMeetingQuery" &&
            (obj.joinBBBMeetingQuery = message.query?.joinBBBMeetingQuery
                ? JoinBBBMeetingQuery.toJSON(message.query?.joinBBBMeetingQuery)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<QueryMessage>, I>>(object: I): QueryMessage {
        const message = createBaseQueryMessage();
        message.id = object.id ?? 0;
        if (
            object.query?.$case === "jitsiJwtQuery" &&
            object.query?.jitsiJwtQuery !== undefined &&
            object.query?.jitsiJwtQuery !== null
        ) {
            message.query = {
                $case: "jitsiJwtQuery",
                jitsiJwtQuery: JitsiJwtQuery.fromPartial(object.query.jitsiJwtQuery),
            };
        }
        if (
            object.query?.$case === "joinBBBMeetingQuery" &&
            object.query?.joinBBBMeetingQuery !== undefined &&
            object.query?.joinBBBMeetingQuery !== null
        ) {
            message.query = {
                $case: "joinBBBMeetingQuery",
                joinBBBMeetingQuery: JoinBBBMeetingQuery.fromPartial(object.query.joinBBBMeetingQuery),
            };
        }
        return message;
    },
};

function createBaseJitsiJwtQuery(): JitsiJwtQuery {
    return { jitsiRoom: "" };
}

export const JitsiJwtQuery = {
    encode(message: JitsiJwtQuery, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.jitsiRoom !== "") {
            writer.uint32(10).string(message.jitsiRoom);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): JitsiJwtQuery {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseJitsiJwtQuery();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.jitsiRoom = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): JitsiJwtQuery {
        return { jitsiRoom: isSet(object.jitsiRoom) ? String(object.jitsiRoom) : "" };
    },

    toJSON(message: JitsiJwtQuery): unknown {
        const obj: any = {};
        message.jitsiRoom !== undefined && (obj.jitsiRoom = message.jitsiRoom);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<JitsiJwtQuery>, I>>(object: I): JitsiJwtQuery {
        const message = createBaseJitsiJwtQuery();
        message.jitsiRoom = object.jitsiRoom ?? "";
        return message;
    },
};

function createBaseJoinBBBMeetingQuery(): JoinBBBMeetingQuery {
    return { meetingId: "", meetingName: "" };
}

export const JoinBBBMeetingQuery = {
    encode(message: JoinBBBMeetingQuery, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.meetingId !== "") {
            writer.uint32(10).string(message.meetingId);
        }
        if (message.meetingName !== "") {
            writer.uint32(18).string(message.meetingName);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): JoinBBBMeetingQuery {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseJoinBBBMeetingQuery();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.meetingId = reader.string();
                    break;
                case 2:
                    message.meetingName = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): JoinBBBMeetingQuery {
        return {
            meetingId: isSet(object.meetingId) ? String(object.meetingId) : "",
            meetingName: isSet(object.meetingName) ? String(object.meetingName) : "",
        };
    },

    toJSON(message: JoinBBBMeetingQuery): unknown {
        const obj: any = {};
        message.meetingId !== undefined && (obj.meetingId = message.meetingId);
        message.meetingName !== undefined && (obj.meetingName = message.meetingName);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<JoinBBBMeetingQuery>, I>>(object: I): JoinBBBMeetingQuery {
        const message = createBaseJoinBBBMeetingQuery();
        message.meetingId = object.meetingId ?? "";
        message.meetingName = object.meetingName ?? "";
        return message;
    },
};

function createBaseAnswerMessage(): AnswerMessage {
    return { id: 0, answer: undefined };
}

export const AnswerMessage = {
    encode(message: AnswerMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.id !== 0) {
            writer.uint32(8).int32(message.id);
        }
        if (message.answer?.$case === "error") {
            ErrorMessage.encode(message.answer.error, writer.uint32(18).fork()).ldelim();
        }
        if (message.answer?.$case === "jitsiJwtAnswer") {
            JitsiJwtAnswer.encode(message.answer.jitsiJwtAnswer, writer.uint32(26).fork()).ldelim();
        }
        if (message.answer?.$case === "joinBBBMeetingAnswer") {
            JoinBBBMeetingAnswer.encode(message.answer.joinBBBMeetingAnswer, writer.uint32(34).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): AnswerMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseAnswerMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.int32();
                    break;
                case 2:
                    message.answer = { $case: "error", error: ErrorMessage.decode(reader, reader.uint32()) };
                    break;
                case 3:
                    message.answer = {
                        $case: "jitsiJwtAnswer",
                        jitsiJwtAnswer: JitsiJwtAnswer.decode(reader, reader.uint32()),
                    };
                    break;
                case 4:
                    message.answer = {
                        $case: "joinBBBMeetingAnswer",
                        joinBBBMeetingAnswer: JoinBBBMeetingAnswer.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): AnswerMessage {
        return {
            id: isSet(object.id) ? Number(object.id) : 0,
            answer: isSet(object.error)
                ? { $case: "error", error: ErrorMessage.fromJSON(object.error) }
                : isSet(object.jitsiJwtAnswer)
                ? { $case: "jitsiJwtAnswer", jitsiJwtAnswer: JitsiJwtAnswer.fromJSON(object.jitsiJwtAnswer) }
                : isSet(object.joinBBBMeetingAnswer)
                ? {
                      $case: "joinBBBMeetingAnswer",
                      joinBBBMeetingAnswer: JoinBBBMeetingAnswer.fromJSON(object.joinBBBMeetingAnswer),
                  }
                : undefined,
        };
    },

    toJSON(message: AnswerMessage): unknown {
        const obj: any = {};
        message.id !== undefined && (obj.id = Math.round(message.id));
        message.answer?.$case === "error" &&
            (obj.error = message.answer?.error ? ErrorMessage.toJSON(message.answer?.error) : undefined);
        message.answer?.$case === "jitsiJwtAnswer" &&
            (obj.jitsiJwtAnswer = message.answer?.jitsiJwtAnswer
                ? JitsiJwtAnswer.toJSON(message.answer?.jitsiJwtAnswer)
                : undefined);
        message.answer?.$case === "joinBBBMeetingAnswer" &&
            (obj.joinBBBMeetingAnswer = message.answer?.joinBBBMeetingAnswer
                ? JoinBBBMeetingAnswer.toJSON(message.answer?.joinBBBMeetingAnswer)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<AnswerMessage>, I>>(object: I): AnswerMessage {
        const message = createBaseAnswerMessage();
        message.id = object.id ?? 0;
        if (object.answer?.$case === "error" && object.answer?.error !== undefined && object.answer?.error !== null) {
            message.answer = { $case: "error", error: ErrorMessage.fromPartial(object.answer.error) };
        }
        if (
            object.answer?.$case === "jitsiJwtAnswer" &&
            object.answer?.jitsiJwtAnswer !== undefined &&
            object.answer?.jitsiJwtAnswer !== null
        ) {
            message.answer = {
                $case: "jitsiJwtAnswer",
                jitsiJwtAnswer: JitsiJwtAnswer.fromPartial(object.answer.jitsiJwtAnswer),
            };
        }
        if (
            object.answer?.$case === "joinBBBMeetingAnswer" &&
            object.answer?.joinBBBMeetingAnswer !== undefined &&
            object.answer?.joinBBBMeetingAnswer !== null
        ) {
            message.answer = {
                $case: "joinBBBMeetingAnswer",
                joinBBBMeetingAnswer: JoinBBBMeetingAnswer.fromPartial(object.answer.joinBBBMeetingAnswer),
            };
        }
        return message;
    },
};

function createBaseJitsiJwtAnswer(): JitsiJwtAnswer {
    return { jwt: "" };
}

export const JitsiJwtAnswer = {
    encode(message: JitsiJwtAnswer, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.jwt !== "") {
            writer.uint32(10).string(message.jwt);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): JitsiJwtAnswer {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseJitsiJwtAnswer();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.jwt = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): JitsiJwtAnswer {
        return { jwt: isSet(object.jwt) ? String(object.jwt) : "" };
    },

    toJSON(message: JitsiJwtAnswer): unknown {
        const obj: any = {};
        message.jwt !== undefined && (obj.jwt = message.jwt);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<JitsiJwtAnswer>, I>>(object: I): JitsiJwtAnswer {
        const message = createBaseJitsiJwtAnswer();
        message.jwt = object.jwt ?? "";
        return message;
    },
};

function createBaseJoinBBBMeetingAnswer(): JoinBBBMeetingAnswer {
    return { meetingId: "", clientURL: "" };
}

export const JoinBBBMeetingAnswer = {
    encode(message: JoinBBBMeetingAnswer, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.meetingId !== "") {
            writer.uint32(10).string(message.meetingId);
        }
        if (message.clientURL !== "") {
            writer.uint32(18).string(message.clientURL);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): JoinBBBMeetingAnswer {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseJoinBBBMeetingAnswer();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.meetingId = reader.string();
                    break;
                case 2:
                    message.clientURL = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): JoinBBBMeetingAnswer {
        return {
            meetingId: isSet(object.meetingId) ? String(object.meetingId) : "",
            clientURL: isSet(object.clientURL) ? String(object.clientURL) : "",
        };
    },

    toJSON(message: JoinBBBMeetingAnswer): unknown {
        const obj: any = {};
        message.meetingId !== undefined && (obj.meetingId = message.meetingId);
        message.clientURL !== undefined && (obj.clientURL = message.clientURL);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<JoinBBBMeetingAnswer>, I>>(object: I): JoinBBBMeetingAnswer {
        const message = createBaseJoinBBBMeetingAnswer();
        message.meetingId = object.meetingId ?? "";
        message.clientURL = object.clientURL ?? "";
        return message;
    },
};

function createBaseUserMovedMessage(): UserMovedMessage {
    return { userId: 0, position: undefined };
}

export const UserMovedMessage = {
    encode(message: UserMovedMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.position !== undefined) {
            PositionMessage.encode(message.position, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserMovedMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserMovedMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 2:
                    message.position = PositionMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserMovedMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            position: isSet(object.position) ? PositionMessage.fromJSON(object.position) : undefined,
        };
    },

    toJSON(message: UserMovedMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.position !== undefined &&
            (obj.position = message.position ? PositionMessage.toJSON(message.position) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserMovedMessage>, I>>(object: I): UserMovedMessage {
        const message = createBaseUserMovedMessage();
        message.userId = object.userId ?? 0;
        message.position =
            object.position !== undefined && object.position !== null
                ? PositionMessage.fromPartial(object.position)
                : undefined;
        return message;
    },
};

function createBaseMoveToPositionMessage(): MoveToPositionMessage {
    return { position: undefined };
}

export const MoveToPositionMessage = {
    encode(message: MoveToPositionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.position !== undefined) {
            PositionMessage.encode(message.position, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): MoveToPositionMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMoveToPositionMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.position = PositionMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): MoveToPositionMessage {
        return { position: isSet(object.position) ? PositionMessage.fromJSON(object.position) : undefined };
    },

    toJSON(message: MoveToPositionMessage): unknown {
        const obj: any = {};
        message.position !== undefined &&
            (obj.position = message.position ? PositionMessage.toJSON(message.position) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<MoveToPositionMessage>, I>>(object: I): MoveToPositionMessage {
        const message = createBaseMoveToPositionMessage();
        message.position =
            object.position !== undefined && object.position !== null
                ? PositionMessage.fromPartial(object.position)
                : undefined;
        return message;
    },
};

function createBaseSubMessage(): SubMessage {
    return { message: undefined };
}

export const SubMessage = {
    encode(message: SubMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "userMovedMessage") {
            UserMovedMessage.encode(message.message.userMovedMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "groupUpdateMessage") {
            GroupUpdateMessage.encode(message.message.groupUpdateMessage, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "groupDeleteMessage") {
            GroupDeleteMessage.encode(message.message.groupDeleteMessage, writer.uint32(26).fork()).ldelim();
        }
        if (message.message?.$case === "userJoinedMessage") {
            UserJoinedMessage.encode(message.message.userJoinedMessage, writer.uint32(34).fork()).ldelim();
        }
        if (message.message?.$case === "userLeftMessage") {
            UserLeftMessage.encode(message.message.userLeftMessage, writer.uint32(42).fork()).ldelim();
        }
        if (message.message?.$case === "itemEventMessage") {
            ItemEventMessage.encode(message.message.itemEventMessage, writer.uint32(50).fork()).ldelim();
        }
        if (message.message?.$case === "emoteEventMessage") {
            EmoteEventMessage.encode(message.message.emoteEventMessage, writer.uint32(58).fork()).ldelim();
        }
        if (message.message?.$case === "variableMessage") {
            VariableMessage.encode(message.message.variableMessage, writer.uint32(66).fork()).ldelim();
        }
        if (message.message?.$case === "errorMessage") {
            ErrorMessage.encode(message.message.errorMessage, writer.uint32(74).fork()).ldelim();
        }
        if (message.message?.$case === "playerDetailsUpdatedMessage") {
            PlayerDetailsUpdatedMessage.encode(
                message.message.playerDetailsUpdatedMessage,
                writer.uint32(82).fork()
            ).ldelim();
        }
        if (message.message?.$case === "pingMessage") {
            PingMessage.encode(message.message.pingMessage, writer.uint32(90).fork()).ldelim();
        }
        if (message.message?.$case === "editMapMessage") {
            EditMapMessage.encode(message.message.editMapMessage, writer.uint32(106).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SubMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSubMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "userMovedMessage",
                        userMovedMessage: UserMovedMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "groupUpdateMessage",
                        groupUpdateMessage: GroupUpdateMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.message = {
                        $case: "groupDeleteMessage",
                        groupDeleteMessage: GroupDeleteMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 4:
                    message.message = {
                        $case: "userJoinedMessage",
                        userJoinedMessage: UserJoinedMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 5:
                    message.message = {
                        $case: "userLeftMessage",
                        userLeftMessage: UserLeftMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 6:
                    message.message = {
                        $case: "itemEventMessage",
                        itemEventMessage: ItemEventMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 7:
                    message.message = {
                        $case: "emoteEventMessage",
                        emoteEventMessage: EmoteEventMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 8:
                    message.message = {
                        $case: "variableMessage",
                        variableMessage: VariableMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 9:
                    message.message = {
                        $case: "errorMessage",
                        errorMessage: ErrorMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 10:
                    message.message = {
                        $case: "playerDetailsUpdatedMessage",
                        playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 11:
                    message.message = {
                        $case: "pingMessage",
                        pingMessage: PingMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 13:
                    message.message = {
                        $case: "editMapMessage",
                        editMapMessage: EditMapMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): SubMessage {
        return {
            message: isSet(object.userMovedMessage)
                ? { $case: "userMovedMessage", userMovedMessage: UserMovedMessage.fromJSON(object.userMovedMessage) }
                : isSet(object.groupUpdateMessage)
                ? {
                      $case: "groupUpdateMessage",
                      groupUpdateMessage: GroupUpdateMessage.fromJSON(object.groupUpdateMessage),
                  }
                : isSet(object.groupDeleteMessage)
                ? {
                      $case: "groupDeleteMessage",
                      groupDeleteMessage: GroupDeleteMessage.fromJSON(object.groupDeleteMessage),
                  }
                : isSet(object.userJoinedMessage)
                ? {
                      $case: "userJoinedMessage",
                      userJoinedMessage: UserJoinedMessage.fromJSON(object.userJoinedMessage),
                  }
                : isSet(object.userLeftMessage)
                ? { $case: "userLeftMessage", userLeftMessage: UserLeftMessage.fromJSON(object.userLeftMessage) }
                : isSet(object.itemEventMessage)
                ? { $case: "itemEventMessage", itemEventMessage: ItemEventMessage.fromJSON(object.itemEventMessage) }
                : isSet(object.emoteEventMessage)
                ? {
                      $case: "emoteEventMessage",
                      emoteEventMessage: EmoteEventMessage.fromJSON(object.emoteEventMessage),
                  }
                : isSet(object.variableMessage)
                ? { $case: "variableMessage", variableMessage: VariableMessage.fromJSON(object.variableMessage) }
                : isSet(object.errorMessage)
                ? { $case: "errorMessage", errorMessage: ErrorMessage.fromJSON(object.errorMessage) }
                : isSet(object.playerDetailsUpdatedMessage)
                ? {
                      $case: "playerDetailsUpdatedMessage",
                      playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage.fromJSON(
                          object.playerDetailsUpdatedMessage
                      ),
                  }
                : isSet(object.pingMessage)
                ? { $case: "pingMessage", pingMessage: PingMessage.fromJSON(object.pingMessage) }
                : isSet(object.editMapMessage)
                ? { $case: "editMapMessage", editMapMessage: EditMapMessage.fromJSON(object.editMapMessage) }
                : undefined,
        };
    },

    toJSON(message: SubMessage): unknown {
        const obj: any = {};
        message.message?.$case === "userMovedMessage" &&
            (obj.userMovedMessage = message.message?.userMovedMessage
                ? UserMovedMessage.toJSON(message.message?.userMovedMessage)
                : undefined);
        message.message?.$case === "groupUpdateMessage" &&
            (obj.groupUpdateMessage = message.message?.groupUpdateMessage
                ? GroupUpdateMessage.toJSON(message.message?.groupUpdateMessage)
                : undefined);
        message.message?.$case === "groupDeleteMessage" &&
            (obj.groupDeleteMessage = message.message?.groupDeleteMessage
                ? GroupDeleteMessage.toJSON(message.message?.groupDeleteMessage)
                : undefined);
        message.message?.$case === "userJoinedMessage" &&
            (obj.userJoinedMessage = message.message?.userJoinedMessage
                ? UserJoinedMessage.toJSON(message.message?.userJoinedMessage)
                : undefined);
        message.message?.$case === "userLeftMessage" &&
            (obj.userLeftMessage = message.message?.userLeftMessage
                ? UserLeftMessage.toJSON(message.message?.userLeftMessage)
                : undefined);
        message.message?.$case === "itemEventMessage" &&
            (obj.itemEventMessage = message.message?.itemEventMessage
                ? ItemEventMessage.toJSON(message.message?.itemEventMessage)
                : undefined);
        message.message?.$case === "emoteEventMessage" &&
            (obj.emoteEventMessage = message.message?.emoteEventMessage
                ? EmoteEventMessage.toJSON(message.message?.emoteEventMessage)
                : undefined);
        message.message?.$case === "variableMessage" &&
            (obj.variableMessage = message.message?.variableMessage
                ? VariableMessage.toJSON(message.message?.variableMessage)
                : undefined);
        message.message?.$case === "errorMessage" &&
            (obj.errorMessage = message.message?.errorMessage
                ? ErrorMessage.toJSON(message.message?.errorMessage)
                : undefined);
        message.message?.$case === "playerDetailsUpdatedMessage" &&
            (obj.playerDetailsUpdatedMessage = message.message?.playerDetailsUpdatedMessage
                ? PlayerDetailsUpdatedMessage.toJSON(message.message?.playerDetailsUpdatedMessage)
                : undefined);
        message.message?.$case === "pingMessage" &&
            (obj.pingMessage = message.message?.pingMessage
                ? PingMessage.toJSON(message.message?.pingMessage)
                : undefined);
        message.message?.$case === "editMapMessage" &&
            (obj.editMapMessage = message.message?.editMapMessage
                ? EditMapMessage.toJSON(message.message?.editMapMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<SubMessage>, I>>(object: I): SubMessage {
        const message = createBaseSubMessage();
        if (
            object.message?.$case === "userMovedMessage" &&
            object.message?.userMovedMessage !== undefined &&
            object.message?.userMovedMessage !== null
        ) {
            message.message = {
                $case: "userMovedMessage",
                userMovedMessage: UserMovedMessage.fromPartial(object.message.userMovedMessage),
            };
        }
        if (
            object.message?.$case === "groupUpdateMessage" &&
            object.message?.groupUpdateMessage !== undefined &&
            object.message?.groupUpdateMessage !== null
        ) {
            message.message = {
                $case: "groupUpdateMessage",
                groupUpdateMessage: GroupUpdateMessage.fromPartial(object.message.groupUpdateMessage),
            };
        }
        if (
            object.message?.$case === "groupDeleteMessage" &&
            object.message?.groupDeleteMessage !== undefined &&
            object.message?.groupDeleteMessage !== null
        ) {
            message.message = {
                $case: "groupDeleteMessage",
                groupDeleteMessage: GroupDeleteMessage.fromPartial(object.message.groupDeleteMessage),
            };
        }
        if (
            object.message?.$case === "userJoinedMessage" &&
            object.message?.userJoinedMessage !== undefined &&
            object.message?.userJoinedMessage !== null
        ) {
            message.message = {
                $case: "userJoinedMessage",
                userJoinedMessage: UserJoinedMessage.fromPartial(object.message.userJoinedMessage),
            };
        }
        if (
            object.message?.$case === "userLeftMessage" &&
            object.message?.userLeftMessage !== undefined &&
            object.message?.userLeftMessage !== null
        ) {
            message.message = {
                $case: "userLeftMessage",
                userLeftMessage: UserLeftMessage.fromPartial(object.message.userLeftMessage),
            };
        }
        if (
            object.message?.$case === "itemEventMessage" &&
            object.message?.itemEventMessage !== undefined &&
            object.message?.itemEventMessage !== null
        ) {
            message.message = {
                $case: "itemEventMessage",
                itemEventMessage: ItemEventMessage.fromPartial(object.message.itemEventMessage),
            };
        }
        if (
            object.message?.$case === "emoteEventMessage" &&
            object.message?.emoteEventMessage !== undefined &&
            object.message?.emoteEventMessage !== null
        ) {
            message.message = {
                $case: "emoteEventMessage",
                emoteEventMessage: EmoteEventMessage.fromPartial(object.message.emoteEventMessage),
            };
        }
        if (
            object.message?.$case === "variableMessage" &&
            object.message?.variableMessage !== undefined &&
            object.message?.variableMessage !== null
        ) {
            message.message = {
                $case: "variableMessage",
                variableMessage: VariableMessage.fromPartial(object.message.variableMessage),
            };
        }
        if (
            object.message?.$case === "errorMessage" &&
            object.message?.errorMessage !== undefined &&
            object.message?.errorMessage !== null
        ) {
            message.message = {
                $case: "errorMessage",
                errorMessage: ErrorMessage.fromPartial(object.message.errorMessage),
            };
        }
        if (
            object.message?.$case === "playerDetailsUpdatedMessage" &&
            object.message?.playerDetailsUpdatedMessage !== undefined &&
            object.message?.playerDetailsUpdatedMessage !== null
        ) {
            message.message = {
                $case: "playerDetailsUpdatedMessage",
                playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage.fromPartial(
                    object.message.playerDetailsUpdatedMessage
                ),
            };
        }
        if (
            object.message?.$case === "pingMessage" &&
            object.message?.pingMessage !== undefined &&
            object.message?.pingMessage !== null
        ) {
            message.message = {
                $case: "pingMessage",
                pingMessage: PingMessage.fromPartial(object.message.pingMessage),
            };
        }
        if (
            object.message?.$case === "editMapMessage" &&
            object.message?.editMapMessage !== undefined &&
            object.message?.editMapMessage !== null
        ) {
            message.message = {
                $case: "editMapMessage",
                editMapMessage: EditMapMessage.fromPartial(object.message.editMapMessage),
            };
        }
        return message;
    },
};

function createBaseBatchMessage(): BatchMessage {
    return { event: "", payload: [] };
}

export const BatchMessage = {
    encode(message: BatchMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.event !== "") {
            writer.uint32(10).string(message.event);
        }
        for (const v of message.payload) {
            SubMessage.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BatchMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBatchMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.event = reader.string();
                    break;
                case 2:
                    message.payload.push(SubMessage.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): BatchMessage {
        return {
            event: isSet(object.event) ? String(object.event) : "",
            payload: Array.isArray(object?.payload) ? object.payload.map((e: any) => SubMessage.fromJSON(e)) : [],
        };
    },

    toJSON(message: BatchMessage): unknown {
        const obj: any = {};
        message.event !== undefined && (obj.event = message.event);
        if (message.payload) {
            obj.payload = message.payload.map((e) => (e ? SubMessage.toJSON(e) : undefined));
        } else {
            obj.payload = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<BatchMessage>, I>>(object: I): BatchMessage {
        const message = createBaseBatchMessage();
        message.event = object.event ?? "";
        message.payload = object.payload?.map((e) => SubMessage.fromPartial(e)) || [];
        return message;
    },
};

function createBaseGroupUpdateMessage(): GroupUpdateMessage {
    return { groupId: 0, position: undefined, groupSize: undefined, locked: undefined };
}

export const GroupUpdateMessage = {
    encode(message: GroupUpdateMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.groupId !== 0) {
            writer.uint32(8).int32(message.groupId);
        }
        if (message.position !== undefined) {
            PointMessage.encode(message.position, writer.uint32(18).fork()).ldelim();
        }
        if (message.groupSize !== undefined) {
            UInt32Value.encode({ value: message.groupSize! }, writer.uint32(26).fork()).ldelim();
        }
        if (message.locked !== undefined) {
            BoolValue.encode({ value: message.locked! }, writer.uint32(34).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupUpdateMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupUpdateMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.groupId = reader.int32();
                    break;
                case 2:
                    message.position = PointMessage.decode(reader, reader.uint32());
                    break;
                case 3:
                    message.groupSize = UInt32Value.decode(reader, reader.uint32()).value;
                    break;
                case 4:
                    message.locked = BoolValue.decode(reader, reader.uint32()).value;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): GroupUpdateMessage {
        return {
            groupId: isSet(object.groupId) ? Number(object.groupId) : 0,
            position: isSet(object.position) ? PointMessage.fromJSON(object.position) : undefined,
            groupSize: isSet(object.groupSize) ? Number(object.groupSize) : undefined,
            locked: isSet(object.locked) ? Boolean(object.locked) : undefined,
        };
    },

    toJSON(message: GroupUpdateMessage): unknown {
        const obj: any = {};
        message.groupId !== undefined && (obj.groupId = Math.round(message.groupId));
        message.position !== undefined &&
            (obj.position = message.position ? PointMessage.toJSON(message.position) : undefined);
        message.groupSize !== undefined && (obj.groupSize = message.groupSize);
        message.locked !== undefined && (obj.locked = message.locked);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<GroupUpdateMessage>, I>>(object: I): GroupUpdateMessage {
        const message = createBaseGroupUpdateMessage();
        message.groupId = object.groupId ?? 0;
        message.position =
            object.position !== undefined && object.position !== null
                ? PointMessage.fromPartial(object.position)
                : undefined;
        message.groupSize = object.groupSize ?? undefined;
        message.locked = object.locked ?? undefined;
        return message;
    },
};

function createBaseGroupDeleteMessage(): GroupDeleteMessage {
    return { groupId: 0 };
}

export const GroupDeleteMessage = {
    encode(message: GroupDeleteMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.groupId !== 0) {
            writer.uint32(8).int32(message.groupId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupDeleteMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupDeleteMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.groupId = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): GroupDeleteMessage {
        return { groupId: isSet(object.groupId) ? Number(object.groupId) : 0 };
    },

    toJSON(message: GroupDeleteMessage): unknown {
        const obj: any = {};
        message.groupId !== undefined && (obj.groupId = Math.round(message.groupId));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<GroupDeleteMessage>, I>>(object: I): GroupDeleteMessage {
        const message = createBaseGroupDeleteMessage();
        message.groupId = object.groupId ?? 0;
        return message;
    },
};

function createBaseUserJoinedMessage(): UserJoinedMessage {
    return {
        userId: 0,
        name: "",
        characterLayers: [],
        position: undefined,
        companion: undefined,
        visitCardUrl: "",
        userUuid: "",
        outlineColor: 0,
        hasOutline: false,
        availabilityStatus: 0,
        variables: {},
    };
}

export const UserJoinedMessage = {
    encode(message: UserJoinedMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.name !== "") {
            writer.uint32(18).string(message.name);
        }
        for (const v of message.characterLayers) {
            CharacterLayerMessage.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        if (message.position !== undefined) {
            PositionMessage.encode(message.position, writer.uint32(34).fork()).ldelim();
        }
        if (message.companion !== undefined) {
            CompanionMessage.encode(message.companion, writer.uint32(42).fork()).ldelim();
        }
        if (message.visitCardUrl !== "") {
            writer.uint32(50).string(message.visitCardUrl);
        }
        if (message.userUuid !== "") {
            writer.uint32(58).string(message.userUuid);
        }
        if (message.outlineColor !== 0) {
            writer.uint32(64).uint32(message.outlineColor);
        }
        if (message.hasOutline === true) {
            writer.uint32(72).bool(message.hasOutline);
        }
        if (message.availabilityStatus !== 0) {
            writer.uint32(80).int32(message.availabilityStatus);
        }
        Object.entries(message.variables).forEach(([key, value]) => {
            UserJoinedMessage_VariablesEntry.encode({ key: key as any, value }, writer.uint32(90).fork()).ldelim();
        });
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserJoinedMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserJoinedMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 2:
                    message.name = reader.string();
                    break;
                case 3:
                    message.characterLayers.push(CharacterLayerMessage.decode(reader, reader.uint32()));
                    break;
                case 4:
                    message.position = PositionMessage.decode(reader, reader.uint32());
                    break;
                case 5:
                    message.companion = CompanionMessage.decode(reader, reader.uint32());
                    break;
                case 6:
                    message.visitCardUrl = reader.string();
                    break;
                case 7:
                    message.userUuid = reader.string();
                    break;
                case 8:
                    message.outlineColor = reader.uint32();
                    break;
                case 9:
                    message.hasOutline = reader.bool();
                    break;
                case 10:
                    message.availabilityStatus = reader.int32() as any;
                    break;
                case 11:
                    const entry11 = UserJoinedMessage_VariablesEntry.decode(reader, reader.uint32());
                    if (entry11.value !== undefined) {
                        message.variables[entry11.key] = entry11.value;
                    }
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserJoinedMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            name: isSet(object.name) ? String(object.name) : "",
            characterLayers: Array.isArray(object?.characterLayers)
                ? object.characterLayers.map((e: any) => CharacterLayerMessage.fromJSON(e))
                : [],
            position: isSet(object.position) ? PositionMessage.fromJSON(object.position) : undefined,
            companion: isSet(object.companion) ? CompanionMessage.fromJSON(object.companion) : undefined,
            visitCardUrl: isSet(object.visitCardUrl) ? String(object.visitCardUrl) : "",
            userUuid: isSet(object.userUuid) ? String(object.userUuid) : "",
            outlineColor: isSet(object.outlineColor) ? Number(object.outlineColor) : 0,
            hasOutline: isSet(object.hasOutline) ? Boolean(object.hasOutline) : false,
            availabilityStatus: isSet(object.availabilityStatus)
                ? availabilityStatusFromJSON(object.availabilityStatus)
                : 0,
            variables: isObject(object.variables)
                ? Object.entries(object.variables).reduce<{ [key: string]: string }>((acc, [key, value]) => {
                      acc[key] = String(value);
                      return acc;
                  }, {})
                : {},
        };
    },

    toJSON(message: UserJoinedMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.name !== undefined && (obj.name = message.name);
        if (message.characterLayers) {
            obj.characterLayers = message.characterLayers.map((e) => (e ? CharacterLayerMessage.toJSON(e) : undefined));
        } else {
            obj.characterLayers = [];
        }
        message.position !== undefined &&
            (obj.position = message.position ? PositionMessage.toJSON(message.position) : undefined);
        message.companion !== undefined &&
            (obj.companion = message.companion ? CompanionMessage.toJSON(message.companion) : undefined);
        message.visitCardUrl !== undefined && (obj.visitCardUrl = message.visitCardUrl);
        message.userUuid !== undefined && (obj.userUuid = message.userUuid);
        message.outlineColor !== undefined && (obj.outlineColor = Math.round(message.outlineColor));
        message.hasOutline !== undefined && (obj.hasOutline = message.hasOutline);
        message.availabilityStatus !== undefined &&
            (obj.availabilityStatus = availabilityStatusToJSON(message.availabilityStatus));
        obj.variables = {};
        if (message.variables) {
            Object.entries(message.variables).forEach(([k, v]) => {
                obj.variables[k] = v;
            });
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserJoinedMessage>, I>>(object: I): UserJoinedMessage {
        const message = createBaseUserJoinedMessage();
        message.userId = object.userId ?? 0;
        message.name = object.name ?? "";
        message.characterLayers = object.characterLayers?.map((e) => CharacterLayerMessage.fromPartial(e)) || [];
        message.position =
            object.position !== undefined && object.position !== null
                ? PositionMessage.fromPartial(object.position)
                : undefined;
        message.companion =
            object.companion !== undefined && object.companion !== null
                ? CompanionMessage.fromPartial(object.companion)
                : undefined;
        message.visitCardUrl = object.visitCardUrl ?? "";
        message.userUuid = object.userUuid ?? "";
        message.outlineColor = object.outlineColor ?? 0;
        message.hasOutline = object.hasOutline ?? false;
        message.availabilityStatus = object.availabilityStatus ?? 0;
        message.variables = Object.entries(object.variables ?? {}).reduce<{ [key: string]: string }>(
            (acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = String(value);
                }
                return acc;
            },
            {}
        );
        return message;
    },
};

function createBaseUserJoinedMessage_VariablesEntry(): UserJoinedMessage_VariablesEntry {
    return { key: "", value: "" };
}

export const UserJoinedMessage_VariablesEntry = {
    encode(message: UserJoinedMessage_VariablesEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserJoinedMessage_VariablesEntry {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserJoinedMessage_VariablesEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserJoinedMessage_VariablesEntry {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? String(object.value) : "",
        };
    },

    toJSON(message: UserJoinedMessage_VariablesEntry): unknown {
        const obj: any = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined && (obj.value = message.value);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserJoinedMessage_VariablesEntry>, I>>(
        object: I
    ): UserJoinedMessage_VariablesEntry {
        const message = createBaseUserJoinedMessage_VariablesEntry();
        message.key = object.key ?? "";
        message.value = object.value ?? "";
        return message;
    },
};

function createBaseUserLeftMessage(): UserLeftMessage {
    return { userId: 0 };
}

export const UserLeftMessage = {
    encode(message: UserLeftMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserLeftMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserLeftMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserLeftMessage {
        return { userId: isSet(object.userId) ? Number(object.userId) : 0 };
    },

    toJSON(message: UserLeftMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserLeftMessage>, I>>(object: I): UserLeftMessage {
        const message = createBaseUserLeftMessage();
        message.userId = object.userId ?? 0;
        return message;
    },
};

function createBaseErrorMessage(): ErrorMessage {
    return { message: "" };
}

export const ErrorMessage = {
    encode(message: ErrorMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message !== "") {
            writer.uint32(10).string(message.message);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ErrorMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseErrorMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ErrorMessage {
        return { message: isSet(object.message) ? String(object.message) : "" };
    },

    toJSON(message: ErrorMessage): unknown {
        const obj: any = {};
        message.message !== undefined && (obj.message = message.message);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ErrorMessage>, I>>(object: I): ErrorMessage {
        const message = createBaseErrorMessage();
        message.message = object.message ?? "";
        return message;
    },
};

function createBaseErrorScreenMessage(): ErrorScreenMessage {
    return {
        type: "",
        code: undefined,
        title: undefined,
        subtitle: undefined,
        details: undefined,
        timeToRetry: undefined,
        canRetryManual: undefined,
        urlToRedirect: undefined,
        buttonTitle: undefined,
        image: undefined,
    };
}

export const ErrorScreenMessage = {
    encode(message: ErrorScreenMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.type !== "") {
            writer.uint32(10).string(message.type);
        }
        if (message.code !== undefined) {
            StringValue.encode({ value: message.code! }, writer.uint32(18).fork()).ldelim();
        }
        if (message.title !== undefined) {
            StringValue.encode({ value: message.title! }, writer.uint32(26).fork()).ldelim();
        }
        if (message.subtitle !== undefined) {
            StringValue.encode({ value: message.subtitle! }, writer.uint32(34).fork()).ldelim();
        }
        if (message.details !== undefined) {
            StringValue.encode({ value: message.details! }, writer.uint32(42).fork()).ldelim();
        }
        if (message.timeToRetry !== undefined) {
            Int32Value.encode({ value: message.timeToRetry! }, writer.uint32(50).fork()).ldelim();
        }
        if (message.canRetryManual !== undefined) {
            BoolValue.encode({ value: message.canRetryManual! }, writer.uint32(58).fork()).ldelim();
        }
        if (message.urlToRedirect !== undefined) {
            StringValue.encode({ value: message.urlToRedirect! }, writer.uint32(66).fork()).ldelim();
        }
        if (message.buttonTitle !== undefined) {
            StringValue.encode({ value: message.buttonTitle! }, writer.uint32(74).fork()).ldelim();
        }
        if (message.image !== undefined) {
            StringValue.encode({ value: message.image! }, writer.uint32(82).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ErrorScreenMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseErrorScreenMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.type = reader.string();
                    break;
                case 2:
                    message.code = StringValue.decode(reader, reader.uint32()).value;
                    break;
                case 3:
                    message.title = StringValue.decode(reader, reader.uint32()).value;
                    break;
                case 4:
                    message.subtitle = StringValue.decode(reader, reader.uint32()).value;
                    break;
                case 5:
                    message.details = StringValue.decode(reader, reader.uint32()).value;
                    break;
                case 6:
                    message.timeToRetry = Int32Value.decode(reader, reader.uint32()).value;
                    break;
                case 7:
                    message.canRetryManual = BoolValue.decode(reader, reader.uint32()).value;
                    break;
                case 8:
                    message.urlToRedirect = StringValue.decode(reader, reader.uint32()).value;
                    break;
                case 9:
                    message.buttonTitle = StringValue.decode(reader, reader.uint32()).value;
                    break;
                case 10:
                    message.image = StringValue.decode(reader, reader.uint32()).value;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ErrorScreenMessage {
        return {
            type: isSet(object.type) ? String(object.type) : "",
            code: isSet(object.code) ? String(object.code) : undefined,
            title: isSet(object.title) ? String(object.title) : undefined,
            subtitle: isSet(object.subtitle) ? String(object.subtitle) : undefined,
            details: isSet(object.details) ? String(object.details) : undefined,
            timeToRetry: isSet(object.timeToRetry) ? Number(object.timeToRetry) : undefined,
            canRetryManual: isSet(object.canRetryManual) ? Boolean(object.canRetryManual) : undefined,
            urlToRedirect: isSet(object.urlToRedirect) ? String(object.urlToRedirect) : undefined,
            buttonTitle: isSet(object.buttonTitle) ? String(object.buttonTitle) : undefined,
            image: isSet(object.image) ? String(object.image) : undefined,
        };
    },

    toJSON(message: ErrorScreenMessage): unknown {
        const obj: any = {};
        message.type !== undefined && (obj.type = message.type);
        message.code !== undefined && (obj.code = message.code);
        message.title !== undefined && (obj.title = message.title);
        message.subtitle !== undefined && (obj.subtitle = message.subtitle);
        message.details !== undefined && (obj.details = message.details);
        message.timeToRetry !== undefined && (obj.timeToRetry = message.timeToRetry);
        message.canRetryManual !== undefined && (obj.canRetryManual = message.canRetryManual);
        message.urlToRedirect !== undefined && (obj.urlToRedirect = message.urlToRedirect);
        message.buttonTitle !== undefined && (obj.buttonTitle = message.buttonTitle);
        message.image !== undefined && (obj.image = message.image);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ErrorScreenMessage>, I>>(object: I): ErrorScreenMessage {
        const message = createBaseErrorScreenMessage();
        message.type = object.type ?? "";
        message.code = object.code ?? undefined;
        message.title = object.title ?? undefined;
        message.subtitle = object.subtitle ?? undefined;
        message.details = object.details ?? undefined;
        message.timeToRetry = object.timeToRetry ?? undefined;
        message.canRetryManual = object.canRetryManual ?? undefined;
        message.urlToRedirect = object.urlToRedirect ?? undefined;
        message.buttonTitle = object.buttonTitle ?? undefined;
        message.image = object.image ?? undefined;
        return message;
    },
};

function createBaseItemStateMessage(): ItemStateMessage {
    return { itemId: 0, stateJson: "" };
}

export const ItemStateMessage = {
    encode(message: ItemStateMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.itemId !== 0) {
            writer.uint32(8).int32(message.itemId);
        }
        if (message.stateJson !== "") {
            writer.uint32(18).string(message.stateJson);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ItemStateMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseItemStateMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.itemId = reader.int32();
                    break;
                case 2:
                    message.stateJson = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ItemStateMessage {
        return {
            itemId: isSet(object.itemId) ? Number(object.itemId) : 0,
            stateJson: isSet(object.stateJson) ? String(object.stateJson) : "",
        };
    },

    toJSON(message: ItemStateMessage): unknown {
        const obj: any = {};
        message.itemId !== undefined && (obj.itemId = Math.round(message.itemId));
        message.stateJson !== undefined && (obj.stateJson = message.stateJson);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ItemStateMessage>, I>>(object: I): ItemStateMessage {
        const message = createBaseItemStateMessage();
        message.itemId = object.itemId ?? 0;
        message.stateJson = object.stateJson ?? "";
        return message;
    },
};

function createBaseGroupUsersUpdateMessage(): GroupUsersUpdateMessage {
    return { groupId: 0, userIds: [] };
}

export const GroupUsersUpdateMessage = {
    encode(message: GroupUsersUpdateMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.groupId !== 0) {
            writer.uint32(8).int32(message.groupId);
        }
        writer.uint32(18).fork();
        for (const v of message.userIds) {
            writer.int32(v);
        }
        writer.ldelim();
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupUsersUpdateMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupUsersUpdateMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.groupId = reader.int32();
                    break;
                case 2:
                    if ((tag & 7) === 2) {
                        const end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2) {
                            message.userIds.push(reader.int32());
                        }
                    } else {
                        message.userIds.push(reader.int32());
                    }
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): GroupUsersUpdateMessage {
        return {
            groupId: isSet(object.groupId) ? Number(object.groupId) : 0,
            userIds: Array.isArray(object?.userIds) ? object.userIds.map((e: any) => Number(e)) : [],
        };
    },

    toJSON(message: GroupUsersUpdateMessage): unknown {
        const obj: any = {};
        message.groupId !== undefined && (obj.groupId = Math.round(message.groupId));
        if (message.userIds) {
            obj.userIds = message.userIds.map((e) => Math.round(e));
        } else {
            obj.userIds = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<GroupUsersUpdateMessage>, I>>(object: I): GroupUsersUpdateMessage {
        const message = createBaseGroupUsersUpdateMessage();
        message.groupId = object.groupId ?? 0;
        message.userIds = object.userIds?.map((e) => e) || [];
        return message;
    },
};

function createBaseRoomJoinedMessage(): RoomJoinedMessage {
    return {
        item: [],
        currentUserId: 0,
        tag: [],
        variable: [],
        userRoomToken: "",
        characterLayer: [],
        activatedInviteUser: false,
        playerVariable: [],
    };
}

export const RoomJoinedMessage = {
    encode(message: RoomJoinedMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        for (const v of message.item) {
            ItemStateMessage.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        if (message.currentUserId !== 0) {
            writer.uint32(32).int32(message.currentUserId);
        }
        for (const v of message.tag) {
            writer.uint32(42).string(v!);
        }
        for (const v of message.variable) {
            VariableMessage.encode(v!, writer.uint32(50).fork()).ldelim();
        }
        if (message.userRoomToken !== "") {
            writer.uint32(58).string(message.userRoomToken);
        }
        for (const v of message.characterLayer) {
            CharacterLayerMessage.encode(v!, writer.uint32(66).fork()).ldelim();
        }
        if (message.activatedInviteUser === true) {
            writer.uint32(72).bool(message.activatedInviteUser);
        }
        for (const v of message.playerVariable) {
            VariableMessage.encode(v!, writer.uint32(82).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RoomJoinedMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRoomJoinedMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 3:
                    message.item.push(ItemStateMessage.decode(reader, reader.uint32()));
                    break;
                case 4:
                    message.currentUserId = reader.int32();
                    break;
                case 5:
                    message.tag.push(reader.string());
                    break;
                case 6:
                    message.variable.push(VariableMessage.decode(reader, reader.uint32()));
                    break;
                case 7:
                    message.userRoomToken = reader.string();
                    break;
                case 8:
                    message.characterLayer.push(CharacterLayerMessage.decode(reader, reader.uint32()));
                    break;
                case 9:
                    message.activatedInviteUser = reader.bool();
                    break;
                case 10:
                    message.playerVariable.push(VariableMessage.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): RoomJoinedMessage {
        return {
            item: Array.isArray(object?.item) ? object.item.map((e: any) => ItemStateMessage.fromJSON(e)) : [],
            currentUserId: isSet(object.currentUserId) ? Number(object.currentUserId) : 0,
            tag: Array.isArray(object?.tag) ? object.tag.map((e: any) => String(e)) : [],
            variable: Array.isArray(object?.variable)
                ? object.variable.map((e: any) => VariableMessage.fromJSON(e))
                : [],
            userRoomToken: isSet(object.userRoomToken) ? String(object.userRoomToken) : "",
            characterLayer: Array.isArray(object?.characterLayer)
                ? object.characterLayer.map((e: any) => CharacterLayerMessage.fromJSON(e))
                : [],
            activatedInviteUser: isSet(object.activatedInviteUser) ? Boolean(object.activatedInviteUser) : false,
            playerVariable: Array.isArray(object?.playerVariable)
                ? object.playerVariable.map((e: any) => VariableMessage.fromJSON(e))
                : [],
        };
    },

    toJSON(message: RoomJoinedMessage): unknown {
        const obj: any = {};
        if (message.item) {
            obj.item = message.item.map((e) => (e ? ItemStateMessage.toJSON(e) : undefined));
        } else {
            obj.item = [];
        }
        message.currentUserId !== undefined && (obj.currentUserId = Math.round(message.currentUserId));
        if (message.tag) {
            obj.tag = message.tag.map((e) => e);
        } else {
            obj.tag = [];
        }
        if (message.variable) {
            obj.variable = message.variable.map((e) => (e ? VariableMessage.toJSON(e) : undefined));
        } else {
            obj.variable = [];
        }
        message.userRoomToken !== undefined && (obj.userRoomToken = message.userRoomToken);
        if (message.characterLayer) {
            obj.characterLayer = message.characterLayer.map((e) => (e ? CharacterLayerMessage.toJSON(e) : undefined));
        } else {
            obj.characterLayer = [];
        }
        message.activatedInviteUser !== undefined && (obj.activatedInviteUser = message.activatedInviteUser);
        if (message.playerVariable) {
            obj.playerVariable = message.playerVariable.map((e) => (e ? VariableMessage.toJSON(e) : undefined));
        } else {
            obj.playerVariable = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<RoomJoinedMessage>, I>>(object: I): RoomJoinedMessage {
        const message = createBaseRoomJoinedMessage();
        message.item = object.item?.map((e) => ItemStateMessage.fromPartial(e)) || [];
        message.currentUserId = object.currentUserId ?? 0;
        message.tag = object.tag?.map((e) => e) || [];
        message.variable = object.variable?.map((e) => VariableMessage.fromPartial(e)) || [];
        message.userRoomToken = object.userRoomToken ?? "";
        message.characterLayer = object.characterLayer?.map((e) => CharacterLayerMessage.fromPartial(e)) || [];
        message.activatedInviteUser = object.activatedInviteUser ?? false;
        message.playerVariable = object.playerVariable?.map((e) => VariableMessage.fromPartial(e)) || [];
        return message;
    },
};

function createBaseWebRtcStartMessage(): WebRtcStartMessage {
    return { userId: 0, initiator: false, webrtcUserName: "", webrtcPassword: "" };
}

export const WebRtcStartMessage = {
    encode(message: WebRtcStartMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.initiator === true) {
            writer.uint32(24).bool(message.initiator);
        }
        if (message.webrtcUserName !== "") {
            writer.uint32(34).string(message.webrtcUserName);
        }
        if (message.webrtcPassword !== "") {
            writer.uint32(42).string(message.webrtcPassword);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WebRtcStartMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWebRtcStartMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 3:
                    message.initiator = reader.bool();
                    break;
                case 4:
                    message.webrtcUserName = reader.string();
                    break;
                case 5:
                    message.webrtcPassword = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): WebRtcStartMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            initiator: isSet(object.initiator) ? Boolean(object.initiator) : false,
            webrtcUserName: isSet(object.webrtcUserName) ? String(object.webrtcUserName) : "",
            webrtcPassword: isSet(object.webrtcPassword) ? String(object.webrtcPassword) : "",
        };
    },

    toJSON(message: WebRtcStartMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.initiator !== undefined && (obj.initiator = message.initiator);
        message.webrtcUserName !== undefined && (obj.webrtcUserName = message.webrtcUserName);
        message.webrtcPassword !== undefined && (obj.webrtcPassword = message.webrtcPassword);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WebRtcStartMessage>, I>>(object: I): WebRtcStartMessage {
        const message = createBaseWebRtcStartMessage();
        message.userId = object.userId ?? 0;
        message.initiator = object.initiator ?? false;
        message.webrtcUserName = object.webrtcUserName ?? "";
        message.webrtcPassword = object.webrtcPassword ?? "";
        return message;
    },
};

function createBaseWebRtcDisconnectMessage(): WebRtcDisconnectMessage {
    return { userId: 0 };
}

export const WebRtcDisconnectMessage = {
    encode(message: WebRtcDisconnectMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WebRtcDisconnectMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWebRtcDisconnectMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): WebRtcDisconnectMessage {
        return { userId: isSet(object.userId) ? Number(object.userId) : 0 };
    },

    toJSON(message: WebRtcDisconnectMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WebRtcDisconnectMessage>, I>>(object: I): WebRtcDisconnectMessage {
        const message = createBaseWebRtcDisconnectMessage();
        message.userId = object.userId ?? 0;
        return message;
    },
};

function createBaseWebRtcSignalToClientMessage(): WebRtcSignalToClientMessage {
    return { userId: 0, signal: "", webrtcUserName: "", webrtcPassword: "" };
}

export const WebRtcSignalToClientMessage = {
    encode(message: WebRtcSignalToClientMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.signal !== "") {
            writer.uint32(18).string(message.signal);
        }
        if (message.webrtcUserName !== "") {
            writer.uint32(34).string(message.webrtcUserName);
        }
        if (message.webrtcPassword !== "") {
            writer.uint32(42).string(message.webrtcPassword);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WebRtcSignalToClientMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWebRtcSignalToClientMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 2:
                    message.signal = reader.string();
                    break;
                case 4:
                    message.webrtcUserName = reader.string();
                    break;
                case 5:
                    message.webrtcPassword = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): WebRtcSignalToClientMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            signal: isSet(object.signal) ? String(object.signal) : "",
            webrtcUserName: isSet(object.webrtcUserName) ? String(object.webrtcUserName) : "",
            webrtcPassword: isSet(object.webrtcPassword) ? String(object.webrtcPassword) : "",
        };
    },

    toJSON(message: WebRtcSignalToClientMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.signal !== undefined && (obj.signal = message.signal);
        message.webrtcUserName !== undefined && (obj.webrtcUserName = message.webrtcUserName);
        message.webrtcPassword !== undefined && (obj.webrtcPassword = message.webrtcPassword);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WebRtcSignalToClientMessage>, I>>(object: I): WebRtcSignalToClientMessage {
        const message = createBaseWebRtcSignalToClientMessage();
        message.userId = object.userId ?? 0;
        message.signal = object.signal ?? "";
        message.webrtcUserName = object.webrtcUserName ?? "";
        message.webrtcPassword = object.webrtcPassword ?? "";
        return message;
    },
};

function createBaseTeleportMessageMessage(): TeleportMessageMessage {
    return { map: "" };
}

export const TeleportMessageMessage = {
    encode(message: TeleportMessageMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.map !== "") {
            writer.uint32(10).string(message.map);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TeleportMessageMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTeleportMessageMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.map = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): TeleportMessageMessage {
        return { map: isSet(object.map) ? String(object.map) : "" };
    },

    toJSON(message: TeleportMessageMessage): unknown {
        const obj: any = {};
        message.map !== undefined && (obj.map = message.map);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<TeleportMessageMessage>, I>>(object: I): TeleportMessageMessage {
        const message = createBaseTeleportMessageMessage();
        message.map = object.map ?? "";
        return message;
    },
};

function createBaseSendUserMessage(): SendUserMessage {
    return { type: "", message: "" };
}

export const SendUserMessage = {
    encode(message: SendUserMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.type !== "") {
            writer.uint32(10).string(message.type);
        }
        if (message.message !== "") {
            writer.uint32(18).string(message.message);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SendUserMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSendUserMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.type = reader.string();
                    break;
                case 2:
                    message.message = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): SendUserMessage {
        return {
            type: isSet(object.type) ? String(object.type) : "",
            message: isSet(object.message) ? String(object.message) : "",
        };
    },

    toJSON(message: SendUserMessage): unknown {
        const obj: any = {};
        message.type !== undefined && (obj.type = message.type);
        message.message !== undefined && (obj.message = message.message);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<SendUserMessage>, I>>(object: I): SendUserMessage {
        const message = createBaseSendUserMessage();
        message.type = object.type ?? "";
        message.message = object.message ?? "";
        return message;
    },
};

function createBaseWorldFullWarningMessage(): WorldFullWarningMessage {
    return {};
}

export const WorldFullWarningMessage = {
    encode(_: WorldFullWarningMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WorldFullWarningMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWorldFullWarningMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(_: any): WorldFullWarningMessage {
        return {};
    },

    toJSON(_: WorldFullWarningMessage): unknown {
        const obj: any = {};
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WorldFullWarningMessage>, I>>(_: I): WorldFullWarningMessage {
        const message = createBaseWorldFullWarningMessage();
        return message;
    },
};

function createBaseWorldFullWarningToRoomMessage(): WorldFullWarningToRoomMessage {
    return { roomId: "" };
}

export const WorldFullWarningToRoomMessage = {
    encode(message: WorldFullWarningToRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.roomId !== "") {
            writer.uint32(10).string(message.roomId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WorldFullWarningToRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWorldFullWarningToRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomId = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): WorldFullWarningToRoomMessage {
        return { roomId: isSet(object.roomId) ? String(object.roomId) : "" };
    },

    toJSON(message: WorldFullWarningToRoomMessage): unknown {
        const obj: any = {};
        message.roomId !== undefined && (obj.roomId = message.roomId);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WorldFullWarningToRoomMessage>, I>>(
        object: I
    ): WorldFullWarningToRoomMessage {
        const message = createBaseWorldFullWarningToRoomMessage();
        message.roomId = object.roomId ?? "";
        return message;
    },
};

function createBaseRefreshRoomPromptMessage(): RefreshRoomPromptMessage {
    return { roomId: "" };
}

export const RefreshRoomPromptMessage = {
    encode(message: RefreshRoomPromptMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.roomId !== "") {
            writer.uint32(10).string(message.roomId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RefreshRoomPromptMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRefreshRoomPromptMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomId = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): RefreshRoomPromptMessage {
        return { roomId: isSet(object.roomId) ? String(object.roomId) : "" };
    },

    toJSON(message: RefreshRoomPromptMessage): unknown {
        const obj: any = {};
        message.roomId !== undefined && (obj.roomId = message.roomId);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<RefreshRoomPromptMessage>, I>>(object: I): RefreshRoomPromptMessage {
        const message = createBaseRefreshRoomPromptMessage();
        message.roomId = object.roomId ?? "";
        return message;
    },
};

function createBaseRefreshRoomMessage(): RefreshRoomMessage {
    return { roomId: "", versionNumber: 0 };
}

export const RefreshRoomMessage = {
    encode(message: RefreshRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.roomId !== "") {
            writer.uint32(10).string(message.roomId);
        }
        if (message.versionNumber !== 0) {
            writer.uint32(16).int32(message.versionNumber);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RefreshRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRefreshRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomId = reader.string();
                    break;
                case 2:
                    message.versionNumber = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): RefreshRoomMessage {
        return {
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            versionNumber: isSet(object.versionNumber) ? Number(object.versionNumber) : 0,
        };
    },

    toJSON(message: RefreshRoomMessage): unknown {
        const obj: any = {};
        message.roomId !== undefined && (obj.roomId = message.roomId);
        message.versionNumber !== undefined && (obj.versionNumber = Math.round(message.versionNumber));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<RefreshRoomMessage>, I>>(object: I): RefreshRoomMessage {
        const message = createBaseRefreshRoomMessage();
        message.roomId = object.roomId ?? "";
        message.versionNumber = object.versionNumber ?? 0;
        return message;
    },
};

function createBaseWorldFullMessage(): WorldFullMessage {
    return {};
}

export const WorldFullMessage = {
    encode(_: WorldFullMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WorldFullMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWorldFullMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(_: any): WorldFullMessage {
        return {};
    },

    toJSON(_: WorldFullMessage): unknown {
        const obj: any = {};
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WorldFullMessage>, I>>(_: I): WorldFullMessage {
        const message = createBaseWorldFullMessage();
        return message;
    },
};

function createBaseTokenExpiredMessage(): TokenExpiredMessage {
    return {};
}

export const TokenExpiredMessage = {
    encode(_: TokenExpiredMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): TokenExpiredMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseTokenExpiredMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(_: any): TokenExpiredMessage {
        return {};
    },

    toJSON(_: TokenExpiredMessage): unknown {
        const obj: any = {};
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<TokenExpiredMessage>, I>>(_: I): TokenExpiredMessage {
        const message = createBaseTokenExpiredMessage();
        return message;
    },
};

function createBaseInvalidTextureMessage(): InvalidTextureMessage {
    return {};
}

export const InvalidTextureMessage = {
    encode(_: InvalidTextureMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): InvalidTextureMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseInvalidTextureMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(_: any): InvalidTextureMessage {
        return {};
    },

    toJSON(_: InvalidTextureMessage): unknown {
        const obj: any = {};
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<InvalidTextureMessage>, I>>(_: I): InvalidTextureMessage {
        const message = createBaseInvalidTextureMessage();
        return message;
    },
};

function createBaseWorldConnexionMessage(): WorldConnexionMessage {
    return { message: "" };
}

export const WorldConnexionMessage = {
    encode(message: WorldConnexionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message !== "") {
            writer.uint32(18).string(message.message);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): WorldConnexionMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseWorldConnexionMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 2:
                    message.message = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): WorldConnexionMessage {
        return { message: isSet(object.message) ? String(object.message) : "" };
    },

    toJSON(message: WorldConnexionMessage): unknown {
        const obj: any = {};
        message.message !== undefined && (obj.message = message.message);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<WorldConnexionMessage>, I>>(object: I): WorldConnexionMessage {
        const message = createBaseWorldConnexionMessage();
        message.message = object.message ?? "";
        return message;
    },
};

function createBaseBanUserMessage(): BanUserMessage {
    return { type: "", message: "" };
}

export const BanUserMessage = {
    encode(message: BanUserMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.type !== "") {
            writer.uint32(10).string(message.type);
        }
        if (message.message !== "") {
            writer.uint32(18).string(message.message);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BanUserMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBanUserMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.type = reader.string();
                    break;
                case 2:
                    message.message = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): BanUserMessage {
        return {
            type: isSet(object.type) ? String(object.type) : "",
            message: isSet(object.message) ? String(object.message) : "",
        };
    },

    toJSON(message: BanUserMessage): unknown {
        const obj: any = {};
        message.type !== undefined && (obj.type = message.type);
        message.message !== undefined && (obj.message = message.message);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<BanUserMessage>, I>>(object: I): BanUserMessage {
        const message = createBaseBanUserMessage();
        message.type = object.type ?? "";
        message.message = object.message ?? "";
        return message;
    },
};

function createBaseAskPositionMessage(): AskPositionMessage {
    return { userIdentifier: "", playUri: "" };
}

export const AskPositionMessage = {
    encode(message: AskPositionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userIdentifier !== "") {
            writer.uint32(10).string(message.userIdentifier);
        }
        if (message.playUri !== "") {
            writer.uint32(18).string(message.playUri);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): AskPositionMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseAskPositionMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userIdentifier = reader.string();
                    break;
                case 2:
                    message.playUri = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): AskPositionMessage {
        return {
            userIdentifier: isSet(object.userIdentifier) ? String(object.userIdentifier) : "",
            playUri: isSet(object.playUri) ? String(object.playUri) : "",
        };
    },

    toJSON(message: AskPositionMessage): unknown {
        const obj: any = {};
        message.userIdentifier !== undefined && (obj.userIdentifier = message.userIdentifier);
        message.playUri !== undefined && (obj.playUri = message.playUri);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<AskPositionMessage>, I>>(object: I): AskPositionMessage {
        const message = createBaseAskPositionMessage();
        message.userIdentifier = object.userIdentifier ?? "";
        message.playUri = object.playUri ?? "";
        return message;
    },
};

function createBaseServerToClientMessage(): ServerToClientMessage {
    return { message: undefined };
}

export const ServerToClientMessage = {
    encode(message: ServerToClientMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "batchMessage") {
            BatchMessage.encode(message.message.batchMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "errorMessage") {
            ErrorMessage.encode(message.message.errorMessage, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "roomJoinedMessage") {
            RoomJoinedMessage.encode(message.message.roomJoinedMessage, writer.uint32(26).fork()).ldelim();
        }
        if (message.message?.$case === "webRtcStartMessage") {
            WebRtcStartMessage.encode(message.message.webRtcStartMessage, writer.uint32(34).fork()).ldelim();
        }
        if (message.message?.$case === "webRtcSignalToClientMessage") {
            WebRtcSignalToClientMessage.encode(
                message.message.webRtcSignalToClientMessage,
                writer.uint32(42).fork()
            ).ldelim();
        }
        if (message.message?.$case === "webRtcScreenSharingSignalToClientMessage") {
            WebRtcSignalToClientMessage.encode(
                message.message.webRtcScreenSharingSignalToClientMessage,
                writer.uint32(50).fork()
            ).ldelim();
        }
        if (message.message?.$case === "webRtcDisconnectMessage") {
            WebRtcDisconnectMessage.encode(message.message.webRtcDisconnectMessage, writer.uint32(58).fork()).ldelim();
        }
        if (message.message?.$case === "teleportMessageMessage") {
            TeleportMessageMessage.encode(message.message.teleportMessageMessage, writer.uint32(82).fork()).ldelim();
        }
        if (message.message?.$case === "sendUserMessage") {
            SendUserMessage.encode(message.message.sendUserMessage, writer.uint32(98).fork()).ldelim();
        }
        if (message.message?.$case === "banUserMessage") {
            BanUserMessage.encode(message.message.banUserMessage, writer.uint32(106).fork()).ldelim();
        }
        if (message.message?.$case === "worldFullWarningMessage") {
            WorldFullWarningMessage.encode(message.message.worldFullWarningMessage, writer.uint32(122).fork()).ldelim();
        }
        if (message.message?.$case === "worldFullMessage") {
            WorldFullMessage.encode(message.message.worldFullMessage, writer.uint32(130).fork()).ldelim();
        }
        if (message.message?.$case === "refreshRoomMessage") {
            RefreshRoomMessage.encode(message.message.refreshRoomMessage, writer.uint32(138).fork()).ldelim();
        }
        if (message.message?.$case === "worldConnexionMessage") {
            WorldConnexionMessage.encode(message.message.worldConnexionMessage, writer.uint32(146).fork()).ldelim();
        }
        if (message.message?.$case === "tokenExpiredMessage") {
            TokenExpiredMessage.encode(message.message.tokenExpiredMessage, writer.uint32(162).fork()).ldelim();
        }
        if (message.message?.$case === "followRequestMessage") {
            FollowRequestMessage.encode(message.message.followRequestMessage, writer.uint32(170).fork()).ldelim();
        }
        if (message.message?.$case === "followConfirmationMessage") {
            FollowConfirmationMessage.encode(
                message.message.followConfirmationMessage,
                writer.uint32(178).fork()
            ).ldelim();
        }
        if (message.message?.$case === "followAbortMessage") {
            FollowAbortMessage.encode(message.message.followAbortMessage, writer.uint32(186).fork()).ldelim();
        }
        if (message.message?.$case === "invalidTextureMessage") {
            InvalidTextureMessage.encode(message.message.invalidTextureMessage, writer.uint32(194).fork()).ldelim();
        }
        if (message.message?.$case === "groupUsersUpdateMessage") {
            GroupUsersUpdateMessage.encode(message.message.groupUsersUpdateMessage, writer.uint32(202).fork()).ldelim();
        }
        if (message.message?.$case === "errorScreenMessage") {
            ErrorScreenMessage.encode(message.message.errorScreenMessage, writer.uint32(210).fork()).ldelim();
        }
        if (message.message?.$case === "answerMessage") {
            AnswerMessage.encode(message.message.answerMessage, writer.uint32(226).fork()).ldelim();
        }
        if (message.message?.$case === "moveToPositionMessage") {
            MoveToPositionMessage.encode(message.message.moveToPositionMessage, writer.uint32(250).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ServerToClientMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseServerToClientMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "batchMessage",
                        batchMessage: BatchMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "errorMessage",
                        errorMessage: ErrorMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.message = {
                        $case: "roomJoinedMessage",
                        roomJoinedMessage: RoomJoinedMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 4:
                    message.message = {
                        $case: "webRtcStartMessage",
                        webRtcStartMessage: WebRtcStartMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 5:
                    message.message = {
                        $case: "webRtcSignalToClientMessage",
                        webRtcSignalToClientMessage: WebRtcSignalToClientMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 6:
                    message.message = {
                        $case: "webRtcScreenSharingSignalToClientMessage",
                        webRtcScreenSharingSignalToClientMessage: WebRtcSignalToClientMessage.decode(
                            reader,
                            reader.uint32()
                        ),
                    };
                    break;
                case 7:
                    message.message = {
                        $case: "webRtcDisconnectMessage",
                        webRtcDisconnectMessage: WebRtcDisconnectMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 10:
                    message.message = {
                        $case: "teleportMessageMessage",
                        teleportMessageMessage: TeleportMessageMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 12:
                    message.message = {
                        $case: "sendUserMessage",
                        sendUserMessage: SendUserMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 13:
                    message.message = {
                        $case: "banUserMessage",
                        banUserMessage: BanUserMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 15:
                    message.message = {
                        $case: "worldFullWarningMessage",
                        worldFullWarningMessage: WorldFullWarningMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 16:
                    message.message = {
                        $case: "worldFullMessage",
                        worldFullMessage: WorldFullMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 17:
                    message.message = {
                        $case: "refreshRoomMessage",
                        refreshRoomMessage: RefreshRoomMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 18:
                    message.message = {
                        $case: "worldConnexionMessage",
                        worldConnexionMessage: WorldConnexionMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 20:
                    message.message = {
                        $case: "tokenExpiredMessage",
                        tokenExpiredMessage: TokenExpiredMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 21:
                    message.message = {
                        $case: "followRequestMessage",
                        followRequestMessage: FollowRequestMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 22:
                    message.message = {
                        $case: "followConfirmationMessage",
                        followConfirmationMessage: FollowConfirmationMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 23:
                    message.message = {
                        $case: "followAbortMessage",
                        followAbortMessage: FollowAbortMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 24:
                    message.message = {
                        $case: "invalidTextureMessage",
                        invalidTextureMessage: InvalidTextureMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 25:
                    message.message = {
                        $case: "groupUsersUpdateMessage",
                        groupUsersUpdateMessage: GroupUsersUpdateMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 26:
                    message.message = {
                        $case: "errorScreenMessage",
                        errorScreenMessage: ErrorScreenMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 28:
                    message.message = {
                        $case: "answerMessage",
                        answerMessage: AnswerMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 31:
                    message.message = {
                        $case: "moveToPositionMessage",
                        moveToPositionMessage: MoveToPositionMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ServerToClientMessage {
        return {
            message: isSet(object.batchMessage)
                ? { $case: "batchMessage", batchMessage: BatchMessage.fromJSON(object.batchMessage) }
                : isSet(object.errorMessage)
                ? { $case: "errorMessage", errorMessage: ErrorMessage.fromJSON(object.errorMessage) }
                : isSet(object.roomJoinedMessage)
                ? {
                      $case: "roomJoinedMessage",
                      roomJoinedMessage: RoomJoinedMessage.fromJSON(object.roomJoinedMessage),
                  }
                : isSet(object.webRtcStartMessage)
                ? {
                      $case: "webRtcStartMessage",
                      webRtcStartMessage: WebRtcStartMessage.fromJSON(object.webRtcStartMessage),
                  }
                : isSet(object.webRtcSignalToClientMessage)
                ? {
                      $case: "webRtcSignalToClientMessage",
                      webRtcSignalToClientMessage: WebRtcSignalToClientMessage.fromJSON(
                          object.webRtcSignalToClientMessage
                      ),
                  }
                : isSet(object.webRtcScreenSharingSignalToClientMessage)
                ? {
                      $case: "webRtcScreenSharingSignalToClientMessage",
                      webRtcScreenSharingSignalToClientMessage: WebRtcSignalToClientMessage.fromJSON(
                          object.webRtcScreenSharingSignalToClientMessage
                      ),
                  }
                : isSet(object.webRtcDisconnectMessage)
                ? {
                      $case: "webRtcDisconnectMessage",
                      webRtcDisconnectMessage: WebRtcDisconnectMessage.fromJSON(object.webRtcDisconnectMessage),
                  }
                : isSet(object.teleportMessageMessage)
                ? {
                      $case: "teleportMessageMessage",
                      teleportMessageMessage: TeleportMessageMessage.fromJSON(object.teleportMessageMessage),
                  }
                : isSet(object.sendUserMessage)
                ? { $case: "sendUserMessage", sendUserMessage: SendUserMessage.fromJSON(object.sendUserMessage) }
                : isSet(object.banUserMessage)
                ? { $case: "banUserMessage", banUserMessage: BanUserMessage.fromJSON(object.banUserMessage) }
                : isSet(object.worldFullWarningMessage)
                ? {
                      $case: "worldFullWarningMessage",
                      worldFullWarningMessage: WorldFullWarningMessage.fromJSON(object.worldFullWarningMessage),
                  }
                : isSet(object.worldFullMessage)
                ? { $case: "worldFullMessage", worldFullMessage: WorldFullMessage.fromJSON(object.worldFullMessage) }
                : isSet(object.refreshRoomMessage)
                ? {
                      $case: "refreshRoomMessage",
                      refreshRoomMessage: RefreshRoomMessage.fromJSON(object.refreshRoomMessage),
                  }
                : isSet(object.worldConnexionMessage)
                ? {
                      $case: "worldConnexionMessage",
                      worldConnexionMessage: WorldConnexionMessage.fromJSON(object.worldConnexionMessage),
                  }
                : isSet(object.tokenExpiredMessage)
                ? {
                      $case: "tokenExpiredMessage",
                      tokenExpiredMessage: TokenExpiredMessage.fromJSON(object.tokenExpiredMessage),
                  }
                : isSet(object.followRequestMessage)
                ? {
                      $case: "followRequestMessage",
                      followRequestMessage: FollowRequestMessage.fromJSON(object.followRequestMessage),
                  }
                : isSet(object.followConfirmationMessage)
                ? {
                      $case: "followConfirmationMessage",
                      followConfirmationMessage: FollowConfirmationMessage.fromJSON(object.followConfirmationMessage),
                  }
                : isSet(object.followAbortMessage)
                ? {
                      $case: "followAbortMessage",
                      followAbortMessage: FollowAbortMessage.fromJSON(object.followAbortMessage),
                  }
                : isSet(object.invalidTextureMessage)
                ? {
                      $case: "invalidTextureMessage",
                      invalidTextureMessage: InvalidTextureMessage.fromJSON(object.invalidTextureMessage),
                  }
                : isSet(object.groupUsersUpdateMessage)
                ? {
                      $case: "groupUsersUpdateMessage",
                      groupUsersUpdateMessage: GroupUsersUpdateMessage.fromJSON(object.groupUsersUpdateMessage),
                  }
                : isSet(object.errorScreenMessage)
                ? {
                      $case: "errorScreenMessage",
                      errorScreenMessage: ErrorScreenMessage.fromJSON(object.errorScreenMessage),
                  }
                : isSet(object.answerMessage)
                ? { $case: "answerMessage", answerMessage: AnswerMessage.fromJSON(object.answerMessage) }
                : isSet(object.moveToPositionMessage)
                ? {
                      $case: "moveToPositionMessage",
                      moveToPositionMessage: MoveToPositionMessage.fromJSON(object.moveToPositionMessage),
                  }
                : undefined,
        };
    },

    toJSON(message: ServerToClientMessage): unknown {
        const obj: any = {};
        message.message?.$case === "batchMessage" &&
            (obj.batchMessage = message.message?.batchMessage
                ? BatchMessage.toJSON(message.message?.batchMessage)
                : undefined);
        message.message?.$case === "errorMessage" &&
            (obj.errorMessage = message.message?.errorMessage
                ? ErrorMessage.toJSON(message.message?.errorMessage)
                : undefined);
        message.message?.$case === "roomJoinedMessage" &&
            (obj.roomJoinedMessage = message.message?.roomJoinedMessage
                ? RoomJoinedMessage.toJSON(message.message?.roomJoinedMessage)
                : undefined);
        message.message?.$case === "webRtcStartMessage" &&
            (obj.webRtcStartMessage = message.message?.webRtcStartMessage
                ? WebRtcStartMessage.toJSON(message.message?.webRtcStartMessage)
                : undefined);
        message.message?.$case === "webRtcSignalToClientMessage" &&
            (obj.webRtcSignalToClientMessage = message.message?.webRtcSignalToClientMessage
                ? WebRtcSignalToClientMessage.toJSON(message.message?.webRtcSignalToClientMessage)
                : undefined);
        message.message?.$case === "webRtcScreenSharingSignalToClientMessage" &&
            (obj.webRtcScreenSharingSignalToClientMessage = message.message?.webRtcScreenSharingSignalToClientMessage
                ? WebRtcSignalToClientMessage.toJSON(message.message?.webRtcScreenSharingSignalToClientMessage)
                : undefined);
        message.message?.$case === "webRtcDisconnectMessage" &&
            (obj.webRtcDisconnectMessage = message.message?.webRtcDisconnectMessage
                ? WebRtcDisconnectMessage.toJSON(message.message?.webRtcDisconnectMessage)
                : undefined);
        message.message?.$case === "teleportMessageMessage" &&
            (obj.teleportMessageMessage = message.message?.teleportMessageMessage
                ? TeleportMessageMessage.toJSON(message.message?.teleportMessageMessage)
                : undefined);
        message.message?.$case === "sendUserMessage" &&
            (obj.sendUserMessage = message.message?.sendUserMessage
                ? SendUserMessage.toJSON(message.message?.sendUserMessage)
                : undefined);
        message.message?.$case === "banUserMessage" &&
            (obj.banUserMessage = message.message?.banUserMessage
                ? BanUserMessage.toJSON(message.message?.banUserMessage)
                : undefined);
        message.message?.$case === "worldFullWarningMessage" &&
            (obj.worldFullWarningMessage = message.message?.worldFullWarningMessage
                ? WorldFullWarningMessage.toJSON(message.message?.worldFullWarningMessage)
                : undefined);
        message.message?.$case === "worldFullMessage" &&
            (obj.worldFullMessage = message.message?.worldFullMessage
                ? WorldFullMessage.toJSON(message.message?.worldFullMessage)
                : undefined);
        message.message?.$case === "refreshRoomMessage" &&
            (obj.refreshRoomMessage = message.message?.refreshRoomMessage
                ? RefreshRoomMessage.toJSON(message.message?.refreshRoomMessage)
                : undefined);
        message.message?.$case === "worldConnexionMessage" &&
            (obj.worldConnexionMessage = message.message?.worldConnexionMessage
                ? WorldConnexionMessage.toJSON(message.message?.worldConnexionMessage)
                : undefined);
        message.message?.$case === "tokenExpiredMessage" &&
            (obj.tokenExpiredMessage = message.message?.tokenExpiredMessage
                ? TokenExpiredMessage.toJSON(message.message?.tokenExpiredMessage)
                : undefined);
        message.message?.$case === "followRequestMessage" &&
            (obj.followRequestMessage = message.message?.followRequestMessage
                ? FollowRequestMessage.toJSON(message.message?.followRequestMessage)
                : undefined);
        message.message?.$case === "followConfirmationMessage" &&
            (obj.followConfirmationMessage = message.message?.followConfirmationMessage
                ? FollowConfirmationMessage.toJSON(message.message?.followConfirmationMessage)
                : undefined);
        message.message?.$case === "followAbortMessage" &&
            (obj.followAbortMessage = message.message?.followAbortMessage
                ? FollowAbortMessage.toJSON(message.message?.followAbortMessage)
                : undefined);
        message.message?.$case === "invalidTextureMessage" &&
            (obj.invalidTextureMessage = message.message?.invalidTextureMessage
                ? InvalidTextureMessage.toJSON(message.message?.invalidTextureMessage)
                : undefined);
        message.message?.$case === "groupUsersUpdateMessage" &&
            (obj.groupUsersUpdateMessage = message.message?.groupUsersUpdateMessage
                ? GroupUsersUpdateMessage.toJSON(message.message?.groupUsersUpdateMessage)
                : undefined);
        message.message?.$case === "errorScreenMessage" &&
            (obj.errorScreenMessage = message.message?.errorScreenMessage
                ? ErrorScreenMessage.toJSON(message.message?.errorScreenMessage)
                : undefined);
        message.message?.$case === "answerMessage" &&
            (obj.answerMessage = message.message?.answerMessage
                ? AnswerMessage.toJSON(message.message?.answerMessage)
                : undefined);
        message.message?.$case === "moveToPositionMessage" &&
            (obj.moveToPositionMessage = message.message?.moveToPositionMessage
                ? MoveToPositionMessage.toJSON(message.message?.moveToPositionMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ServerToClientMessage>, I>>(object: I): ServerToClientMessage {
        const message = createBaseServerToClientMessage();
        if (
            object.message?.$case === "batchMessage" &&
            object.message?.batchMessage !== undefined &&
            object.message?.batchMessage !== null
        ) {
            message.message = {
                $case: "batchMessage",
                batchMessage: BatchMessage.fromPartial(object.message.batchMessage),
            };
        }
        if (
            object.message?.$case === "errorMessage" &&
            object.message?.errorMessage !== undefined &&
            object.message?.errorMessage !== null
        ) {
            message.message = {
                $case: "errorMessage",
                errorMessage: ErrorMessage.fromPartial(object.message.errorMessage),
            };
        }
        if (
            object.message?.$case === "roomJoinedMessage" &&
            object.message?.roomJoinedMessage !== undefined &&
            object.message?.roomJoinedMessage !== null
        ) {
            message.message = {
                $case: "roomJoinedMessage",
                roomJoinedMessage: RoomJoinedMessage.fromPartial(object.message.roomJoinedMessage),
            };
        }
        if (
            object.message?.$case === "webRtcStartMessage" &&
            object.message?.webRtcStartMessage !== undefined &&
            object.message?.webRtcStartMessage !== null
        ) {
            message.message = {
                $case: "webRtcStartMessage",
                webRtcStartMessage: WebRtcStartMessage.fromPartial(object.message.webRtcStartMessage),
            };
        }
        if (
            object.message?.$case === "webRtcSignalToClientMessage" &&
            object.message?.webRtcSignalToClientMessage !== undefined &&
            object.message?.webRtcSignalToClientMessage !== null
        ) {
            message.message = {
                $case: "webRtcSignalToClientMessage",
                webRtcSignalToClientMessage: WebRtcSignalToClientMessage.fromPartial(
                    object.message.webRtcSignalToClientMessage
                ),
            };
        }
        if (
            object.message?.$case === "webRtcScreenSharingSignalToClientMessage" &&
            object.message?.webRtcScreenSharingSignalToClientMessage !== undefined &&
            object.message?.webRtcScreenSharingSignalToClientMessage !== null
        ) {
            message.message = {
                $case: "webRtcScreenSharingSignalToClientMessage",
                webRtcScreenSharingSignalToClientMessage: WebRtcSignalToClientMessage.fromPartial(
                    object.message.webRtcScreenSharingSignalToClientMessage
                ),
            };
        }
        if (
            object.message?.$case === "webRtcDisconnectMessage" &&
            object.message?.webRtcDisconnectMessage !== undefined &&
            object.message?.webRtcDisconnectMessage !== null
        ) {
            message.message = {
                $case: "webRtcDisconnectMessage",
                webRtcDisconnectMessage: WebRtcDisconnectMessage.fromPartial(object.message.webRtcDisconnectMessage),
            };
        }
        if (
            object.message?.$case === "teleportMessageMessage" &&
            object.message?.teleportMessageMessage !== undefined &&
            object.message?.teleportMessageMessage !== null
        ) {
            message.message = {
                $case: "teleportMessageMessage",
                teleportMessageMessage: TeleportMessageMessage.fromPartial(object.message.teleportMessageMessage),
            };
        }
        if (
            object.message?.$case === "sendUserMessage" &&
            object.message?.sendUserMessage !== undefined &&
            object.message?.sendUserMessage !== null
        ) {
            message.message = {
                $case: "sendUserMessage",
                sendUserMessage: SendUserMessage.fromPartial(object.message.sendUserMessage),
            };
        }
        if (
            object.message?.$case === "banUserMessage" &&
            object.message?.banUserMessage !== undefined &&
            object.message?.banUserMessage !== null
        ) {
            message.message = {
                $case: "banUserMessage",
                banUserMessage: BanUserMessage.fromPartial(object.message.banUserMessage),
            };
        }
        if (
            object.message?.$case === "worldFullWarningMessage" &&
            object.message?.worldFullWarningMessage !== undefined &&
            object.message?.worldFullWarningMessage !== null
        ) {
            message.message = {
                $case: "worldFullWarningMessage",
                worldFullWarningMessage: WorldFullWarningMessage.fromPartial(object.message.worldFullWarningMessage),
            };
        }
        if (
            object.message?.$case === "worldFullMessage" &&
            object.message?.worldFullMessage !== undefined &&
            object.message?.worldFullMessage !== null
        ) {
            message.message = {
                $case: "worldFullMessage",
                worldFullMessage: WorldFullMessage.fromPartial(object.message.worldFullMessage),
            };
        }
        if (
            object.message?.$case === "refreshRoomMessage" &&
            object.message?.refreshRoomMessage !== undefined &&
            object.message?.refreshRoomMessage !== null
        ) {
            message.message = {
                $case: "refreshRoomMessage",
                refreshRoomMessage: RefreshRoomMessage.fromPartial(object.message.refreshRoomMessage),
            };
        }
        if (
            object.message?.$case === "worldConnexionMessage" &&
            object.message?.worldConnexionMessage !== undefined &&
            object.message?.worldConnexionMessage !== null
        ) {
            message.message = {
                $case: "worldConnexionMessage",
                worldConnexionMessage: WorldConnexionMessage.fromPartial(object.message.worldConnexionMessage),
            };
        }
        if (
            object.message?.$case === "tokenExpiredMessage" &&
            object.message?.tokenExpiredMessage !== undefined &&
            object.message?.tokenExpiredMessage !== null
        ) {
            message.message = {
                $case: "tokenExpiredMessage",
                tokenExpiredMessage: TokenExpiredMessage.fromPartial(object.message.tokenExpiredMessage),
            };
        }
        if (
            object.message?.$case === "followRequestMessage" &&
            object.message?.followRequestMessage !== undefined &&
            object.message?.followRequestMessage !== null
        ) {
            message.message = {
                $case: "followRequestMessage",
                followRequestMessage: FollowRequestMessage.fromPartial(object.message.followRequestMessage),
            };
        }
        if (
            object.message?.$case === "followConfirmationMessage" &&
            object.message?.followConfirmationMessage !== undefined &&
            object.message?.followConfirmationMessage !== null
        ) {
            message.message = {
                $case: "followConfirmationMessage",
                followConfirmationMessage: FollowConfirmationMessage.fromPartial(
                    object.message.followConfirmationMessage
                ),
            };
        }
        if (
            object.message?.$case === "followAbortMessage" &&
            object.message?.followAbortMessage !== undefined &&
            object.message?.followAbortMessage !== null
        ) {
            message.message = {
                $case: "followAbortMessage",
                followAbortMessage: FollowAbortMessage.fromPartial(object.message.followAbortMessage),
            };
        }
        if (
            object.message?.$case === "invalidTextureMessage" &&
            object.message?.invalidTextureMessage !== undefined &&
            object.message?.invalidTextureMessage !== null
        ) {
            message.message = {
                $case: "invalidTextureMessage",
                invalidTextureMessage: InvalidTextureMessage.fromPartial(object.message.invalidTextureMessage),
            };
        }
        if (
            object.message?.$case === "groupUsersUpdateMessage" &&
            object.message?.groupUsersUpdateMessage !== undefined &&
            object.message?.groupUsersUpdateMessage !== null
        ) {
            message.message = {
                $case: "groupUsersUpdateMessage",
                groupUsersUpdateMessage: GroupUsersUpdateMessage.fromPartial(object.message.groupUsersUpdateMessage),
            };
        }
        if (
            object.message?.$case === "errorScreenMessage" &&
            object.message?.errorScreenMessage !== undefined &&
            object.message?.errorScreenMessage !== null
        ) {
            message.message = {
                $case: "errorScreenMessage",
                errorScreenMessage: ErrorScreenMessage.fromPartial(object.message.errorScreenMessage),
            };
        }
        if (
            object.message?.$case === "answerMessage" &&
            object.message?.answerMessage !== undefined &&
            object.message?.answerMessage !== null
        ) {
            message.message = {
                $case: "answerMessage",
                answerMessage: AnswerMessage.fromPartial(object.message.answerMessage),
            };
        }
        if (
            object.message?.$case === "moveToPositionMessage" &&
            object.message?.moveToPositionMessage !== undefined &&
            object.message?.moveToPositionMessage !== null
        ) {
            message.message = {
                $case: "moveToPositionMessage",
                moveToPositionMessage: MoveToPositionMessage.fromPartial(object.message.moveToPositionMessage),
            };
        }
        return message;
    },
};

function createBaseJoinRoomMessage(): JoinRoomMessage {
    return {
        positionMessage: undefined,
        name: "",
        characterLayer: [],
        userUuid: "",
        roomId: "",
        tag: [],
        IPAddress: "",
        companion: undefined,
        visitCardUrl: "",
        userRoomToken: "",
        availabilityStatus: 0,
        activatedInviteUser: false,
        isLogged: false,
    };
}

export const JoinRoomMessage = {
    encode(message: JoinRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.positionMessage !== undefined) {
            PositionMessage.encode(message.positionMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.name !== "") {
            writer.uint32(18).string(message.name);
        }
        for (const v of message.characterLayer) {
            CharacterLayerMessage.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        if (message.userUuid !== "") {
            writer.uint32(34).string(message.userUuid);
        }
        if (message.roomId !== "") {
            writer.uint32(42).string(message.roomId);
        }
        for (const v of message.tag) {
            writer.uint32(50).string(v!);
        }
        if (message.IPAddress !== "") {
            writer.uint32(58).string(message.IPAddress);
        }
        if (message.companion !== undefined) {
            CompanionMessage.encode(message.companion, writer.uint32(66).fork()).ldelim();
        }
        if (message.visitCardUrl !== "") {
            writer.uint32(74).string(message.visitCardUrl);
        }
        if (message.userRoomToken !== "") {
            writer.uint32(82).string(message.userRoomToken);
        }
        if (message.availabilityStatus !== 0) {
            writer.uint32(88).int32(message.availabilityStatus);
        }
        if (message.activatedInviteUser === true) {
            writer.uint32(96).bool(message.activatedInviteUser);
        }
        if (message.isLogged === true) {
            writer.uint32(104).bool(message.isLogged);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): JoinRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseJoinRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.positionMessage = PositionMessage.decode(reader, reader.uint32());
                    break;
                case 2:
                    message.name = reader.string();
                    break;
                case 3:
                    message.characterLayer.push(CharacterLayerMessage.decode(reader, reader.uint32()));
                    break;
                case 4:
                    message.userUuid = reader.string();
                    break;
                case 5:
                    message.roomId = reader.string();
                    break;
                case 6:
                    message.tag.push(reader.string());
                    break;
                case 7:
                    message.IPAddress = reader.string();
                    break;
                case 8:
                    message.companion = CompanionMessage.decode(reader, reader.uint32());
                    break;
                case 9:
                    message.visitCardUrl = reader.string();
                    break;
                case 10:
                    message.userRoomToken = reader.string();
                    break;
                case 11:
                    message.availabilityStatus = reader.int32() as any;
                    break;
                case 12:
                    message.activatedInviteUser = reader.bool();
                    break;
                case 13:
                    message.isLogged = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): JoinRoomMessage {
        return {
            positionMessage: isSet(object.positionMessage)
                ? PositionMessage.fromJSON(object.positionMessage)
                : undefined,
            name: isSet(object.name) ? String(object.name) : "",
            characterLayer: Array.isArray(object?.characterLayer)
                ? object.characterLayer.map((e: any) => CharacterLayerMessage.fromJSON(e))
                : [],
            userUuid: isSet(object.userUuid) ? String(object.userUuid) : "",
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            tag: Array.isArray(object?.tag) ? object.tag.map((e: any) => String(e)) : [],
            IPAddress: isSet(object.IPAddress) ? String(object.IPAddress) : "",
            companion: isSet(object.companion) ? CompanionMessage.fromJSON(object.companion) : undefined,
            visitCardUrl: isSet(object.visitCardUrl) ? String(object.visitCardUrl) : "",
            userRoomToken: isSet(object.userRoomToken) ? String(object.userRoomToken) : "",
            availabilityStatus: isSet(object.availabilityStatus)
                ? availabilityStatusFromJSON(object.availabilityStatus)
                : 0,
            activatedInviteUser: isSet(object.activatedInviteUser) ? Boolean(object.activatedInviteUser) : false,
            isLogged: isSet(object.isLogged) ? Boolean(object.isLogged) : false,
        };
    },

    toJSON(message: JoinRoomMessage): unknown {
        const obj: any = {};
        message.positionMessage !== undefined &&
            (obj.positionMessage = message.positionMessage
                ? PositionMessage.toJSON(message.positionMessage)
                : undefined);
        message.name !== undefined && (obj.name = message.name);
        if (message.characterLayer) {
            obj.characterLayer = message.characterLayer.map((e) => (e ? CharacterLayerMessage.toJSON(e) : undefined));
        } else {
            obj.characterLayer = [];
        }
        message.userUuid !== undefined && (obj.userUuid = message.userUuid);
        message.roomId !== undefined && (obj.roomId = message.roomId);
        if (message.tag) {
            obj.tag = message.tag.map((e) => e);
        } else {
            obj.tag = [];
        }
        message.IPAddress !== undefined && (obj.IPAddress = message.IPAddress);
        message.companion !== undefined &&
            (obj.companion = message.companion ? CompanionMessage.toJSON(message.companion) : undefined);
        message.visitCardUrl !== undefined && (obj.visitCardUrl = message.visitCardUrl);
        message.userRoomToken !== undefined && (obj.userRoomToken = message.userRoomToken);
        message.availabilityStatus !== undefined &&
            (obj.availabilityStatus = availabilityStatusToJSON(message.availabilityStatus));
        message.activatedInviteUser !== undefined && (obj.activatedInviteUser = message.activatedInviteUser);
        message.isLogged !== undefined && (obj.isLogged = message.isLogged);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<JoinRoomMessage>, I>>(object: I): JoinRoomMessage {
        const message = createBaseJoinRoomMessage();
        message.positionMessage =
            object.positionMessage !== undefined && object.positionMessage !== null
                ? PositionMessage.fromPartial(object.positionMessage)
                : undefined;
        message.name = object.name ?? "";
        message.characterLayer = object.characterLayer?.map((e) => CharacterLayerMessage.fromPartial(e)) || [];
        message.userUuid = object.userUuid ?? "";
        message.roomId = object.roomId ?? "";
        message.tag = object.tag?.map((e) => e) || [];
        message.IPAddress = object.IPAddress ?? "";
        message.companion =
            object.companion !== undefined && object.companion !== null
                ? CompanionMessage.fromPartial(object.companion)
                : undefined;
        message.visitCardUrl = object.visitCardUrl ?? "";
        message.userRoomToken = object.userRoomToken ?? "";
        message.availabilityStatus = object.availabilityStatus ?? 0;
        message.activatedInviteUser = object.activatedInviteUser ?? false;
        message.isLogged = object.isLogged ?? false;
        return message;
    },
};

function createBaseUserJoinedZoneMessage(): UserJoinedZoneMessage {
    return {
        userId: 0,
        name: "",
        characterLayers: [],
        position: undefined,
        fromZone: undefined,
        companion: undefined,
        visitCardUrl: "",
        userUuid: "",
        outlineColor: 0,
        hasOutline: false,
        availabilityStatus: 0,
        variables: {},
    };
}

export const UserJoinedZoneMessage = {
    encode(message: UserJoinedZoneMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.name !== "") {
            writer.uint32(18).string(message.name);
        }
        for (const v of message.characterLayers) {
            CharacterLayerMessage.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        if (message.position !== undefined) {
            PositionMessage.encode(message.position, writer.uint32(34).fork()).ldelim();
        }
        if (message.fromZone !== undefined) {
            Zone.encode(message.fromZone, writer.uint32(42).fork()).ldelim();
        }
        if (message.companion !== undefined) {
            CompanionMessage.encode(message.companion, writer.uint32(50).fork()).ldelim();
        }
        if (message.visitCardUrl !== "") {
            writer.uint32(58).string(message.visitCardUrl);
        }
        if (message.userUuid !== "") {
            writer.uint32(66).string(message.userUuid);
        }
        if (message.outlineColor !== 0) {
            writer.uint32(72).uint32(message.outlineColor);
        }
        if (message.hasOutline === true) {
            writer.uint32(80).bool(message.hasOutline);
        }
        if (message.availabilityStatus !== 0) {
            writer.uint32(88).int32(message.availabilityStatus);
        }
        Object.entries(message.variables).forEach(([key, value]) => {
            UserJoinedZoneMessage_VariablesEntry.encode({ key: key as any, value }, writer.uint32(98).fork()).ldelim();
        });
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserJoinedZoneMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserJoinedZoneMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 2:
                    message.name = reader.string();
                    break;
                case 3:
                    message.characterLayers.push(CharacterLayerMessage.decode(reader, reader.uint32()));
                    break;
                case 4:
                    message.position = PositionMessage.decode(reader, reader.uint32());
                    break;
                case 5:
                    message.fromZone = Zone.decode(reader, reader.uint32());
                    break;
                case 6:
                    message.companion = CompanionMessage.decode(reader, reader.uint32());
                    break;
                case 7:
                    message.visitCardUrl = reader.string();
                    break;
                case 8:
                    message.userUuid = reader.string();
                    break;
                case 9:
                    message.outlineColor = reader.uint32();
                    break;
                case 10:
                    message.hasOutline = reader.bool();
                    break;
                case 11:
                    message.availabilityStatus = reader.int32() as any;
                    break;
                case 12:
                    const entry12 = UserJoinedZoneMessage_VariablesEntry.decode(reader, reader.uint32());
                    if (entry12.value !== undefined) {
                        message.variables[entry12.key] = entry12.value;
                    }
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserJoinedZoneMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            name: isSet(object.name) ? String(object.name) : "",
            characterLayers: Array.isArray(object?.characterLayers)
                ? object.characterLayers.map((e: any) => CharacterLayerMessage.fromJSON(e))
                : [],
            position: isSet(object.position) ? PositionMessage.fromJSON(object.position) : undefined,
            fromZone: isSet(object.fromZone) ? Zone.fromJSON(object.fromZone) : undefined,
            companion: isSet(object.companion) ? CompanionMessage.fromJSON(object.companion) : undefined,
            visitCardUrl: isSet(object.visitCardUrl) ? String(object.visitCardUrl) : "",
            userUuid: isSet(object.userUuid) ? String(object.userUuid) : "",
            outlineColor: isSet(object.outlineColor) ? Number(object.outlineColor) : 0,
            hasOutline: isSet(object.hasOutline) ? Boolean(object.hasOutline) : false,
            availabilityStatus: isSet(object.availabilityStatus)
                ? availabilityStatusFromJSON(object.availabilityStatus)
                : 0,
            variables: isObject(object.variables)
                ? Object.entries(object.variables).reduce<{ [key: string]: string }>((acc, [key, value]) => {
                      acc[key] = String(value);
                      return acc;
                  }, {})
                : {},
        };
    },

    toJSON(message: UserJoinedZoneMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.name !== undefined && (obj.name = message.name);
        if (message.characterLayers) {
            obj.characterLayers = message.characterLayers.map((e) => (e ? CharacterLayerMessage.toJSON(e) : undefined));
        } else {
            obj.characterLayers = [];
        }
        message.position !== undefined &&
            (obj.position = message.position ? PositionMessage.toJSON(message.position) : undefined);
        message.fromZone !== undefined && (obj.fromZone = message.fromZone ? Zone.toJSON(message.fromZone) : undefined);
        message.companion !== undefined &&
            (obj.companion = message.companion ? CompanionMessage.toJSON(message.companion) : undefined);
        message.visitCardUrl !== undefined && (obj.visitCardUrl = message.visitCardUrl);
        message.userUuid !== undefined && (obj.userUuid = message.userUuid);
        message.outlineColor !== undefined && (obj.outlineColor = Math.round(message.outlineColor));
        message.hasOutline !== undefined && (obj.hasOutline = message.hasOutline);
        message.availabilityStatus !== undefined &&
            (obj.availabilityStatus = availabilityStatusToJSON(message.availabilityStatus));
        obj.variables = {};
        if (message.variables) {
            Object.entries(message.variables).forEach(([k, v]) => {
                obj.variables[k] = v;
            });
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserJoinedZoneMessage>, I>>(object: I): UserJoinedZoneMessage {
        const message = createBaseUserJoinedZoneMessage();
        message.userId = object.userId ?? 0;
        message.name = object.name ?? "";
        message.characterLayers = object.characterLayers?.map((e) => CharacterLayerMessage.fromPartial(e)) || [];
        message.position =
            object.position !== undefined && object.position !== null
                ? PositionMessage.fromPartial(object.position)
                : undefined;
        message.fromZone =
            object.fromZone !== undefined && object.fromZone !== null ? Zone.fromPartial(object.fromZone) : undefined;
        message.companion =
            object.companion !== undefined && object.companion !== null
                ? CompanionMessage.fromPartial(object.companion)
                : undefined;
        message.visitCardUrl = object.visitCardUrl ?? "";
        message.userUuid = object.userUuid ?? "";
        message.outlineColor = object.outlineColor ?? 0;
        message.hasOutline = object.hasOutline ?? false;
        message.availabilityStatus = object.availabilityStatus ?? 0;
        message.variables = Object.entries(object.variables ?? {}).reduce<{ [key: string]: string }>(
            (acc, [key, value]) => {
                if (value !== undefined) {
                    acc[key] = String(value);
                }
                return acc;
            },
            {}
        );
        return message;
    },
};

function createBaseUserJoinedZoneMessage_VariablesEntry(): UserJoinedZoneMessage_VariablesEntry {
    return { key: "", value: "" };
}

export const UserJoinedZoneMessage_VariablesEntry = {
    encode(message: UserJoinedZoneMessage_VariablesEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== "") {
            writer.uint32(18).string(message.value);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserJoinedZoneMessage_VariablesEntry {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserJoinedZoneMessage_VariablesEntry();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.key = reader.string();
                    break;
                case 2:
                    message.value = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserJoinedZoneMessage_VariablesEntry {
        return {
            key: isSet(object.key) ? String(object.key) : "",
            value: isSet(object.value) ? String(object.value) : "",
        };
    },

    toJSON(message: UserJoinedZoneMessage_VariablesEntry): unknown {
        const obj: any = {};
        message.key !== undefined && (obj.key = message.key);
        message.value !== undefined && (obj.value = message.value);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserJoinedZoneMessage_VariablesEntry>, I>>(
        object: I
    ): UserJoinedZoneMessage_VariablesEntry {
        const message = createBaseUserJoinedZoneMessage_VariablesEntry();
        message.key = object.key ?? "";
        message.value = object.value ?? "";
        return message;
    },
};

function createBaseUserLeftZoneMessage(): UserLeftZoneMessage {
    return { userId: 0, toZone: undefined };
}

export const UserLeftZoneMessage = {
    encode(message: UserLeftZoneMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.toZone !== undefined) {
            Zone.encode(message.toZone, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserLeftZoneMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserLeftZoneMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 2:
                    message.toZone = Zone.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserLeftZoneMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            toZone: isSet(object.toZone) ? Zone.fromJSON(object.toZone) : undefined,
        };
    },

    toJSON(message: UserLeftZoneMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.toZone !== undefined && (obj.toZone = message.toZone ? Zone.toJSON(message.toZone) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserLeftZoneMessage>, I>>(object: I): UserLeftZoneMessage {
        const message = createBaseUserLeftZoneMessage();
        message.userId = object.userId ?? 0;
        message.toZone =
            object.toZone !== undefined && object.toZone !== null ? Zone.fromPartial(object.toZone) : undefined;
        return message;
    },
};

function createBaseGroupUpdateZoneMessage(): GroupUpdateZoneMessage {
    return { groupId: 0, position: undefined, groupSize: 0, fromZone: undefined, locked: false };
}

export const GroupUpdateZoneMessage = {
    encode(message: GroupUpdateZoneMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.groupId !== 0) {
            writer.uint32(8).int32(message.groupId);
        }
        if (message.position !== undefined) {
            PointMessage.encode(message.position, writer.uint32(18).fork()).ldelim();
        }
        if (message.groupSize !== 0) {
            writer.uint32(24).int32(message.groupSize);
        }
        if (message.fromZone !== undefined) {
            Zone.encode(message.fromZone, writer.uint32(34).fork()).ldelim();
        }
        if (message.locked === true) {
            writer.uint32(40).bool(message.locked);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupUpdateZoneMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupUpdateZoneMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.groupId = reader.int32();
                    break;
                case 2:
                    message.position = PointMessage.decode(reader, reader.uint32());
                    break;
                case 3:
                    message.groupSize = reader.int32();
                    break;
                case 4:
                    message.fromZone = Zone.decode(reader, reader.uint32());
                    break;
                case 5:
                    message.locked = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): GroupUpdateZoneMessage {
        return {
            groupId: isSet(object.groupId) ? Number(object.groupId) : 0,
            position: isSet(object.position) ? PointMessage.fromJSON(object.position) : undefined,
            groupSize: isSet(object.groupSize) ? Number(object.groupSize) : 0,
            fromZone: isSet(object.fromZone) ? Zone.fromJSON(object.fromZone) : undefined,
            locked: isSet(object.locked) ? Boolean(object.locked) : false,
        };
    },

    toJSON(message: GroupUpdateZoneMessage): unknown {
        const obj: any = {};
        message.groupId !== undefined && (obj.groupId = Math.round(message.groupId));
        message.position !== undefined &&
            (obj.position = message.position ? PointMessage.toJSON(message.position) : undefined);
        message.groupSize !== undefined && (obj.groupSize = Math.round(message.groupSize));
        message.fromZone !== undefined && (obj.fromZone = message.fromZone ? Zone.toJSON(message.fromZone) : undefined);
        message.locked !== undefined && (obj.locked = message.locked);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<GroupUpdateZoneMessage>, I>>(object: I): GroupUpdateZoneMessage {
        const message = createBaseGroupUpdateZoneMessage();
        message.groupId = object.groupId ?? 0;
        message.position =
            object.position !== undefined && object.position !== null
                ? PointMessage.fromPartial(object.position)
                : undefined;
        message.groupSize = object.groupSize ?? 0;
        message.fromZone =
            object.fromZone !== undefined && object.fromZone !== null ? Zone.fromPartial(object.fromZone) : undefined;
        message.locked = object.locked ?? false;
        return message;
    },
};

function createBaseGroupLeftZoneMessage(): GroupLeftZoneMessage {
    return { groupId: 0, toZone: undefined };
}

export const GroupLeftZoneMessage = {
    encode(message: GroupLeftZoneMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.groupId !== 0) {
            writer.uint32(8).int32(message.groupId);
        }
        if (message.toZone !== undefined) {
            Zone.encode(message.toZone, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): GroupLeftZoneMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseGroupLeftZoneMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.groupId = reader.int32();
                    break;
                case 2:
                    message.toZone = Zone.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): GroupLeftZoneMessage {
        return {
            groupId: isSet(object.groupId) ? Number(object.groupId) : 0,
            toZone: isSet(object.toZone) ? Zone.fromJSON(object.toZone) : undefined,
        };
    },

    toJSON(message: GroupLeftZoneMessage): unknown {
        const obj: any = {};
        message.groupId !== undefined && (obj.groupId = Math.round(message.groupId));
        message.toZone !== undefined && (obj.toZone = message.toZone ? Zone.toJSON(message.toZone) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<GroupLeftZoneMessage>, I>>(object: I): GroupLeftZoneMessage {
        const message = createBaseGroupLeftZoneMessage();
        message.groupId = object.groupId ?? 0;
        message.toZone =
            object.toZone !== undefined && object.toZone !== null ? Zone.fromPartial(object.toZone) : undefined;
        return message;
    },
};

function createBasePlayerDetailsUpdatedMessage(): PlayerDetailsUpdatedMessage {
    return { userId: 0, details: undefined };
}

export const PlayerDetailsUpdatedMessage = {
    encode(message: PlayerDetailsUpdatedMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.userId !== 0) {
            writer.uint32(8).int32(message.userId);
        }
        if (message.details !== undefined) {
            SetPlayerDetailsMessage.encode(message.details, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PlayerDetailsUpdatedMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePlayerDetailsUpdatedMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.userId = reader.int32();
                    break;
                case 2:
                    message.details = SetPlayerDetailsMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): PlayerDetailsUpdatedMessage {
        return {
            userId: isSet(object.userId) ? Number(object.userId) : 0,
            details: isSet(object.details) ? SetPlayerDetailsMessage.fromJSON(object.details) : undefined,
        };
    },

    toJSON(message: PlayerDetailsUpdatedMessage): unknown {
        const obj: any = {};
        message.userId !== undefined && (obj.userId = Math.round(message.userId));
        message.details !== undefined &&
            (obj.details = message.details ? SetPlayerDetailsMessage.toJSON(message.details) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PlayerDetailsUpdatedMessage>, I>>(object: I): PlayerDetailsUpdatedMessage {
        const message = createBasePlayerDetailsUpdatedMessage();
        message.userId = object.userId ?? 0;
        message.details =
            object.details !== undefined && object.details !== null
                ? SetPlayerDetailsMessage.fromPartial(object.details)
                : undefined;
        return message;
    },
};

function createBaseZone(): Zone {
    return { x: 0, y: 0 };
}

export const Zone = {
    encode(message: Zone, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.x !== 0) {
            writer.uint32(8).int32(message.x);
        }
        if (message.y !== 0) {
            writer.uint32(16).int32(message.y);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): Zone {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseZone();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.x = reader.int32();
                    break;
                case 2:
                    message.y = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): Zone {
        return { x: isSet(object.x) ? Number(object.x) : 0, y: isSet(object.y) ? Number(object.y) : 0 };
    },

    toJSON(message: Zone): unknown {
        const obj: any = {};
        message.x !== undefined && (obj.x = Math.round(message.x));
        message.y !== undefined && (obj.y = Math.round(message.y));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<Zone>, I>>(object: I): Zone {
        const message = createBaseZone();
        message.x = object.x ?? 0;
        message.y = object.y ?? 0;
        return message;
    },
};

function createBaseZoneMessage(): ZoneMessage {
    return { roomId: "", x: 0, y: 0 };
}

export const ZoneMessage = {
    encode(message: ZoneMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.roomId !== "") {
            writer.uint32(10).string(message.roomId);
        }
        if (message.x !== 0) {
            writer.uint32(16).int32(message.x);
        }
        if (message.y !== 0) {
            writer.uint32(24).int32(message.y);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ZoneMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseZoneMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomId = reader.string();
                    break;
                case 2:
                    message.x = reader.int32();
                    break;
                case 3:
                    message.y = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ZoneMessage {
        return {
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            x: isSet(object.x) ? Number(object.x) : 0,
            y: isSet(object.y) ? Number(object.y) : 0,
        };
    },

    toJSON(message: ZoneMessage): unknown {
        const obj: any = {};
        message.roomId !== undefined && (obj.roomId = message.roomId);
        message.x !== undefined && (obj.x = Math.round(message.x));
        message.y !== undefined && (obj.y = Math.round(message.y));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ZoneMessage>, I>>(object: I): ZoneMessage {
        const message = createBaseZoneMessage();
        message.roomId = object.roomId ?? "";
        message.x = object.x ?? 0;
        message.y = object.y ?? 0;
        return message;
    },
};

function createBaseRoomMessage(): RoomMessage {
    return { roomId: "" };
}

export const RoomMessage = {
    encode(message: RoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.roomId !== "") {
            writer.uint32(10).string(message.roomId);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomId = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): RoomMessage {
        return { roomId: isSet(object.roomId) ? String(object.roomId) : "" };
    },

    toJSON(message: RoomMessage): unknown {
        const obj: any = {};
        message.roomId !== undefined && (obj.roomId = message.roomId);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<RoomMessage>, I>>(object: I): RoomMessage {
        const message = createBaseRoomMessage();
        message.roomId = object.roomId ?? "";
        return message;
    },
};

function createBasePusherToBackMessage(): PusherToBackMessage {
    return { message: undefined };
}

export const PusherToBackMessage = {
    encode(message: PusherToBackMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "joinRoomMessage") {
            JoinRoomMessage.encode(message.message.joinRoomMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "userMovesMessage") {
            UserMovesMessage.encode(message.message.userMovesMessage, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "itemEventMessage") {
            ItemEventMessage.encode(message.message.itemEventMessage, writer.uint32(34).fork()).ldelim();
        }
        if (message.message?.$case === "setPlayerDetailsMessage") {
            SetPlayerDetailsMessage.encode(message.message.setPlayerDetailsMessage, writer.uint32(42).fork()).ldelim();
        }
        if (message.message?.$case === "webRtcSignalToServerMessage") {
            WebRtcSignalToServerMessage.encode(
                message.message.webRtcSignalToServerMessage,
                writer.uint32(50).fork()
            ).ldelim();
        }
        if (message.message?.$case === "webRtcScreenSharingSignalToServerMessage") {
            WebRtcSignalToServerMessage.encode(
                message.message.webRtcScreenSharingSignalToServerMessage,
                writer.uint32(58).fork()
            ).ldelim();
        }
        if (message.message?.$case === "reportPlayerMessage") {
            ReportPlayerMessage.encode(message.message.reportPlayerMessage, writer.uint32(82).fork()).ldelim();
        }
        if (message.message?.$case === "sendUserMessage") {
            SendUserMessage.encode(message.message.sendUserMessage, writer.uint32(98).fork()).ldelim();
        }
        if (message.message?.$case === "banUserMessage") {
            BanUserMessage.encode(message.message.banUserMessage, writer.uint32(106).fork()).ldelim();
        }
        if (message.message?.$case === "emotePromptMessage") {
            EmotePromptMessage.encode(message.message.emotePromptMessage, writer.uint32(114).fork()).ldelim();
        }
        if (message.message?.$case === "variableMessage") {
            VariableMessage.encode(message.message.variableMessage, writer.uint32(122).fork()).ldelim();
        }
        if (message.message?.$case === "followRequestMessage") {
            FollowRequestMessage.encode(message.message.followRequestMessage, writer.uint32(130).fork()).ldelim();
        }
        if (message.message?.$case === "followConfirmationMessage") {
            FollowConfirmationMessage.encode(
                message.message.followConfirmationMessage,
                writer.uint32(138).fork()
            ).ldelim();
        }
        if (message.message?.$case === "followAbortMessage") {
            FollowAbortMessage.encode(message.message.followAbortMessage, writer.uint32(146).fork()).ldelim();
        }
        if (message.message?.$case === "lockGroupPromptMessage") {
            LockGroupPromptMessage.encode(message.message.lockGroupPromptMessage, writer.uint32(154).fork()).ldelim();
        }
        if (message.message?.$case === "queryMessage") {
            QueryMessage.encode(message.message.queryMessage, writer.uint32(170).fork()).ldelim();
        }
        if (message.message?.$case === "askPositionMessage") {
            AskPositionMessage.encode(message.message.askPositionMessage, writer.uint32(178).fork()).ldelim();
        }
        if (message.message?.$case === "editMapWithKeyMessage") {
            EditMapWithKeyMessage.encode(message.message.editMapWithKeyMessage, writer.uint32(186).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PusherToBackMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePusherToBackMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "joinRoomMessage",
                        joinRoomMessage: JoinRoomMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "userMovesMessage",
                        userMovesMessage: UserMovesMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 4:
                    message.message = {
                        $case: "itemEventMessage",
                        itemEventMessage: ItemEventMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 5:
                    message.message = {
                        $case: "setPlayerDetailsMessage",
                        setPlayerDetailsMessage: SetPlayerDetailsMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 6:
                    message.message = {
                        $case: "webRtcSignalToServerMessage",
                        webRtcSignalToServerMessage: WebRtcSignalToServerMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 7:
                    message.message = {
                        $case: "webRtcScreenSharingSignalToServerMessage",
                        webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage.decode(
                            reader,
                            reader.uint32()
                        ),
                    };
                    break;
                case 10:
                    message.message = {
                        $case: "reportPlayerMessage",
                        reportPlayerMessage: ReportPlayerMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 12:
                    message.message = {
                        $case: "sendUserMessage",
                        sendUserMessage: SendUserMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 13:
                    message.message = {
                        $case: "banUserMessage",
                        banUserMessage: BanUserMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 14:
                    message.message = {
                        $case: "emotePromptMessage",
                        emotePromptMessage: EmotePromptMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 15:
                    message.message = {
                        $case: "variableMessage",
                        variableMessage: VariableMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 16:
                    message.message = {
                        $case: "followRequestMessage",
                        followRequestMessage: FollowRequestMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 17:
                    message.message = {
                        $case: "followConfirmationMessage",
                        followConfirmationMessage: FollowConfirmationMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 18:
                    message.message = {
                        $case: "followAbortMessage",
                        followAbortMessage: FollowAbortMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 19:
                    message.message = {
                        $case: "lockGroupPromptMessage",
                        lockGroupPromptMessage: LockGroupPromptMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 21:
                    message.message = {
                        $case: "queryMessage",
                        queryMessage: QueryMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 22:
                    message.message = {
                        $case: "askPositionMessage",
                        askPositionMessage: AskPositionMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 23:
                    message.message = {
                        $case: "editMapWithKeyMessage",
                        editMapWithKeyMessage: EditMapWithKeyMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): PusherToBackMessage {
        return {
            message: isSet(object.joinRoomMessage)
                ? { $case: "joinRoomMessage", joinRoomMessage: JoinRoomMessage.fromJSON(object.joinRoomMessage) }
                : isSet(object.userMovesMessage)
                ? { $case: "userMovesMessage", userMovesMessage: UserMovesMessage.fromJSON(object.userMovesMessage) }
                : isSet(object.itemEventMessage)
                ? { $case: "itemEventMessage", itemEventMessage: ItemEventMessage.fromJSON(object.itemEventMessage) }
                : isSet(object.setPlayerDetailsMessage)
                ? {
                      $case: "setPlayerDetailsMessage",
                      setPlayerDetailsMessage: SetPlayerDetailsMessage.fromJSON(object.setPlayerDetailsMessage),
                  }
                : isSet(object.webRtcSignalToServerMessage)
                ? {
                      $case: "webRtcSignalToServerMessage",
                      webRtcSignalToServerMessage: WebRtcSignalToServerMessage.fromJSON(
                          object.webRtcSignalToServerMessage
                      ),
                  }
                : isSet(object.webRtcScreenSharingSignalToServerMessage)
                ? {
                      $case: "webRtcScreenSharingSignalToServerMessage",
                      webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage.fromJSON(
                          object.webRtcScreenSharingSignalToServerMessage
                      ),
                  }
                : isSet(object.reportPlayerMessage)
                ? {
                      $case: "reportPlayerMessage",
                      reportPlayerMessage: ReportPlayerMessage.fromJSON(object.reportPlayerMessage),
                  }
                : isSet(object.sendUserMessage)
                ? { $case: "sendUserMessage", sendUserMessage: SendUserMessage.fromJSON(object.sendUserMessage) }
                : isSet(object.banUserMessage)
                ? { $case: "banUserMessage", banUserMessage: BanUserMessage.fromJSON(object.banUserMessage) }
                : isSet(object.emotePromptMessage)
                ? {
                      $case: "emotePromptMessage",
                      emotePromptMessage: EmotePromptMessage.fromJSON(object.emotePromptMessage),
                  }
                : isSet(object.variableMessage)
                ? { $case: "variableMessage", variableMessage: VariableMessage.fromJSON(object.variableMessage) }
                : isSet(object.followRequestMessage)
                ? {
                      $case: "followRequestMessage",
                      followRequestMessage: FollowRequestMessage.fromJSON(object.followRequestMessage),
                  }
                : isSet(object.followConfirmationMessage)
                ? {
                      $case: "followConfirmationMessage",
                      followConfirmationMessage: FollowConfirmationMessage.fromJSON(object.followConfirmationMessage),
                  }
                : isSet(object.followAbortMessage)
                ? {
                      $case: "followAbortMessage",
                      followAbortMessage: FollowAbortMessage.fromJSON(object.followAbortMessage),
                  }
                : isSet(object.lockGroupPromptMessage)
                ? {
                      $case: "lockGroupPromptMessage",
                      lockGroupPromptMessage: LockGroupPromptMessage.fromJSON(object.lockGroupPromptMessage),
                  }
                : isSet(object.queryMessage)
                ? { $case: "queryMessage", queryMessage: QueryMessage.fromJSON(object.queryMessage) }
                : isSet(object.askPositionMessage)
                ? {
                      $case: "askPositionMessage",
                      askPositionMessage: AskPositionMessage.fromJSON(object.askPositionMessage),
                  }
                : isSet(object.editMapWithKeyMessage)
                ? {
                      $case: "editMapWithKeyMessage",
                      editMapWithKeyMessage: EditMapWithKeyMessage.fromJSON(object.editMapWithKeyMessage),
                  }
                : undefined,
        };
    },

    toJSON(message: PusherToBackMessage): unknown {
        const obj: any = {};
        message.message?.$case === "joinRoomMessage" &&
            (obj.joinRoomMessage = message.message?.joinRoomMessage
                ? JoinRoomMessage.toJSON(message.message?.joinRoomMessage)
                : undefined);
        message.message?.$case === "userMovesMessage" &&
            (obj.userMovesMessage = message.message?.userMovesMessage
                ? UserMovesMessage.toJSON(message.message?.userMovesMessage)
                : undefined);
        message.message?.$case === "itemEventMessage" &&
            (obj.itemEventMessage = message.message?.itemEventMessage
                ? ItemEventMessage.toJSON(message.message?.itemEventMessage)
                : undefined);
        message.message?.$case === "setPlayerDetailsMessage" &&
            (obj.setPlayerDetailsMessage = message.message?.setPlayerDetailsMessage
                ? SetPlayerDetailsMessage.toJSON(message.message?.setPlayerDetailsMessage)
                : undefined);
        message.message?.$case === "webRtcSignalToServerMessage" &&
            (obj.webRtcSignalToServerMessage = message.message?.webRtcSignalToServerMessage
                ? WebRtcSignalToServerMessage.toJSON(message.message?.webRtcSignalToServerMessage)
                : undefined);
        message.message?.$case === "webRtcScreenSharingSignalToServerMessage" &&
            (obj.webRtcScreenSharingSignalToServerMessage = message.message?.webRtcScreenSharingSignalToServerMessage
                ? WebRtcSignalToServerMessage.toJSON(message.message?.webRtcScreenSharingSignalToServerMessage)
                : undefined);
        message.message?.$case === "reportPlayerMessage" &&
            (obj.reportPlayerMessage = message.message?.reportPlayerMessage
                ? ReportPlayerMessage.toJSON(message.message?.reportPlayerMessage)
                : undefined);
        message.message?.$case === "sendUserMessage" &&
            (obj.sendUserMessage = message.message?.sendUserMessage
                ? SendUserMessage.toJSON(message.message?.sendUserMessage)
                : undefined);
        message.message?.$case === "banUserMessage" &&
            (obj.banUserMessage = message.message?.banUserMessage
                ? BanUserMessage.toJSON(message.message?.banUserMessage)
                : undefined);
        message.message?.$case === "emotePromptMessage" &&
            (obj.emotePromptMessage = message.message?.emotePromptMessage
                ? EmotePromptMessage.toJSON(message.message?.emotePromptMessage)
                : undefined);
        message.message?.$case === "variableMessage" &&
            (obj.variableMessage = message.message?.variableMessage
                ? VariableMessage.toJSON(message.message?.variableMessage)
                : undefined);
        message.message?.$case === "followRequestMessage" &&
            (obj.followRequestMessage = message.message?.followRequestMessage
                ? FollowRequestMessage.toJSON(message.message?.followRequestMessage)
                : undefined);
        message.message?.$case === "followConfirmationMessage" &&
            (obj.followConfirmationMessage = message.message?.followConfirmationMessage
                ? FollowConfirmationMessage.toJSON(message.message?.followConfirmationMessage)
                : undefined);
        message.message?.$case === "followAbortMessage" &&
            (obj.followAbortMessage = message.message?.followAbortMessage
                ? FollowAbortMessage.toJSON(message.message?.followAbortMessage)
                : undefined);
        message.message?.$case === "lockGroupPromptMessage" &&
            (obj.lockGroupPromptMessage = message.message?.lockGroupPromptMessage
                ? LockGroupPromptMessage.toJSON(message.message?.lockGroupPromptMessage)
                : undefined);
        message.message?.$case === "queryMessage" &&
            (obj.queryMessage = message.message?.queryMessage
                ? QueryMessage.toJSON(message.message?.queryMessage)
                : undefined);
        message.message?.$case === "askPositionMessage" &&
            (obj.askPositionMessage = message.message?.askPositionMessage
                ? AskPositionMessage.toJSON(message.message?.askPositionMessage)
                : undefined);
        message.message?.$case === "editMapWithKeyMessage" &&
            (obj.editMapWithKeyMessage = message.message?.editMapWithKeyMessage
                ? EditMapWithKeyMessage.toJSON(message.message?.editMapWithKeyMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PusherToBackMessage>, I>>(object: I): PusherToBackMessage {
        const message = createBasePusherToBackMessage();
        if (
            object.message?.$case === "joinRoomMessage" &&
            object.message?.joinRoomMessage !== undefined &&
            object.message?.joinRoomMessage !== null
        ) {
            message.message = {
                $case: "joinRoomMessage",
                joinRoomMessage: JoinRoomMessage.fromPartial(object.message.joinRoomMessage),
            };
        }
        if (
            object.message?.$case === "userMovesMessage" &&
            object.message?.userMovesMessage !== undefined &&
            object.message?.userMovesMessage !== null
        ) {
            message.message = {
                $case: "userMovesMessage",
                userMovesMessage: UserMovesMessage.fromPartial(object.message.userMovesMessage),
            };
        }
        if (
            object.message?.$case === "itemEventMessage" &&
            object.message?.itemEventMessage !== undefined &&
            object.message?.itemEventMessage !== null
        ) {
            message.message = {
                $case: "itemEventMessage",
                itemEventMessage: ItemEventMessage.fromPartial(object.message.itemEventMessage),
            };
        }
        if (
            object.message?.$case === "setPlayerDetailsMessage" &&
            object.message?.setPlayerDetailsMessage !== undefined &&
            object.message?.setPlayerDetailsMessage !== null
        ) {
            message.message = {
                $case: "setPlayerDetailsMessage",
                setPlayerDetailsMessage: SetPlayerDetailsMessage.fromPartial(object.message.setPlayerDetailsMessage),
            };
        }
        if (
            object.message?.$case === "webRtcSignalToServerMessage" &&
            object.message?.webRtcSignalToServerMessage !== undefined &&
            object.message?.webRtcSignalToServerMessage !== null
        ) {
            message.message = {
                $case: "webRtcSignalToServerMessage",
                webRtcSignalToServerMessage: WebRtcSignalToServerMessage.fromPartial(
                    object.message.webRtcSignalToServerMessage
                ),
            };
        }
        if (
            object.message?.$case === "webRtcScreenSharingSignalToServerMessage" &&
            object.message?.webRtcScreenSharingSignalToServerMessage !== undefined &&
            object.message?.webRtcScreenSharingSignalToServerMessage !== null
        ) {
            message.message = {
                $case: "webRtcScreenSharingSignalToServerMessage",
                webRtcScreenSharingSignalToServerMessage: WebRtcSignalToServerMessage.fromPartial(
                    object.message.webRtcScreenSharingSignalToServerMessage
                ),
            };
        }
        if (
            object.message?.$case === "reportPlayerMessage" &&
            object.message?.reportPlayerMessage !== undefined &&
            object.message?.reportPlayerMessage !== null
        ) {
            message.message = {
                $case: "reportPlayerMessage",
                reportPlayerMessage: ReportPlayerMessage.fromPartial(object.message.reportPlayerMessage),
            };
        }
        if (
            object.message?.$case === "sendUserMessage" &&
            object.message?.sendUserMessage !== undefined &&
            object.message?.sendUserMessage !== null
        ) {
            message.message = {
                $case: "sendUserMessage",
                sendUserMessage: SendUserMessage.fromPartial(object.message.sendUserMessage),
            };
        }
        if (
            object.message?.$case === "banUserMessage" &&
            object.message?.banUserMessage !== undefined &&
            object.message?.banUserMessage !== null
        ) {
            message.message = {
                $case: "banUserMessage",
                banUserMessage: BanUserMessage.fromPartial(object.message.banUserMessage),
            };
        }
        if (
            object.message?.$case === "emotePromptMessage" &&
            object.message?.emotePromptMessage !== undefined &&
            object.message?.emotePromptMessage !== null
        ) {
            message.message = {
                $case: "emotePromptMessage",
                emotePromptMessage: EmotePromptMessage.fromPartial(object.message.emotePromptMessage),
            };
        }
        if (
            object.message?.$case === "variableMessage" &&
            object.message?.variableMessage !== undefined &&
            object.message?.variableMessage !== null
        ) {
            message.message = {
                $case: "variableMessage",
                variableMessage: VariableMessage.fromPartial(object.message.variableMessage),
            };
        }
        if (
            object.message?.$case === "followRequestMessage" &&
            object.message?.followRequestMessage !== undefined &&
            object.message?.followRequestMessage !== null
        ) {
            message.message = {
                $case: "followRequestMessage",
                followRequestMessage: FollowRequestMessage.fromPartial(object.message.followRequestMessage),
            };
        }
        if (
            object.message?.$case === "followConfirmationMessage" &&
            object.message?.followConfirmationMessage !== undefined &&
            object.message?.followConfirmationMessage !== null
        ) {
            message.message = {
                $case: "followConfirmationMessage",
                followConfirmationMessage: FollowConfirmationMessage.fromPartial(
                    object.message.followConfirmationMessage
                ),
            };
        }
        if (
            object.message?.$case === "followAbortMessage" &&
            object.message?.followAbortMessage !== undefined &&
            object.message?.followAbortMessage !== null
        ) {
            message.message = {
                $case: "followAbortMessage",
                followAbortMessage: FollowAbortMessage.fromPartial(object.message.followAbortMessage),
            };
        }
        if (
            object.message?.$case === "lockGroupPromptMessage" &&
            object.message?.lockGroupPromptMessage !== undefined &&
            object.message?.lockGroupPromptMessage !== null
        ) {
            message.message = {
                $case: "lockGroupPromptMessage",
                lockGroupPromptMessage: LockGroupPromptMessage.fromPartial(object.message.lockGroupPromptMessage),
            };
        }
        if (
            object.message?.$case === "queryMessage" &&
            object.message?.queryMessage !== undefined &&
            object.message?.queryMessage !== null
        ) {
            message.message = {
                $case: "queryMessage",
                queryMessage: QueryMessage.fromPartial(object.message.queryMessage),
            };
        }
        if (
            object.message?.$case === "askPositionMessage" &&
            object.message?.askPositionMessage !== undefined &&
            object.message?.askPositionMessage !== null
        ) {
            message.message = {
                $case: "askPositionMessage",
                askPositionMessage: AskPositionMessage.fromPartial(object.message.askPositionMessage),
            };
        }
        if (
            object.message?.$case === "editMapWithKeyMessage" &&
            object.message?.editMapWithKeyMessage !== undefined &&
            object.message?.editMapWithKeyMessage !== null
        ) {
            message.message = {
                $case: "editMapWithKeyMessage",
                editMapWithKeyMessage: EditMapWithKeyMessage.fromPartial(object.message.editMapWithKeyMessage),
            };
        }
        return message;
    },
};

function createBaseBatchToPusherMessage(): BatchToPusherMessage {
    return { payload: [] };
}

export const BatchToPusherMessage = {
    encode(message: BatchToPusherMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        for (const v of message.payload) {
            SubToPusherMessage.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BatchToPusherMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBatchToPusherMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 2:
                    message.payload.push(SubToPusherMessage.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): BatchToPusherMessage {
        return {
            payload: Array.isArray(object?.payload)
                ? object.payload.map((e: any) => SubToPusherMessage.fromJSON(e))
                : [],
        };
    },

    toJSON(message: BatchToPusherMessage): unknown {
        const obj: any = {};
        if (message.payload) {
            obj.payload = message.payload.map((e) => (e ? SubToPusherMessage.toJSON(e) : undefined));
        } else {
            obj.payload = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<BatchToPusherMessage>, I>>(object: I): BatchToPusherMessage {
        const message = createBaseBatchToPusherMessage();
        message.payload = object.payload?.map((e) => SubToPusherMessage.fromPartial(e)) || [];
        return message;
    },
};

function createBaseSubToPusherMessage(): SubToPusherMessage {
    return { message: undefined };
}

export const SubToPusherMessage = {
    encode(message: SubToPusherMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "userJoinedZoneMessage") {
            UserJoinedZoneMessage.encode(message.message.userJoinedZoneMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "groupUpdateZoneMessage") {
            GroupUpdateZoneMessage.encode(message.message.groupUpdateZoneMessage, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "userMovedMessage") {
            UserMovedMessage.encode(message.message.userMovedMessage, writer.uint32(26).fork()).ldelim();
        }
        if (message.message?.$case === "groupLeftZoneMessage") {
            GroupLeftZoneMessage.encode(message.message.groupLeftZoneMessage, writer.uint32(34).fork()).ldelim();
        }
        if (message.message?.$case === "userLeftZoneMessage") {
            UserLeftZoneMessage.encode(message.message.userLeftZoneMessage, writer.uint32(42).fork()).ldelim();
        }
        if (message.message?.$case === "itemEventMessage") {
            ItemEventMessage.encode(message.message.itemEventMessage, writer.uint32(50).fork()).ldelim();
        }
        if (message.message?.$case === "sendUserMessage") {
            SendUserMessage.encode(message.message.sendUserMessage, writer.uint32(58).fork()).ldelim();
        }
        if (message.message?.$case === "banUserMessage") {
            BanUserMessage.encode(message.message.banUserMessage, writer.uint32(66).fork()).ldelim();
        }
        if (message.message?.$case === "emoteEventMessage") {
            EmoteEventMessage.encode(message.message.emoteEventMessage, writer.uint32(74).fork()).ldelim();
        }
        if (message.message?.$case === "errorMessage") {
            ErrorMessage.encode(message.message.errorMessage, writer.uint32(82).fork()).ldelim();
        }
        if (message.message?.$case === "playerDetailsUpdatedMessage") {
            PlayerDetailsUpdatedMessage.encode(
                message.message.playerDetailsUpdatedMessage,
                writer.uint32(90).fork()
            ).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SubToPusherMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSubToPusherMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "userJoinedZoneMessage",
                        userJoinedZoneMessage: UserJoinedZoneMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "groupUpdateZoneMessage",
                        groupUpdateZoneMessage: GroupUpdateZoneMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.message = {
                        $case: "userMovedMessage",
                        userMovedMessage: UserMovedMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 4:
                    message.message = {
                        $case: "groupLeftZoneMessage",
                        groupLeftZoneMessage: GroupLeftZoneMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 5:
                    message.message = {
                        $case: "userLeftZoneMessage",
                        userLeftZoneMessage: UserLeftZoneMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 6:
                    message.message = {
                        $case: "itemEventMessage",
                        itemEventMessage: ItemEventMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 7:
                    message.message = {
                        $case: "sendUserMessage",
                        sendUserMessage: SendUserMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 8:
                    message.message = {
                        $case: "banUserMessage",
                        banUserMessage: BanUserMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 9:
                    message.message = {
                        $case: "emoteEventMessage",
                        emoteEventMessage: EmoteEventMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 10:
                    message.message = {
                        $case: "errorMessage",
                        errorMessage: ErrorMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 11:
                    message.message = {
                        $case: "playerDetailsUpdatedMessage",
                        playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): SubToPusherMessage {
        return {
            message: isSet(object.userJoinedZoneMessage)
                ? {
                      $case: "userJoinedZoneMessage",
                      userJoinedZoneMessage: UserJoinedZoneMessage.fromJSON(object.userJoinedZoneMessage),
                  }
                : isSet(object.groupUpdateZoneMessage)
                ? {
                      $case: "groupUpdateZoneMessage",
                      groupUpdateZoneMessage: GroupUpdateZoneMessage.fromJSON(object.groupUpdateZoneMessage),
                  }
                : isSet(object.userMovedMessage)
                ? { $case: "userMovedMessage", userMovedMessage: UserMovedMessage.fromJSON(object.userMovedMessage) }
                : isSet(object.groupLeftZoneMessage)
                ? {
                      $case: "groupLeftZoneMessage",
                      groupLeftZoneMessage: GroupLeftZoneMessage.fromJSON(object.groupLeftZoneMessage),
                  }
                : isSet(object.userLeftZoneMessage)
                ? {
                      $case: "userLeftZoneMessage",
                      userLeftZoneMessage: UserLeftZoneMessage.fromJSON(object.userLeftZoneMessage),
                  }
                : isSet(object.itemEventMessage)
                ? { $case: "itemEventMessage", itemEventMessage: ItemEventMessage.fromJSON(object.itemEventMessage) }
                : isSet(object.sendUserMessage)
                ? { $case: "sendUserMessage", sendUserMessage: SendUserMessage.fromJSON(object.sendUserMessage) }
                : isSet(object.banUserMessage)
                ? { $case: "banUserMessage", banUserMessage: BanUserMessage.fromJSON(object.banUserMessage) }
                : isSet(object.emoteEventMessage)
                ? {
                      $case: "emoteEventMessage",
                      emoteEventMessage: EmoteEventMessage.fromJSON(object.emoteEventMessage),
                  }
                : isSet(object.errorMessage)
                ? { $case: "errorMessage", errorMessage: ErrorMessage.fromJSON(object.errorMessage) }
                : isSet(object.playerDetailsUpdatedMessage)
                ? {
                      $case: "playerDetailsUpdatedMessage",
                      playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage.fromJSON(
                          object.playerDetailsUpdatedMessage
                      ),
                  }
                : undefined,
        };
    },

    toJSON(message: SubToPusherMessage): unknown {
        const obj: any = {};
        message.message?.$case === "userJoinedZoneMessage" &&
            (obj.userJoinedZoneMessage = message.message?.userJoinedZoneMessage
                ? UserJoinedZoneMessage.toJSON(message.message?.userJoinedZoneMessage)
                : undefined);
        message.message?.$case === "groupUpdateZoneMessage" &&
            (obj.groupUpdateZoneMessage = message.message?.groupUpdateZoneMessage
                ? GroupUpdateZoneMessage.toJSON(message.message?.groupUpdateZoneMessage)
                : undefined);
        message.message?.$case === "userMovedMessage" &&
            (obj.userMovedMessage = message.message?.userMovedMessage
                ? UserMovedMessage.toJSON(message.message?.userMovedMessage)
                : undefined);
        message.message?.$case === "groupLeftZoneMessage" &&
            (obj.groupLeftZoneMessage = message.message?.groupLeftZoneMessage
                ? GroupLeftZoneMessage.toJSON(message.message?.groupLeftZoneMessage)
                : undefined);
        message.message?.$case === "userLeftZoneMessage" &&
            (obj.userLeftZoneMessage = message.message?.userLeftZoneMessage
                ? UserLeftZoneMessage.toJSON(message.message?.userLeftZoneMessage)
                : undefined);
        message.message?.$case === "itemEventMessage" &&
            (obj.itemEventMessage = message.message?.itemEventMessage
                ? ItemEventMessage.toJSON(message.message?.itemEventMessage)
                : undefined);
        message.message?.$case === "sendUserMessage" &&
            (obj.sendUserMessage = message.message?.sendUserMessage
                ? SendUserMessage.toJSON(message.message?.sendUserMessage)
                : undefined);
        message.message?.$case === "banUserMessage" &&
            (obj.banUserMessage = message.message?.banUserMessage
                ? BanUserMessage.toJSON(message.message?.banUserMessage)
                : undefined);
        message.message?.$case === "emoteEventMessage" &&
            (obj.emoteEventMessage = message.message?.emoteEventMessage
                ? EmoteEventMessage.toJSON(message.message?.emoteEventMessage)
                : undefined);
        message.message?.$case === "errorMessage" &&
            (obj.errorMessage = message.message?.errorMessage
                ? ErrorMessage.toJSON(message.message?.errorMessage)
                : undefined);
        message.message?.$case === "playerDetailsUpdatedMessage" &&
            (obj.playerDetailsUpdatedMessage = message.message?.playerDetailsUpdatedMessage
                ? PlayerDetailsUpdatedMessage.toJSON(message.message?.playerDetailsUpdatedMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<SubToPusherMessage>, I>>(object: I): SubToPusherMessage {
        const message = createBaseSubToPusherMessage();
        if (
            object.message?.$case === "userJoinedZoneMessage" &&
            object.message?.userJoinedZoneMessage !== undefined &&
            object.message?.userJoinedZoneMessage !== null
        ) {
            message.message = {
                $case: "userJoinedZoneMessage",
                userJoinedZoneMessage: UserJoinedZoneMessage.fromPartial(object.message.userJoinedZoneMessage),
            };
        }
        if (
            object.message?.$case === "groupUpdateZoneMessage" &&
            object.message?.groupUpdateZoneMessage !== undefined &&
            object.message?.groupUpdateZoneMessage !== null
        ) {
            message.message = {
                $case: "groupUpdateZoneMessage",
                groupUpdateZoneMessage: GroupUpdateZoneMessage.fromPartial(object.message.groupUpdateZoneMessage),
            };
        }
        if (
            object.message?.$case === "userMovedMessage" &&
            object.message?.userMovedMessage !== undefined &&
            object.message?.userMovedMessage !== null
        ) {
            message.message = {
                $case: "userMovedMessage",
                userMovedMessage: UserMovedMessage.fromPartial(object.message.userMovedMessage),
            };
        }
        if (
            object.message?.$case === "groupLeftZoneMessage" &&
            object.message?.groupLeftZoneMessage !== undefined &&
            object.message?.groupLeftZoneMessage !== null
        ) {
            message.message = {
                $case: "groupLeftZoneMessage",
                groupLeftZoneMessage: GroupLeftZoneMessage.fromPartial(object.message.groupLeftZoneMessage),
            };
        }
        if (
            object.message?.$case === "userLeftZoneMessage" &&
            object.message?.userLeftZoneMessage !== undefined &&
            object.message?.userLeftZoneMessage !== null
        ) {
            message.message = {
                $case: "userLeftZoneMessage",
                userLeftZoneMessage: UserLeftZoneMessage.fromPartial(object.message.userLeftZoneMessage),
            };
        }
        if (
            object.message?.$case === "itemEventMessage" &&
            object.message?.itemEventMessage !== undefined &&
            object.message?.itemEventMessage !== null
        ) {
            message.message = {
                $case: "itemEventMessage",
                itemEventMessage: ItemEventMessage.fromPartial(object.message.itemEventMessage),
            };
        }
        if (
            object.message?.$case === "sendUserMessage" &&
            object.message?.sendUserMessage !== undefined &&
            object.message?.sendUserMessage !== null
        ) {
            message.message = {
                $case: "sendUserMessage",
                sendUserMessage: SendUserMessage.fromPartial(object.message.sendUserMessage),
            };
        }
        if (
            object.message?.$case === "banUserMessage" &&
            object.message?.banUserMessage !== undefined &&
            object.message?.banUserMessage !== null
        ) {
            message.message = {
                $case: "banUserMessage",
                banUserMessage: BanUserMessage.fromPartial(object.message.banUserMessage),
            };
        }
        if (
            object.message?.$case === "emoteEventMessage" &&
            object.message?.emoteEventMessage !== undefined &&
            object.message?.emoteEventMessage !== null
        ) {
            message.message = {
                $case: "emoteEventMessage",
                emoteEventMessage: EmoteEventMessage.fromPartial(object.message.emoteEventMessage),
            };
        }
        if (
            object.message?.$case === "errorMessage" &&
            object.message?.errorMessage !== undefined &&
            object.message?.errorMessage !== null
        ) {
            message.message = {
                $case: "errorMessage",
                errorMessage: ErrorMessage.fromPartial(object.message.errorMessage),
            };
        }
        if (
            object.message?.$case === "playerDetailsUpdatedMessage" &&
            object.message?.playerDetailsUpdatedMessage !== undefined &&
            object.message?.playerDetailsUpdatedMessage !== null
        ) {
            message.message = {
                $case: "playerDetailsUpdatedMessage",
                playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage.fromPartial(
                    object.message.playerDetailsUpdatedMessage
                ),
            };
        }
        return message;
    },
};

function createBaseBatchToPusherRoomMessage(): BatchToPusherRoomMessage {
    return { payload: [] };
}

export const BatchToPusherRoomMessage = {
    encode(message: BatchToPusherRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        for (const v of message.payload) {
            SubToPusherRoomMessage.encode(v!, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BatchToPusherRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBatchToPusherRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 2:
                    message.payload.push(SubToPusherRoomMessage.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): BatchToPusherRoomMessage {
        return {
            payload: Array.isArray(object?.payload)
                ? object.payload.map((e: any) => SubToPusherRoomMessage.fromJSON(e))
                : [],
        };
    },

    toJSON(message: BatchToPusherRoomMessage): unknown {
        const obj: any = {};
        if (message.payload) {
            obj.payload = message.payload.map((e) => (e ? SubToPusherRoomMessage.toJSON(e) : undefined));
        } else {
            obj.payload = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<BatchToPusherRoomMessage>, I>>(object: I): BatchToPusherRoomMessage {
        const message = createBaseBatchToPusherRoomMessage();
        message.payload = object.payload?.map((e) => SubToPusherRoomMessage.fromPartial(e)) || [];
        return message;
    },
};

function createBaseSubToPusherRoomMessage(): SubToPusherRoomMessage {
    return { message: undefined };
}

export const SubToPusherRoomMessage = {
    encode(message: SubToPusherRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "variableMessage") {
            VariableWithTagMessage.encode(message.message.variableMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "errorMessage") {
            ErrorMessage.encode(message.message.errorMessage, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "editMapMessage") {
            EditMapMessage.encode(message.message.editMapMessage, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): SubToPusherRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseSubToPusherRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "variableMessage",
                        variableMessage: VariableWithTagMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "errorMessage",
                        errorMessage: ErrorMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.message = {
                        $case: "editMapMessage",
                        editMapMessage: EditMapMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): SubToPusherRoomMessage {
        return {
            message: isSet(object.variableMessage)
                ? { $case: "variableMessage", variableMessage: VariableWithTagMessage.fromJSON(object.variableMessage) }
                : isSet(object.errorMessage)
                ? { $case: "errorMessage", errorMessage: ErrorMessage.fromJSON(object.errorMessage) }
                : isSet(object.editMapMessage)
                ? { $case: "editMapMessage", editMapMessage: EditMapMessage.fromJSON(object.editMapMessage) }
                : undefined,
        };
    },

    toJSON(message: SubToPusherRoomMessage): unknown {
        const obj: any = {};
        message.message?.$case === "variableMessage" &&
            (obj.variableMessage = message.message?.variableMessage
                ? VariableWithTagMessage.toJSON(message.message?.variableMessage)
                : undefined);
        message.message?.$case === "errorMessage" &&
            (obj.errorMessage = message.message?.errorMessage
                ? ErrorMessage.toJSON(message.message?.errorMessage)
                : undefined);
        message.message?.$case === "editMapMessage" &&
            (obj.editMapMessage = message.message?.editMapMessage
                ? EditMapMessage.toJSON(message.message?.editMapMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<SubToPusherRoomMessage>, I>>(object: I): SubToPusherRoomMessage {
        const message = createBaseSubToPusherRoomMessage();
        if (
            object.message?.$case === "variableMessage" &&
            object.message?.variableMessage !== undefined &&
            object.message?.variableMessage !== null
        ) {
            message.message = {
                $case: "variableMessage",
                variableMessage: VariableWithTagMessage.fromPartial(object.message.variableMessage),
            };
        }
        if (
            object.message?.$case === "errorMessage" &&
            object.message?.errorMessage !== undefined &&
            object.message?.errorMessage !== null
        ) {
            message.message = {
                $case: "errorMessage",
                errorMessage: ErrorMessage.fromPartial(object.message.errorMessage),
            };
        }
        if (
            object.message?.$case === "editMapMessage" &&
            object.message?.editMapMessage !== undefined &&
            object.message?.editMapMessage !== null
        ) {
            message.message = {
                $case: "editMapMessage",
                editMapMessage: EditMapMessage.fromPartial(object.message.editMapMessage),
            };
        }
        return message;
    },
};

function createBaseEditMapMessage(): EditMapMessage {
    return { message: undefined };
}

export const EditMapMessage = {
    encode(message: EditMapMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "modifyAreaMessage") {
            ModifyAreaMessage.encode(message.message.modifyAreaMessage, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EditMapMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEditMapMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "modifyAreaMessage",
                        modifyAreaMessage: ModifyAreaMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): EditMapMessage {
        return {
            message: isSet(object.modifyAreaMessage)
                ? {
                      $case: "modifyAreaMessage",
                      modifyAreaMessage: ModifyAreaMessage.fromJSON(object.modifyAreaMessage),
                  }
                : undefined,
        };
    },

    toJSON(message: EditMapMessage): unknown {
        const obj: any = {};
        message.message?.$case === "modifyAreaMessage" &&
            (obj.modifyAreaMessage = message.message?.modifyAreaMessage
                ? ModifyAreaMessage.toJSON(message.message?.modifyAreaMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<EditMapMessage>, I>>(object: I): EditMapMessage {
        const message = createBaseEditMapMessage();
        if (
            object.message?.$case === "modifyAreaMessage" &&
            object.message?.modifyAreaMessage !== undefined &&
            object.message?.modifyAreaMessage !== null
        ) {
            message.message = {
                $case: "modifyAreaMessage",
                modifyAreaMessage: ModifyAreaMessage.fromPartial(object.message.modifyAreaMessage),
            };
        }
        return message;
    },
};

function createBaseEditMapWithKeyMessage(): EditMapWithKeyMessage {
    return { mapKey: "", editMapMessage: undefined };
}

export const EditMapWithKeyMessage = {
    encode(message: EditMapWithKeyMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.mapKey !== "") {
            writer.uint32(10).string(message.mapKey);
        }
        if (message.editMapMessage !== undefined) {
            EditMapMessage.encode(message.editMapMessage, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EditMapWithKeyMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEditMapWithKeyMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.mapKey = reader.string();
                    break;
                case 2:
                    message.editMapMessage = EditMapMessage.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): EditMapWithKeyMessage {
        return {
            mapKey: isSet(object.mapKey) ? String(object.mapKey) : "",
            editMapMessage: isSet(object.editMapMessage) ? EditMapMessage.fromJSON(object.editMapMessage) : undefined,
        };
    },

    toJSON(message: EditMapWithKeyMessage): unknown {
        const obj: any = {};
        message.mapKey !== undefined && (obj.mapKey = message.mapKey);
        message.editMapMessage !== undefined &&
            (obj.editMapMessage = message.editMapMessage ? EditMapMessage.toJSON(message.editMapMessage) : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<EditMapWithKeyMessage>, I>>(object: I): EditMapWithKeyMessage {
        const message = createBaseEditMapWithKeyMessage();
        message.mapKey = object.mapKey ?? "";
        message.editMapMessage =
            object.editMapMessage !== undefined && object.editMapMessage !== null
                ? EditMapMessage.fromPartial(object.editMapMessage)
                : undefined;
        return message;
    },
};

function createBaseEmptyMapMessage(): EmptyMapMessage {
    return { mapKey: "" };
}

export const EmptyMapMessage = {
    encode(message: EmptyMapMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.mapKey !== "") {
            writer.uint32(10).string(message.mapKey);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EmptyMapMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEmptyMapMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.mapKey = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): EmptyMapMessage {
        return { mapKey: isSet(object.mapKey) ? String(object.mapKey) : "" };
    },

    toJSON(message: EmptyMapMessage): unknown {
        const obj: any = {};
        message.mapKey !== undefined && (obj.mapKey = message.mapKey);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<EmptyMapMessage>, I>>(object: I): EmptyMapMessage {
        const message = createBaseEmptyMapMessage();
        message.mapKey = object.mapKey ?? "";
        return message;
    },
};

function createBaseUserJoinedRoomMessage(): UserJoinedRoomMessage {
    return { uuid: "", ipAddress: "", name: "" };
}

export const UserJoinedRoomMessage = {
    encode(message: UserJoinedRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.uuid !== "") {
            writer.uint32(10).string(message.uuid);
        }
        if (message.ipAddress !== "") {
            writer.uint32(18).string(message.ipAddress);
        }
        if (message.name !== "") {
            writer.uint32(26).string(message.name);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserJoinedRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserJoinedRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.uuid = reader.string();
                    break;
                case 2:
                    message.ipAddress = reader.string();
                    break;
                case 3:
                    message.name = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserJoinedRoomMessage {
        return {
            uuid: isSet(object.uuid) ? String(object.uuid) : "",
            ipAddress: isSet(object.ipAddress) ? String(object.ipAddress) : "",
            name: isSet(object.name) ? String(object.name) : "",
        };
    },

    toJSON(message: UserJoinedRoomMessage): unknown {
        const obj: any = {};
        message.uuid !== undefined && (obj.uuid = message.uuid);
        message.ipAddress !== undefined && (obj.ipAddress = message.ipAddress);
        message.name !== undefined && (obj.name = message.name);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserJoinedRoomMessage>, I>>(object: I): UserJoinedRoomMessage {
        const message = createBaseUserJoinedRoomMessage();
        message.uuid = object.uuid ?? "";
        message.ipAddress = object.ipAddress ?? "";
        message.name = object.name ?? "";
        return message;
    },
};

function createBaseUserLeftRoomMessage(): UserLeftRoomMessage {
    return { uuid: "" };
}

export const UserLeftRoomMessage = {
    encode(message: UserLeftRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.uuid !== "") {
            writer.uint32(10).string(message.uuid);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): UserLeftRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseUserLeftRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.uuid = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): UserLeftRoomMessage {
        return { uuid: isSet(object.uuid) ? String(object.uuid) : "" };
    },

    toJSON(message: UserLeftRoomMessage): unknown {
        const obj: any = {};
        message.uuid !== undefined && (obj.uuid = message.uuid);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<UserLeftRoomMessage>, I>>(object: I): UserLeftRoomMessage {
        const message = createBaseUserLeftRoomMessage();
        message.uuid = object.uuid ?? "";
        return message;
    },
};

function createBaseServerToAdminClientMessage(): ServerToAdminClientMessage {
    return { message: undefined };
}

export const ServerToAdminClientMessage = {
    encode(message: ServerToAdminClientMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "userJoinedRoom") {
            UserJoinedRoomMessage.encode(message.message.userJoinedRoom, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "userLeftRoom") {
            UserLeftRoomMessage.encode(message.message.userLeftRoom, writer.uint32(18).fork()).ldelim();
        }
        if (message.message?.$case === "errorMessage") {
            ErrorMessage.encode(message.message.errorMessage, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): ServerToAdminClientMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseServerToAdminClientMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "userJoinedRoom",
                        userJoinedRoom: UserJoinedRoomMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "userLeftRoom",
                        userLeftRoom: UserLeftRoomMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 3:
                    message.message = {
                        $case: "errorMessage",
                        errorMessage: ErrorMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): ServerToAdminClientMessage {
        return {
            message: isSet(object.userJoinedRoom)
                ? { $case: "userJoinedRoom", userJoinedRoom: UserJoinedRoomMessage.fromJSON(object.userJoinedRoom) }
                : isSet(object.userLeftRoom)
                ? { $case: "userLeftRoom", userLeftRoom: UserLeftRoomMessage.fromJSON(object.userLeftRoom) }
                : isSet(object.errorMessage)
                ? { $case: "errorMessage", errorMessage: ErrorMessage.fromJSON(object.errorMessage) }
                : undefined,
        };
    },

    toJSON(message: ServerToAdminClientMessage): unknown {
        const obj: any = {};
        message.message?.$case === "userJoinedRoom" &&
            (obj.userJoinedRoom = message.message?.userJoinedRoom
                ? UserJoinedRoomMessage.toJSON(message.message?.userJoinedRoom)
                : undefined);
        message.message?.$case === "userLeftRoom" &&
            (obj.userLeftRoom = message.message?.userLeftRoom
                ? UserLeftRoomMessage.toJSON(message.message?.userLeftRoom)
                : undefined);
        message.message?.$case === "errorMessage" &&
            (obj.errorMessage = message.message?.errorMessage
                ? ErrorMessage.toJSON(message.message?.errorMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<ServerToAdminClientMessage>, I>>(object: I): ServerToAdminClientMessage {
        const message = createBaseServerToAdminClientMessage();
        if (
            object.message?.$case === "userJoinedRoom" &&
            object.message?.userJoinedRoom !== undefined &&
            object.message?.userJoinedRoom !== null
        ) {
            message.message = {
                $case: "userJoinedRoom",
                userJoinedRoom: UserJoinedRoomMessage.fromPartial(object.message.userJoinedRoom),
            };
        }
        if (
            object.message?.$case === "userLeftRoom" &&
            object.message?.userLeftRoom !== undefined &&
            object.message?.userLeftRoom !== null
        ) {
            message.message = {
                $case: "userLeftRoom",
                userLeftRoom: UserLeftRoomMessage.fromPartial(object.message.userLeftRoom),
            };
        }
        if (
            object.message?.$case === "errorMessage" &&
            object.message?.errorMessage !== undefined &&
            object.message?.errorMessage !== null
        ) {
            message.message = {
                $case: "errorMessage",
                errorMessage: ErrorMessage.fromPartial(object.message.errorMessage),
            };
        }
        return message;
    },
};

function createBaseAdminPusherToBackMessage(): AdminPusherToBackMessage {
    return { message: undefined };
}

export const AdminPusherToBackMessage = {
    encode(message: AdminPusherToBackMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "subscribeToRoom") {
            writer.uint32(10).string(message.message.subscribeToRoom);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): AdminPusherToBackMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseAdminPusherToBackMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = { $case: "subscribeToRoom", subscribeToRoom: reader.string() };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): AdminPusherToBackMessage {
        return {
            message: isSet(object.subscribeToRoom)
                ? { $case: "subscribeToRoom", subscribeToRoom: String(object.subscribeToRoom) }
                : undefined,
        };
    },

    toJSON(message: AdminPusherToBackMessage): unknown {
        const obj: any = {};
        message.message?.$case === "subscribeToRoom" && (obj.subscribeToRoom = message.message?.subscribeToRoom);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<AdminPusherToBackMessage>, I>>(object: I): AdminPusherToBackMessage {
        const message = createBaseAdminPusherToBackMessage();
        if (
            object.message?.$case === "subscribeToRoom" &&
            object.message?.subscribeToRoom !== undefined &&
            object.message?.subscribeToRoom !== null
        ) {
            message.message = { $case: "subscribeToRoom", subscribeToRoom: object.message.subscribeToRoom };
        }
        return message;
    },
};

function createBaseAdminMessage(): AdminMessage {
    return { message: "", recipientUuid: "", roomId: "", type: "" };
}

export const AdminMessage = {
    encode(message: AdminMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message !== "") {
            writer.uint32(10).string(message.message);
        }
        if (message.recipientUuid !== "") {
            writer.uint32(18).string(message.recipientUuid);
        }
        if (message.roomId !== "") {
            writer.uint32(26).string(message.roomId);
        }
        if (message.type !== "") {
            writer.uint32(34).string(message.type);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): AdminMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseAdminMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = reader.string();
                    break;
                case 2:
                    message.recipientUuid = reader.string();
                    break;
                case 3:
                    message.roomId = reader.string();
                    break;
                case 4:
                    message.type = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): AdminMessage {
        return {
            message: isSet(object.message) ? String(object.message) : "",
            recipientUuid: isSet(object.recipientUuid) ? String(object.recipientUuid) : "",
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            type: isSet(object.type) ? String(object.type) : "",
        };
    },

    toJSON(message: AdminMessage): unknown {
        const obj: any = {};
        message.message !== undefined && (obj.message = message.message);
        message.recipientUuid !== undefined && (obj.recipientUuid = message.recipientUuid);
        message.roomId !== undefined && (obj.roomId = message.roomId);
        message.type !== undefined && (obj.type = message.type);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<AdminMessage>, I>>(object: I): AdminMessage {
        const message = createBaseAdminMessage();
        message.message = object.message ?? "";
        message.recipientUuid = object.recipientUuid ?? "";
        message.roomId = object.roomId ?? "";
        message.type = object.type ?? "";
        return message;
    },
};

function createBaseAdminRoomMessage(): AdminRoomMessage {
    return { message: "", roomId: "", type: "" };
}

export const AdminRoomMessage = {
    encode(message: AdminRoomMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message !== "") {
            writer.uint32(10).string(message.message);
        }
        if (message.roomId !== "") {
            writer.uint32(18).string(message.roomId);
        }
        if (message.type !== "") {
            writer.uint32(26).string(message.type);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): AdminRoomMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseAdminRoomMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = reader.string();
                    break;
                case 2:
                    message.roomId = reader.string();
                    break;
                case 3:
                    message.type = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): AdminRoomMessage {
        return {
            message: isSet(object.message) ? String(object.message) : "",
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            type: isSet(object.type) ? String(object.type) : "",
        };
    },

    toJSON(message: AdminRoomMessage): unknown {
        const obj: any = {};
        message.message !== undefined && (obj.message = message.message);
        message.roomId !== undefined && (obj.roomId = message.roomId);
        message.type !== undefined && (obj.type = message.type);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<AdminRoomMessage>, I>>(object: I): AdminRoomMessage {
        const message = createBaseAdminRoomMessage();
        message.message = object.message ?? "";
        message.roomId = object.roomId ?? "";
        message.type = object.type ?? "";
        return message;
    },
};

function createBaseAdminGlobalMessage(): AdminGlobalMessage {
    return { message: "" };
}

export const AdminGlobalMessage = {
    encode(message: AdminGlobalMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message !== "") {
            writer.uint32(10).string(message.message);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): AdminGlobalMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseAdminGlobalMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): AdminGlobalMessage {
        return { message: isSet(object.message) ? String(object.message) : "" };
    },

    toJSON(message: AdminGlobalMessage): unknown {
        const obj: any = {};
        message.message !== undefined && (obj.message = message.message);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<AdminGlobalMessage>, I>>(object: I): AdminGlobalMessage {
        const message = createBaseAdminGlobalMessage();
        message.message = object.message ?? "";
        return message;
    },
};

function createBaseBanMessage(): BanMessage {
    return { recipientUuid: "", roomId: "", type: "", message: "" };
}

export const BanMessage = {
    encode(message: BanMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.recipientUuid !== "") {
            writer.uint32(10).string(message.recipientUuid);
        }
        if (message.roomId !== "") {
            writer.uint32(18).string(message.roomId);
        }
        if (message.type !== "") {
            writer.uint32(26).string(message.type);
        }
        if (message.message !== "") {
            writer.uint32(34).string(message.message);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BanMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBanMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.recipientUuid = reader.string();
                    break;
                case 2:
                    message.roomId = reader.string();
                    break;
                case 3:
                    message.type = reader.string();
                    break;
                case 4:
                    message.message = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): BanMessage {
        return {
            recipientUuid: isSet(object.recipientUuid) ? String(object.recipientUuid) : "",
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            type: isSet(object.type) ? String(object.type) : "",
            message: isSet(object.message) ? String(object.message) : "",
        };
    },

    toJSON(message: BanMessage): unknown {
        const obj: any = {};
        message.recipientUuid !== undefined && (obj.recipientUuid = message.recipientUuid);
        message.roomId !== undefined && (obj.roomId = message.roomId);
        message.type !== undefined && (obj.type = message.type);
        message.message !== undefined && (obj.message = message.message);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<BanMessage>, I>>(object: I): BanMessage {
        const message = createBaseBanMessage();
        message.recipientUuid = object.recipientUuid ?? "";
        message.roomId = object.roomId ?? "";
        message.type = object.type ?? "";
        message.message = object.message ?? "";
        return message;
    },
};

function createBaseRoomDescription(): RoomDescription {
    return { roomId: "", nbUsers: 0 };
}

export const RoomDescription = {
    encode(message: RoomDescription, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.roomId !== "") {
            writer.uint32(10).string(message.roomId);
        }
        if (message.nbUsers !== 0) {
            writer.uint32(16).int32(message.nbUsers);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RoomDescription {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRoomDescription();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomId = reader.string();
                    break;
                case 2:
                    message.nbUsers = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): RoomDescription {
        return {
            roomId: isSet(object.roomId) ? String(object.roomId) : "",
            nbUsers: isSet(object.nbUsers) ? Number(object.nbUsers) : 0,
        };
    },

    toJSON(message: RoomDescription): unknown {
        const obj: any = {};
        message.roomId !== undefined && (obj.roomId = message.roomId);
        message.nbUsers !== undefined && (obj.nbUsers = Math.round(message.nbUsers));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<RoomDescription>, I>>(object: I): RoomDescription {
        const message = createBaseRoomDescription();
        message.roomId = object.roomId ?? "";
        message.nbUsers = object.nbUsers ?? 0;
        return message;
    },
};

function createBaseRoomsList(): RoomsList {
    return { roomDescription: [] };
}

export const RoomsList = {
    encode(message: RoomsList, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        for (const v of message.roomDescription) {
            RoomDescription.encode(v!, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): RoomsList {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseRoomsList();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.roomDescription.push(RoomDescription.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): RoomsList {
        return {
            roomDescription: Array.isArray(object?.roomDescription)
                ? object.roomDescription.map((e: any) => RoomDescription.fromJSON(e))
                : [],
        };
    },

    toJSON(message: RoomsList): unknown {
        const obj: any = {};
        if (message.roomDescription) {
            obj.roomDescription = message.roomDescription.map((e) => (e ? RoomDescription.toJSON(e) : undefined));
        } else {
            obj.roomDescription = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<RoomsList>, I>>(object: I): RoomsList {
        const message = createBaseRoomsList();
        message.roomDescription = object.roomDescription?.map((e) => RoomDescription.fromPartial(e)) || [];
        return message;
    },
};

function createBaseEmptyMessage(): EmptyMessage {
    return {};
}

export const EmptyMessage = {
    encode(_: EmptyMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): EmptyMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseEmptyMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(_: any): EmptyMessage {
        return {};
    },

    toJSON(_: EmptyMessage): unknown {
        const obj: any = {};
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<EmptyMessage>, I>>(_: I): EmptyMessage {
        const message = createBaseEmptyMessage();
        return message;
    },
};

function createBaseIframeToPusherMessage(): IframeToPusherMessage {
    return { message: undefined };
}

export const IframeToPusherMessage = {
    encode(message: IframeToPusherMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "xmppMessage") {
            XmppMessage.encode(message.message.xmppMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "banUserByUuidMessage") {
            BanUserByUuidMessage.encode(message.message.banUserByUuidMessage, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): IframeToPusherMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseIframeToPusherMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "xmppMessage",
                        xmppMessage: XmppMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "banUserByUuidMessage",
                        banUserByUuidMessage: BanUserByUuidMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): IframeToPusherMessage {
        return {
            message: isSet(object.xmppMessage)
                ? { $case: "xmppMessage", xmppMessage: XmppMessage.fromJSON(object.xmppMessage) }
                : isSet(object.banUserByUuidMessage)
                ? {
                      $case: "banUserByUuidMessage",
                      banUserByUuidMessage: BanUserByUuidMessage.fromJSON(object.banUserByUuidMessage),
                  }
                : undefined,
        };
    },

    toJSON(message: IframeToPusherMessage): unknown {
        const obj: any = {};
        message.message?.$case === "xmppMessage" &&
            (obj.xmppMessage = message.message?.xmppMessage
                ? XmppMessage.toJSON(message.message?.xmppMessage)
                : undefined);
        message.message?.$case === "banUserByUuidMessage" &&
            (obj.banUserByUuidMessage = message.message?.banUserByUuidMessage
                ? BanUserByUuidMessage.toJSON(message.message?.banUserByUuidMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<IframeToPusherMessage>, I>>(object: I): IframeToPusherMessage {
        const message = createBaseIframeToPusherMessage();
        if (
            object.message?.$case === "xmppMessage" &&
            object.message?.xmppMessage !== undefined &&
            object.message?.xmppMessage !== null
        ) {
            message.message = {
                $case: "xmppMessage",
                xmppMessage: XmppMessage.fromPartial(object.message.xmppMessage),
            };
        }
        if (
            object.message?.$case === "banUserByUuidMessage" &&
            object.message?.banUserByUuidMessage !== undefined &&
            object.message?.banUserByUuidMessage !== null
        ) {
            message.message = {
                $case: "banUserByUuidMessage",
                banUserByUuidMessage: BanUserByUuidMessage.fromPartial(object.message.banUserByUuidMessage),
            };
        }
        return message;
    },
};

function createBasePusherToIframeMessage(): PusherToIframeMessage {
    return { message: undefined };
}

export const PusherToIframeMessage = {
    encode(message: PusherToIframeMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.message?.$case === "xmppSettingsMessage") {
            XmppSettingsMessage.encode(message.message.xmppSettingsMessage, writer.uint32(10).fork()).ldelim();
        }
        if (message.message?.$case === "xmppConnectionStatusChangeMessage") {
            XmppConnectionStatusChangeMessage.encode(
                message.message.xmppConnectionStatusChangeMessage,
                writer.uint32(18).fork()
            ).ldelim();
        }
        if (message.message?.$case === "xmppMessage") {
            XmppMessage.encode(message.message.xmppMessage, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): PusherToIframeMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBasePusherToIframeMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.message = {
                        $case: "xmppSettingsMessage",
                        xmppSettingsMessage: XmppSettingsMessage.decode(reader, reader.uint32()),
                    };
                    break;
                case 2:
                    message.message = {
                        $case: "xmppConnectionStatusChangeMessage",
                        xmppConnectionStatusChangeMessage: XmppConnectionStatusChangeMessage.decode(
                            reader,
                            reader.uint32()
                        ),
                    };
                    break;
                case 3:
                    message.message = {
                        $case: "xmppMessage",
                        xmppMessage: XmppMessage.decode(reader, reader.uint32()),
                    };
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): PusherToIframeMessage {
        return {
            message: isSet(object.xmppSettingsMessage)
                ? {
                      $case: "xmppSettingsMessage",
                      xmppSettingsMessage: XmppSettingsMessage.fromJSON(object.xmppSettingsMessage),
                  }
                : isSet(object.xmppConnectionStatusChangeMessage)
                ? {
                      $case: "xmppConnectionStatusChangeMessage",
                      xmppConnectionStatusChangeMessage: XmppConnectionStatusChangeMessage.fromJSON(
                          object.xmppConnectionStatusChangeMessage
                      ),
                  }
                : isSet(object.xmppMessage)
                ? { $case: "xmppMessage", xmppMessage: XmppMessage.fromJSON(object.xmppMessage) }
                : undefined,
        };
    },

    toJSON(message: PusherToIframeMessage): unknown {
        const obj: any = {};
        message.message?.$case === "xmppSettingsMessage" &&
            (obj.xmppSettingsMessage = message.message?.xmppSettingsMessage
                ? XmppSettingsMessage.toJSON(message.message?.xmppSettingsMessage)
                : undefined);
        message.message?.$case === "xmppConnectionStatusChangeMessage" &&
            (obj.xmppConnectionStatusChangeMessage = message.message?.xmppConnectionStatusChangeMessage
                ? XmppConnectionStatusChangeMessage.toJSON(message.message?.xmppConnectionStatusChangeMessage)
                : undefined);
        message.message?.$case === "xmppMessage" &&
            (obj.xmppMessage = message.message?.xmppMessage
                ? XmppMessage.toJSON(message.message?.xmppMessage)
                : undefined);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<PusherToIframeMessage>, I>>(object: I): PusherToIframeMessage {
        const message = createBasePusherToIframeMessage();
        if (
            object.message?.$case === "xmppSettingsMessage" &&
            object.message?.xmppSettingsMessage !== undefined &&
            object.message?.xmppSettingsMessage !== null
        ) {
            message.message = {
                $case: "xmppSettingsMessage",
                xmppSettingsMessage: XmppSettingsMessage.fromPartial(object.message.xmppSettingsMessage),
            };
        }
        if (
            object.message?.$case === "xmppConnectionStatusChangeMessage" &&
            object.message?.xmppConnectionStatusChangeMessage !== undefined &&
            object.message?.xmppConnectionStatusChangeMessage !== null
        ) {
            message.message = {
                $case: "xmppConnectionStatusChangeMessage",
                xmppConnectionStatusChangeMessage: XmppConnectionStatusChangeMessage.fromPartial(
                    object.message.xmppConnectionStatusChangeMessage
                ),
            };
        }
        if (
            object.message?.$case === "xmppMessage" &&
            object.message?.xmppMessage !== undefined &&
            object.message?.xmppMessage !== null
        ) {
            message.message = {
                $case: "xmppMessage",
                xmppMessage: XmppMessage.fromPartial(object.message.xmppMessage),
            };
        }
        return message;
    },
};

function createBaseMucRoomDefinitionMessage(): MucRoomDefinitionMessage {
    return { url: "", name: "", type: "", subscribe: false };
}

export const MucRoomDefinitionMessage = {
    encode(message: MucRoomDefinitionMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.url !== "") {
            writer.uint32(10).string(message.url);
        }
        if (message.name !== "") {
            writer.uint32(18).string(message.name);
        }
        if (message.type !== "") {
            writer.uint32(26).string(message.type);
        }
        if (message.subscribe === true) {
            writer.uint32(32).bool(message.subscribe);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): MucRoomDefinitionMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseMucRoomDefinitionMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.url = reader.string();
                    break;
                case 2:
                    message.name = reader.string();
                    break;
                case 3:
                    message.type = reader.string();
                    break;
                case 4:
                    message.subscribe = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): MucRoomDefinitionMessage {
        return {
            url: isSet(object.url) ? String(object.url) : "",
            name: isSet(object.name) ? String(object.name) : "",
            type: isSet(object.type) ? String(object.type) : "",
            subscribe: isSet(object.subscribe) ? Boolean(object.subscribe) : false,
        };
    },

    toJSON(message: MucRoomDefinitionMessage): unknown {
        const obj: any = {};
        message.url !== undefined && (obj.url = message.url);
        message.name !== undefined && (obj.name = message.name);
        message.type !== undefined && (obj.type = message.type);
        message.subscribe !== undefined && (obj.subscribe = message.subscribe);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<MucRoomDefinitionMessage>, I>>(object: I): MucRoomDefinitionMessage {
        const message = createBaseMucRoomDefinitionMessage();
        message.url = object.url ?? "";
        message.name = object.name ?? "";
        message.type = object.type ?? "";
        message.subscribe = object.subscribe ?? false;
        return message;
    },
};

function createBaseXmppSettingsMessage(): XmppSettingsMessage {
    return { jid: "", conferenceDomain: "", rooms: [] };
}

export const XmppSettingsMessage = {
    encode(message: XmppSettingsMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.jid !== "") {
            writer.uint32(10).string(message.jid);
        }
        if (message.conferenceDomain !== "") {
            writer.uint32(18).string(message.conferenceDomain);
        }
        for (const v of message.rooms) {
            MucRoomDefinitionMessage.encode(v!, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): XmppSettingsMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseXmppSettingsMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.jid = reader.string();
                    break;
                case 2:
                    message.conferenceDomain = reader.string();
                    break;
                case 3:
                    message.rooms.push(MucRoomDefinitionMessage.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): XmppSettingsMessage {
        return {
            jid: isSet(object.jid) ? String(object.jid) : "",
            conferenceDomain: isSet(object.conferenceDomain) ? String(object.conferenceDomain) : "",
            rooms: Array.isArray(object?.rooms)
                ? object.rooms.map((e: any) => MucRoomDefinitionMessage.fromJSON(e))
                : [],
        };
    },

    toJSON(message: XmppSettingsMessage): unknown {
        const obj: any = {};
        message.jid !== undefined && (obj.jid = message.jid);
        message.conferenceDomain !== undefined && (obj.conferenceDomain = message.conferenceDomain);
        if (message.rooms) {
            obj.rooms = message.rooms.map((e) => (e ? MucRoomDefinitionMessage.toJSON(e) : undefined));
        } else {
            obj.rooms = [];
        }
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<XmppSettingsMessage>, I>>(object: I): XmppSettingsMessage {
        const message = createBaseXmppSettingsMessage();
        message.jid = object.jid ?? "";
        message.conferenceDomain = object.conferenceDomain ?? "";
        message.rooms = object.rooms?.map((e) => MucRoomDefinitionMessage.fromPartial(e)) || [];
        return message;
    },
};

function createBaseXmppConnectionStatusChangeMessage(): XmppConnectionStatusChangeMessage {
    return { status: 0 };
}

export const XmppConnectionStatusChangeMessage = {
    encode(message: XmppConnectionStatusChangeMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.status !== 0) {
            writer.uint32(8).int32(message.status);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): XmppConnectionStatusChangeMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseXmppConnectionStatusChangeMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.status = reader.int32() as any;
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): XmppConnectionStatusChangeMessage {
        return { status: isSet(object.status) ? xmppConnectionStatusChangeMessage_StatusFromJSON(object.status) : 0 };
    },

    toJSON(message: XmppConnectionStatusChangeMessage): unknown {
        const obj: any = {};
        message.status !== undefined && (obj.status = xmppConnectionStatusChangeMessage_StatusToJSON(message.status));
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<XmppConnectionStatusChangeMessage>, I>>(
        object: I
    ): XmppConnectionStatusChangeMessage {
        const message = createBaseXmppConnectionStatusChangeMessage();
        message.status = object.status ?? 0;
        return message;
    },
};

function createBaseBanUserByUuidMessage(): BanUserByUuidMessage {
    return { playUri: "", uuidToBan: "", name: "", message: "", byUserEmail: "" };
}

export const BanUserByUuidMessage = {
    encode(message: BanUserByUuidMessage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
        if (message.playUri !== "") {
            writer.uint32(10).string(message.playUri);
        }
        if (message.uuidToBan !== "") {
            writer.uint32(18).string(message.uuidToBan);
        }
        if (message.name !== "") {
            writer.uint32(26).string(message.name);
        }
        if (message.message !== "") {
            writer.uint32(34).string(message.message);
        }
        if (message.byUserEmail !== "") {
            writer.uint32(42).string(message.byUserEmail);
        }
        return writer;
    },

    decode(input: _m0.Reader | Uint8Array, length?: number): BanUserByUuidMessage {
        const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        let end = length === undefined ? reader.len : reader.pos + length;
        const message = createBaseBanUserByUuidMessage();
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.playUri = reader.string();
                    break;
                case 2:
                    message.uuidToBan = reader.string();
                    break;
                case 3:
                    message.name = reader.string();
                    break;
                case 4:
                    message.message = reader.string();
                    break;
                case 5:
                    message.byUserEmail = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },

    fromJSON(object: any): BanUserByUuidMessage {
        return {
            playUri: isSet(object.playUri) ? String(object.playUri) : "",
            uuidToBan: isSet(object.uuidToBan) ? String(object.uuidToBan) : "",
            name: isSet(object.name) ? String(object.name) : "",
            message: isSet(object.message) ? String(object.message) : "",
            byUserEmail: isSet(object.byUserEmail) ? String(object.byUserEmail) : "",
        };
    },

    toJSON(message: BanUserByUuidMessage): unknown {
        const obj: any = {};
        message.playUri !== undefined && (obj.playUri = message.playUri);
        message.uuidToBan !== undefined && (obj.uuidToBan = message.uuidToBan);
        message.name !== undefined && (obj.name = message.name);
        message.message !== undefined && (obj.message = message.message);
        message.byUserEmail !== undefined && (obj.byUserEmail = message.byUserEmail);
        return obj;
    },

    fromPartial<I extends Exact<DeepPartial<BanUserByUuidMessage>, I>>(object: I): BanUserByUuidMessage {
        const message = createBaseBanUserByUuidMessage();
        message.playUri = object.playUri ?? "";
        message.uuidToBan = object.uuidToBan ?? "";
        message.name = object.name ?? "";
        message.message = object.message ?? "";
        message.byUserEmail = object.byUserEmail ?? "";
        return message;
    },
};

/** Service handled by the "back". Pusher servers connect to this service. */
export type RoomManagerService = typeof RoomManagerService;
export const RoomManagerService = {
    /** Holds a connection between one given client and the back */
    joinRoom: {
        path: "/workadventure.RoomManager/joinRoom",
        requestStream: true,
        responseStream: true,
        requestSerialize: (value: PusherToBackMessage) => Buffer.from(PusherToBackMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => PusherToBackMessage.decode(value),
        responseSerialize: (value: ServerToClientMessage) => Buffer.from(ServerToClientMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => ServerToClientMessage.decode(value),
    },
    /** Connection used to send to a pusher messages related to a given zone of a given room */
    listenZone: {
        path: "/workadventure.RoomManager/listenZone",
        requestStream: false,
        responseStream: true,
        requestSerialize: (value: ZoneMessage) => Buffer.from(ZoneMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => ZoneMessage.decode(value),
        responseSerialize: (value: BatchToPusherMessage) => Buffer.from(BatchToPusherMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => BatchToPusherMessage.decode(value),
    },
    /** Connection used to send to a pusher messages related to a given room */
    listenRoom: {
        path: "/workadventure.RoomManager/listenRoom",
        requestStream: false,
        responseStream: true,
        requestSerialize: (value: RoomMessage) => Buffer.from(RoomMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => RoomMessage.decode(value),
        responseSerialize: (value: BatchToPusherRoomMessage) =>
            Buffer.from(BatchToPusherRoomMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => BatchToPusherRoomMessage.decode(value),
    },
    adminRoom: {
        path: "/workadventure.RoomManager/adminRoom",
        requestStream: true,
        responseStream: true,
        requestSerialize: (value: AdminPusherToBackMessage) =>
            Buffer.from(AdminPusherToBackMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => AdminPusherToBackMessage.decode(value),
        responseSerialize: (value: ServerToAdminClientMessage) =>
            Buffer.from(ServerToAdminClientMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => ServerToAdminClientMessage.decode(value),
    },
    sendAdminMessage: {
        path: "/workadventure.RoomManager/sendAdminMessage",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: AdminMessage) => Buffer.from(AdminMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => AdminMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
    sendGlobalAdminMessage: {
        path: "/workadventure.RoomManager/sendGlobalAdminMessage",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: AdminGlobalMessage) => Buffer.from(AdminGlobalMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => AdminGlobalMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
    ban: {
        path: "/workadventure.RoomManager/ban",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: BanMessage) => Buffer.from(BanMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => BanMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
    sendAdminMessageToRoom: {
        path: "/workadventure.RoomManager/sendAdminMessageToRoom",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: AdminRoomMessage) => Buffer.from(AdminRoomMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => AdminRoomMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
    sendWorldFullWarningToRoom: {
        path: "/workadventure.RoomManager/sendWorldFullWarningToRoom",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: WorldFullWarningToRoomMessage) =>
            Buffer.from(WorldFullWarningToRoomMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => WorldFullWarningToRoomMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
    sendRefreshRoomPrompt: {
        path: "/workadventure.RoomManager/sendRefreshRoomPrompt",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: RefreshRoomPromptMessage) =>
            Buffer.from(RefreshRoomPromptMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => RefreshRoomPromptMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
    getRooms: {
        path: "/workadventure.RoomManager/getRooms",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => EmptyMessage.decode(value),
        responseSerialize: (value: RoomsList) => Buffer.from(RoomsList.encode(value).finish()),
        responseDeserialize: (value: Buffer) => RoomsList.decode(value),
    },
    ping: {
        path: "/workadventure.RoomManager/ping",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => PingMessage.decode(value),
        responseSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => PingMessage.decode(value),
    },
} as const;

export interface RoomManagerServer extends UntypedServiceImplementation {
    /** Holds a connection between one given client and the back */
    joinRoom: handleBidiStreamingCall<PusherToBackMessage, ServerToClientMessage>;
    /** Connection used to send to a pusher messages related to a given zone of a given room */
    listenZone: handleServerStreamingCall<ZoneMessage, BatchToPusherMessage>;
    /** Connection used to send to a pusher messages related to a given room */
    listenRoom: handleServerStreamingCall<RoomMessage, BatchToPusherRoomMessage>;
    adminRoom: handleBidiStreamingCall<AdminPusherToBackMessage, ServerToAdminClientMessage>;
    sendAdminMessage: handleUnaryCall<AdminMessage, EmptyMessage>;
    sendGlobalAdminMessage: handleUnaryCall<AdminGlobalMessage, EmptyMessage>;
    ban: handleUnaryCall<BanMessage, EmptyMessage>;
    sendAdminMessageToRoom: handleUnaryCall<AdminRoomMessage, EmptyMessage>;
    sendWorldFullWarningToRoom: handleUnaryCall<WorldFullWarningToRoomMessage, EmptyMessage>;
    sendRefreshRoomPrompt: handleUnaryCall<RefreshRoomPromptMessage, EmptyMessage>;
    getRooms: handleUnaryCall<EmptyMessage, RoomsList>;
    ping: handleUnaryCall<PingMessage, PingMessage>;
}

export interface RoomManagerClient extends Client {
    /** Holds a connection between one given client and the back */
    joinRoom(): ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
    joinRoom(options: Partial<CallOptions>): ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
    joinRoom(
        metadata: Metadata,
        options?: Partial<CallOptions>
    ): ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
    /** Connection used to send to a pusher messages related to a given zone of a given room */
    listenZone(request: ZoneMessage, options?: Partial<CallOptions>): ClientReadableStream<BatchToPusherMessage>;
    listenZone(
        request: ZoneMessage,
        metadata?: Metadata,
        options?: Partial<CallOptions>
    ): ClientReadableStream<BatchToPusherMessage>;
    /** Connection used to send to a pusher messages related to a given room */
    listenRoom(request: RoomMessage, options?: Partial<CallOptions>): ClientReadableStream<BatchToPusherRoomMessage>;
    listenRoom(
        request: RoomMessage,
        metadata?: Metadata,
        options?: Partial<CallOptions>
    ): ClientReadableStream<BatchToPusherRoomMessage>;
    adminRoom(): ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
    adminRoom(options: Partial<CallOptions>): ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
    adminRoom(
        metadata: Metadata,
        options?: Partial<CallOptions>
    ): ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
    sendAdminMessage(
        request: AdminMessage,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendAdminMessage(
        request: AdminMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendAdminMessage(
        request: AdminMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendGlobalAdminMessage(
        request: AdminGlobalMessage,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendGlobalAdminMessage(
        request: AdminGlobalMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendGlobalAdminMessage(
        request: AdminGlobalMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    ban(request: BanMessage, callback: (error: ServiceError | null, response: EmptyMessage) => void): ClientUnaryCall;
    ban(
        request: BanMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    ban(
        request: BanMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendAdminMessageToRoom(
        request: AdminRoomMessage,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendAdminMessageToRoom(
        request: AdminRoomMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendAdminMessageToRoom(
        request: AdminRoomMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendWorldFullWarningToRoom(
        request: WorldFullWarningToRoomMessage,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendWorldFullWarningToRoom(
        request: WorldFullWarningToRoomMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendWorldFullWarningToRoom(
        request: WorldFullWarningToRoomMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendRefreshRoomPrompt(
        request: RefreshRoomPromptMessage,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendRefreshRoomPrompt(
        request: RefreshRoomPromptMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    sendRefreshRoomPrompt(
        request: RefreshRoomPromptMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    getRooms(
        request: EmptyMessage,
        callback: (error: ServiceError | null, response: RoomsList) => void
    ): ClientUnaryCall;
    getRooms(
        request: EmptyMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: RoomsList) => void
    ): ClientUnaryCall;
    getRooms(
        request: EmptyMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: RoomsList) => void
    ): ClientUnaryCall;
    ping(request: PingMessage, callback: (error: ServiceError | null, response: PingMessage) => void): ClientUnaryCall;
    ping(
        request: PingMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: PingMessage) => void
    ): ClientUnaryCall;
    ping(
        request: PingMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: PingMessage) => void
    ): ClientUnaryCall;
}

export const RoomManagerClient = makeGenericClientConstructor(
    RoomManagerService,
    "workadventure.RoomManager"
) as unknown as {
    new (address: string, credentials: ChannelCredentials, options?: Partial<ChannelOptions>): RoomManagerClient;
    service: typeof RoomManagerService;
};

/** Service handled by the "map-storage". Back servers connect to this service. */
export type MapStorageService = typeof MapStorageService;
export const MapStorageService = {
    ping: {
        path: "/workadventure.MapStorage/ping",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => PingMessage.decode(value),
        responseSerialize: (value: PingMessage) => Buffer.from(PingMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => PingMessage.decode(value),
    },
    handleEditMapWithKeyMessage: {
        path: "/workadventure.MapStorage/handleEditMapWithKeyMessage",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: EditMapWithKeyMessage) => Buffer.from(EditMapWithKeyMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => EditMapWithKeyMessage.decode(value),
        responseSerialize: (value: EditMapMessage) => Buffer.from(EditMapMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EditMapMessage.decode(value),
    },
    handleNoUsersOnTheMap: {
        path: "/workadventure.MapStorage/handleNoUsersOnTheMap",
        requestStream: false,
        responseStream: false,
        requestSerialize: (value: EmptyMapMessage) => Buffer.from(EmptyMapMessage.encode(value).finish()),
        requestDeserialize: (value: Buffer) => EmptyMapMessage.decode(value),
        responseSerialize: (value: EmptyMessage) => Buffer.from(EmptyMessage.encode(value).finish()),
        responseDeserialize: (value: Buffer) => EmptyMessage.decode(value),
    },
} as const;

export interface MapStorageServer extends UntypedServiceImplementation {
    ping: handleUnaryCall<PingMessage, PingMessage>;
    handleEditMapWithKeyMessage: handleUnaryCall<EditMapWithKeyMessage, EditMapMessage>;
    handleNoUsersOnTheMap: handleUnaryCall<EmptyMapMessage, EmptyMessage>;
}

export interface MapStorageClient extends Client {
    ping(request: PingMessage, callback: (error: ServiceError | null, response: PingMessage) => void): ClientUnaryCall;
    ping(
        request: PingMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: PingMessage) => void
    ): ClientUnaryCall;
    ping(
        request: PingMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: PingMessage) => void
    ): ClientUnaryCall;
    handleEditMapWithKeyMessage(
        request: EditMapWithKeyMessage,
        callback: (error: ServiceError | null, response: EditMapMessage) => void
    ): ClientUnaryCall;
    handleEditMapWithKeyMessage(
        request: EditMapWithKeyMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EditMapMessage) => void
    ): ClientUnaryCall;
    handleEditMapWithKeyMessage(
        request: EditMapWithKeyMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EditMapMessage) => void
    ): ClientUnaryCall;
    handleNoUsersOnTheMap(
        request: EmptyMapMessage,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    handleNoUsersOnTheMap(
        request: EmptyMapMessage,
        metadata: Metadata,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
    handleNoUsersOnTheMap(
        request: EmptyMapMessage,
        metadata: Metadata,
        options: Partial<CallOptions>,
        callback: (error: ServiceError | null, response: EmptyMessage) => void
    ): ClientUnaryCall;
}

export const MapStorageClient = makeGenericClientConstructor(
    MapStorageService,
    "workadventure.MapStorage"
) as unknown as {
    new (address: string, credentials: ChannelCredentials, options?: Partial<ChannelOptions>): MapStorageClient;
    service: typeof MapStorageService;
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin
    ? T
    : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends { $case: string }
    ? { [K in keyof Omit<T, "$case">]?: DeepPartial<T[K]> } & { $case: T["$case"] }
    : T extends {}
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
    ? P
    : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isObject(value: any): boolean {
    return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
    return value !== null && value !== undefined;
}
