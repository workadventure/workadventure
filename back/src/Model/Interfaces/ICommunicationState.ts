import type {
    HandleRecordingWebhookRequest,
    MeetingConnectionRestartMessage,
    SpaceUser,
} from "@workadventure/messages";
import type { S3Upload } from "livekit-server-sdk";
import type { RecordingStartInfo } from "../Services/LivekitService";
import type { ICommunicationStrategy, IRecordableStrategy } from "./ICommunicationStrategy";

export interface StateTransitionResult<T extends ICommunicationStrategy> {
    nextStatePromise?: Promise<ICommunicationState<T>>;
    abortController?: AbortController;
}

export interface ICommunicationState<T extends ICommunicationStrategy> {
    get communicationType(): string;
    init(): Promise<void>;
    handleUserAdded(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserDeleted(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserUpdated(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    handleUserToNotifyDeleted(user: SpaceUser): Promise<StateTransitionResult<T> | ICommunicationState<T> | void>;
    switchState(targetCommunicationType: string): void;
    finalize(): void;
    handleMeetingConnectionRestartMessage(
        meetingConnectionRestartMessage: MeetingConnectionRestartMessage,
        senderUserId: string,
    ): void;
}

export interface IRecordableState<T extends IRecordableStrategy> extends ICommunicationState<T> {
    handleStartRecording(user: SpaceUser, recordingSessionId: string): Promise<RecordingStartInfo>;
    handleStopRecording(egressId?: string): Promise<void>;
    handleLivekitWebhook(
        rawBody: Buffer | Uint8Array,
        authorizationHeader: string | undefined,
        spaceName: string,
        recordingSessionId: string,
    ): Promise<HandleRecordingWebhookRequest | "ignored">;
}

/** When an egress recorded its file, by the egress's clock, once it has ended. */
export type EgressFile = { startedAtMs: number; endedAtMs: number; durationMs: number };

/** A state whose microphones can be recorded one by one (see AutoRecorder): LivekitState. */
export interface IAutoRecordableState {
    /** Starts recording one participant's microphone to `filepath` in that bucket. Resolves to the egress id. */
    startTrackEgress(spaceUserId: string, trackSid: string, filepath: string, s3: S3Upload): Promise<string>;
    stopEgress(egressId: string): Promise<void>;
    /** Undefined while the egress has not written its file yet. */
    getEgressFile(egressId: string): Promise<EgressFile | undefined>;
}
