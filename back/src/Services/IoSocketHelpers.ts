import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";
import {BatchMessage, ErrorMessage, ServerToClientMessage, SubMessage} from "../Messages/generated/messages_pb";
import {DEV_MODE} from "../Enum/EnvironmentVariable";

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

    // If we send a message, we don't need to keep the connection alive
    resetPing(socket);
}

export function resetPing(ws: ExSocketInterface): void {
    if (ws.pingTimeout) {
        clearTimeout(ws.pingTimeout);
    }
    ws.pingTimeout = setTimeout(() => {
        if (ws.disconnecting) {
            return;
        }
        ws.ping();
        resetPing(ws);
    }, 29000);
}

export function emitError(Client: ExSocketInterface, message: string): void {
    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const serverToClientMessage = new ServerToClientMessage();
    serverToClientMessage.setErrormessage(errorMessage);

    if (!Client.disconnecting) {
        Client.send(serverToClientMessage.serializeBinary().buffer, true);
    }
    console.warn(message);
}

export const pongMaxInterval = 30000; // the maximum duration (in ms) between pongs before we shutdown the connexion.

export function refresLogoutTimerOnPong(ws: ExSocketInterface): void {
    if (DEV_MODE) return; //this feature is disabled in dev mode as it clashes with live reload.
    if(ws.pongTimeout) clearTimeout(ws.pongTimeout);
    ws.pongTimeout = setTimeout(() => {
        ws.close();
    }, pongMaxInterval);
}
