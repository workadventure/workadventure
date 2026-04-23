import type { MeetingConnectionRestartMessage, SpaceRecordingLayoutMode, SpaceUser } from "@workadventure/messages";
import type { ManagedRecordingState } from "../RecordingManager";

export interface ICommunicationManager {
    getRecordingState(): ManagedRecordingState;
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser): Promise<void>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleStartRecording(user: SpaceUser, layoutMode?: SpaceRecordingLayoutMode): Promise<void>;
    handleStopRecording(user: SpaceUser): Promise<void>;
    handleRecorderLeftSpace(spaceUserId: string): Promise<boolean>;
    handleServerStopRecording(): Promise<boolean>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string
    ): void;
    destroy(): void;
}
