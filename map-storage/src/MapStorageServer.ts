import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import * as _ from "lodash";
import { AreaData, AreaType } from "@workadventure/map-editor";
import { mapsManager } from "./MapsManager";
import {
    EditMapCommandMessage,
    EditMapCommandWithKeyMessage,
    EmptyMessage,
    PingMessage,
} from "@workadventure/messages";

import { MapStorageServer } from "@workadventure/messages/src/ts-proto-generated/services";

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
            callback({ name: "MapStorageError", message: "EditMapCommand message does not exist" }, null);
            return;
        }
        const gameMap = mapsManager.getGameMap(call.request.mapKey);
        if (!gameMap) {
            callback(
                { name: "MapStorageError", message: `Could not find the game map of ${call.request.mapKey} key!` },
                { id: editMapCommandMessage.id, editMapMessage: undefined }
            );
            return;
        }
        const editMapMessage = editMapCommandMessage.editMapMessage.message;
        let validCommand = false;
        try {
            switch (editMapMessage.$case) {
                case "modifyAreaMessage": {
                    const message = editMapMessage.modifyAreaMessage;
                    const area = gameMap.getGameMapAreas().getArea(message.id, AreaType.Static);
                    if (area) {
                        const areaObjectConfig: AreaData = structuredClone(area);
                        _.merge(areaObjectConfig, message);
                        validCommand = mapsManager.executeCommand(call.request.mapKey, {
                            type: "UpdateAreaCommand",
                            areaObjectConfig,
                        });
                    } else {
                        console.log(`Could not find area with id: ${message.id}`);
                    }
                    break;
                }
                case "createAreaMessage": {
                    const message = editMapMessage.createAreaMessage;
                    const areaObjectConfig: AreaData = {
                        ...message,
                        properties: {
                            customProperties: {},
                        },
                        visible: true,
                    };
                    validCommand = mapsManager.executeCommand(call.request.mapKey, {
                        areaObjectConfig,
                        type: "CreateAreaCommand",
                    });
                    break;
                }
                case "deleteAreaMessage": {
                    const message = editMapMessage.deleteAreaMessage;
                    validCommand = mapsManager.executeCommand(call.request.mapKey, {
                        type: "DeleteAreaCommand",
                        id: message.id,
                    });
                    break;
                }
                case "createEntityMessage": {
                    const message = editMapMessage.createEntityMessage;
                    const entityPrefab = mapsManager.getEntityPrefab(message.collecionName, message.prefabId);
                    if (!entityPrefab) {
                        throw new Error(`CANNOT FIND PREFAB FOR: ${message.collecionName} ${message.prefabId}`);
                    }
                    validCommand = mapsManager.executeCommand(call.request.mapKey, {
                        type: "CreateEntityCommand",
                        entityData: {
                            id: message.id,
                            prefab: entityPrefab,
                            x: message.x,
                            y: message.y,
                            interactive: true,
                        },
                    });
                    break;
                }
                case "deleteEntityMessage": {
                    const message = editMapMessage.deleteEntityMessage;
                    validCommand = mapsManager.executeCommand(call.request.mapKey, {
                        type: "DeleteEntityCommand",
                        id: message.id,
                    });
                    break;
                }
                default: {
                    throw new Error(`UNKNOWN EDIT MAP MESSAGE CASE. THIS SHOULD NOT BE POSSIBLE`);
                }
            }
            // send edit map message back as a valid one
            if (validCommand) {
                callback(null, editMapCommandMessage);
            }
        } catch (e) {
            console.log(e);
            callback({ name: "MapStorageError", message: `${e}` }, null);
        }
    },
};

export { mapStorageServer };
