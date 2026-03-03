import type { Room } from "livekit-client";
import type { LiveKitTranscriptionState } from "./LiveKitTranscriptionTypes";

export interface LiveKitRoomInterface {
    prepareConnection(): Promise<Room>;
    joinRoom(): Promise<void>;
    leaveRoom(): void;
    getTranscriptionStateStore(): LiveKitTranscriptionState;
    destroy(): void;
}
