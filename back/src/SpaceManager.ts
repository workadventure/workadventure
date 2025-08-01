import { SpaceManagerServer } from "@workadventure/messages/src/ts-proto-generated/services";
import { v4 as uuid } from "uuid";
import { BackToPusherSpaceMessage, PusherToBackSpaceMessage } from "@workadventure/messages";
import Debug from "debug";
import { ServerDuplexStream } from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import { socketManager } from "./Services/SocketManager";
import { SpacesWatcher } from "./Model/SpacesWatcher";

export type SpaceSocket = ServerDuplexStream<PusherToBackSpaceMessage, BackToPusherSpaceMessage>;

const debug = Debug("space");

const spaceManager = {
    watchSpace: (call: SpaceSocket): void => {
        debug("watchSpace => called");
        const pusherUuid = uuid();
        const pusher = new SpacesWatcher(pusherUuid, call);

        call.on("data", (message: PusherToBackSpaceMessage) => {
            if (!message.message) {
                console.error("Empty message received");
                Sentry.captureException("Empty message received");
                return;
            }
            try {
                switch (message.message.$case) {
                    case "joinSpaceMessage": {
                        socketManager.handleJoinSpaceMessage(pusher, message.message.joinSpaceMessage);
                        break;
                    }
                    case "leaveSpaceMessage": {
                        socketManager.handleLeaveSpaceMessage(pusher, message.message.leaveSpaceMessage);
                        break;
                    }
                    case "updateSpaceUserMessage": {
                        socketManager.handleUpdateSpaceUserMessage(pusher, message.message.updateSpaceUserMessage);
                        break;
                    }
                    case "updateSpaceMetadataMessage": {
                        socketManager.handleUpdateSpaceMetadataMessage(
                            pusher,
                            message.message.updateSpaceMetadataMessage
                        );
                        break;
                    }
                    case "pongMessage": {
                        pusher.clearPongTimeout();
                        break;
                    }
                    // FIXME: kickOffMessage should go through the room (unless we plan to ban from the user list). If so, it should be a private message.
                    case "kickOffMessage": {
                        socketManager.handleKickSpaceUserMessage(pusher, message.message.kickOffMessage);
                        break;
                    }
                    case "publicEvent": {
                        socketManager.handlePublicEvent(pusher, message.message.publicEvent);
                        break;
                    }
                    case "privateEvent": {
                        socketManager.handlePrivateEvent(pusher, message.message.privateEvent);
                        break;
                    }
                    case "syncSpaceUsersMessage": {
                        socketManager.handleSyncSpaceUsersMessage(pusher, message.message.syncSpaceUsersMessage);
                        break;
                    }
                    case "spaceQueryMessage": {
                        await socketManager.handleSpaceQueryMessage(pusher, message.message.spaceQueryMessage);
                        break;
                    }
                    case "addSpaceUserToNotifyMessage": {
                        await socketManager.handleAddSpaceUserToNotifyMessage(
                            pusher,
                            message.message.addSpaceUserToNotifyMessage
                        );
                        break;
                    }
                    case "deleteSpaceUserToNotifyMessage": {
                        socketManager.handleDeleteSpaceUserToNotifyMessage(
                            pusher,
                            message.message.deleteSpaceUserToNotifyMessage
                        );
                        break;
                    }
                    default: {
                        const _exhaustiveCheck: never = message.message;
                    }
                }
            } catch (e) {
                console.error(
                    "An error occurred while managing a message of type PusherToBackSpaceMessage:" +
                        message.message.$case,
                    e
                );
                Sentry.captureException(
                    "An error occurred while managing a message of type PusherToBackSpaceMessage:" +
                        message.message.$case +
                        JSON.stringify(e)
                );
                // Note: We do not close the back connection on every error to avoid excessive reconnections.
                // When 'end' is triggered, the callback below will handle cleanup.
                // 'error' and 'end' events may not always be triggered together; handle both cases.
                // Consider revising the reconnection logic in pusher to avoid reconnecting to the same back repeatedly.
                //call.end();
            }
        })
            .on("error", (e) => {
                console.error("Error on watchSpace", e);
                Sentry.captureException(`Error on watchSpace ${JSON.stringify(e)}`);
                socketManager.handleUnwatchAllSpaces(pusher);
            })
            .on("end", () => {
                socketManager.handleUnwatchAllSpaces(pusher);
                pusher.end();
                debug("watchSpace => ended %s", pusher.id);
                call.end();
            });
    },
} satisfies SpaceManagerServer;

export { spaceManager };
