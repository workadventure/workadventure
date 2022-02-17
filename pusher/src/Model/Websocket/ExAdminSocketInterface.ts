import { PointInterface } from "./PointInterface";
import { Identificable } from "./Identificable";
import { ViewportInterface } from "_Model/Websocket/ViewportMessage";
import {
    AdminPusherToBackMessage,
    BatchMessage,
    PusherToBackMessage,
    ServerToAdminClientMessage,
    ServerToClientMessage,
    SubMessage,
} from "../../Messages/generated/messages_pb";
import { compressors } from "hyper-express";
import { ClientDuplexStream } from "grpc";
import { Zone } from "_Model/Zone";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export interface ExAdminSocketInterface extends compressors.WebSocket {
    adminConnection: AdminConnection;
    disconnecting: boolean;
}
