import type { AdminPusherToBackMessage, ServerToAdminClientMessage } from "../../messages/generated/messages_pb";
import type { compressors } from "hyper-express";
import type { ClientDuplexStream } from "@grpc/grpc-js";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export interface ExAdminSocketInterface extends compressors.WebSocket {
    adminConnection: AdminConnection;
    disconnecting: boolean;
}
