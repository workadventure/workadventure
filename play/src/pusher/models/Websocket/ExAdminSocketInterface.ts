import type { AdminPusherToBackMessage, ServerToAdminClientMessage } from "@workadventure/messages";
import type { compressors } from "hyper-express";
import type { ClientDuplexStream } from "@grpc/grpc-js";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export interface ExAdminSocketInterface extends compressors.WebSocket {
    adminConnections: Map<string, AdminConnection> | undefined;
    disconnecting: boolean;
}
