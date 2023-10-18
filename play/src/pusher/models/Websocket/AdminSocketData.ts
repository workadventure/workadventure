import type { AdminPusherToBackMessage, ServerToAdminClientMessage } from "@workadventure/messages";
import type { ClientDuplexStream } from "@grpc/grpc-js";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export type AdminSocketData = {
    adminConnections: Map<string, AdminConnection> | undefined;
    disconnecting: boolean;
};
