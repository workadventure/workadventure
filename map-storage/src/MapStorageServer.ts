import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import { AreaType } from "@workadventure/map-editor";
import { mapsManager } from "./MapsManager";
import { IMapStorageServer } from "./Messages/generated/messages_grpc_pb";
import { EditMapMessage, EditMapWithKeyMessage, EmptyMessage, PingMessage } from "./Messages/generated/messages_pb";

const mapStorageServer: IMapStorageServer = {
    ping(call: ServerUnaryCall<PingMessage, EmptyMessage>, callback: sendUnaryData<PingMessage>): void {
        callback(null, call.request);
    },
    handleEditMapWithKeyMessage(
        call: ServerUnaryCall<EditMapWithKeyMessage, EmptyMessage>,
        callback: sendUnaryData<EditMapMessage>
    ): void {
        const editMapMessage = call.request.getEditmapmessage();
        if (!editMapMessage) {
            callback(null, new EditMapMessage());
            return;
        }
        const gameMap = mapsManager.getGameMap(call.request.getMapkey());
        if (!gameMap) {
            // TODO: Send an error?
            callback(null, new EditMapMessage());
            return;
        }
        if (editMapMessage.hasModifyareamessage()) {
            const modifyAreaMessage = editMapMessage.getModifyareamessage();
            if (modifyAreaMessage) {
                // TODO: Not feeling this way of handling incoming data. gRPC problem?
                const area = gameMap.getGameMapAreas().getArea(modifyAreaMessage.getId(), AreaType.Static);
                if (area) {
                    const areaObjectConfig = {
                        ...area,
                        x: Number(modifyAreaMessage.getX()),
                        y: Number(modifyAreaMessage.getY()),
                        width: Number(modifyAreaMessage.getWidth()),
                        height: Number(modifyAreaMessage.getHeight()),
                    };
                    mapsManager.executeCommand(call.request.getMapkey(), {
                        type: "UpdateAreaCommand",
                        areaObjectConfig,
                    });
                    callback(null, editMapMessage);
                    return;
                }
            }
        }
        // TODO: Change to EmptyMessage?
        callback(null, new EditMapMessage());
    },
};

export { mapStorageServer };
