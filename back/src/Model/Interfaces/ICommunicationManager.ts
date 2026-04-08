import type { MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";

export interface ICommunicationManager {
    getRecordingState(): { isRecording: boolean; recorder: string | null };
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser, shouldStopRecording: boolean): Promise<void>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleStartRecording(user: SpaceUser): Promise<void>;
    handleStopRecording(user: SpaceUser): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string
    ): void;
    destroy(): void;
}
