import { ISpaceManagerServer } from "./Messages/generated/services_grpc_pb";
import { uuid } from "uuidv4";
import { Pusher } from "./Model/Pusher";
import {
    AddSpaceUserMessage,
    BackToPusherSpaceMessage,
    PusherToBackSpaceMessage,
    RemoveSpaceUserMessage,
    UnwatchSpaceMessage,
    UpdateSpaceUserMessage,
    WatchSpaceMessage,
} from "./Messages/generated/messages_pb";
import { socketManager } from "./Services/SocketManager";
import Debug from "debug";
import { ServerDuplexStream } from "@grpc/grpc-js";

export type SpaceSocket = ServerDuplexStream<PusherToBackSpaceMessage, BackToPusherSpaceMessage>;

const debug = Debug("spacemanager");

const spaceManager: ISpaceManagerServer = {
    watchSpace: (call: SpaceSocket): void => {
        debug("watchSpace called");
        const pusherUuid = uuid();
        const pusher = new Pusher(pusherUuid, call);

        call.on("data", (message: PusherToBackSpaceMessage) => {
            if (message.hasWatchspacemessage()) {
                socketManager.handleWatchSpaceMessage(pusher, message.getWatchspacemessage() as WatchSpaceMessage);
            } else if (message.hasUnwatchspacemessage()) {
                socketManager.handleUnwatchSpaceMessage(
                    pusher,
                    message.getUnwatchspacemessage() as UnwatchSpaceMessage
                );
            } else if (message.hasAddspaceusermessage()) {
                socketManager.handleAddSpaceUserMessage(
                    pusher,
                    message.getAddspaceusermessage() as AddSpaceUserMessage
                );
            } else if (message.hasUpdatespaceusermessage()) {
                socketManager.handleUpdateSpaceUserMessage(
                    pusher,
                    message.getUpdatespaceusermessage() as UpdateSpaceUserMessage
                );
            } else if (message.hasRemovespaceusermessage()) {
                socketManager.handleRemoveSpaceUserMessage(
                    pusher,
                    message.getRemovespaceusermessage() as RemoveSpaceUserMessage
                );
            }
        });

        call.on("end", () => {
            debug("watchSpace ended");
            socketManager.handleUnwatchAllSpaces(pusher);

            call.end();
        });
    },
};

export { spaceManager };
