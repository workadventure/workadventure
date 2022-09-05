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
        try {
            switch (editMapMessage.message.$case) {
                case "modifyAreaMessage": {
                    const message = editMapMessage.message.modifyAreaMessage;
                    const area = gameMap.getGameMapAreas().getArea(message.id, AreaType.Static);
                    if (area) {
                        const areaObjectConfig: ITiledMapRectangleObject = {
                            ...area,
                            ...message,
                        };
                        mapsManager.executeCommand(call.request.mapKey, {
                            type: "UpdateAreaCommand",
                            areaObjectConfig,
                        });
                    }
                    break;
                }
                case "createAreaMessage": {
                    // const message = editMapMessage.message.createAreaMessage;
                    // mapsManager.executeCommand(call.request.mapKey, {
                    //     type: "DeleteAreaCommand",
                    //     id: message.id,
                    // });
                    break;
                }
                case "deleteAreaMessage": {
                    const message = editMapMessage.message.deleteAreaMessage;
                    console.log("DELETE AREA MESSAGE HANDLED");
                    mapsManager.executeCommand(call.request.mapKey, {
                        type: "DeleteAreaCommand",
                        id: message.id,
                    });
                    break;
                }
                default: {
                    throw new Error(`UNKNOWN EDIT MAP MESSAGE CASE. THIS SHOULD NOT BE POSSIBLE`);
                }
            }
            // send edit map message back as a valid one
            callback(null, editMapMessage);
        } catch (e) {
            console.log(e);
            // do not send editMap message back?
            callback(null, {});
        }
    },
};

export { mapStorageServer };
