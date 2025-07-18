import type { ClientDuplexStream } from "@grpc/grpc-js";
import type {
    PusherToBackMessage,
    ServerToClientMessage,
    BackToPusherSpaceMessage,
    PusherToBackSpaceMessage,
    ApplicationDefinitionInterface,
    AvailabilityStatus,
    CharacterTextureMessage,
    CompanionTextureMessage,
    BatchMessage,
    SubMessage,
} from "@workadventure/messages";
import { Deferred } from "ts-deferred";
import { PusherRoom } from "../PusherRoom";
import { Zone } from "../Zone";
import { PointInterface } from "./PointInterface";
import { ViewportInterface } from "./ViewportMessage";

export type BackConnection = ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
export type BackSpaceConnection_ = ClientDuplexStream<PusherToBackSpaceMessage, BackToPusherSpaceMessage>;

export interface BackSpaceConnection extends BackSpaceConnection_ {
    pingTimeout: NodeJS.Timeout | undefined;
}

export type SpaceName = string;

export type SocketData = {
    rejected: false;
    disconnecting: boolean;
    token: string;
    roomId: string;
    userId?: number; // User Id served by the back
    userUuid: string; // Admin UUID
    isLogged: boolean;
    ipAddress: string;
    name: string;
    characterTextures: CharacterTextureMessage[];
    companionTexture?: CompanionTextureMessage;
    position: PointInterface;
    viewport: ViewportInterface;
    availabilityStatus: AvailabilityStatus;
    lastCommandId?: string;
    messages: unknown[];
    tags: string[];
    visitCardUrl: string | null;
    userRoomToken: string | undefined;
    activatedInviteUser: boolean | undefined;
    applications?: Array<ApplicationDefinitionInterface> | null;
    canEdit: boolean;
    spaceUserId: string;
    emitInBatch: (payload: SubMessage) => void;
    batchedMessages: BatchMessage;
    batchTimeout: NodeJS.Timeout | null;
    backConnection?: BackConnection;
    listenedZones: Set<Zone>;
    pusherRoom: PusherRoom | undefined;
    spaces: Set<SpaceName>;
    joinSpacesPromise: Map<SpaceName, Deferred<void>>;
    chatID?: string;
    world: string;
    currentChatRoomArea: string[];
    roomName: string;
    microphoneState: boolean;
    cameraState: boolean;
    canRecord: boolean;
};
