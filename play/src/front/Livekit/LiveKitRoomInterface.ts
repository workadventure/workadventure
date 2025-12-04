import { Room } from "livekit-client";

export interface LiveKitRoomInterface {
    prepareConnection(): Promise<Room>;
    joinRoom(): Promise<void>;
    leaveRoom(): void;
    destroy(): Promise<void>;
}
