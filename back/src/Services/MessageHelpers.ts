import {
    BatchMessage,
    BatchToPusherMessage,
    BatchToPusherRoomMessage,
    ErrorMessage,
    ServerToClientMessage,
    SubToPusherMessage,
    SubToPusherRoomMessage,
} from "../Messages/generated/messages_pb";
import { UserSocket } from "_Model/User";
import { RoomSocket, ZoneSocket } from "../RoomManager";

function getMessageFromError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === "string") {
        return error;
    } else {
        return "Unknown error";
    }
}

export function emitError(Client: UserSocket, error: unknown): void {
    const message = getMessageFromError(error);

    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const serverToClientMessage = new ServerToClientMessage();
    serverToClientMessage.setErrormessage(errorMessage);

    //if (!Client.disconnecting) {
    Client.write(serverToClientMessage);
    //}
    console.warn(message);
}

export function emitErrorOnRoomSocket(Client: RoomSocket, error: unknown): void {
    console.error(error);
    const message = getMessageFromError(error);

    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const subToPusherRoomMessage = new SubToPusherRoomMessage();
    subToPusherRoomMessage.setErrormessage(errorMessage);

    const batchToPusherMessage = new BatchToPusherRoomMessage();
    batchToPusherMessage.addPayload(subToPusherRoomMessage);

    //if (!Client.disconnecting) {
    Client.write(batchToPusherMessage);
    //}
    console.warn(message);
}

export function emitErrorOnZoneSocket(Client: ZoneSocket, error: unknown): void {
    console.error(error);
    const message = getMessageFromError(error);

    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const subToPusherMessage = new SubToPusherMessage();
    subToPusherMessage.setErrormessage(errorMessage);

    const batchToPusherMessage = new BatchToPusherMessage();
    batchToPusherMessage.addPayload(subToPusherMessage);

    //if (!Client.disconnecting) {
    Client.write(batchToPusherMessage);
    //}
    console.warn(message);
}
