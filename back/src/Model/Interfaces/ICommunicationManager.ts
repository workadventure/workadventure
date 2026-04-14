import type { MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";

export interface ICommunicationManager {
    getRecordingState(): { isRecording: boolean; recorder: string | null };
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser): Promise<void>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleStartRecording(user: SpaceUser): Promise<void>;
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
