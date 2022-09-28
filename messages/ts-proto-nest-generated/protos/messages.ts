/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from "@nestjs/microservices";
import { util, configure } from "protobufjs/minimal";
import * as Long from "long";
import { Observable } from "rxjs";

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
    x: number | undefined;
    y: number | undefined;
    width: number | undefined;
    height: number | undefined;
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
        | { $case: "joinBBBMeetingQuery"; joinBBBMeetingQuery: JoinBBBMeetingQuery };
}

export interface JitsiJwtQuery {
    jitsiRoom: string;
}

export interface JoinBBBMeetingQuery {
    /** a hash of domain, instance and localMeetingId */
    meetingId: string;
    /** bbbMeeting field from the map */
    localMeetingId: string;
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
        | { $case: "joinBBBMeetingAnswer"; joinBBBMeetingAnswer: JoinBBBMeetingAnswer };
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
        | { $case: "editMapMessage"; editMapMessage: EditMapMessage };
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
        | { $case: "errorMessage"; errorMessage: ErrorMessage }
        | { $case: "editMapMessage"; editMapMessage: EditMapMessage }
        | { $case: "joinMucRoomMessage"; joinMucRoomMessage: JoinMucRoomMessage }
        | { $case: "leaveMucRoomMessage"; leaveMucRoomMessage: LeaveMucRoomMessage };
}

export interface EditMapMessage {
    message?: { $case: "modifyAreaMessage"; modifyAreaMessage: ModifyAreaMessage };
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
        | { $case: "userLeftRoom"; userLeftRoom: UserLeftRoomMessage }
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

export interface SubChatMessage {
    message?:
        | { $case: "joinMucRoomMessage"; joinMucRoomMessage: JoinMucRoomMessage }
        | { $case: "leaveMucRoomMessage"; leaveMucRoomMessage: LeaveMucRoomMessage };
}

export interface BatchChatMessage {
    event: string;
    payload: SubChatMessage[];
}

export interface ChatMessagePrompt {
    roomId: string;
    message?:
        | { $case: "joinMucRoomMessage"; joinMucRoomMessage: JoinMucRoomMessage }
        | { $case: "leaveMucRoomMessage"; leaveMucRoomMessage: LeaveMucRoomMessage };
}

export interface JoinMucRoomMessage {
    mucRoomDefinitionMessage: MucRoomDefinitionMessage | undefined;
}

export interface LeaveMucRoomMessage {
    url: string;
}

export interface IframeToPusherMessage {
    message?:
        | { $case: "xmppMessage"; xmppMessage: XmppMessage }
        | { $case: "banUserByUuidMessage"; banUserByUuidMessage: BanUserByUuidMessage };
}

export interface PusherToIframeMessage {
    message?:
        | { $case: "batchChatMessage"; batchChatMessage: BatchChatMessage }
        | { $case: "xmppSettingsMessage"; xmppSettingsMessage: XmppSettingsMessage }
        | {
              $case: "xmppConnectionStatusChangeMessage";
              xmppConnectionStatusChangeMessage: XmppConnectionStatusChangeMessage;
          }
        | { $case: "xmppMessage"; xmppMessage: XmppMessage }
        | { $case: "xmppConnectionNotAuthorized"; xmppConnectionNotAuthorized: XmppConnectionNotAuthorizedMessage }
        | { $case: "errorMessage"; errorMessage: ErrorMessage };
}

export interface MucRoomDefinitionMessage {
    url: string;
    name: string;
    type: string;
    subscribe: boolean | undefined;
}

export interface XmppSettingsMessage {
    jid: string;
    conferenceDomain: string;
    rooms: MucRoomDefinitionMessage[];
}

export interface XmppConnectionNotAuthorizedMessage {}

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

export interface BanUserByUuidMessage {
    playUri: string;
    uuidToBan: string;
    name: string;
    message: string;
    byUserEmail: string;
}

export const WORKADVENTURE_PACKAGE_NAME = "workadventure";

/** Service handled by the "back". Pusher servers connect to this service. */

export interface RoomManagerClient {
    /** Holds a connection between one given client and the back */

    joinRoom(request: Observable<PusherToBackMessage>): Observable<ServerToClientMessage>;

    /** Connection used to send to a pusher messages related to a given zone of a given room */

    listenZone(request: ZoneMessage): Observable<BatchToPusherMessage>;

    /** Connection used to send to a pusher messages related to a given room */

    listenRoom(request: RoomMessage): Observable<BatchToPusherRoomMessage>;

    adminRoom(request: Observable<AdminPusherToBackMessage>): Observable<ServerToAdminClientMessage>;

    sendAdminMessage(request: AdminMessage): Observable<EmptyMessage>;

    sendGlobalAdminMessage(request: AdminGlobalMessage): Observable<EmptyMessage>;

    ban(request: BanMessage): Observable<EmptyMessage>;

    sendAdminMessageToRoom(request: AdminRoomMessage): Observable<EmptyMessage>;

    sendWorldFullWarningToRoom(request: WorldFullWarningToRoomMessage): Observable<EmptyMessage>;

    sendRefreshRoomPrompt(request: RefreshRoomPromptMessage): Observable<EmptyMessage>;

    sendChatMessagePrompt(request: ChatMessagePrompt): Observable<EmptyMessage>;

    getRooms(request: EmptyMessage): Observable<RoomsList>;

    ping(request: PingMessage): Observable<PingMessage>;
}

/** Service handled by the "back". Pusher servers connect to this service. */

export interface RoomManagerController {
    /** Holds a connection between one given client and the back */

    joinRoom(request: Observable<PusherToBackMessage>): Observable<ServerToClientMessage>;

    /** Connection used to send to a pusher messages related to a given zone of a given room */

    listenZone(request: ZoneMessage): Observable<BatchToPusherMessage>;

    /** Connection used to send to a pusher messages related to a given room */

    listenRoom(request: RoomMessage): Observable<BatchToPusherRoomMessage>;

    adminRoom(request: Observable<AdminPusherToBackMessage>): Observable<ServerToAdminClientMessage>;

    sendAdminMessage(request: AdminMessage): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    sendGlobalAdminMessage(
        request: AdminGlobalMessage
    ): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    ban(request: BanMessage): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    sendAdminMessageToRoom(request: AdminRoomMessage): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    sendWorldFullWarningToRoom(
        request: WorldFullWarningToRoomMessage
    ): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    sendRefreshRoomPrompt(
        request: RefreshRoomPromptMessage
    ): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    sendChatMessagePrompt(request: ChatMessagePrompt): Promise<EmptyMessage> | Observable<EmptyMessage> | EmptyMessage;

    getRooms(request: EmptyMessage): Promise<RoomsList> | Observable<RoomsList> | RoomsList;

    ping(request: PingMessage): Promise<PingMessage> | Observable<PingMessage> | PingMessage;
}

export function RoomManagerControllerMethods() {
    return function (constructor: Function) {
        const grpcMethods: string[] = [
            "listenZone",
            "listenRoom",
            "sendAdminMessage",
            "sendGlobalAdminMessage",
            "ban",
            "sendAdminMessageToRoom",
            "sendWorldFullWarningToRoom",
            "sendRefreshRoomPrompt",
            "sendChatMessagePrompt",
            "getRooms",
            "ping",
        ];
        for (const method of grpcMethods) {
            const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
            GrpcMethod("RoomManager", method)(constructor.prototype[method], method, descriptor);
        }
        const grpcStreamMethods: string[] = ["joinRoom", "adminRoom"];
        for (const method of grpcStreamMethods) {
            const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
            GrpcStreamMethod("RoomManager", method)(constructor.prototype[method], method, descriptor);
        }
    };
}

export const ROOM_MANAGER_SERVICE_NAME = "RoomManager";

/** Service handled by the "map-storage". Back servers connect to this service. */

export interface MapStorageClient {
    ping(request: PingMessage): Observable<PingMessage>;
}

/** Service handled by the "map-storage". Back servers connect to this service. */

export interface MapStorageController {
    ping(request: PingMessage): Promise<PingMessage> | Observable<PingMessage> | PingMessage;
}

export function MapStorageControllerMethods() {
    return function (constructor: Function) {
        const grpcMethods: string[] = ["ping"];
        for (const method of grpcMethods) {
            const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
            GrpcMethod("MapStorage", method)(constructor.prototype[method], method, descriptor);
        }
        const grpcStreamMethods: string[] = [];
        for (const method of grpcStreamMethods) {
            const descriptor: any = Reflect.getOwnPropertyDescriptor(constructor.prototype, method);
            GrpcStreamMethod("MapStorage", method)(constructor.prototype[method], method, descriptor);
        }
    };
}

export const MAP_STORAGE_SERVICE_NAME = "MapStorage";

// If you get a compile-error about 'Constructor<Long> and ... have no overlap',
// add '--ts_proto_opt=esModuleInterop=true' as a flag when calling 'protoc'.
if (util.Long !== Long) {
    util.Long = Long as any;
    configure();
}
