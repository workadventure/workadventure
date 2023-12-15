import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import {
    AreaData,
    AtLeast,
    CreateAreaCommand,
    CreateEntityCommand,
    DeleteAreaCommand,
    DeleteEntityCommand,
    EntityData,
    EntityDataProperties,
    UpdateAreaCommand,
    UpdateEntityCommand,
    UpdateWAMSettingCommand,
    WAMEntityData,
} from "@workadventure/map-editor";
import {
    EditMapCommandMessage,
    EditMapCommandsArrayMessage,
    EditMapCommandWithKeyMessage,
    MapStorageClearAfterUploadMessage,
    PingMessage,
    UpdateMapToNewestWithKeyMessage,
} from "@workadventure/messages";
import { MapStorageServer } from "@workadventure/messages/src/ts-proto-generated/services";
import { Empty } from "@workadventure/messages/src/ts-proto-generated/google/protobuf/empty";
import * as Sentry from "@sentry/node";
import { mapsManager } from "./MapsManager";
import { mapPathUsingDomainWithPrefix } from "./Services/PathMapper";

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, Empty>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleClearAfterUpload(
        call: ServerUnaryCall<MapStorageClearAfterUploadMessage, Empty>,
        callback: sendUnaryData<Empty>
    ): void {
        try {
            const wamUrl = call.request.wamUrl;
            const url = new URL(wamUrl);
            const wamKey = mapPathUsingDomainWithPrefix(url.pathname, url.hostname);
            mapsManager.clearAfterUpload(wamKey);
            callback(null);
        } catch (e: unknown) {
            console.error("An error occurred in handleClearAfterUpload", e);
            Sentry.captureException(`An error occurred in handleClearAfterUpload ${JSON.stringify(e)}`);
            let message: string;
            if (typeof e === "object" && e !== null) {
                message = e.toString();
            } else {
                message = "Unknown error";
            }
            callback({ name: "MapStorageError", message }, null);
        }
    },
    handleUpdateMapToNewestMessage(
        call: ServerUnaryCall<UpdateMapToNewestWithKeyMessage, Empty>,
        callback: sendUnaryData<EditMapCommandsArrayMessage>
    ): void {
        try {
            const mapUrl = new URL(call.request.mapKey);
            const mapKey = mapPathUsingDomainWithPrefix(mapUrl.pathname, mapUrl.hostname);
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
        } catch (e: unknown) {
            console.error("An error occurred in handleClearAfterUpload", e);
            Sentry.captureException(`An error occurred in handleClearAfterUpload ${JSON.stringify(e)}`);
            let message: string;
            if (typeof e === "object" && e !== null) {
                message = e.toString();
            } else {
                message = "Unknown error";
            }
            callback({ name: "MapStorageError", message }, null);
        }
    },

    handleEditMapCommandWithKeyMessage(
        call: ServerUnaryCall<EditMapCommandWithKeyMessage, Empty>,
        callback: sendUnaryData<EditMapCommandMessage>
    ): void {
        (async () => {
            const editMapCommandMessage = call.request.editMapCommandMessage;
            if (!editMapCommandMessage || !editMapCommandMessage.editMapMessage?.message) {
                callback({ name: "MapStorageError", message: "EditMapCommand message does not exist" }, null);
                return;
            }
            // The mapKey is the complete URL to the map. Let's map it to our virtual path.
            const mapUrl = new URL(call.request.mapKey);
            const mapKey = mapPathUsingDomainWithPrefix(mapUrl.pathname, mapUrl.hostname);

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
                    // NOTE: protobuf does not distinguish between null and empty array, we cannot create optional repeated value.
                    //       Because of that, we send additional "modifyProperties" flag set properties value as "undefined" so they won't get erased
                    //       by [] value which was supposed to be null.
                    const dataToModify: AtLeast<EntityData, "id"> = structuredClone(message);
                    if (!message.modifyProperties) {
                        dataToModify.properties = undefined;
                    }
                    const area = gameMap.getGameMapAreas()?.getArea(message.id);
                    if (area) {
                        await mapsManager.executeCommand(
                            mapKey,
                            new UpdateAreaCommand(gameMap, dataToModify, commandId)
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
                    await mapsManager.executeCommand(
                        mapKey,
                        new CreateAreaCommand(gameMap, areaObjectConfig, commandId)
                    );
                    break;
                }
                case "deleteAreaMessage": {
                    const message = editMapMessage.deleteAreaMessage;
                    await mapsManager.executeCommand(mapKey, new DeleteAreaCommand(gameMap, message.id, commandId));
                    break;
                }
                case "modifyEntityMessage": {
                    const message = editMapMessage.modifyEntityMessage;

                    // NOTE: protobuf does not distinguish between null and empty array, we cannot create optional repeated value.
                    //       Because of that, we send additional "modifyProperties" flag set properties value as "undefined" so they won't get erased
                    //       by [] value which was supposed to be null.
                    const dataToModify: Partial<WAMEntityData> = structuredClone(message);
                    if (!message.modifyProperties) {
                        dataToModify.properties = undefined;
                    }
                    const entity = gameMap.getGameMapEntities()?.getEntity(message.id);
                    if (entity) {
                        await mapsManager.executeCommand(
                            mapKey,
                            new UpdateEntityCommand(gameMap, message.id, dataToModify, commandId)
                        );
                    } else {
                        console.log(`Could not find entity with id: ${message.id}`);
                    }
                    break;
                }
                case "createEntityMessage": {
                    const message = editMapMessage.createEntityMessage;
                    await mapsManager.executeCommand(
                        mapKey,
                        new CreateEntityCommand(
                            gameMap,
                            message.id,
                            {
                                prefabRef: {
                                    id: message.prefabId,
                                    collectionName: message.collectionName,
                                },
                                x: message.x,
                                y: message.y,
                                properties: message.properties as EntityDataProperties,
                            },
                            commandId
                        )
                    );
                    break;
                }
                case "deleteEntityMessage": {
                    const message = editMapMessage.deleteEntityMessage;
                    await mapsManager.executeCommand(mapKey, new DeleteEntityCommand(gameMap, message.id, commandId));
                    break;
                }
                case "updateWAMSettingsMessage": {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const message = editMapMessage.updateWAMSettingsMessage;
                    const wam = gameMap.getWam();
                    if (!wam) {
                        throw new Error("WAM is not defined");
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    await mapsManager.executeCommand(mapKey, new UpdateWAMSettingCommand(wam, message, commandId));
                    break;
                }
                case "errorCommandMessage": {
                    // Nothing to do, this message will never come from client
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = editMapMessage;
                }
            }
            // send edit map message back as a valid one
            mapsManager.addCommandToQueue(mapKey, editMapCommandMessage);
            callback(null, editMapCommandMessage);
        })().catch((e: unknown) => {
            console.log(e);
            callback(null, {
                id: call.request.editMapCommandMessage?.id ?? "Unknown id command error",
                editMapMessage: {
                    message: {
                        $case: "errorCommandMessage",
                        errorCommandMessage: {
                            reason: getMessageFromError(e),
                        },
                    },
                },
            });
        });
    },
};

function getMessageFromError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === "string") {
        return error;
    } else {
        return "Unknown error";
    }
}

export { mapStorageServer };
