import type { HandleLivekitWebhookRequest, MeetingConnectionRestartMessage, SpaceUser } from "@workadventure/messages";
import type { ManagedRecordingState } from "../RecordingManager";
import { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";

export interface ICommunicationManager {
    getRecordingState(): ManagedRecordingState;
    getLivekitCredentials(user: SpaceUser): Promise<{ url: string, jwtToken: string }>;
    handleUserAdded(user: SpaceUser): Promise<void>;
    handleUserDeleted(user: SpaceUser): Promise<void>;
    handleUserUpdated(user: SpaceUser): Promise<void>;
    handleStartRecording(user: SpaceUser): Promise<void>;
    handleStopRecording(user: SpaceUser): Promise<void>;
    handleRecorderLeftSpace(spaceUserId: string): Promise<boolean>;
    handleServerStopRecording(): Promise<boolean>;
    handleLivekitWebhook(request: HandleLivekitWebhookRequest): Promise<void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void>;
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string
    ): void;
    destroy(): void;
}
