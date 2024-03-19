import { ClientToServerMessage, SpaceFilterMessage, SpaceUser } from "@workadventure/messages";

import { SpaceEventEmitterInterface } from "./SpaceEventEmitterInterface";

export enum WebSocketStatus {
    OPEN = 1,
    CLOSING = 2,
    CLOSED = 3,
}
export interface Encoder {
    encode(message: ClientToServerMessage): {
        finish: () => Uint8Array;
    };
}

export interface SpaceEventEmitterSocket {
    send(message: Uint8Array): void;
    readyState: number;
}

export enum SpaceFilterMessageCase {
    ADD = "addSpaceFilterMessage",
    REMOVE = "removeSpaceFilterMessage",
    UPDATE_FILTER = "updateSpaceFilterMessage",
    UPDATE_SPACE_METADATA = "updateSpaceMetadataMessage",
    USER_JOIN_SPACE = "addSpaceUserMessage",
    USER_LEAVE_SPACE = "removeSpaceUserMessage",
}
export class ProtobufSpaceEventEmitter implements SpaceEventEmitterInterface {
    constructor(private socket: SpaceEventEmitterSocket, private encoder: Encoder) {}
    addSpaceFilter(newSpaceFilter: SpaceFilterMessage): void {
        this.send({
            message: {
                $case: SpaceFilterMessageCase.ADD,
                addSpaceFilterMessage: newSpaceFilter,
            },
        });
    }

    removeSpaceFilter(spaceFilter: SpaceFilterMessage): void {
        this.send({
            message: {
                $case: SpaceFilterMessageCase.REMOVE,
                removeSpaceFilterMessage: spaceFilter,
            },
        });
    }

    updateSpaceFilter(spaceFilter: SpaceFilterMessage): void {
        this.send({
            message: {
                $case: SpaceFilterMessageCase.UPDATE_FILTER,
                updateSpaceFilterMessage: spaceFilter,
            },
        });
    }

    updateSpaceMetadata(spaceName: string, metadata: string): void {
        this.send({
            message: {
                $case: SpaceFilterMessageCase.UPDATE_SPACE_METADATA,
                updateSpaceMetadataMessage: {
                    spaceName,
                    metadata,
                    filterName: undefined,
                },
            },
        });
    }

    userJoinSpace(spaceName: string, spaceUser: SpaceUser): void {
        this.send({
            message: {
                $case: SpaceFilterMessageCase.USER_JOIN_SPACE,
                addSpaceUserMessage: {
                    user: spaceUser,
                    filterName: undefined,
                    spaceName,
                },
            },
        });
    }

    userLeaveSpace(spaceName: string, spaceUser: SpaceUser): void {
        this.send({
            message: {
                $case: SpaceFilterMessageCase.USER_LEAVE_SPACE,
                removeSpaceUserMessage: {
                    userId: spaceUser.id,
                    spaceName,
                    filterName: undefined,
                },
            },
        });
    }

    private send(message: ClientToServerMessage): void {
        const bytes = this.encoder.encode(message).finish();
        if (this.socket.readyState === WebSocketStatus.CLOSING || this.socket.readyState === WebSocketStatus.CLOSED) {
            console.warn("Trying to send a message to the server, but the connection is closed. Message: ", message);
            return;
        }
        this.socket.send(bytes);
    }
}
