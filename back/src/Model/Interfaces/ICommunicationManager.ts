import type { HandleLivekitWebhookRequest, MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";
import type { ManagedRecordingState } from "../RecordingManager";
import type { SessionEndReason } from "../../Services/SpaceSessionAnalytics";

export interface ICommunicationManager {
    getRecordingState(): ManagedRecordingState;
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser): Promise<void>;
    handleUserUpdated(user: SpaceUser, updateMask?: string[]): Promise<void>;
    handleStartRecording(user: SpaceUser): Promise<void>;
    handleStopRecording(user: SpaceUser): Promise<void>;
    handleRecorderLeftSpace(spaceUserId: string): Promise<boolean>;
    handleServerStopRecording(): Promise<boolean>;
    handleLivekitWebhook(request: HandleLivekitWebhookRequest): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
    handleMemberJoined(user: SpaceUser, active: boolean): void;
    handleMemberActiveChanged(spaceUserId: string, active: boolean): void;
    handleMemberLeft(spaceUserId: string): void;
    handleSpaceKindChanged(): void;
    closeSession(endReason: SessionEndReason): boolean;
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string,
    ): void;
    destroy(): void;
}
