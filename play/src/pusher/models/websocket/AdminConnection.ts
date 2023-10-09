import { ClientDuplexStream } from "@grpc/grpc-js";
import { AdminPusherToBackMessage, ServerToAdminClientMessage } from "@workadventure/messages";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;
