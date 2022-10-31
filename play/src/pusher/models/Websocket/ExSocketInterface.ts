import type { PointInterface } from "./PointInterface";
import type { Identificable } from "./Identificable";
import type { ViewportInterface } from "./ViewportMessage";
import type {
    AvailabilityStatus,
    BatchMessage,
    CompanionMessage,
    PusherToBackMessage,
    ServerToClientMessage,
    SubMessage,
} from "../../../messages/generated/messages_pb";
import type { ClientDuplexStream } from "@grpc/grpc-js";
import type { Zone } from "../Zone";
import type { compressors } from "hyper-express";
import type { WokaDetail, MucRoomDefinitionInterface, ApplicationDefinitionInterface } from "@workadventure/messages";
import type { PusherRoom } from "../PusherRoom";
import type { XmppClient } from "../../services/XmppClient";

export type BackConnection = ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;

export interface ExSocketInterface extends compressors.WebSocket, Identificable {
    token: string;
    roomId: string;
    //userId: number;   // A temporary (autoincremented) identifier for this user
    userUuid: string; // A unique identifier for this user
    userIdentifier: string;
    isLogged: boolean;
    IPAddress: string; // IP address
    name: string;
    characterLayers: WokaDetail[];
    position: PointInterface;
    viewport: ViewportInterface;
    companion?: CompanionMessage;
    availabilityStatus: AvailabilityStatus;
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
    maxHistoryChat: number;
    // The ID of the timer that sends ping requests.
    // Ping requests are sent from the server because the setTimeout on the browser is unreliable when the tab is hidden.
    pingIntervalId: NodeJS.Timeout | undefined;
    // When this timeout triggers, no pong has been received.
    pongTimeoutId: NodeJS.Timeout | undefined;
    resetPongTimeout: () => void;
    pusherRoom: PusherRoom | undefined;
    xmppClient: XmppClient | undefined;
    jabberId: string;
    jabberPassword: string;
    activatedInviteUser: boolean | undefined;
    mucRooms: Array<MucRoomDefinitionInterface>;
    applications: Array<ApplicationDefinitionInterface> | undefined;
}
