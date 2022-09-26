import { ExSocketInterface } from "../Model/Websocket/ExSocketInterface";
import {
    BatchChatMessage,
    BatchMessage,
    ErrorMessage,
    PusherToIframeMessage,
    ServerToClientMessage,
    SubChatMessage,
    SubMessage,
} from "../Messages/generated/messages_pb";
import { WebSocket } from "uWebSockets.js";

export function emitInBatch(socket: ExSocketInterface, payload: SubMessage | SubChatMessage): void {
    if (socket.batchedMessages instanceof BatchChatMessage && payload instanceof SubChatMessage) {
        socket.batchedMessages.addPayload(payload);

        if (socket.batchTimeout === null) {
            socket.batchTimeout = setTimeout(() => {
                if (socket.disconnecting) {
                    return;
                }

                const pusherToIframeMessage = new PusherToIframeMessage();
                if (socket.batchedMessages instanceof BatchChatMessage) {
                    pusherToIframeMessage.setBatchchatmessage(socket.batchedMessages);
                }

                socket.send(pusherToIframeMessage.serializeBinary().buffer, true);
                socket.batchedMessages = new BatchChatMessage();
                socket.batchTimeout = null;
                console.log("Batch message sent to chat");
            }, 100);
        }
    } else if (socket.batchedMessages instanceof BatchMessage && payload instanceof SubMessage) {
        socket.batchedMessages.addPayload(payload);

        if (socket.batchTimeout === null) {
            socket.batchTimeout = setTimeout(() => {
                if (socket.disconnecting) {
                    return;
                }

                const serverToClientMessage = new ServerToClientMessage();
                if (socket.batchedMessages instanceof BatchMessage) {
                    serverToClientMessage.setBatchmessage(socket.batchedMessages);
                }

                socket.send(serverToClientMessage.serializeBinary().buffer, true);
                socket.batchedMessages = new BatchMessage();
                socket.batchTimeout = null;
                console.log("Batch message sent to front");
            }, 100);
        }
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
