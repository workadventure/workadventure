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
} from "@workadventure/messages";
import type { AdminLoginMessage } from "../../services/AdminApi";
import type { PusherRoom } from "../PusherRoom";
import type { ViewportInterface } from "./ViewportMessage";

export type BackConnection = ClientDuplexStream<PusherToBackMessage, ServerToClientMessage>;
export type BackSpaceConnection_ = ClientDuplexStream<PusherToBackSpaceMessage, BackToPusherSpaceMessage>;

export interface BackSpaceConnection extends BackSpaceConnection_ {
    pingTimeout: NodeJS.Timeout | undefined;
}

export type SpaceName = string;

/**
 * The data attached to a socket in "connecting" state (i.e. when the websocket connection is established but the
 * JoinRoomFrontMessage was not received yet)
 */
export type ConnectingSocketData = {
    rejected: false;
    token: string;
    roomId: string;
    userId?: number; // User Id served by the back
    userUuid: string; // Admin UUID
    isLogged: boolean;
    ipAddress: string;
    characterTextures: CharacterTextureMessage[];
    companionTexture?: CompanionTextureMessage;
    lastCommandId?: string;
    tags: string[];
    visitCardUrl: string | null;
    userRoomToken: string | undefined;
    loginMessages: AdminLoginMessage[];
    activatedInviteUser: boolean | undefined;
    applications?: Array<ApplicationDefinitionInterface> | null;
    canEdit: boolean;
    spaceUserId: string;
    backConnection?: BackConnection;
    listenedZones: Set<string>;
    pusherRoom: PusherRoom | undefined;
    spaces: Set<SpaceName>;
    joinSpacesPromise: Map<SpaceName, Promise<void>>;
    chatID?: string;
    world: string;
    currentChatRoomArea: string[];
    roomName: string;
    microphoneState: boolean;
    cameraState: boolean;
    // Unique identifier for the browser tab, captured as early as websocket upgrade.
    tabId: string;
    attendeesState: boolean;
    // The abort controllers for each queries received
    queryAbortControllers: Map<number, AbortController>;
    canRecord: boolean;
};

export type SocketData = ConnectingSocketData & {
    name: string;
    viewport: ViewportInterface;
    availabilityStatus: AvailabilityStatus;
    // Unique identifier for the browser tab, used to detect reconnections from the same tab
    tabId: string | undefined;
};
