import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import * as _ from "lodash";
import { AreaData, AreaType } from "@workadventure/map-editor";
import { mapsManager } from "./MapsManager";
import {
    EditMapCommandMessage,
    EditMapCommandsArrayMessage,
    EditMapCommandWithKeyMessage,
    EmptyMessage,
    PingMessage,
    UpdateMapToNewestWithKeyMessage,
} from "@workadventure/messages";

import { MapStorageServer } from "@workadventure/messages/src/ts-proto-generated/services";
import { mapPathUsingDomain } from "./Services/PathMapper";

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, EmptyMessage>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleUpdateMapToNewestMessage(
        call: ServerUnaryCall<UpdateMapToNewestWithKeyMessage, EmptyMessage>,
        callback: sendUnaryData<EditMapCommandsArrayMessage>
    ): void {
        const updateMapToNewestMessage = call.request.updateMapToNewestMessage;
        if (!updateMapToNewestMessage) {
            callback({ name: "MapStorageError", message: "UpdateMapToNewest message does not exist" }, null);
            return;
        }
        const clientCommandId = updateMapToNewestMessage.commandId;
        const newestCommandId = mapsManager.getGameMap(call.request.mapKey)?.getLastCommandId();
        let commandsToApply: EditMapCommandMessage[] = [];
        if (clientCommandId !== newestCommandId) {
            commandsToApply = mapsManager.getCommandsNewerThan(call.request.mapKey, updateMapToNewestMessage.commandId);
        }
        const editMapCommandsArrayMessage: EditMapCommandsArrayMessage = {
            editMapCommands: commandsToApply,
        };
        callback(null, editMapCommandsArrayMessage);
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
        try {
            // The mapKey is the complete URL to the map. Let's map it to our virtual path.
            const mapUrl = new URL(call.request.mapKey);
            const mapKey = mapPathUsingDomain(mapUrl.pathname, mapUrl.hostname);

            const gameMap = mapsManager.getGameMap(mapKey);
            if (!gameMap) {
                callback(
                    { name: "MapStorageError", message: `Could not find the game map of ${mapKey} key!` },
                    { id: editMapCommandMessage.id, editMapMessage: undefined }
                );
                return;
            }
            const editMapMessage = editMapCommandMessage.editMapMessage.message;
            const commandId = editMapCommandMessage.id;
            switch (editMapMessage.$case) {
                case "modifyAreaMessage": {
                    const message = editMapMessage.modifyAreaMessage;
                    const area = gameMap.getGameMapAreas().getArea(message.id, AreaType.Static);
                    if (area) {
                        const areaObjectConfig: AreaData = structuredClone(area);
                        _.merge(areaObjectConfig, message);
                        mapsManager.executeCommand(
                            mapKey,
                            {
                                type: "UpdateAreaCommand",
                                areaObjectConfig,
                            },
                            commandId
                        );
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
                    mapsManager.executeCommand(
                        mapKey,
                        {
                            areaObjectConfig,
                            type: "CreateAreaCommand",
                        },
                        commandId
                    );
                    break;
                }
                case "deleteAreaMessage": {
                    const message = editMapMessage.deleteAreaMessage;
                    mapsManager.executeCommand(
                        mapKey,
                        {
                            type: "DeleteAreaCommand",
                            id: message.id,
                        },
                        commandId
                    );
                    break;
                }
                case "modifyEntityMessage": {
                    const message = editMapMessage.modifyEntityMessage;
                    const entity = gameMap.getGameMapEntities().getEntity(message.id);
                    if (entity) {
                        mapsManager.executeCommand(
                            mapKey,
                            {
                                type: "UpdateEntityCommand",
                                dataToModify: message,
                            },
                            commandId
                        );
                    } else {
                        console.log(`Could not find entity with id: ${message.id}`);
                    }
                    break;
                }
                case "createEntityMessage": {
                    const message = editMapMessage.createEntityMessage;
                    const entityPrefab = mapsManager.getEntityPrefab(message.collectionName, message.prefabId);
                    if (!entityPrefab) {
                        throw new Error(`CANNOT FIND PREFAB FOR: ${message.collectionName} ${message.prefabId}`);
                    }
                    mapsManager.executeCommand(
                        mapKey,
                        {
                            type: "CreateEntityCommand",
                            entityData: {
                                id: message.id,
                                prefab: entityPrefab,
                                x: message.x,
                                y: message.y,
                            },
                        },
                        commandId
                    );
                    break;
                }
                case "deleteEntityMessage": {
                    const message = editMapMessage.deleteEntityMessage;
                    mapsManager.executeCommand(
                        mapKey,
                        {
                            type: "DeleteEntityCommand",
                            id: message.id,
                        },
                        commandId
                    );
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = editMapMessage;
                }
            }
            // send edit map message back as a valid one
            mapsManager.addCommandToQueue(call.request.mapKey, editMapCommandMessage);
            callback(null, editMapCommandMessage);
        } catch (e) {
            console.log(e);
            let message: string;
            if (typeof e === "object" && e !== null) {
                message = e.toString();
            } else {
                message = "Unknown error";
            }
            callback({ name: "MapStorageError", message }, null);
        }
    },
};

export { mapStorageServer };
