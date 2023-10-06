import type { AdminPusherToBackMessage, ServerToAdminClientMessage } from "@workadventure/messages";
import type { ClientDuplexStream } from "@grpc/grpc-js";
import { WASocketData } from "./WASocketData";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export interface AdminSocketData extends WASocketData {
    adminConnections: Map<string, AdminConnection> | undefined;
};
