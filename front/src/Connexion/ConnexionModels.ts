import type { SignalData } from "simple-peer";
import type { RoomConnection } from "./RoomConnection";
import type { BodyResourceDescriptionInterface } from "../Phaser/Entity/PlayerTextures";
import { PositionMessage_Direction } from "../Messages/ts-proto-generated/messages";

export interface PointInterface {
    x: number;
    y: number;
    direction: string; // TODO: modify this to the enum from ts-proto
    moving: boolean;
}

export interface MessageUserPositionInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    position: PointInterface;
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
}

export interface MessageUserMovedInterface {
    userId: number;
    position: PointInterface;
}

export interface MessageUserJoined {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    position: PointInterface;
    visitCardUrl: string | null;
    companion: string | null;
    userUuid: string;
    outlineColor: number | undefined;
}

export interface PositionInterface {
    x: number;
    y: number;
}

export interface GroupCreatedUpdatedMessageInterface {
    position: PositionInterface;
    groupId: number;
    groupSize: number;
}

export interface WebRtcDisconnectMessageInterface {
    userId: number;
}

export interface WebRtcSignalReceivedMessageInterface {
    userId: number;
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

export interface PlayerDetailsUpdatedMessageInterface {
    userId: number;
    outlineColor: number;
    removeOutlineColor: boolean;
}

export interface RoomJoinedMessageInterface {
    //users: MessageUserPositionInterface[],
    //groups: GroupCreatedUpdatedMessageInterface[],
    items: { [itemId: number]: unknown };
    variables: Map<string, unknown>;
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
