import type { ClientDuplexStream } from "@grpc/grpc-js";
import type {
    PusherToBackMessage,
    ServerToClientMessage,
    BackToPusherSpaceMessage,
    PusherToBackSpaceMessage,
    SpaceUser,
    ApplicationDefinitionInterface,
    AvailabilityStatus,
    CharacterTextureMessage,
    CompanionTextureMessage,
    MucRoomDefinition,
    BatchMessage,
    SpaceFilterMessage,
    SubMessage,
} from "@workadventure/messages";
import { PusherRoom } from "../PusherRoom";
import { Space } from "../Space";
import { Zone } from "../Zone";
import { PointInterface } from "./PointInterface";
import { ViewportInterface } from "./ViewportMessage";

export type BackConnection = ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
export type BackSpaceConnection_ = ClientDuplexStream<PusherToBackSpaceMessage, BackToPusherSpaceMessage>;

export interface BackSpaceConnection extends BackSpaceConnection_ {
    pingTimeout: NodeJS.Timeout | undefined;
}

export type SocketData = {
    rejected: false;
    disconnecting: boolean;
    token: string;
    roomId: string;
    userId?: number; // User Id served by the back
    userUuid: string; // Admin UUID
    userJid: string;
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
    jabberId: string;
    jabberPassword: string | undefined | null;
    activatedInviteUser: boolean | undefined;
    mucRooms: Array<MucRoomDefinition>;
    applications?: Array<ApplicationDefinitionInterface> | null;
    canEdit: boolean;
    spaceUser: SpaceUser;
    emitInBatch: (payload: SubMessage) => void;
    batchedMessages: BatchMessage;
    batchTimeout: NodeJS.Timeout | null;
    backConnection?: BackConnection;
    listenedZones: Set<Zone>;
    pusherRoom: PusherRoom | undefined;
    spaces: Space[];
    spacesFilters: Map<string, SpaceFilterMessage[]>;
    cameraState?: boolean;
    microphoneState?: boolean;
    screenSharingState?: boolean;
    megaphoneState?: boolean;
};
