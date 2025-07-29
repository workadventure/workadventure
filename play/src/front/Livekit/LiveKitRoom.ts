import { Room } from "livekit-client";

export interface LiveKitRoom {
    prepareConnection(): Promise<Room>;
    joinRoom(): Promise<void>;
    leaveRoom(): void;
    destroy(): void;
}
