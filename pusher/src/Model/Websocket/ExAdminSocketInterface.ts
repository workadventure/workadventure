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
import { WebSocket } from "uWebSockets.js";
import { ClientDuplexStream } from "grpc";
import { Zone } from "_Model/Zone";

export type AdminConnection = ClientDuplexStream<AdminPusherToBackMessage, ServerToAdminClientMessage>;

export interface ExAdminSocketInterface extends WebSocket {
    adminConnection: AdminConnection;
    disconnecting: boolean;
}
