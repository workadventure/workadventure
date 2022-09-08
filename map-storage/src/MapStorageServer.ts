import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import { AreaType, ITiledMapRectangleObject } from "@workadventure/map-editor";
import { mapsManager } from "./MapsManager";
import {
    EditMapCommandMessage,
    EditMapCommandWithKeyMessage,
    EmptyMessage,
    MapStorageServer,
    PingMessage,
} from "./Messages/ts-proto-map-storage-generated/protos/messages";

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, EmptyMessage>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleEditMapCommandWithKeyMessage(
        call: ServerUnaryCall<EditMapCommandWithKeyMessage, EmptyMessage>,
        callback: sendUnaryData<EditMapCommandMessage>
    ): void {
        const editMapCommandMessage = call.request.editMapCommandMessage;
        if (!editMapCommandMessage || !editMapCommandMessage.editMapMessage?.message) {
            callback(null, { id: "", editMapMessage: undefined });
            return;
        }
        const gameMap = mapsManager.getGameMap(call.request.mapKey);
        if (!gameMap) {
            // TODO: Send an error?
            callback(null, { id: editMapCommandMessage.id, editMapMessage: undefined });
            return;
        }
        const editMapMessage = editMapCommandMessage.editMapMessage.message;
        try {
            switch (editMapMessage.$case) {
                case "modifyAreaMessage": {
                    const message = editMapMessage.modifyAreaMessage;
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
                    const message = editMapMessage.createAreaMessage;
                    console.log(message);
                    const areaObjectConfig: ITiledMapRectangleObject = {
                        ...message,
                        visible: true,
                        class: "area",
                    };
                    mapsManager.executeCommand(call.request.mapKey, {
                        areaObjectConfig,
                        type: "CreateAreaCommand",
                    });
                    break;
                }
                case "deleteAreaMessage": {
                    const message = editMapMessage.deleteAreaMessage;
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
            callback(null, editMapCommandMessage);
        } catch (e) {
            console.log(e);
            // do not send editMap message back?
            callback(null, { id: editMapCommandMessage.id, editMapMessage: undefined });
        }
    },
};

export { mapStorageServer };
