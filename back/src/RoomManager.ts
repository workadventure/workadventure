import { clearInterval } from "timers";
import type {
    AdminGlobalMessage,
    AdminMessage,
    AdminPusherToBackMessage,
    AdminRoomMessage,
    BanMessage,
    BatchToPusherRoomMessage,
    EventRequest,
    EventResponse,
    PingMessage,
    PusherToBackMessage,
    PusherToBackRoomMessage,
    RefreshRoomPromptMessage,
    RoomsList,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    VariableRequest,
    WorldFullWarningToRoomMessage,
} from "@workadventure/messages";
import type { RoomManagerServer } from "@workadventure/messages/src/ts-proto-generated/services";
import type { sendUnaryData, ServerDuplexStream, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js";
import Debug from "debug";
import type { Empty } from "@workadventure/messages/src/ts-proto-generated/google/protobuf/empty";
import * as Sentry from "@sentry/node";
import { socketManager } from "./Services/SocketManager";
import { emitError, emitErrorOnAdminSocket, emitErrorOnRoomSocket } from "./Services/MessageHelpers";
import type { User, UserSocket } from "./Model/User";
import type { GameRoom } from "./Model/GameRoom";
import { Admin } from "./Model/Admin";
import { getMapStorageClient } from "./Services/MapStorageClient";

const debug = Debug("roommanager");

export type AdminSocket = ServerDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
export type RoomSocket = ServerDuplexStream<PusherToBackRoomMessage, BatchToPusherRoomMessage>;
export type VariableSocket = ServerWritableStream<VariableRequest, unknown>;
export type EventSocket = ServerWritableStream<EventRequest, EventResponse>;

// Maximum time to wait for a pong answer to a ping before closing connection.
// Note: PONG_TIMEOUT must be less than PING_INTERVAL
const PONG_TIMEOUT = 70000; // PONG_TIMEOUT is > 1 minute because of Chrome heavy throttling. See: https://docs.google.com/document/d/11FhKHRcABGS4SWPFGwoL6g0ALMqrFKapCk5ZTKKupEk/edit#
const PING_INTERVAL = 80000;

const roomManager = {
    joinRoom: (call: UserSocket): void => {
        let room: GameRoom | null = null;
        let user: User | null = null;
        let pongTimeoutId: NodeJS.Timeout | undefined;

        call.on("data", (message: PusherToBackMessage) => {
            // On each message, let's reset the pong timeout
            if (pongTimeoutId) {
                clearTimeout(pongTimeoutId);
                pongTimeoutId = undefined;
            }

            (async () => {
                if (!message.message) {
                    console.error("Empty message received");
                    Sentry.captureException(`Empty message received ${JSON.stringify(room)}`);
                    return;
                }

                try {
                    if (room === null || user === null) {
                        if (message.message.$case === "joinRoomMessage") {
                            socketManager
                                .handleJoinRoom(call, message.message.joinRoomMessage)
                                .then(({ room: gameRoom, user: myUser }) => {
                                    if (call.writable) {
                                        room = gameRoom;
                                        user = myUser;
                                    } else {
                                        // Connection may have been closed before the init was finished, so we have to manually disconnect the user.
                                        // TODO: Remove this debug line
                                        console.info(
                                            "message handleJoinRoom connection have been closed before. Check 'call.writable': ",
                                            call.writable
                                        );
                                        socketManager.leaveRoom(gameRoom, myUser);
                                    }
                                })
                                .catch((e) => {
                                    console.error("message handleJoinRoom error: ", e);
                                    Sentry.captureException(e);
                                    emitError(call, e);
                                });
                        } else if (message.message.$case !== "pingMessage") {
                            throw new Error("The first message sent MUST be of type JoinRoomMessage");
                        }
                    } else {
                        switch (message.message.$case) {
                            case "joinRoomMessage": {
                                throw new Error("Cannot call JoinRoomMessage twice!");
                            }
                            case "userMovesMessage": {
                                socketManager.handleUserMovesMessage(room, user, message.message.userMovesMessage);
                                break;
                            }
                            case "itemEventMessage": {
                                socketManager.handleItemEvent(room, user, message.message.itemEventMessage);
                                break;
                            }
                            case "variableMessage": {
                                await socketManager.handleVariableEvent(room, user, message.message.variableMessage);
                                break;
                            }
                            case "queryMessage": {
                                await socketManager.handleQueryMessage(room, user, message.message.queryMessage);
                                break;
                            }
                            case "abortQueryMessage": {
                                socketManager.handleAbortQueryMessage(room, user, message.message.abortQueryMessage);
                                break;
                            }
                            case "emotePromptMessage": {
                                socketManager.handleEmoteEventMessage(room, user, message.message.emotePromptMessage);
                                break;
                            }
                            case "followRequestMessage": {
                                socketManager.handleFollowRequestMessage(
                                    room,
                                    user,
                                    message.message.followRequestMessage
                                );
                                break;
                            }
                            case "followConfirmationMessage": {
                                socketManager.handleFollowConfirmationMessage(
                                    room,
                                    user,
                                    message.message.followConfirmationMessage
                                );
                                break;
                            }
                            case "followAbortMessage": {
                                socketManager.handleFollowAbortMessage(room, user, message.message.followAbortMessage);
                                break;
                            }
                            case "lockGroupPromptMessage": {
                                socketManager.handleLockGroupPromptMessage(
                                    room,
                                    user,
                                    message.message.lockGroupPromptMessage
                                );
                                break;
                            }
                            case "editMapCommandMessage": {
                                room.forwardEditMapCommandMessage(user, message.message.editMapCommandMessage);
                                break;
                            }
                            case "sendUserMessage": {
                                socketManager.handleSendUserMessage(user, message.message.sendUserMessage);
                                break;
                            }
                            case "banUserMessage": {
                                socketManager.handleBanUserMessage(room, user, message.message.banUserMessage);
                                break;
                            }
                            case "setPlayerDetailsMessage": {
                                socketManager.handleSetPlayerDetails(
                                    room,
                                    user,
                                    message.message.setPlayerDetailsMessage
                                );
                                break;
                            }
                            case "pingMessage": {
                                // Do nothing
                                break;
                            }
                            case "askPositionMessage": {
                                socketManager.handleAskPositionMessage(room, user, message.message.askPositionMessage);
                                break;
                            }
                            case "publicEvent":
                            case "privateEvent": {
                                throw new Error("Cannot reach here, this is handled by the space manager");
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }
                    }
                } catch (e) {
                    console.error(
                        "An error occurred while managing a message of type PusherToBackMessage:" +
                            message.message.$case,
                        e
                    );
                    Sentry.captureException(e);
                    emitError(call, e);
                    call.end();
                }
            })().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        });

        const closeConnection = () => {
            if (user !== null && room !== null) {
                socketManager.leaveRoom(room, user);
            }
            if (pingIntervalId) {
                clearInterval(pingIntervalId);
            }
            if (pongTimeoutId) {
                clearTimeout(pongTimeoutId);
                pongTimeoutId = undefined;
            }
            call.end();
            room = null;
            user = null;
        };

        call.on("end", () => {
            debug("joinRoom ended for user %s", user?.name);
            closeConnection();
        });

        call.on("error", (err: unknown) => {
            // Note: it seems "end" is called before "error" and therefore, user is null
            console.error("An error occurred in joinRoom stream for user", user?.name, ":", err);
            Sentry.captureException(err, {
                user: user ?? undefined,
            });
            closeConnection();
        });

        // Let's set up a ping mechanism
        const serverToClientMessage: ServerToClientMessage = {
            message: {
                $case: "batchMessage",
                batchMessage: {
                    event: "",
                    payload: [
                        {
                            message: {
                                $case: "pingMessage",
                                pingMessage: {},
                            },
                        },
                    ],
                },
            },
        };

        // Ping requests are sent from the server because the setTimeout on the browser is unreliable when the tab is hidden.
        const pingIntervalId = setInterval(() => {
            call.write(serverToClientMessage);

            if (pongTimeoutId) {
                console.warn("Warning, emitting a new ping message before previous pong message was received.");
                clearTimeout(pongTimeoutId);
            }
            const today = new Date();
            pongTimeoutId = setTimeout(() => {
                console.info(
                    "Connection lost with user ",
                    user?.uuid,
                    user?.name,
                    "in room",
                    room?.roomUrl,
                    "at : ",
                    today.toLocaleString("en-GB")
                );
                call.write({
                    message: {
                        $case: "errorMessage",
                        errorMessage: {
                            message:
                                "Connection lost with user. The user did not send a pong message in time. You should never see this message in the browser.",
                        },
                    },
                });
                closeConnection();
            }, PONG_TIMEOUT);
        }, PING_INTERVAL);
    },

    listenRoom(call: RoomSocket): void {
        debug("listenRoom called");
        let roomId: string | null = null;
        const subscribedZones = new Map<string, { x: number; y: number }>();
        // We use this promise to serialize the processing of incoming messages. Only one message is processed at a time.
        let messageProcessingPromise = Promise.resolve();

        call.on("data", (message: PusherToBackRoomMessage) => {
            messageProcessingPromise = messageProcessingPromise
                .then(async () => {
                    if (!message.message) {
                        console.error("Empty message received in listenRoom");
                        Sentry.captureException("Empty message received in listenRoom");
                        return;
                    }

                    try {
                        switch (message.message.$case) {
                            case "initRoomMessage": {
                                const initMessage = message.message.initRoomMessage;
                                roomId = initMessage.roomId;
                                await socketManager.addRoomListener(call, roomId);
                                break;
                            }
                            case "subscribeZoneMessage": {
                                const subscribeMessage = message.message.subscribeZoneMessage;
                                if (roomId === null) {
                                    throw new Error(`subscribeZoneMessage called before initRoomMessage`);
                                }

                                const zoneKey = `${subscribeMessage.x},${subscribeMessage.y}`;
                                if (subscribedZones.has(zoneKey)) {
                                    console.warn(
                                        `WARNING: Double subscription to zone (${subscribeMessage.x},${subscribeMessage.y}) in room ${roomId}. This indicates a bug in the pusher.`
                                    );
                                    return;
                                }

                                subscribedZones.set(zoneKey, { x: subscribeMessage.x, y: subscribeMessage.y });
                                await socketManager.addZoneListener(
                                    call,
                                    roomId,
                                    subscribeMessage.x,
                                    subscribeMessage.y
                                );
                                break;
                            }
                            case "unsubscribeZoneMessage": {
                                const unsubscribeMessage = message.message.unsubscribeZoneMessage;
                                if (roomId === null) {
                                    throw new Error(`unsubscribeZoneMessage called before initRoomMessage`);
                                }

                                const zoneKey = `${unsubscribeMessage.x},${unsubscribeMessage.y}`;
                                if (!subscribedZones.has(zoneKey)) {
                                    console.warn(
                                        `Attempting to unsubscribe from non-subscribed zone (${unsubscribeMessage.x},${unsubscribeMessage.y})`
                                    );
                                    return;
                                }

                                subscribedZones.delete(zoneKey);
                                await socketManager.removeZoneListener(
                                    call,
                                    roomId,
                                    unsubscribeMessage.x,
                                    unsubscribeMessage.y
                                );
                                break;
                            }
                            default: {
                                const _exhaustiveCheck: never = message.message;
                            }
                        }
                    } catch (e) {
                        console.error("An error occurred while managing a listenRoom message:", e);
                        Sentry.captureException(e);
                        emitErrorOnRoomSocket(call, e);
                    }
                })
                .catch((e) => {
                    console.error(e);
                    Sentry.captureException(e, { tags: { roomId: roomId || "unknown" } });
                });
        });

        const cleanupAllZones = async () => {
            if (roomId !== null) {
                try {
                    await socketManager.removeRoomListener(call, roomId);
                } finally {
                    const theRoomId = roomId;
                    await Promise.all(
                        Array.from(subscribedZones.values()).map((zone) =>
                            socketManager.removeZoneListener(call, theRoomId, zone.x, zone.y)
                        )
                    );
                }
            }
        };

        call.on("cancelled", () => {
            debug("listenRoom cancelled");
            cleanupAllZones()
                .catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                })
                .finally(() => {
                    call.end();
                });
        });

        call.on("close", () => {
            debug("listenRoom connection closed");
            cleanupAllZones().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }).on("error", (e) => {
            console.error("An error occurred in listenRoom stream:", e);
            Sentry.captureException(`An error occurred in listenRoom stream: ${JSON.stringify(e)}`);
            cleanupAllZones()
                .catch((e) => {
                    console.error(e);
                    Sentry.captureException(e);
                })
                .finally(() => {
                    call.end();
                });
        });
    },

    adminRoom(call: AdminSocket): void {
        const admin = new Admin(call);
        let room: GameRoom | null = null;

        call.on("data", (message: AdminPusherToBackMessage) => {
            try {
                if (!message.message) {
                    console.error("Received an empty message in adminRoom");
                    Sentry.captureException(`Received an empty message in adminRoom ${JSON.stringify(room)}`);
                    return;
                }
                if (room === null) {
                    if (message.message.$case === "subscribeToRoom") {
                        const roomId = message.message.subscribeToRoom;
                        socketManager
                            .handleJoinAdminRoom(admin, roomId)
                            .then((gameRoom: GameRoom) => {
                                room = gameRoom;
                            })
                            .catch((e) => {
                                console.error(e);
                                Sentry.captureException(e);
                            });
                    } else {
                        throw new Error("The first message sent MUST be of type JoinRoomMessage");
                    }
                }
            } catch (e) {
                emitErrorOnAdminSocket(call, e);
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
            Sentry.captureException(`An error occurred in joinAdminRoom stream: ${JSON.stringify(err)}`);
        });
    },
    sendAdminMessage(call: ServerUnaryCall<AdminMessage, Empty>, callback: sendUnaryData<Empty>): void {
        const adminMessage = call.request;
        socketManager
            .sendAdminMessage(adminMessage.roomId, adminMessage.recipientUuid, adminMessage.message, adminMessage.type)
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });

        callback(null, {});
    },
    sendGlobalAdminMessage(call: ServerUnaryCall<AdminGlobalMessage, Empty>, callback: sendUnaryData<Empty>): void {
        throw new Error("Not implemented yet");
        // TODO
        callback(null, {});
    },
    ban(call: ServerUnaryCall<BanMessage, Empty>, callback: sendUnaryData<Empty>): void {
        // FIXME Work in progress
        socketManager.banUser(call.request.roomId, call.request.recipientUuid, call.request.message).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });

        callback(null, {});
    },
    sendAdminMessageToRoom(call: ServerUnaryCall<AdminRoomMessage, Empty>, callback: sendUnaryData<Empty>): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.sendAdminRoomMessage(call.request.roomId, call.request.message, call.request.type).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
        callback(null, {});
    },
    sendWorldFullWarningToRoom(
        call: ServerUnaryCall<WorldFullWarningToRoomMessage, Empty>,
        callback: sendUnaryData<Empty>
    ): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.dispatchWorldFullWarning(call.request.roomId).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
        callback(null, {});
    },
    sendRefreshRoomPrompt(
        call: ServerUnaryCall<RefreshRoomPromptMessage, Empty>,
        callback: sendUnaryData<Empty>
    ): void {
        // FIXME: we could improve return message by returning a Success|ErrorMessage message
        socketManager.dispatchRoomRefresh(call.request.roomId).catch((e) => {
            console.error(e);
            Sentry.captureException(e);
        });
        callback(null, {});
    },
    getRooms(call: ServerUnaryCall<Empty, Empty>, callback: sendUnaryData<RoomsList>): void {
        callback(null, socketManager.getAllRooms());
    },
    ping(call: ServerUnaryCall<PingMessage, Empty>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    readVariable(call, callback) {
        socketManager
            .readVariable(call.request.room, call.request.name)
            .then((value) => {
                callback(null, value === undefined ? undefined : JSON.parse(value));
            })
            .catch((error) => {
                throw error;
            });
    },
    listenVariable(call) {
        socketManager.addVariableListener(call).catch((e) => {
            call.end();
        });

        call.on("cancelled", () => {
            socketManager.removeVariableListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            call.end();
        });

        call.on("close", () => {
            socketManager.removeVariableListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }).on("error", (e) => {
            socketManager.removeVariableListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            call.end(e);
        });
    },
    saveVariable(call, callback) {
        socketManager
            .saveVariable(call.request.room, call.request.name, JSON.stringify(call.request.value))
            .then(() => {
                callback(null);
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureException(error);
                throw error;
            });
    },
    handleMapStorageUploadMapDetected(call) {
        /**
         * We are calling the mapstorage connected to this back server and asking to purge the wamUrl from memory.
         * We are not sure this particular mapstorage has this particular WAM map in memory. But since the message
         * is dispatched to all back servers, one of the back servers will be connected to the correct map storage.
         */
        getMapStorageClient().handleClearAfterUpload(
            {
                wamUrl: call.request.wamUrl,
            },
            (err) => {
                if (err) {
                    console.error(err);
                    Sentry.captureException(err);
                    return;
                }
                Promise.all(socketManager.getWorlds().values())
                    .then((gameRooms) => {
                        for (const gameRoom of gameRooms) {
                            if (gameRoom.wamUrl === call.request.wamUrl) {
                                gameRoom.sendRefreshRoomMessageToUsers();
                            }
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        Sentry.captureException(error);
                    });
            }
        );
    },
    /** Dispatch an event to all users in the room */
    dispatchEvent(call, callback) {
        socketManager
            .dispatchEvent(call.request.room, call.request.name, call.request.data, call.request.targetUserIds)
            .then(() => {
                callback(null);
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureException(error);
                throw error;
            });
    },
    /** Listen to events dispatched in the room */
    listenEvent(call) {
        socketManager.addEventListener(call).catch((e) => {
            call.end();
        });

        call.on("cancelled", () => {
            socketManager.removeEventListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            call.end();
        });

        call.on("close", () => {
            socketManager.removeEventListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
        }).on("error", (e) => {
            socketManager.removeEventListener(call).catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            console.error(e);
            Sentry.captureException(e);
            call.end();
        });
    },
    dispatchGlobalEvent(call, callback) {
        socketManager.dispatchGlobalEvent(call.request.name, call.request.value);
        callback(null);
    },
    /** Dispatch external module event */
    dispatchExternalModuleMessage(call) {
        socketManager.handleExternalModuleMessage(call.request).catch((e) => console.error(e));
    },
} satisfies RoomManagerServer;

export { roomManager };
