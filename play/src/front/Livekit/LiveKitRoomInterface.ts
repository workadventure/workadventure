import type { Room } from "livekit-client";

export interface LiveKitRoomInterface {
    prepareConnection(): Promise<Room>;
    joinRoom(): Promise<void>;
    leaveRoom(): void;
    destroy(): void;
}
