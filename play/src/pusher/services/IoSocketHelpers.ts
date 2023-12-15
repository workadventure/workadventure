import { SubMessage, ServerToClientMessage } from "@workadventure/messages";
import { Socket } from "./SocketManager";

export function emitInBatch(socket: Socket, payload: SubMessage): void {
    const socketData = socket.getUserData();
    socketData.batchedMessages.payload.push(payload);

    if (socketData.batchTimeout === null) {
        socketData.batchTimeout = setTimeout(() => {
            if (socketData.disconnecting) {
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

/*export function emitError(Client: HyperExpress.compressors.WebSocket, message: string): void {
    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const serverToClientMessage = new ServerToClientMessage();
    serverToClientMessage.setErrormessage(errorMessage);

    if (!Client.disconnecting) {
        Client.send(serverToClientMessage.serializeBinary().buffer, true);
    }
    console.warn(message);
}*/
