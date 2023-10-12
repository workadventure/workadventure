import { SubMessage, ServerToClientMessage } from "@workadventure/messages";
import { Socket } from "socket.io";
import { socketManager } from "./SocketManager";

export function emitInBatch(socket: Socket, payload: SubMessage): void {
    const socketData = socketManager.getConnectedSocketData(socket);

    if (!socketData) {
        return;
    }

    socketData.batchedMessages.payload.push(payload);

    if (socketData.batchTimeout === null) {
        socketData.batchTimeout = setTimeout(() => {
            if (socket.disconnected) {
                return;
            }

            const serverToClientMessage: ServerToClientMessage = {
                message: {
                    $case: "batchMessage",
                    batchMessage: socketData.batchedMessages,
                },
            };

            socket.send(ServerToClientMessage.encode(serverToClientMessage).finish(), true);
            socketData.batchedMessages = {
                event: "",
                payload: [],
            };
            socketData.batchTimeout = null;
        }, 100);
    }
}
