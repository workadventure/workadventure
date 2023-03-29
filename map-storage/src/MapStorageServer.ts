import { sendUnaryData, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js";
import { AreaData, EntityDataProperties } from "@workadventure/map-editor";
import {
    EditMapCommandMessage,
    EditMapCommandsArrayMessage,
    EditMapCommandWithKeyMessage,
    EmptyMessage,
    MapStorageToBackMessage,
    MapStorageUrlMessage,
    PingMessage,
    UpdateMapToNewestWithKeyMessage,
} from "@workadventure/messages";

import { MapStorageServer } from "@workadventure/messages/src/ts-proto-generated/services";
import { mapsManager } from "./MapsManager";
import { mapPathUsingDomain } from "./Services/PathMapper";
import { uploadDetector } from "./Services/UploadDetector";

export type MapStorageStream = ServerWritableStream<MapStorageUrlMessage, MapStorageToBackMessage>;

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, EmptyMessage>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    listenToMessages(call: MapStorageStream): void {
        const url = new URL(call.request.mapUrl);
        const mapKey = mapPathUsingDomain(url.pathname, url.hostname);
        uploadDetector.registerStream(mapKey, call);
        call.on("close", () => {
            uploadDetector.clearStream(mapKey, call);
        });
    },
    handleUpdateMapToNewestMessage(
        call: ServerUnaryCall<UpdateMapToNewestWithKeyMessage, EmptyMessage>,
        callback: sendUnaryData<EditMapCommandsArrayMessage>
    ): void {
        const mapUrl = new URL(call.request.mapKey);
        const mapKey = mapPathUsingDomain(mapUrl.pathname, mapUrl.hostname);
        const updateMapToNewestMessage = call.request.updateMapToNewestMessage;
        if (!updateMapToNewestMessage) {
            callback({ name: "MapStorageError", message: "UpdateMapToNewest message does not exist" }, null);
            return;
        }
        const clientCommandId = updateMapToNewestMessage.commandId;
        const lastCommandId = mapsManager.getGameMap(mapKey)?.getLastCommandId();
        let commandsToApply: EditMapCommandMessage[] = [];
        if (clientCommandId !== lastCommandId) {
            commandsToApply = mapsManager.getCommandsNewerThan(mapKey, updateMapToNewestMessage.commandId);
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
                    const area = gameMap.getGameMapAreas()?.getArea(message.id);
                    if (area) {
                        mapsManager.executeCommand(
                            mapKey,
                            {
                                type: "UpdateAreaCommand",
                                dataToModify: message,
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
                    const entity = gameMap.getGameMapEntities()?.getEntity(message.id);
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
                                properties: message.properties as EntityDataProperties,
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
            mapsManager.addCommandToQueue(mapKey, editMapCommandMessage);
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
