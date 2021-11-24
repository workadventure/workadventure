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
import log from "./Logger";

export function emitError(Client: UserSocket, message: string): void {
    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const serverToClientMessage = new ServerToClientMessage();
    serverToClientMessage.setErrormessage(errorMessage);

    //if (!Client.disconnecting) {
    Client.write(serverToClientMessage);
    //}
    log.warn(message);
}

export function emitErrorOnRoomSocket(Client: RoomSocket, message: string): void {
    log.error(message);

    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const subToPusherRoomMessage = new SubToPusherRoomMessage();
    subToPusherRoomMessage.setErrormessage(errorMessage);

    const batchToPusherMessage = new BatchToPusherRoomMessage();
    batchToPusherMessage.addPayload(subToPusherRoomMessage);

    //if (!Client.disconnecting) {
    Client.write(batchToPusherMessage);
    //}
    log.warn(message);
}

export function emitErrorOnZoneSocket(Client: ZoneSocket, message: string): void {
    log.error(message);

    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const subToPusherMessage = new SubToPusherMessage();
    subToPusherMessage.setErrormessage(errorMessage);

    const batchToPusherMessage = new BatchToPusherMessage();
    batchToPusherMessage.addPayload(subToPusherMessage);

    //if (!Client.disconnecting) {
    Client.write(batchToPusherMessage);
    //}
    log.warn(message);
}
