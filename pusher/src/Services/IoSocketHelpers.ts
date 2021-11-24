import { ExSocketInterface } from "_Model/Websocket/ExSocketInterface";
import { BatchMessage, ErrorMessage, ServerToClientMessage, SubMessage } from "../Messages/generated/messages_pb";
import { WebSocket } from "uWebSockets.js";

export function emitInBatch(socket: ExSocketInterface, payload: SubMessage): void {
    socket.batchedMessages.addPayload(payload);

    if (socket.batchTimeout === null) {
        socket.batchTimeout = setTimeout(() => {
            if (socket.disconnecting) {
                return;
            }

            const serverToClientMessage = new ServerToClientMessage();
            serverToClientMessage.setBatchmessage(socket.batchedMessages);

            socket.send(serverToClientMessage.serializeBinary().buffer, true);
            socket.batchedMessages = new BatchMessage();
            socket.batchTimeout = null;
        }, 100);
    }
}

export function emitError(Client: WebSocket, message: string): void {
    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const serverToClientMessage = new ServerToClientMessage();
    serverToClientMessage.setErrormessage(errorMessage);

    if (!Client.disconnecting) {
        Client.send(serverToClientMessage.serializeBinary().buffer, true);
    }
    console.warn(message);
}
