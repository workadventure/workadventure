import type {
    HandleRecordingWebhookRequest,
    MeetingConnectionRestartMessage,
    SpaceUser,
} from "@workadventure/messages";
import type { RecordingStartInfo } from "../Services/LivekitService";

export interface ICommunicationStrategy {
    addUser(user: SpaceUser): Promise<void>;
    deleteUser(user: SpaceUser): void;
    updateUser(user: SpaceUser): void;
    addUserToNotify(user: SpaceUser): Promise<void>;
    deleteUserFromNotify(user: SpaceUser): void;
    initialize(users: ReadonlyMap<string, SpaceUser>, usersToNotify: ReadonlyMap<string, SpaceUser>): Promise<void>;
    addUserReady(userId: string): void;
    canSwitch(): boolean;
    cleanup(): void;
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId?: string
    ): void;
}

export interface IRecordableStrategy extends ICommunicationStrategy {
    startRecording(user: SpaceUser, recordingSessionId: string): Promise<RecordingStartInfo>;
    stopRecording(egressId?: string): Promise<void>;
    handleLivekitWebhook(
        rawBody: Buffer | Uint8Array,
        authorizationHeader: string | undefined,
        spaceName: string,
        recordingSessionId: string
    ): Promise<HandleRecordingWebhookRequest | "ignored">;
}
