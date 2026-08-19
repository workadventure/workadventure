import type { AdminPusherToBackMessage, ServerToAdminClientMessage } from "@workadventure/messages";
import type { ClientDuplexStream } from "@grpc/grpc-js";
import type express from "fulmine.js";
import type { Request } from "express";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export type AdminSocketData = {
    adminConnections: Map<string, AdminConnection> | undefined;
    disconnecting: boolean;
    sendMessage: (message: string) => void;
};

/** The socket the admin route opens: uWS carries the upgrade's request for its whole life. */
export type AdminSocket = express.FulmineSocket;

/** What the admin upgrade left on that request. */
export function adminDataOf(socket: AdminSocket): AdminSocketData {
    return (socket.req as Request & { socketData: AdminSocketData }).socketData;
}
