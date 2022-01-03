import { IRoomManagerServer } from "./Messages/generated/messages_grpc_pb";
import {
    AdminGlobalMessage,
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    BanUserMessage,
    BatchToPusherMessage,
    BatchToPusherRoomMessage,
    EmotePromptMessage,
    FollowRequestMessage,
    FollowConfirmationMessage,
    FollowAbortMessage,
    EmptyMessage,
    ItemEventMessage,
    JoinRoomMessage,
    PlayGlobalMessage,
    PusherToBackMessage,
    QueryJitsiJwtMessage,
    RefreshRoomPromptMessage,
    RoomMessage,
    SendUserMessage,
    ServerToAdminClientMessage,
    SetPlayerDetailsMessage,
    SilentMessage,
    UserMovesMessage,
    VariableMessage,
    WebRtcSignalToServerMessage,
    WorldFullWarningToRoomMessage,
    ZoneMessage,
} from "./Messages/generated/messages_pb";
import { sendUnaryData, ServerDuplexStream, ServerUnaryCall, ServerWritableStream } from "grpc";
import { socketManager } from "./Services/SocketManager";
import { emitError, emitErrorOnRoomSocket, emitErrorOnZoneSocket } from "./Services/MessageHelpers";
import { User, UserSocket } from "./Model/User";
import { GameRoom } from "./Model/GameRoom";
import Debug from "debug";
import { Admin } from "./Model/Admin";

const debug = Debug("roommanager");

export type AdminSocket = ServerDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
export type ZoneSocket = ServerWritableStream<ZoneMessage, BatchToPusherMessage>;
export type RoomSocket = ServerWritableStream<RoomMessage, BatchToPusherRoomMessage>;

const roomManager: IRoomManagerServer = {
    joinRoom: (call: UserSocket): void => {
        console.log("joinRoom called");

        let room: GameRoom | null = null;
        let user: User | null = null;

        call.on("data", (message: PusherToBackMessage) => {
            (async () => {
                try {
                    if (room === null || user === null) {
                        if (message.hasJoinroommessage()) {
                            socketManager
                                .handleJoinRoom(call, message.getJoinroommessage() as JoinRoomMessage)
                                .then(({ room: gameRoom, user: myUser }) => {
                                    if (call.writable) {
                                        room = gameRoom;
                                        user = myUser;
                                    } else {
                                        //Connection may have been closed before the init was finished, so we have to manually disconnect the user.
                                        socketManager.leaveRoom(gameRoom, myUser);
                                    }
                                })
                                .catch((e) => emitError(call, e));
                        } else {
                            throw new Error("The first message sent MUST be of type JoinRoomMessage");
                        }
                    } else {
                        if (message.hasJoinroommessage()) {
                            throw new Error("Cannot call JoinRoomMessage twice!");
                        } else if (message.hasUsermovesmessage()) {
                            socketManager.handleUserMovesMessage(
                                room,
                                user,
                                message.getUsermovesmessage() as UserMovesMessage
                            );
                        } else if (message.hasSilentmessage()) {
                            socketManager.handleSilentMessage(room, user, message.getSilentmessage() as SilentMessage);
                        } else if (message.hasItemeventmessage()) {
                            socketManager.handleItemEvent(
                                room,
                                user,
                                message.getItemeventmessage() as ItemEventMessage
                            );
                        } else if (message.hasVariablemessage()) {
                            await socketManager.handleVariableEvent(
                                room,
                                user,
                                message.getVariablemessage() as VariableMessage
                            );
                        } else if (message.hasWebrtcsignaltoservermessage()) {
                            socketManager.emitVideo(
                                room,
                                user,
                                message.getWebrtcsignaltoservermessage() as WebRtcSignalToServerMessage
                            );
                        } else if (message.hasWebrtcscreensharingsignaltoservermessage()) {
                            socketManager.emitScreenSharing(
                                room,
                                user,
                                message.getWebrtcscreensharingsignaltoservermessage() as WebRtcSignalToServerMessage
                            );
                        } else if (message.hasQueryjitsijwtmessage()) {
                            socketManager.handleQueryJitsiJwtMessage(
                                user,
                                message.getQueryjitsijwtmessage() as QueryJitsiJwtMessage
                            );
                        } else if (message.hasEmotepromptmessage()) {
                            socketManager.handleEmoteEventMessage(
                                room,
                                user,
                                message.getEmotepromptmessage() as EmotePromptMessage
                            );
                        } else if (message.hasFollowrequestmessage()) {
                            socketManager.handleFollowRequestMessage(
                                room,
                                user,
                                message.getFollowrequestmessage() as FollowRequestMessage
                            );
                        } else if (message.hasFollowconfirmationmessage()) {
                            socketManager.handleFollowConfirmationMessage(
                                room,
                                user,
                                message.getFollowconfirmationmessage() as FollowConfirmationMessage
                            );
                        } else if (message.hasFollowabortmessage()) {
                            socketManager.handleFollowAbortMessage(
                                room,
                                user,
                                message.getFollowabortmessage() as FollowAbortMessage
                            );
                        } else if (message.hasSendusermessage()) {
                            const sendUserMessage = message.getSendusermessage();
                            socketManager.handleSendUserMessage(user, sendUserMessage as SendUserMessage);
                        } else if (message.hasBanusermessage()) {
                            const banUserMessage = message.getBanusermessage();
                            socketManager.handlerBanUserMessage(room, user, banUserMessage as BanUserMessage);
                        } else if (message.hasSetplayerdetailsmessage()) {
                            const setPlayerDetailsMessage = message.getSetplayerdetailsmessage();
                            socketManager.handleSetPlayerDetails(
                                room,
                                user,
                                setPlayerDetailsMessage as SetPlayerDetailsMessage
                            );
                        } else {
                            throw new Error("Unhandled message type");
                        }
                    }
                } catch (e) {
                    console.error(e);
                    emitError(call, e);
                    call.end();
                }
            })().catch((e) => console.error(e));
        });

        call.on("end", () => {
            debug("joinRoom ended");
            if (user !== null && room !== null) {
                socketManager.leaveRoom(room, user);
            }
            call.end();
            room = null;
            user = null;
        });

        call.on("error", (err: Error) => {
            console.error("An error occurred in joinRoom stream:", err);
        });
    },

    listenZone(call: ZoneSocket): void {
        debug("listenZone called");
        const zoneMessage = call.request;

        socketManager
            .addZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY())
            .catch((e) => {
                emitErrorOnZoneSocket(call, e);
            });

        call.on("cancelled", () => {
            debug("listenZone cancelled");
            socketManager
                .removeZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY())
                .catch((e) => console.error(e));
            call.end();
        });

        call.on("close", () => {
            debug("listenZone connection closed");
            socketManager
                .removeZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY())
                .catch((e) => console.error(e));
        }).on("error", (e) => {
            console.error("An error occurred in listenZone stream:", e);
            socketManager
                .removeZoneListener(call, zoneMessage.getRoomid(), zoneMessage.getX(), zoneMessage.getY())
                .catch((e) => console.error(e));
            call.end();
        });
    },

    listenRoom(call: RoomSocket): void {
        debug("listenRoom called");
        const roomMessage = call.request;

        socketManager.addRoomListener(call, roomMessage.getRoomid()).catch((e) => {
            emitErrorOnRoomSocket(call, e);
        });

        call.on("cancelled", () => {
            debug("listenRoom cancelled");
            socketManager.removeRoomListener(call, roomMessage.getRoomid()).catch((e) => console.error(e));
            call.end();
        });

        call.on("close", () => {
            debug("listenRoom connection closed");
            socketManager.removeRoomListener(call, roomMessage.getRoomid()).catch((e) => console.error(e));
        }).on("error", (e) => {
            console.error("An error occurred in listenRoom stream:", e);
            socketManager.removeRoomListener(call, roomMessage.getRoomid()).catch((e) => console.error(e));
            call.end();
        });
    },

    adminRoom(call: AdminSocket): void {
        console.log("adminRoom called");

        const admin = new Admin(call);
        let room: GameRoom | null = null;

        call.on("data", (message: AdminPusherToBackMessage) => {
            try {
                if (room === null) {
                    if (message.hasSubscribetoroom()) {
                        const roomId = message.getSubscribetoroom();
                        socketManager
                            .handleJoinAdminRoom(admin, roomId)
                            .then((gameRoom: GameRoom) => {
                                room = gameRoom;
                            })
                            .catch((e) => console.error(e));
                    } else {
                        throw new Error("The first message sent MUST be of type JoinRoomMessage");
                    }
                }
            } catch (e) {
                emitError(call, e);
                call.end();
            }
        });

        call.on("end", () => {
            debug("joinRoom ended");
            if (room !== null) {
                socketManager.leaveAdminRoom(room, admin);
            }
            call.end();
            room = null;
        });

        call.on("error", (err: Error) => {
            console.error("An error occurred in joinAdminRoom stream:", err);
        });
    },
    sendAdminMessage(call: ServerUnaryCall<AdminMessage>, callback: sendUnaryData<EmptyMessage>): void {
        socketManager
            .sendAdminMessage(
                call.request.getRoomid(),
                call.request.getRecipientuuid(),
                call.request.getMessage(),
                call.request.getType()
            )
            .catch((e) => console.error(e));

        callback(null, new EmptyMessage());
    },
    sendGlobalAdminMessage(call: ServerUnaryCall<AdminGlobalMessage>, callback: sendUnaryData<EmptyMessage>): void {
        throw new Error("Not implemented yet");
        // TODO
        callback(null, new EmptyMessage());
    },
    ban(call: ServerUnaryCall<BanMessage>, callback: sendUnaryData<EmptyMessage>): void {
        // FIXME Work in progress
        socketManager
            .banUser(call.request.getRoomid(), call.request.getRecipientuuid(), call.request.getMessage())
            .catch((e) => console.error(e));

        callback(null, new EmptyMessage());
    },
    sendAdminMessageToRoom(call: ServerUnaryCall<AdminRoomMessage>, callback: sendUnaryData<EmptyMessage>): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager
            .sendAdminRoomMessage(call.request.getRoomid(), call.request.getMessage(), call.request.getType())
            .catch((e) => console.error(e));
        callback(null, new EmptyMessage());
    },
    sendWorldFullWarningToRoom(
        call: ServerUnaryCall<WorldFullWarningToRoomMessage>,
        callback: sendUnaryData<EmptyMessage>
    ): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.dispatchWorldFullWarning(call.request.getRoomid()).catch((e) => console.error(e));
        callback(null, new EmptyMessage());
    },
    sendRefreshRoomPrompt(
        call: ServerUnaryCall<RefreshRoomPromptMessage>,
        callback: sendUnaryData<EmptyMessage>
    ): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.dispatchRoomRefresh(call.request.getRoomid()).catch((e) => console.error(e));
        callback(null, new EmptyMessage());
    },
};

export { roomManager };
