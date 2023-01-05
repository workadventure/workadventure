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
import { mapPathUsingDomain } from "./Services/PathMapper";

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
            switch (editMapMessage.$case) {
                case "modifyAreaMessage": {
                    const message = editMapMessage.modifyAreaMessage;
                    console.log(message);
                    const area = gameMap.getGameMapAreas().getArea(message.id, AreaType.Static);
                    if (area) {
                        const areaObjectConfig: AreaData = structuredClone(area);
                        _.merge(areaObjectConfig, message);
                        mapsManager.executeCommand(mapKey, {
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
                    mapsManager.executeCommand(mapKey, {
                        areaObjectConfig,
                        type: "CreateAreaCommand",
                    });
                    break;
                }
                case "deleteAreaMessage": {
                    const message = editMapMessage.deleteAreaMessage;
                    mapsManager.executeCommand(mapKey, {
                        type: "DeleteAreaCommand",
                        id: message.id,
                    });
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = editMapMessage;
                }
            }
            // send edit map message back as a valid one
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
