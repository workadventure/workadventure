import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import { AreaType, ITiledMapRectangleObject } from "@workadventure/map-editor";
import { mapsManager } from "./MapsManager";
import {
    EditMapMessage,
    EditMapWithKeyMessage,
    EmptyMessage,
    MapStorageServer,
    PingMessage,
} from "./Messages/ts-proto-map-storage-generated/protos/messages";

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, EmptyMessage>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    // handleNoUsersOnTheMap(
    //     call: ServerUnaryCall<EmptyMapMessage, EmptyMessage>,
    //     callback: sendUnaryData<EmptyMessage>
    // ): void {
    //     const success = mapsManager.clearSaveMapInterval(call.request.mapKey);
    //     if (success) {
    //         console.log(`${call.request.mapKey} save map interval cleared!`);
    //     }
    //     callback(null, {});
    // },
    handleEditMapWithKeyMessage(
        call: ServerUnaryCall<EditMapWithKeyMessage, EmptyMessage>,
        callback: sendUnaryData<EditMapMessage>
    ): void {
        const editMapMessage = call.request.editMapMessage;
        if (!editMapMessage || !editMapMessage.message) {
            callback(null, {});
            return;
        }
        const gameMap = mapsManager.getGameMap(call.request.mapKey);
        if (!gameMap) {
            // TODO: Send an error?
            callback(null, {});
            return;
        }
        switch (editMapMessage.message.$case) {
            case "modifyAreaMessage": {
                const message = editMapMessage.message.modifyAreaMessage;
                const area = gameMap.getGameMapAreas().getArea(message.id, AreaType.Static);
                if (area) {
                    console.log(message);
                    const areaObjectConfig: ITiledMapRectangleObject = {
                        ...area,
                        ...message,
                    };
                    mapsManager.executeCommand(call.request.mapKey, {
                        type: "UpdateAreaCommand",
                        areaObjectConfig,
                    });
                    callback(null, editMapMessage);
                    return;
                }
                break;
            }
            default: {
                break;
            }
        }
        // TODO: Change to EmptyMessage?
        callback(null, {});
    },
};

export { mapStorageServer };
