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
                    case "watchSpaceMessage": {
                        socketManager.handleWatchSpaceMessage(pusher, message.message.watchSpaceMessage);
                        break;
                    }
                    case "unwatchSpaceMessage": {
                        socketManager.handleUnwatchSpaceMessage(pusher, message.message.unwatchSpaceMessage);
                        break;
                    }
                    case "addSpaceUserMessage": {
                        socketManager.handleAddSpaceUserMessage(pusher, message.message.addSpaceUserMessage);
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
                    case "removeSpaceUserMessage": {
                        socketManager.handleRemoveSpaceUserMessage(pusher, message.message.removeSpaceUserMessage);
                        break;
                    }
                    case "pongMessage": {
                        pusher.receivedPong();
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
                call.end();
            }
        })
            .on("error", (e) => {
                console.error("Error on watchSpace", e);
                Sentry.captureException(`Error on watchSpace ${JSON.stringify(e)}`);
                socketManager.handleUnwatchAllSpaces(pusher);
            })
            .on("end", () => {
                socketManager.handleUnwatchAllSpaces(pusher);
                debug("watchSpace => ended %s", pusher.id);
                call.end();
            });
    },
} satisfies SpaceManagerServer;

export { spaceManager };
