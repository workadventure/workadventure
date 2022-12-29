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
        const newestCommandId = mapsManager.getGameMap(call.request.mapKey)?.getLatestCommandId();
        let commandsToApply: EditMapCommandMessage[] = [];
        console.log(`CLIENT LAST COMMAND: ${updateMapToNewestMessage.commandId}`);
        console.log(`LOADED MAP LAST COMMAND: ${mapsManager.getGameMap(call.request.mapKey)?.getLatestCommandId()}`);
        if (clientCommandId !== newestCommandId) {
            commandsToApply = mapsManager.getCommandsNewerThan(call.request.mapKey, updateMapToNewestMessage.commandId);
        }
        const editMapCommandsArrayMessage: EditMapCommandsArrayMessage = {
            editMapCommands: commandsToApply,
        };
        console.log("TRY TO APPLY THESE COMMANDS");
        console.log(commandsToApply.map((command) => command.id));
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
        const gameMap = mapsManager.getGameMap(call.request.mapKey);
        if (!gameMap) {
            callback(
                { name: "MapStorageError", message: `Could not find the game map of ${call.request.mapKey} key!` },
                { id: editMapCommandMessage.id, editMapMessage: undefined }
            );
            return;
        }
        const commandId = editMapCommandMessage.id;
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
                        validCommand = mapsManager.executeCommand(
                            call.request.mapKey,
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
                    validCommand = mapsManager.executeCommand(
                        call.request.mapKey,
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
                    validCommand = mapsManager.executeCommand(
                        call.request.mapKey,
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
                        validCommand = mapsManager.executeCommand(
                            call.request.mapKey,
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
                    const entityPrefab = mapsManager.getEntityPrefab(message.collecionName, message.prefabId);
                    if (!entityPrefab) {
                        throw new Error(`CANNOT FIND PREFAB FOR: ${message.collecionName} ${message.prefabId}`);
                    }
                    validCommand = mapsManager.executeCommand(
                        call.request.mapKey,
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
                    validCommand = mapsManager.executeCommand(
                        call.request.mapKey,
                        {
                            type: "DeleteEntityCommand",
                            id: message.id,
                        },
                        commandId
                    );
                    break;
                }
                default: {
                    throw new Error(`UNKNOWN EDIT MAP MESSAGE CASE. THIS SHOULD NOT BE POSSIBLE`);
                }
            }
            // send edit map message back as a valid one
            if (validCommand) {
                mapsManager.addCommandToQueue(call.request.mapKey, editMapCommandMessage);
                setTimeout(() => {
                    callback(null, editMapCommandMessage);
                }, 5000);
                // callback(null, editMapCommandMessage);
            }
        } catch (e) {
            console.log(e);
            callback({ name: "MapStorageError", message: `${e}` }, null);
        }
    },
};

export { mapStorageServer };
