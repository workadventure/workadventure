import { PointInterface } from "./PointInterface";
import { Identificable } from "./Identificable";
import { ViewportInterface } from "_Model/Websocket/ViewportMessage";
import {
    BatchMessage,
    CompanionMessage,
    PusherToBackMessage,
    ServerToClientMessage,
    SubMessage,
} from "../../Messages/generated/messages_pb";
import { ClientDuplexStream } from "grpc";
import { Zone } from "_Model/Zone";
import { compressors } from "hyper-express";
import { WokaDetail } from "_Enum/PlayerTextures";

export type BackConnection = ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;

export interface ExSocketInterface extends compressors.WebSocket, Identificable {
    token: string;
    roomId: string;
    //userId: number;   // A temporary (autoincremented) identifier for this user
    userUuid: string; // A unique identifier for this user
    IPAddress: string; // IP address
    name: string;
    characterLayers: WokaDetail[];
    position: PointInterface;
    viewport: ViewportInterface;
    companion?: CompanionMessage;
    /**
     * Pushes an event that will be sent in the next batch of events
     */
    emitInBatch: (payload: SubMessage) => void;
    batchedMessages: BatchMessage;
    batchTimeout: NodeJS.Timeout | null;
    disconnecting: boolean;
    messages: unknown;
    tags: string[];
    visitCardUrl: string | null;
    backConnection: BackConnection;
    listenedZones: Set<Zone>;
    userRoomToken: string | undefined;
}
