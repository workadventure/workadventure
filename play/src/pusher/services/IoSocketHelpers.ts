import { SubMessage, ServerToClientMessage } from "@workadventure/messages";
import { ExSocketInterface } from "../models/Websocket/ExSocketInterface";

export function emitInBatch(socket: ExSocketInterface, payload: SubMessage): void {
    socket.batchedMessages.payload.push(payload);

    if (socket.batchTimeout === null) {
        socket.batchTimeout = setTimeout(() => {
            if (socket.disconnecting) {
                return;
            }

            const serverToClientMessage: ServerToClientMessage = {
                message: {
                    $case: "batchMessage",
                    batchMessage: socket.batchedMessages,
                },
            };

            socket.send(ServerToClientMessage.encode(serverToClientMessage).finish(), true);
            socket.batchedMessages = {
                event: "",
                payload: [],
            };
            socket.batchTimeout = null;
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
