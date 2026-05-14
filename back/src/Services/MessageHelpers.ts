import type {
    BatchToPusherRoomMessage,
    ServerToAdminClientMessage,
    ServerToClientMessage,
} from "@workadventure/messages";
import type { UserSocket } from "../Model/User";
import type { AdminSocket, RoomSocket } from "../RoomManager";
import { closeBackpressureWriter, writeWithBackpressure } from "./StreamBackpressure";

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

    const serverToClientMessage: ServerToClientMessage = {
        message: {
            $case: "errorMessage",
            errorMessage: {
                message: message,
            },
        },
    };

    //if (!Client.disconnecting) {
    writeWithBackpressure(Client, serverToClientMessage, {}, "back_user_socket");
    //}
    console.warn(message);
}

export function endUserConnectionWithReason(Client: UserSocket, reason: string): void {
    if (Client.writable) {
        writeWithBackpressure(
            Client,
            {
                message: {
                    $case: "backConnectionCloseReasonMessage",
                    backConnectionCloseReasonMessage: {
                        reason,
                    },
                },
            },
            {},
            "back_user_socket"
        );
    }

    Client.end();
    closeBackpressureWriter(Client, "target_closed");
}

export function emitErrorOnAdminSocket(Client: AdminSocket, error: unknown): void {
    const message = getMessageFromError(error);

    const serverToClientMessage: ServerToAdminClientMessage = {
        message: {
            $case: "errorMessage",
            errorMessage: {
                message: message,
            },
        },
    };

    //if (!Client.disconnecting) {
    writeWithBackpressure(Client, serverToClientMessage, {}, "back_admin_socket");
    //}
    console.warn(message);
}

export function emitErrorOnRoomSocket(Client: RoomSocket, error: unknown): void {
    console.error(error);
    const message = getMessageFromError(error);

    const batchToPusherMessage: BatchToPusherRoomMessage = {
        payload: [
            {
                message: {
                    $case: "errorMessage",
                    errorMessage: {
                        message: message,
                    },
                },
            },
        ],
    };

    //if (!Client.disconnecting) {
    writeWithBackpressure(Client, batchToPusherMessage, {}, "back_room_socket");
    //}
    console.warn(message);
}
