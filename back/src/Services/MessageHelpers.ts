import { ErrorMessage, ServerToClientMessage } from "../Messages/generated/messages_pb";
import { UserSocket } from "_Model/User";

export function emitError(Client: UserSocket, message: string): void {
    const errorMessage = new ErrorMessage();
    errorMessage.setMessage(message);

    const serverToClientMessage = new ServerToClientMessage();
    serverToClientMessage.setErrormessage(errorMessage);

    //if (!Client.disconnecting) {
    Client.write(serverToClientMessage);
    //}
    console.warn(message);
}
