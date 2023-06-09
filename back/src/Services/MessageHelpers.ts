import {
    BatchToPusherMessage,
    BatchToPusherRoomMessage,
    ServerToAdminClientMessage,
    ServerToClientMessage,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { UserSocket } from "../Model/User";
import { AdminSocket, RoomSocket, ZoneSocket } from "../RoomManager";

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
    Client.write(serverToClientMessage);
    //}
    console.warn(message);
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
    Client.write(serverToClientMessage);
    //}
    console.warn(message);
}

export function emitErrorOnRoomSocket(Client: RoomSocket, error: unknown): void {
    console.error(error);
    Sentry.captureException(error);
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
    Client.write(batchToPusherMessage);
    //}
    console.warn(message);
}

export function emitErrorOnZoneSocket(Client: ZoneSocket, error: unknown): void {
    console.error(error);
    const message = getMessageFromError(error);

    const batchToPusherMessage: BatchToPusherMessage = {
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
    Client.write(batchToPusherMessage);
    //}
    console.warn(message);
}
