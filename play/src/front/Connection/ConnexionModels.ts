import type { SignalData } from "simple-peer";
import type {
    ApplicationDefinitionInterface,
    AvailabilityStatus,
    EditMapCommandMessage,
    PositionMessage,
    SayMessage,
} from "@workadventure/messages";
import type { WokaTextureDescriptionInterface } from "../Phaser/Entity/PlayerTextures";
import { CompanionTextureDescriptionInterface } from "../Phaser/Companion/CompanionTextures";
import type { RoomConnection } from "./RoomConnection";

export interface MessageUserMovedInterface {
    userId: number;
    position: PositionMessage;
}

export interface MessageUserJoined {
    userId: number;
    name: string;
    characterTextures: WokaTextureDescriptionInterface[];
    position: PositionMessage;
    availabilityStatus: AvailabilityStatus;
    visitCardUrl: string | null;
    companionTexture: CompanionTextureDescriptionInterface | undefined;
    userUuid: string;
    outlineColor: number | undefined;
    variables: Map<string, unknown>;
    chatID?: string;
    sayMessage?: SayMessage;
}

export interface PositionInterface {
    x: number;
    y: number;
}

export interface GroupCreatedUpdatedMessageInterface {
    position: PositionInterface;
    groupId: number;
    groupSize?: number;
    locked?: boolean;
    userIds: number[];
}

export interface GroupUsersUpdateMessageInterface {
    groupId: number;
    userIds: number[];
}

export interface WebRtcDisconnectMessageInterface {
    userId: number;
}

export interface WebRtcSignalReceivedMessageInterface {
    userId: string;
    signal: SignalData;
    webRtcUser: string | undefined;
    webRtcPassword: string | undefined;
}

export interface ViewportInterface {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface ItemEventMessageInterface {
    itemId: number;
    event: string;
    state: unknown;
    parameters: unknown;
}

export interface RoomJoinedMessageInterface {
    items: { [itemId: number]: unknown };
    variables: Map<string, unknown>;
    playerVariables: Map<string, unknown>;
    characterTextures: WokaTextureDescriptionInterface[];
    companionTexture?: CompanionTextureDescriptionInterface;
    commandsToApply?: EditMapCommandMessage[];
    webRtcUserName: string;
    webRtcPassword: string;
    applications?: Array<ApplicationDefinitionInterface> | undefined;
}

export interface PlayGlobalMessageInterface {
    type: string;
    content: string;
    broadcastToWorld: boolean;
}

export interface OnConnectInterface {
    connection: RoomConnection;
    room: RoomJoinedMessageInterface;
}
