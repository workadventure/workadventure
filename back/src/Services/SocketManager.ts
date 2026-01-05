import crypto from "crypto";
import type {
    ZoneMessage,
    AskPositionMessage,
    BanUserMessage,
    BatchToPusherRoomMessage,
    EditMapCommandMessage,
    EditMapCommandsArrayMessage,
    EmoteEventMessage,
    EmotePromptMessage,
    FollowAbortMessage,
    FollowConfirmationMessage,
    FollowRequestMessage,
    ItemEventMessage,
    ItemStateMessage,
    JitsiJwtAnswer,
    JitsiJwtQuery,
    JoinBBBMeetingAnswer,
    JoinBBBMeetingQuery,
    JoinRoomMessage,
    KickOffMessage,
    LockGroupPromptMessage,
    PlayerDetailsUpdatedMessage,
    QueryMessage,
    RoomDescription,
    RoomsList,
    SendEventQuery,
    SendUserMessage,
    SetPlayerDetailsMessage,
    SubToPusherRoomMessage,
    UpdateMapToNewestWithKeyMessage,
    UpdateSpaceMetadataMessage,
    UpdateSpaceUserMessage,
    UserMovesMessage,
    VariableMessage,
    Zone as ProtoZone,
    PublicEvent,
    PrivateEvent,
    LeaveSpaceMessage,
    JoinSpaceMessage,
    ExternalModuleMessage,
    SyncSpaceUsersMessage,
    SpaceQueryMessage,
    AddSpaceUserToNotifyMessage,
    DeleteSpaceUserToNotifyMessage,
    AbortQueryMessage,
} from "@workadventure/messages";
import {
    AnswerMessage,
    RoomJoinedMessage,
    UserJoinedZoneMessage,
    FilterType,
    AskPositionMessage_AskType,
} from "@workadventure/messages";
import Jwt from "jsonwebtoken";
import BigbluebuttonJs from "bigbluebutton-js";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { WAMSettingsUtils } from "@workadventure/map-editor";
import { z } from "zod";
import type { ServiceError } from "@grpc/grpc-js";
import { asError } from "catch-unknown";
import { GameRoom } from "../Model/GameRoom";
import type { UserSocket } from "../Model/User";
import { User } from "../Model/User";
import { ProtobufUtils } from "../Model/Websocket/ProtobufUtils";
import { Group } from "../Model/Group";
import { GROUP_RADIUS, MINIMUM_DISTANCE } from "../Enum/EnvironmentVariable";
import type { Movable } from "../Model/Movable";
import type { PositionInterface } from "../Model/PositionInterface";
import type { EventSocket, RoomSocket, VariableSocket } from "../RoomManager";
import type { Zone, ZonePosition } from "../Model/Zone";
import type { Admin } from "../Model/Admin";
import { Space } from "../Model/Space";
import type { SpacesWatcher } from "../Model/SpacesWatcher";
import { eventProcessor } from "../Model/EventProcessorInit";
import { gaugeManager } from "./GaugeManager";
import { clientEventsEmitter } from "./ClientEventsEmitter";
import { getMapStorageClient } from "./MapStorageClient";
import { emitError } from "./MessageHelpers";
import { cpuTracker } from "./CpuTracker";

const debug = Debug("socketmanager");

function emitZoneMessage(subMessage: SubToPusherRoomMessage, socket: RoomSocket): void {
    // TODO: should we batch those every 100ms?
    const batchMessage: BatchToPusherRoomMessage = {
        payload: [subMessage],
    };
    socket.write(batchMessage);
}

export class SocketManager {
    /**
     * Helper to generate a SubToPusherRoomMessage zoneMessage
     */
    private static toZoneMessage(
        zonePosition: ZonePosition,
        zonePayload: ZoneMessage["message"]
    ): SubToPusherRoomMessage {
        return {
            message: {
                $case: "zoneMessage",
                zoneMessage: {
                    x: zonePosition.x,
                    y: zonePosition.y,
                    message: zonePayload,
                },
            },
        };
    }
    /**
     * List of rooms already loaded (note: never use this directly).
     * It is only here for the very specific getAllRooms case that needs to return all available rooms
     * without waiting for pending rooms.
     */
    private resolvedRooms = new Map<string, GameRoom>();
    // List of rooms (or rooms in process of loading).
    private roomsPromises = new Map<string, PromiseLike<GameRoom>>();

    private spaces = new Map<string, Space>();

    public async handleJoinRoom(
        socket: UserSocket,
        joinRoomMessage: JoinRoomMessage
    ): Promise<{ room: GameRoom; user: User }> {
        //join new previous room
        const { room, user } = await this.joinRoom(socket, joinRoomMessage);
        const lastCommandId = joinRoomMessage.lastCommandId;
        let commandsToApply: EditMapCommandMessage[] | undefined = undefined;

        if (room.wamUrl) {
            const updateMapToNewestWithKeyMessage: UpdateMapToNewestWithKeyMessage = {
                mapKey: room.wamUrl,
                updateMapToNewestMessage: {
                    commandId: lastCommandId,
                },
            };

            commandsToApply = await new Promise<EditMapCommandMessage[]>((resolve, reject) => {
                getMapStorageClient().handleUpdateMapToNewestMessage(
                    updateMapToNewestWithKeyMessage,
                    (err: ServiceError | null, message: EditMapCommandsArrayMessage) => {
                        if (err) {
                            emitError(user.socket, err);
                            reject(err);
                            return;
                        }
                        resolve(message.editMapCommands);
                    }
                );
            });
        }

        if (!socket.writable) {
            console.warn("Socket was aborted");
            return {
                room,
                user,
            };
        }

        let editMapCommandsArrayMessage: EditMapCommandsArrayMessage | undefined = undefined;
        if (commandsToApply) {
            editMapCommandsArrayMessage = {
                editMapCommands: commandsToApply,
            };
        }

        const itemStateMessage: ItemStateMessage[] = [];
        for (const [itemId, item] of room.getItemsState().entries()) {
            itemStateMessage.push({
                itemId: itemId,
                stateJson: JSON.stringify(item),
            });
        }

        const variables = await room.getVariablesForTags(user.tags);
        const variablesMessage: VariableMessage[] = [];

        for (const [name, value] of variables.entries()) {
            variablesMessage.push({
                name: name,
                value: value,
            });
        }

        const playerVariables = user.getVariables().getVariables();
        const playerVariablesMessage: VariableMessage[] = [];

        for (const [name, value] of playerVariables.entries()) {
            playerVariablesMessage.push({
                name: name,
                value: value.value,
            });
        }

        const roomJoinedMessage: Partial<RoomJoinedMessage> = {
            tag: joinRoomMessage.tag,
            userRoomToken: joinRoomMessage.userRoomToken,
            characterTextures: joinRoomMessage.characterTextures,
            companionTexture: joinRoomMessage.companionTexture,
            canEdit: joinRoomMessage.canEdit,
            editMapCommandsArrayMessage,
            item: itemStateMessage,
            variable: variablesMessage,
            currentUserId: user.id,
            activatedInviteUser: user.activatedInviteUser != undefined ? user.activatedInviteUser : true,
            applications: user.applications ?? [],
            playerVariable: playerVariablesMessage,
            megaphoneSettings: {
                enabled: WAMSettingsUtils.canUseMegaphone(room.wamSettings, user.tags),
                url: WAMSettingsUtils.getMegaphoneUrl(
                    room.wamSettings,
                    room.roomGroup ?? new URL(room.roomUrl).host,
                    room.roomUrl
                ),
            },
        };

        user.write({
            $case: "roomJoinedMessage",
            roomJoinedMessage: RoomJoinedMessage.fromPartial(roomJoinedMessage),
        });

        return {
            room,
            user,
        };
    }

    handleUserMovesMessage(room: GameRoom, user: User, userMoves: UserMovesMessage) {
        const position = userMoves.position;

        // If CPU is high, let's drop messages of users moving (we will only dispatch the final position)
        if (cpuTracker.isOverHeating() && userMoves.position?.moving === true) {
            return;
        }

        if (position === undefined) {
            throw new Error("Position not found in message");
        }
        const viewport = userMoves.viewport;
        if (viewport === undefined) {
            throw new Error("Viewport not found in message");
        }

        // update position in the world
        room.updatePosition(user, ProtobufUtils.toPointInterface(position));
        //room.setViewport(client, client.viewport);
    }

    handleSetPlayerDetails(room: GameRoom, user: User, playerDetailsMessage: SetPlayerDetailsMessage) {
        room.updatePlayerDetails(user, playerDetailsMessage);
    }

    handleItemEvent(room: GameRoom, user: User, itemEventMessage: ItemEventMessage) {
        const itemEvent = ProtobufUtils.toItemEvent(itemEventMessage);

        // Let's send the event without using the SocketIO room.
        // TODO: move this in the GameRoom class.
        for (const user of room.getUsers().values()) {
            user.emitInBatch({
                message: {
                    $case: "itemEventMessage",
                    itemEventMessage,
                },
            });
        }

        room.setItemState(itemEvent.itemId, itemEvent.state);
    }

    handleVariableEvent(room: GameRoom, user: User, variableMessage: VariableMessage): Promise<void> {
        return room.setVariable(variableMessage.name, variableMessage.value, user);
    }

    async readVariable(roomUrl: string, variable: string): Promise<string | undefined> {
        const room = await this.getOrCreateRoom(roomUrl);
        // Info: Admin tag is given to bypass the tags checking
        const variables = await room.getVariablesForTags(undefined);
        return variables.get(variable);
    }

    async saveVariable(roomUrl: string, variable: string, newValue: string): Promise<void> {
        const room = await this.getOrCreateRoom(roomUrl);
        await room.setVariable(variable, newValue, "RoomApi");
    }

    leaveRoom(room: GameRoom, user: User) {
        // leave previous room and world
        try {
            //user leave previous world
            room.leave(user);
            this.cleanupRoomIfEmpty(room);
        } finally {
            clientEventsEmitter.clientLeaveSubject.next({ clientUUid: user.uuid, roomId: room.roomUrl });
        }
    }

    async getOrCreateRoom(roomId: string): Promise<GameRoom> {
        //check and create new room
        let roomPromise = this.roomsPromises.get(roomId);
        if (roomPromise === undefined) {
            roomPromise = GameRoom.create(
                roomId,
                (user: User, group: Group) => {
                    this.joinWebRtcRoom(user, group);
                },
                (user: User, group: Group) => {
                    this.disConnectedUser(user, group);
                },
                MINIMUM_DISTANCE,
                GROUP_RADIUS,
                (thing: Movable, currentZone: ZonePosition, fromZone: Zone | null, listener: RoomSocket) => {
                    this.onZoneEnter(thing, currentZone, fromZone, listener);
                },
                (thing: Movable, currentZone: ZonePosition, position: PositionInterface, listener: RoomSocket) =>
                    this.onClientMove(thing, currentZone, position, listener),
                (thing: Movable, currentZone: ZonePosition, newZone: Zone | null, listener: RoomSocket) =>
                    this.onClientLeave(thing, currentZone, newZone, listener),
                (emoteEventMessage: EmoteEventMessage, currentZone: ZonePosition, listener: RoomSocket) =>
                    this.onEmote(emoteEventMessage, currentZone, listener),
                (currentZone: ZonePosition, groupId: number, listener: RoomSocket) => {
                    this.onLockGroup(currentZone, groupId, listener, roomPromise).catch((e) => {
                        console.error("An error happened while handling a lock group event:", e);
                        Sentry.captureException(e);
                    });
                },
                (
                    currentZone: ZonePosition,
                    playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
                    listener: RoomSocket
                ) => this.onPlayerDetailsUpdated(currentZone, playerDetailsUpdatedMessage, listener),
                (currentZone: ZonePosition, group: Group, listener: RoomSocket) => {
                    this.onUserEntersOrLeavesBubble(currentZone, group, listener);
                }
            )
                .then((gameRoom) => {
                    gaugeManager.incNbRoomGauge();
                    this.resolvedRooms.set(roomId, gameRoom);
                    return gameRoom;
                })
                .catch((e) => {
                    this.roomsPromises.delete(roomId);
                    throw e;
                });
            this.roomsPromises.set(roomId, roomPromise);
        }
        return roomPromise;
    }

    private async joinRoom(
        socket: UserSocket,
        joinRoomMessage: JoinRoomMessage
    ): Promise<{ room: GameRoom; user: User }> {
        const roomId = joinRoomMessage.roomId;

        const room = await socketManager.getOrCreateRoom(roomId);

        //join world
        const user = await room.join(socket, joinRoomMessage);

        clientEventsEmitter.clientJoinSubject.next({ clientUUid: user.uuid, roomId: roomId });

        return { room, user };
    }

    private onZoneEnter(thing: Movable, currentZone: ZonePosition, fromZone: Zone | null, listener: RoomSocket) {
        if (thing instanceof User) {
            const subMessage = SocketManager.toUserJoinedZoneMessage(thing, currentZone, fromZone);
            emitZoneMessage(subMessage, listener);
            //listener.emitInBatch(subMessage);
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(listener, currentZone, fromZone, thing);
        } else {
            console.error("Unexpected type for Movable.");
            Sentry.captureException("Unexpected type for Movable.");
        }
    }

    private static toUserJoinedZoneMessage(
        user: User,
        currentZone: ZonePosition,
        fromZone?: Zone | null
    ): SubToPusherRoomMessage {
        if (!Number.isInteger(user.id)) {
            throw new Error(`clientUser.userId is not an integer ${user.id}`);
        }
        const userJoinedZoneMessage: Partial<UserJoinedZoneMessage> = {
            userId: user.id,
            userUuid: user.uuid,
            name: user.name,
            availabilityStatus: user.getAvailabilityStatus(),
            characterTextures: user.characterTextures,
            position: ProtobufUtils.toPositionMessage(user.getPosition()),
            chatID: user.chatID,
        };
        if (fromZone) {
            userJoinedZoneMessage.fromZone = SocketManager.toProtoZone(fromZone);
        }
        if (user.visitCardUrl) {
            userJoinedZoneMessage.visitCardUrl = user.visitCardUrl;
        }
        userJoinedZoneMessage.companionTexture = user.companionTexture;
        const outlineColor = user.getOutlineColor();
        if (outlineColor === undefined) {
            userJoinedZoneMessage.hasOutline = false;
        } else {
            userJoinedZoneMessage.hasOutline = true;
            userJoinedZoneMessage.outlineColor = outlineColor;
        }
        userJoinedZoneMessage.variables = {};
        for (const entry of user.getVariables().getVariables().entries()) {
            const key = entry[0];
            const value = entry[1].value;
            const isPublic = entry[1].isPublic;
            if (isPublic) {
                userJoinedZoneMessage.variables[key] = value;
            }
        }
        userJoinedZoneMessage.sayMessage = user.getSayMessage();

        return SocketManager.toZoneMessage(currentZone, {
            $case: "userJoinedZoneMessage",
            userJoinedZoneMessage: UserJoinedZoneMessage.fromPartial(userJoinedZoneMessage),
        });
    }

    private onClientMove(
        thing: Movable,
        currentZone: ZonePosition,
        position: PositionInterface,
        listener: RoomSocket
    ): void {
        if (thing instanceof User) {
            // Note: the position parameter is not used because the thing has already been User.setPosition
            const posMsg = ProtobufUtils.toPositionMessage(thing.getPosition());
            /*const posMsg = ProtobufUtils.toPositionMessage({
                x: position.x,
                y: position.y,
                direction: "down",
                moving: false,
            });*/
            emitZoneMessage(
                SocketManager.toZoneMessage(currentZone, {
                    $case: "userMovedMessage",
                    userMovedMessage: {
                        userId: thing.id,
                        position: posMsg,
                    },
                }),
                listener
            );
        } else if (thing instanceof Group) {
            this.emitCreateUpdateGroupEvent(listener, currentZone, null, thing);
        } else {
            console.error("Unexpected type for Movable.");
            Sentry.captureException("Unexpected type for Movable.");
        }
    }

    private onClientLeave(thing: Movable, currentZone: ZonePosition, newZone: Zone | null, listener: RoomSocket) {
        if (thing instanceof User) {
            this.emitUserLeftEvent(listener, currentZone, thing.id, newZone);
        } else if (thing instanceof Group) {
            this.emitDeleteGroupEvent(listener, currentZone, thing.getId(), newZone);
        } else {
            console.error("Unexpected type for Movable.");
            Sentry.captureException("Unexpected type for Movable.");
        }
    }

    private onUserEntersOrLeavesBubble(currentZone: ZonePosition, group: Group, client: RoomSocket) {
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "groupUsersUpdateMessage",
                groupUsersUpdateMessage: {
                    groupId: group.getId(),
                    userIds: group.getUsers().map((user) => user.id),
                },
            }),
            client
        );
    }

    private onEmote(emoteEventMessage: EmoteEventMessage, currentZone: ZonePosition, client: RoomSocket) {
        // Ideally, we should pass the position of the concerned user
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "emoteEventMessage",
                emoteEventMessage,
            }),
            client
        );
    }

    private async onLockGroup(
        currentZone: ZonePosition,
        groupId: number,
        client: RoomSocket,
        roomPromise: PromiseLike<GameRoom> | undefined
    ): Promise<void> {
        if (!roomPromise) {
            return;
        }
        const group = (await roomPromise).getGroupById(groupId);
        if (!group) {
            return;
        }
        this.emitCreateUpdateGroupEvent(client, currentZone, null, group);
    }

    private onPlayerDetailsUpdated(
        currentZone: ZonePosition,
        playerDetailsUpdatedMessage: PlayerDetailsUpdatedMessage,
        client: RoomSocket
    ) {
        // Ideally, we should pass the position of the concerned user
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "playerDetailsUpdatedMessage",
                playerDetailsUpdatedMessage,
            }),
            client
        );
    }

    private emitCreateUpdateGroupEvent(
        client: RoomSocket,
        currentZone: ZonePosition,
        fromZone: Zone | null,
        group: Group
    ): void {
        const position = group.getPosition();
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "groupUpdateZoneMessage",
                groupUpdateZoneMessage: {
                    groupId: group.getId(),
                    position: {
                        x: Math.floor(position.x),
                        y: Math.floor(position.y),
                    },
                    groupSize: group.getSize,
                    fromZone: SocketManager.toProtoZone(fromZone),
                    locked: group.isLocked(),
                    userIds: group.getUsers().map((user) => user.id),
                },
            }),
            client
        );
    }

    private emitDeleteGroupEvent(
        client: RoomSocket,
        currentZone: ZonePosition,
        groupId: number,
        newZone: Zone | null
    ): void {
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "groupLeftZoneMessage",
                groupLeftZoneMessage: {
                    groupId,
                    toZone: SocketManager.toProtoZone(newZone),
                },
            }),
            client
        );
    }

    private emitUserLeftEvent(
        client: RoomSocket,
        currentZone: ZonePosition,
        userId: number,
        newZone: Zone | null
    ): void {
        emitZoneMessage(
            SocketManager.toZoneMessage(currentZone, {
                $case: "userLeftZoneMessage",
                userLeftZoneMessage: {
                    userId,
                    toZone: SocketManager.toProtoZone(newZone),
                },
            }),
            client
        );
    }

    private static toProtoZone(zone: Zone | null): ProtoZone | undefined {
        if (zone !== null) {
            return {
                x: zone.x,
                y: zone.y,
            };
        }
        return undefined;
    }

    private joinWebRtcRoom(user: User, group: Group) {
        user.write({
            $case: "joinSpaceRequestMessage",
            joinSpaceRequestMessage: {
                // FIXME: before fixing the fact that spaceName is undefined, let's try to understand why I don't have any info about the user in the error caught above
                spaceName: group.spaceName,
                propertiesToSync: ["cameraState", "microphoneState", "screenSharingState"],
            },
        });
    }

    //disconnect user
    private disConnectedUser(user: User, group: Group) {
        user.write({
            $case: "leaveSpaceRequestMessage",
            leaveSpaceRequestMessage: {
                spaceName: group.spaceName,
            },
        });
    }

    public getWorlds(): Map<string, PromiseLike<GameRoom>> {
        return this.roomsPromises;
    }

    public async handleQueryMessage(gameRoom: GameRoom, user: User, queryMessage: QueryMessage): Promise<void> {
        if (!queryMessage.query) {
            console.error("QueryMessage has no query");
            Sentry.captureException("QueryMessage has no query");
            return;
        }
        const queryCase = queryMessage.query.$case;
        const answerMessage: Partial<AnswerMessage> = {
            id: queryMessage.id,
        };
        const abortController = new AbortController();
        user.queryMessageAbortControllers.set(queryMessage.id, abortController);

        try {
            switch (queryCase) {
                case "jitsiJwtQuery": {
                    const answer = await this.handleQueryJitsiJwtMessage(
                        gameRoom,
                        user,
                        queryMessage.query.jitsiJwtQuery
                    );
                    answerMessage.answer = {
                        $case: "jitsiJwtAnswer",
                        jitsiJwtAnswer: answer,
                    };
                    break;
                }
                case "joinBBBMeetingQuery": {
                    const answer = await this.handleJoinBBBMeetingMessage(
                        gameRoom,
                        user,
                        queryMessage.query.joinBBBMeetingQuery
                    );
                    answerMessage.answer = {
                        $case: "joinBBBMeetingAnswer",
                        joinBBBMeetingAnswer: answer,
                    };
                    break;
                }
                case "sendEventQuery": {
                    // TODO: in the future, if the event system is abused, we can throttle message by user id, here.
                    this.handleSendEventQuery(gameRoom, user, queryMessage.query.sendEventQuery);
                    answerMessage.answer = {
                        $case: "sendEventAnswer",
                        sendEventAnswer: {},
                    };
                    break;
                }
                case "iceServersQuery":
                case "embeddableWebsiteQuery":
                case "roomTagsQuery":
                case "roomsFromSameWorldQuery":
                case "searchMemberQuery":
                case "getMemberQuery":
                case "searchTagsQuery":
                case "chatMembersQuery":
                case "oauthRefreshTokenQuery":
                case "joinSpaceQuery":
                case "leaveSpaceQuery":
                case "mapStorageJwtQuery":
                case "enterChatRoomAreaQuery": {
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = queryCase;
                }
            }
        } catch (e) {
            const error = asError(e);
            console.error("An error happened while answering a query:", e);
            Sentry.captureException(`An error happened while answering a query: ${error.message}`, {
                extra: { queryMessage, userId: user.id, userUuid: user.uuid, roomId: gameRoom.roomUrl },
            });
            answerMessage.answer = {
                $case: "error",
                error: {
                    message: error.message,
                },
            };
        } finally {
            user.queryMessageAbortControllers.delete(queryMessage.id);
        }

        user.write({
            $case: "answerMessage",
            answerMessage: AnswerMessage.fromPartial(answerMessage),
        });
    }

    public handleAbortQueryMessage(room: GameRoom, user: User, abortQueryMessage: AbortQueryMessage) {
        const controller = user.queryMessageAbortControllers.get(abortQueryMessage.id);
        if (controller) {
            controller.abort();
        }
    }

    public async handleQueryJitsiJwtMessage(
        gameRoom: GameRoom,
        user: User,
        queryJitsiJwtMessage: JitsiJwtQuery
    ): Promise<JitsiJwtAnswer> {
        const jitsiRoom = queryJitsiJwtMessage.jitsiRoom;
        const jitsiSettings = gameRoom.getJitsiSettings();

        if (jitsiSettings === undefined || !jitsiSettings.secret) {
            throw new Error("You must set the SECRET_JITSI_KEY key to the secret to generate JWT tokens for Jitsi.");
        }

        // Let's see if the current client has moderator rights
        let isAdmin = false;
        if (user.tags.includes("admin")) {
            isAdmin = true;
        } else {
            const moderatorTag = await gameRoom.getModeratorTagForJitsiRoom(jitsiRoom);
            if (moderatorTag && user.tags.includes(moderatorTag)) {
                isAdmin = true;
            }
        }

        const jwt = Jwt.sign(
            {
                aud: "jitsi",
                context: {
                    user: {
                        id: user.id,
                        name: user.name,
                    },
                    features: {
                        livestreaming: isAdmin,
                        recording: isAdmin,
                    },
                },
                iss: jitsiSettings.iss,
                sub: jitsiSettings.url,
                room: jitsiRoom,
                moderator: isAdmin,
            },
            jitsiSettings.secret,
            {
                expiresIn: "1d",
                algorithm: "HS256",
                header: {
                    alg: "HS256",
                    typ: "JWT",
                },
            }
        );

        return {
            jwt,
            url: jitsiSettings.url,
        };
    }

    public async handleJoinBBBMeetingMessage(
        gameRoom: GameRoom,
        user: User,
        joinBBBMeetingQuery: JoinBBBMeetingQuery
    ): Promise<JoinBBBMeetingAnswer> {
        const meetingId = joinBBBMeetingQuery.meetingId;
        const localMeetingId = joinBBBMeetingQuery.localMeetingId;
        const meetingName = joinBBBMeetingQuery.meetingName;
        const bbbSettings = gameRoom.getBbbSettings();

        if (bbbSettings === undefined) {
            throw new Error(
                "Unable to join the conference because either " +
                    "the BBB_URL or BBB_SECRET environment variables are not set."
            );
        }

        // Let's see if the current client has moderator rights
        let isAdmin = false;
        if (user.tags.includes("admin")) {
            isAdmin = true;
        } else {
            const moderatorTag = await gameRoom.getModeratorTagForBbbMeeting(localMeetingId);
            if (moderatorTag && user.tags.includes(moderatorTag)) {
                isAdmin = true;
            } else if (moderatorTag === undefined) {
                // If the bbbMeetingAdminTag is not set, everyone is a moderator.
                isAdmin = true;
            }
        }

        if (bbbSettings === undefined || !bbbSettings.secret) {
            throw new Error("You must set the SECRET_BBB_KEY key to the secret to generate JWT tokens for BBB.");
        }

        const api = BigbluebuttonJs.api(bbbSettings.url, bbbSettings.secret);
        // It seems bbb-api is limiting password length to 50 chars
        const maxPWLen = 50;
        const attendeePW = crypto
            .createHmac("sha256", bbbSettings.secret)
            .update(`attendee-${meetingId}`)
            .digest("hex")
            .slice(0, maxPWLen);
        const moderatorPW = crypto
            .createHmac("sha256", bbbSettings.secret)
            .update(`moderator-${meetingId}`)
            .digest("hex")
            .slice(0, maxPWLen);

        // This is idempotent, so we call it on each join in order to be sure that the meeting exists.
        const createOptions = { attendeePW, moderatorPW, record: true };
        const createURL = api.administration.create(meetingName, meetingId, createOptions);
        await BigbluebuttonJs.http(createURL);

        const joinParams: Record<string, string> = {};

        // XXX: figure out how to know if the user has admin status and use the moderatorPW
        // in that case
        const clientURL = api.administration.join(user.name, meetingId, isAdmin ? moderatorPW : attendeePW, {
            ...joinParams,
            userID: user.id,
            joinViaHtml5: true,
        });
        debug(
            `User "${user.name}" (${user.uuid}) joined the BBB meeting "${meetingName}" as ${
                isAdmin ? "Admin" : "Participant"
            }.`
        );

        return {
            meetingId,
            clientURL,
        };
    }

    public handleSendUserMessage(user: User, sendUserMessageToSend: SendUserMessage) {
        user.write({
            $case: "sendUserMessage",
            sendUserMessage: sendUserMessageToSend,
        });
    }

    public handleBanUserMessage(room: GameRoom, user: User, banUserMessageToSend: BanUserMessage) {
        user.write({
            $case: "sendUserMessage",
            sendUserMessage: banUserMessageToSend,
        });

        setTimeout(() => {
            // Let's leave the room now.
            room.leave(user);
            // Let's close the connection when the user is banned.
            user.socket.end();
        }, 10000);
    }

    public async addZoneListener(call: RoomSocket, roomId: string, x: number, y: number): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            throw new Error("In addZoneListener, could not find room with id '" + roomId + "'");
        }

        const things = room.addZoneListener(call, x, y);

        const batchMessage: BatchToPusherRoomMessage = {
            payload: [],
        };

        for (const thing of things) {
            if (thing instanceof User) {
                const subMessage = SocketManager.toUserJoinedZoneMessage(thing, { x, y });
                batchMessage.payload.push(subMessage);
            } else if (thing instanceof Group) {
                const position = thing.getPosition();
                batchMessage.payload.push(
                    SocketManager.toZoneMessage(
                        { x, y },
                        {
                            $case: "groupUpdateZoneMessage",
                            groupUpdateZoneMessage: {
                                groupId: thing.getId(),
                                position: ProtobufUtils.toPointMessage(position),
                                groupSize: thing.getSize,
                                fromZone: undefined,
                                locked: thing.isLocked(),
                                userIds: thing.getUsers().map((user) => user.id),
                            },
                        }
                    )
                );
            } else {
                console.error("Unexpected type for Movable returned by setViewport");
                Sentry.captureException("Unexpected type for Movable returned by setViewport");
            }
        }

        call.write(batchMessage);
    }

    async removeZoneListener(call: RoomSocket, roomId: string, x: number, y: number): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.warn("In removeZoneListener, could not find room with id '" + roomId + "'");
            return;
        }

        room.removeZoneListener(call, x, y);
        this.cleanupRoomIfEmpty(room);
    }

    async addRoomListener(call: RoomSocket, roomId: string) {
        const room = await this.getOrCreateRoom(roomId);
        if (!room) {
            throw new Error("In addRoomListener, could not find room with id '" + roomId + "'");
        }

        room.addRoomListener(call);

        /*const batchMessage = new BatchToPusherRoomMessage();

        call.write(batchMessage);*/
    }

    async removeRoomListener(call: RoomSocket, roomId: string) {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            throw new Error("In removeRoomListener, could not find room with id '" + roomId + "'");
        }

        room.removeRoomListener(call);
    }

    async addVariableListener(call: VariableSocket) {
        const room = await this.getOrCreateRoom(call.request.room);
        if (!room) {
            throw new Error("In addVariableListener, could not find room with id '" + call.request.room + "'");
        }

        room.addVariableListener(call);
    }

    async removeVariableListener(call: VariableSocket) {
        const room = await this.roomsPromises.get(call.request.room);
        if (!room) {
            throw new Error("In removeVariableListener, could not find room with id '" + call.request.room + "'");
        }

        room.removeVariableListener(call);

        this.cleanupRoomIfEmpty(room);
    }

    public async handleJoinAdminRoom(admin: Admin, roomId: string): Promise<GameRoom> {
        const room = await socketManager.getOrCreateRoom(roomId);

        room.adminJoin(admin);

        return room;
    }

    public leaveAdminRoom(room: GameRoom, admin: Admin) {
        room.adminLeave(admin);
        this.cleanupRoomIfEmpty(room);
    }

    private cleanupRoomIfEmpty(room: GameRoom): void {
        if (room.isEmpty()) {
            this.roomsPromises.delete(room.roomUrl);
            const deleted = this.resolvedRooms.delete(room.roomUrl);
            if (deleted) {
                gaugeManager.decNbRoomGauge();
            }
            debug('Room is empty. Deleting room "%s"', room.roomUrl);
        }
    }

    public async sendAdminMessage(roomId: string, recipientUuid: string, message: string, type: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.error(
                "In sendAdminMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In sendAdminMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.error(
                "In sendAdminMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In sendAdminMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            recipient.write({
                $case: "sendUserMessage",
                sendUserMessage: {
                    message,
                    type,
                },
            });
        }
    }

    public async banUser(roomId: string, recipientUuid: string, message: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            console.error(
                "In banUser, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In banUser, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.error(
                "In banUser, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In banUser, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            // Let's leave the room now.
            room.leave(recipient);

            // Let's close the connection when the user is banned.
            recipient.write({
                $case: "banUserMessage",
                banUserMessage: {
                    message,
                    type: "banned",
                },
            });
            recipient.socket.end();
        }
    }

    async sendAdminRoomMessage(roomId: string, message: string, type: string) {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            //todo: this should cause the http call to return a 500
            console.error(
                "In sendAdminRoomMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In sendAdminRoomMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        room.getUsers().forEach((recipient) => {
            recipient.write({
                $case: "sendUserMessage",
                sendUserMessage: {
                    message,
                    type,
                },
            });
        });
    }

    async dispatchWorldFullWarning(roomId: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            //todo: this should cause the http call to return a 500
            console.error(
                "In dispatchWorldFullWarning, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            Sentry.captureException(
                "In dispatchWorldFullWarning, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        room.getUsers().forEach((recipient) => {
            recipient.write({
                $case: "worldFullWarningMessage",
                worldFullWarningMessage: {},
            });
        });
    }

    async dispatchRoomRefresh(roomId: string): Promise<void> {
        const room = await this.roomsPromises.get(roomId);
        if (!room) {
            return;
        }

        const versionNumber = await room.incrementVersion();
        room.getUsers().forEach((recipient) => {
            recipient.write({
                $case: "refreshRoomMessage",
                refreshRoomMessage: {
                    roomId,
                    versionNumber,
                },
            });
        });
    }

    handleEmoteEventMessage(room: GameRoom, user: User, emotePromptMessage: EmotePromptMessage) {
        room.emitEmoteEvent(user, {
            emote: emotePromptMessage.emote,
            actorUserId: user.id,
        });
    }

    handleFollowRequestMessage(room: GameRoom, user: User, message: FollowRequestMessage) {
        room.sendToOthersInGroupIncludingUser(user, {
            message: {
                $case: "followRequestMessage",
                followRequestMessage: message,
            },
        });
    }

    handleFollowConfirmationMessage(room: GameRoom, user: User, message: FollowConfirmationMessage) {
        const leader = room.getUserById(message.leader);
        if (!leader) {
            const message = `Could not follow user "{message.getLeader()}" in room "{room.roomUrl}".`;
            console.info(message, "Maybe the user just left.");
            return;
        }

        // By security, we look at the group leader. If the group leader is NOT the leader in the message,
        // everybody should stop following the group leader (to avoid having 2 group leaders)
        if (user?.group?.leader && user?.group?.leader !== leader) {
            user?.group?.leader?.stopLeading();
        }

        leader.addFollower(user);
    }

    handleFollowAbortMessage(room: GameRoom, user: User, message: FollowAbortMessage) {
        const leader = room.getUserById(message.leader);
        if (user.id === message.leader) {
            leader?.stopLeading();
        } else {
            // Forward message
            leader?.delFollower(user);
        }
    }

    handleLockGroupPromptMessage(room: GameRoom, user: User, message: LockGroupPromptMessage) {
        const group = user.group;
        if (!group) {
            return;
        }
        group.lock(message.lock);
        room.emitLockGroupEvent(user, group.getId());
    }

    handleUpdateMapToNewestMessage(room: GameRoom, user: User, message: UpdateMapToNewestWithKeyMessage) {
        getMapStorageClient().handleUpdateMapToNewestMessage(
            message,
            (err: ServiceError | null, message: EditMapCommandsArrayMessage) => {
                if (err) {
                    emitError(user.socket, err);
                    throw err;
                }
                const commands = message.editMapCommands;
                for (const editMapCommandMessage of commands) {
                    user.emitInBatch({
                        message: {
                            $case: "editMapCommandMessage",
                            editMapCommandMessage,
                        },
                    });
                }
            }
        );
    }

    getAllRooms(): RoomsList {
        const roomsList: RoomDescription[] = [];

        for (const room of this.resolvedRooms.values()) {
            const roomDescription = {
                roomId: room.roomUrl,
                nbUsers: room.getUsers().size,
            };

            roomsList.push(roomDescription);
        }

        return {
            roomDescription: roomsList,
        };
    }

    handleAskPositionMessage(room: GameRoom, user: User, askPositionMessage: AskPositionMessage) {
        if (room) {
            const userToJoin = room.getUserByUuid(askPositionMessage.userIdentifier);
            const position = userToJoin?.getPosition();
            if (position && askPositionMessage.askType === AskPositionMessage_AskType.MOVE) {
                user.write({
                    $case: "moveToPositionMessage",
                    moveToPositionMessage: {
                        position: ProtobufUtils.toPositionMessage(position),
                    },
                });
            } else if (userToJoin && position && askPositionMessage.askType === AskPositionMessage_AskType.LOCATE) {
                user.write({
                    $case: "locatePositionMessage",
                    locatePositionMessage: {
                        position: ProtobufUtils.toPositionMessage(position),
                        userId: userToJoin.id,
                    },
                });
            }

            if (room.isEmpty()) {
                // TODO delete room;
            }
        }
    }

    handleJoinSpaceMessage(pusher: SpacesWatcher, joinSpaceMessage: JoinSpaceMessage) {
        let space: Space | undefined = this.spaces.get(joinSpaceMessage.spaceName);
        if (!space) {
            if (joinSpaceMessage.filterType === FilterType.UNRECOGNIZED) {
                throw new Error("Unrecognized filter type when joining space");
            }
            space = new Space(
                joinSpaceMessage.spaceName,
                joinSpaceMessage.filterType,
                eventProcessor,
                joinSpaceMessage.propertiesToSync,
                joinSpaceMessage.world
            );
            this.spaces.set(joinSpaceMessage.spaceName, space);
            clientEventsEmitter.newSpaceSubject.next(space);
        }

        if (space.filterType !== joinSpaceMessage.filterType) {
            throw new Error("Filter type mismatch when joining space");
        }

        pusher.watchSpace(space.name);
        try {
            space.addWatcher(pusher);
        } catch (e) {
            pusher.unwatchSpace(space.name);
            throw e;
        }
    }

    handleLeaveSpaceMessage(pusher: SpacesWatcher, leaveSpaceMessage: LeaveSpaceMessage) {
        const space: Space | undefined = this.spaces.get(leaveSpaceMessage.spaceName);
        if (!space) {
            throw new Error(
                `In handleLeaveSpaceMessage, can't unwatch space ${leaveSpaceMessage.spaceName}, space not found`
            );
        }
        this.removeSpaceWatcher(pusher, space);
    }

    handleUnwatchAllSpaces(pusher: SpacesWatcher) {
        pusher.spacesWatched.forEach((spaceName) => {
            const space = this.spaces.get(spaceName);
            if (!space) {
                console.error(`In handleUnwatchAllSpaces, can't unwatch space ${spaceName}, space not found`);
                return;
            }
            this.removeSpaceWatcher(pusher, space);
        });
    }

    private removeSpaceWatcher(watcher: SpacesWatcher, space: Space) {
        watcher.unwatchSpace(space.name);
        space.removeWatcher(watcher);

        // If there are no more watchers, we delete the space
        if (space.canBeDeleted()) {
            debug("[space] Space %s => deleted", space.name);
            this.spaces.delete(space.name);
            clientEventsEmitter.deleteSpaceSubject.next(space);
        }
    }

    handleUpdateSpaceUserMessage(pusher: SpacesWatcher, updateSpaceUserMessage: UpdateSpaceUserMessage) {
        const updateMask = updateSpaceUserMessage.updateMask;
        if (!updateSpaceUserMessage.user || !updateMask) {
            console.error("UpdateSpaceUserMessage has no user or updateMask");
            Sentry.captureException("UpdateSpaceUserMessage has no user or updateMask");
            return;
        }

        const space = this.spaces.get(updateSpaceUserMessage.spaceName);
        if (!space) {
            console.error("Could not find space to update in UpdateSpaceUserMessage");
            Sentry.captureException("Could not find space to update in UpdateSpaceUserMessage");
            return;
        }

        space.updateUser(pusher, updateSpaceUserMessage.user, updateMask);
    }

    handleUpdateSpaceMetadataMessage(pusher: SpacesWatcher, updateSpaceMetadataMessage: UpdateSpaceMetadataMessage) {
        const space = this.spaces.get(updateSpaceMetadataMessage.spaceName);

        const isMetadata = z.record(z.string(), z.unknown()).safeParse(JSON.parse(updateSpaceMetadataMessage.metadata));
        if (!isMetadata.success) {
            console.error("Metadata is not a valid json object");
            return;
        }

        if (space) {
            space.updateMetadata(pusher, isMetadata.data);
        }
    }

    handleKickSpaceUserMessage(pusher: SpacesWatcher, kickUserMessage: KickOffMessage) {
        const space = this.spaces.get(kickUserMessage.spaceName);
        if (!space) return;
        pusher.write({
            message: {
                $case: "kickOffMessage",
                kickOffMessage: {
                    spaceName: kickUserMessage.spaceName,
                    userId: kickUserMessage.userId,
                },
            },
        });
    }

    handleSyncSpaceUsersMessage(pusher: SpacesWatcher, syncSpaceUsersMessage: SyncSpaceUsersMessage) {
        const { spaceName, users } = syncSpaceUsersMessage;
        const space = this.spaces.get(spaceName);
        if (!space) {
            console.error("Could not find space to sync users in SyncSpaceUsersMessage");
            Sentry.captureException("Could not find space to sync users in SyncSpaceUsersMessage");
            return;
        }
        space.syncUsersFromPusher(pusher, users);
    }

    handlePublicEvent(pusher: SpacesWatcher, publicEvent: PublicEvent) {
        const space = this.spaces.get(publicEvent.spaceName);
        if (!space) {
            throw new Error(`Could not find space ${publicEvent.spaceName} to dispatch public event`);
        }
        space.dispatchPublicEvent(publicEvent);
    }

    handlePrivateEvent(pusher: SpacesWatcher, privateEvent: PrivateEvent) {
        const space = this.spaces.get(privateEvent.spaceName);
        if (!space) {
            throw new Error(`Could not find space ${privateEvent.spaceName} to dispatch public event`);
        }
        space.dispatchPrivateEvent(privateEvent);
    }

    private handleSendEventQuery(gameRoom: GameRoom, user: User, sendEventQuery: SendEventQuery) {
        gameRoom.dispatchEvent(sendEventQuery.name, sendEventQuery.data, user.id, sendEventQuery.targetUserIds);
    }

    async dispatchEvent(roomUrl: string, name: string, value: unknown, targetUserIds: number[]): Promise<void> {
        const roomPromise = this.roomsPromises.get(roomUrl);
        if (!roomPromise) {
            // The room does not exist. No need to instantiate it, there is no one in.
            return Promise.resolve();
        }
        const room = await roomPromise;
        room.dispatchEvent(name, value, "RoomApi", targetUserIds);
    }

    async addEventListener(call: EventSocket) {
        const room = await this.getOrCreateRoom(call.request.room);
        if (!room) {
            throw new Error("In addEventListener, could not find room with id '" + call.request.room + "'");
        }

        room.addEventListener(call);
    }

    async removeEventListener(call: EventSocket) {
        const room = await this.roomsPromises.get(call.request.room);
        if (!room) {
            throw new Error("In removeEventListener, could not find room with id '" + call.request.room + "'");
        }

        room.removeEventListener(call);

        this.cleanupRoomIfEmpty(room);
    }

    dispatchGlobalEvent(name: string, value: unknown) {
        for (const room of this.resolvedRooms.values()) {
            room.dispatchEvent(name, value, "RoomApi", []);
        }
    }

    // TODO: connect this.
    handleKickOffUserMessage(user: User, userKickedUuid: string) {
        const group = user.group;
        if (!group) {
            return;
        }
        if (!user.tags.includes("admin")) {
            return;
        }
        const usersKiked = group.getUsers().filter((user) => user.uuid === userKickedUuid);
        if (usersKiked.length === 0) return;
        for (const userKiked of usersKiked) {
            group.leave(userKiked);
        }
        // TODO fixme to notify only user kiked
        group.setOutOfBounds(true);
    }

    async handleExternalModuleMessage(externalModuleMessage: ExternalModuleMessage) {
        if (!externalModuleMessage.roomId) {
            console.error("externalModuleMessage has no roomId. This feature isn't implemented yet.");
            return;
        }
        if (!externalModuleMessage.recipientUuid) {
            console.error("externalModuleMessage has no recipientUuid. This feature isn't implemented yet.");
            return;
        }
        const roomId = externalModuleMessage.roomId;
        const recipientUuid = externalModuleMessage.recipientUuid;

        const room = await this.roomsPromises.get(externalModuleMessage.roomId);
        if (!room) {
            console.info(
                "In handleExternalModuleMessage, could not find room with id '" +
                    roomId +
                    "'. Maybe the room was closed a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        const recipients = room.getUsersByUuid(recipientUuid);
        if (recipients.size === 0) {
            console.info(
                "In handleExternalModuleMessage, could not find user with id '" +
                    recipientUuid +
                    "'. Maybe the user left the room a few milliseconds ago and there was a race condition?"
            );
            return;
        }

        for (const recipient of recipients) {
            recipient.socket.write({
                message: {
                    $case: "externalModuleMessage",
                    externalModuleMessage: externalModuleMessage,
                },
            });
        }
    }

    /*
     * This function is used to close the connection of the space. for testing purpose.
     */
    closeSpaceConnection(spaceName: string) {
        const space = this.spaces.get(spaceName);
        if (!space) {
            throw new Error(`Space ${spaceName} not found`);
        }
        space.closeAllWatcherConnections();
        this.spaces.delete(spaceName);
        clientEventsEmitter.deleteSpaceSubject.next(space);
    }

    handleSpaceQueryMessage(pusher: SpacesWatcher, spaceQueryMessage: SpaceQueryMessage) {
        const space = this.spaces.get(spaceQueryMessage.spaceName);

        if (!space) {
            throw new Error(`Could not find space ${spaceQueryMessage.spaceName} to handle query`);
        }

        if (!spaceQueryMessage.query) {
            console.error("SpaceQueryMessage has no query");
            Sentry.captureException("SpaceQueryMessage has no query");
            return;
        }

        try {
            const answer = space.handleQuery(pusher, spaceQueryMessage);
            pusher.write({
                message: {
                    $case: "spaceAnswerMessage",
                    spaceAnswerMessage: {
                        id: spaceQueryMessage.id,
                        answer: answer.answer,
                        spaceName: spaceQueryMessage.spaceName,
                    },
                },
            });
        } catch (e) {
            console.error("Error while handling space query", e);
            Sentry.captureException("Error while handling space query");
            return;
        }
    }

    handleAddSpaceUserToNotifyMessage(pusher: SpacesWatcher, addSpaceUserToNotifyMessage: AddSpaceUserToNotifyMessage) {
        const space = this.spaces.get(addSpaceUserToNotifyMessage.spaceName);
        if (!space) {
            throw new Error(`Could not find space ${addSpaceUserToNotifyMessage.spaceName} to add user to notify`);
        }
        if (!addSpaceUserToNotifyMessage.user) {
            throw new Error(`User to add to notify is undefined in AddSpaceUserToNotifyMessage`);
        }
        space.addUserToNotify(pusher, addSpaceUserToNotifyMessage.user);
    }

    handleDeleteSpaceUserToNotifyMessage(
        pusher: SpacesWatcher,
        deleteSpaceUserToNotifyMessage: DeleteSpaceUserToNotifyMessage
    ) {
        const space = this.spaces.get(deleteSpaceUserToNotifyMessage.spaceName);
        if (!space) {
            throw new Error(
                `Could not find space ${deleteSpaceUserToNotifyMessage.spaceName} to delete user to notify`
            );
        }
        if (!deleteSpaceUserToNotifyMessage.user) {
            throw new Error(`User to delete from notify is undefined in DeleteSpaceUserToNotifyMessage`);
        }
        space.deleteUserToNotify(pusher, deleteSpaceUserToNotifyMessage.user);
    }
}

export const socketManager = new SocketManager();
