import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import * as Sentry from "@sentry/node";
import _ from "lodash";
import {
    AreaData,
    AreaDataProperties,
    AtLeast,
    CreateAreaCommand,
    CreateEntityCommand,
    DeleteEntityCommand,
    EntityCoordinates,
    EntityDataProperties,
    EntityDimensions,
    EntityPermissions,
    UpdateEntityCommand,
    UpdateWAMMetadataCommand,
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
import { Empty } from "@workadventure/messages/src/ts-proto-generated/google/protobuf/empty";
import { MapStorageServer } from "@workadventure/messages/src/ts-proto-generated/services";
import { asError } from "catch-unknown";
import { DeleteCustomEntityMapStorageCommand } from "./Commands/CustomEntity/DeleteCustomEntityMapStorageCommand";
import { ModifyCustomEntityMapStorageCommand } from "./Commands/CustomEntity/ModifyCustomEntityMapStorageCommand";
import { UploadEntityMapStorageCommand } from "./Commands/CustomEntity/UploadEntityMapStorageCommand";
import { entitiesManager } from "./EntitiesManager";
import { mapsManager } from "./MapsManager";
import { mapPathUsingDomainWithPrefix } from "./Services/PathMapper";
import { LockByKey } from "./Services/LockByKey";
import { DeleteAreaMapStorageCommand } from "./Commands/Area/DeleteAreaMapStorageCommand";
import { UpdateAreaMapStorageCommand } from "./Commands/Area/UpdateAreaMapStorageCommand";
import { UploadFileMapStorageCommand } from "./Commands/File/UploadFileMapStorageCommand";
import { DeleteFileMapStorageCommand } from "./Commands/File/DeleteFileMapStorageCommand";

const editionLocks = new LockByKey<string>();

const mapStorageServer: MapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, Empty>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleClearAfterUpload(
        call: ServerUnaryCall<MapStorageClearAfterUploadMessage, Empty>,
        callback: sendUnaryData<Empty>
    ): void {
        const wamUrl = call.request.wamUrl;
        const url = new URL(wamUrl);
        const wamKey = mapPathUsingDomainWithPrefix(url.pathname, url.hostname);
        mapsManager.clearAfterUpload(wamKey);
        callback(null);
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
            const error = asError(e);
            console.error(`[${new Date().toISOString()}] An error occurred in handleClearAfterUpload`, e);
            Sentry.captureException(e);
            callback({ name: "MapStorageError", message: error.message }, null);
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

            await editionLocks.waitForLock(mapKey, async () => {
                const editMapCommandMessage = call.request.editMapCommandMessage;
                if (!editMapCommandMessage || !editMapCommandMessage.editMapMessage?.message) {
                    callback({ name: "MapStorageError", message: "EditMapCommand message does not exist" }, null);
                    return;
                }
                const editMapMessage = editMapCommandMessage.editMapMessage.message;
                const gameMap = await mapsManager.getOrLoadGameMap(mapKey);

                const { connectedUserTags, userCanEdit, userUUID } = call.request;

                const gameMapAreas = gameMap.getGameMapAreas();
                const entityCommandPermissions = gameMapAreas
                    ? new EntityPermissions(gameMapAreas, connectedUserTags, userCanEdit, userUUID)
                    : undefined;

                const commandId = editMapCommandMessage.id;
                switch (editMapMessage.$case) {
                    case "modifyAreaMessage": {
                        const message = editMapMessage.modifyAreaMessage;
                        // NOTE: protobuf does not distinguish between null and empty array, we cannot create optional repeated value.
                        //       Because of that, we send additional "modifyProperties" flag set properties value as "undefined" so they won't get erased
                        //       by [] value which was supposed to be null.
                        const dataToModify: AtLeast<AreaData, "id"> = structuredClone(message);
                        if (!message.modifyProperties) {
                            dataToModify.properties = undefined;
                        }
                        const area = gameMap.getGameMapAreas()?.getArea(message.id);
                        if (area) {
                            await mapsManager.executeCommand(
                                mapKey,
                                mapUrl.host,
                                new UpdateAreaMapStorageCommand(gameMap, dataToModify, commandId, area)
                            );

                            const newAreaData = gameMap.getGameMapAreas()?.getArea(message.id);

                            if (newAreaData) {
                                const oldPropertiesParsed =
                                    AreaDataProperties.safeParse(editMapMessage.modifyAreaMessage.properties).data ||
                                    [];

                                const oldServerData = oldPropertiesParsed.reduce((acc, currProperty) => {
                                    if (currProperty.serverData) {
                                        acc.push({
                                            id: currProperty.id,
                                            serverData: currProperty.serverData,
                                        });
                                    }

                                    return acc;
                                }, [] as { id: string; serverData: unknown }[]);

                                const newServerData = newAreaData.properties.reduce((acc, currProperty) => {
                                    if (currProperty.serverData) {
                                        acc.push({
                                            id: currProperty.id,
                                            serverData: currProperty.serverData,
                                        });
                                    }
                                    return acc;
                                }, [] as { id: string; serverData: unknown }[]);

                                editMapMessage.modifyAreaMessage = {
                                    ...newAreaData,
                                    modifyServerData: !_.isEqual(oldServerData, newServerData),
                                };
                            }
                        } else {
                            console.log(`[${new Date().toISOString()}] Could not find area with id: ${message.id}`);
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
                            mapUrl.host,
                            new CreateAreaCommand(gameMap, areaObjectConfig, commandId)
                        );
                        break;
                    }
                    case "deleteAreaMessage": {
                        const message = editMapMessage.deleteAreaMessage;
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new DeleteAreaMapStorageCommand(gameMap, message.id, commandId)
                        );
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
                            const { x, y, width, height } = message;
                            if (
                                entityCommandPermissions &&
                                !entityCommandPermissions.canEdit(
                                    getEntityCenterCoordinates({ x, y }, { width, height })
                                )
                            ) {
                                Sentry.captureException("User is not allowed to modify the entity on map");
                                break;
                            }
                            await mapsManager.executeCommand(
                                mapKey,
                                mapUrl.host,
                                new UpdateEntityCommand(gameMap, message.id, dataToModify, commandId)
                            );
                        } else {
                            console.log(`[${new Date().toISOString()}] Could not find entity with id: ${message.id}`);
                        }
                        break;
                    }
                    case "createEntityMessage": {
                        const message = editMapMessage.createEntityMessage;
                        const { x, y, width, height } = message;
                        if (
                            entityCommandPermissions &&
                            !entityCommandPermissions.canEdit(getEntityCenterCoordinates({ x, y }, { width, height }))
                        ) {
                            Sentry.captureException("User is not allowed to create entity on map");
                            break;
                        }
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
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
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new DeleteEntityCommand(gameMap, message.id, commandId)
                        );
                        break;
                    }
                    case "uploadEntityMessage": {
                        const uploadEntityMessage = editMapMessage.uploadEntityMessage;
                        await entitiesManager.executeCommand(
                            new UploadEntityMapStorageCommand(uploadEntityMessage, mapUrl.hostname)
                        );
                        break;
                    }
                    case "modifyCustomEntityMessage": {
                        const modifyCustomEntityMessage = editMapMessage.modifyCustomEntityMessage;
                        await entitiesManager.executeCommand(
                            new ModifyCustomEntityMapStorageCommand(modifyCustomEntityMessage, mapUrl.hostname)
                        );
                        break;
                    }
                    case "deleteCustomEntityMessage": {
                        const deleteCustomEntityMessage = editMapMessage.deleteCustomEntityMessage;
                        await entitiesManager.executeCommand(
                            new DeleteCustomEntityMapStorageCommand(deleteCustomEntityMessage, gameMap, mapUrl.hostname)
                        );
                        break;
                    }
                    case "updateWAMSettingsMessage": {
                        const message = editMapMessage.updateWAMSettingsMessage;
                        const wam = gameMap.getWam();
                        if (!wam) {
                            throw new Error("WAM is not defined");
                        }
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new UpdateWAMSettingCommand(wam, message, commandId)
                        );
                        break;
                    }
                    case "errorCommandMessage": {
                        // Nothing to do, this message will never come from client
                        break;
                    }
                    case "modifiyWAMMetadataMessage": {
                        const message = editMapMessage.modifiyWAMMetadataMessage;
                        const wam = gameMap.getWam();
                        if (!wam) {
                            throw new Error("WAM is not defined");
                        }
                        await mapsManager.executeCommand(
                            mapKey,
                            mapUrl.host,
                            new UpdateWAMMetadataCommand(wam, message, commandId)
                        );
                        break;
                    }
                    case "uploadFileMessage": {
                        const uploadFileMessage = editMapMessage.uploadFileMessage;
                        await entitiesManager.executeCommand(
                            new UploadFileMapStorageCommand(uploadFileMessage, mapUrl.hostname)
                        );
                        break;
                    }
                    case "deleteFileMessage": {
                        const deleteFileMessage = editMapMessage.deleteFileMessage;
                        await entitiesManager.executeCommand(
                            new DeleteFileMapStorageCommand(deleteFileMessage, mapUrl.hostname)
                        );
                        break;
                    }
                    default: {
                        //const _exhaustiveCheck: never = editMapMessage;
                    }
                }
                // send edit map message back as a valid one
                mapsManager.addCommandToQueue(mapKey, editMapCommandMessage);
                callback(null, editMapCommandMessage);
            });
        })().catch((e: unknown) => {
            console.error(e);
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

function getEntityCenterCoordinates(entityCoordinates: EntityCoordinates, entityDimensions: EntityDimensions) {
    return {
        x: entityCoordinates.x + entityDimensions.width * 0.5,
        y: entityCoordinates.y + entityDimensions.height * 0.5,
    };
}

export { mapStorageServer };
