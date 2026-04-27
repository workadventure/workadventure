import { randomUUID } from "crypto";
import type { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import type { ITransitionOrchestrator } from "./Interfaces/ITransitionOrchestrator";
import { CommunicationType } from "./Types/CommunicationTypes";
import type { IUserRegistry } from "./Interfaces/IUserRegistry";
import type { IStateLifecycleManager } from "./Interfaces/IStateLifecycleManager";
import type { IRecordableStrategy } from "./Interfaces/ICommunicationStrategy";
import { getLivekitRoomName } from "./Services/LivekitService";

export type RecordingStatus = "idle" | "starting" | "recording" | "stopping";

interface RecordingSession {
    createdAt: number;
    egressId?: string;
    expectedRoomName: string;
    recorder: SpaceUser;
    recordingSessionId: string;
    startPromise: Promise<void> | null;
    status: Exclude<RecordingStatus, "idle">;
    stopAfterStartRequested: boolean;
    stopPromise: Promise<SpaceUser | null> | null;
}

export interface ManagedRecordingState {
    isRecording: boolean;
    recorder: string | null;
    status: RecordingStatus;
}

export interface IRecordingManager {
    getRecordingState(): ManagedRecordingState;
    startRecording(user: SpaceUser): Promise<void>;
    stopRecording(user: SpaceUser): Promise<SpaceUser | null>;
    stopRecordingByServer(): Promise<SpaceUser | null>;
    stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null>;
    confirmRecordingStartedByWebhook(recordingSessionId: string, egressId: string, roomName: string): boolean;
    finishRecordingByWebhook(
        recordingSessionId: string,
        egressId: string,
        roomName: string
    ): { processed: boolean; recorder: SpaceUser | null; unexpected: boolean; hasActiveSessions: boolean };
    hasRecordingSession(recordingSessionId: string): boolean;
    handleAddUser(user: SpaceUser): void;
    isRecording: boolean;
    destroy(): void;
}

export class RecordingManager implements IRecordingManager {
    private readonly sessions = new Map<string, RecordingSession>();
    private readonly sessionIdsByEgressId = new Map<string, string>();
    private primarySessionId: string | undefined;

    constructor(
        private readonly _space: ICommunicationSpace,
        private readonly _transitionOrchestrator: ITransitionOrchestrator,
        private readonly _userRegistry: IUserRegistry,
        private readonly _lifecycleManager: IStateLifecycleManager
    ) {}

    public async startRecording(user: SpaceUser): Promise<void> {
        const primarySession = this.getPrimarySession();

        if (!primarySession) {
            const session = this.createSession(user);
            return this.runStart(session);
        }

        if (primarySession.recorder.spaceUserId !== user.spaceUserId) {
            switch (primarySession.status) {
                case "starting":
                    throw new Error("Recording is already starting");
                case "recording":
                    throw new Error("Recording already started");
                case "stopping":
                    throw new Error("Recording is already stopping");
            }
        }

        switch (primarySession.status) {
            case "starting":
                if (primarySession.startPromise) {
                    return primarySession.startPromise;
                }
                throw new Error("Recording is already starting");
            case "recording":
                return;
            case "stopping":
                if (primarySession.stopPromise) {
                    await primarySession.stopPromise;
                    return;
                }
                throw new Error("Recording is already stopping");
        }
    }

    public async stopRecording(user: SpaceUser): Promise<SpaceUser | null> {
        const primarySession = this.getPrimarySession();
        if (!primarySession) {
            console.warn("No recording is currently active.");
            return null;
        }

        if (primarySession.recorder.spaceUserId !== user.spaceUserId) {
            throw new Error("User is not the one recording");
        }

        return this.stopSession(primarySession);
    }

    public async stopRecordingByServer(): Promise<SpaceUser | null> {
        const primarySession = this.getPrimarySession();
        if (!primarySession) {
            return null;
        }

        return this.stopSession(primarySession);
    }

    public async stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null> {
        const primarySession = this.getPrimarySession();
        if (!primarySession || primarySession.recorder.spaceUserId !== spaceUserId) {
            return null;
        }

        return this.stopSession(primarySession);
    }

    public handleAddUser(_user: SpaceUser): void {
        // Intentionally empty. Kept for symmetry with deletion hooks.
    }

    public hasRecordingSession(recordingSessionId: string): boolean {
        return this.sessions.has(recordingSessionId);
    }

    public getRecordingState(): ManagedRecordingState {
        return this.buildStateSnapshot();
    }

    public get isRecording(): boolean {
        return this.sessions.size > 0;
    }

    public destroy(): void {
        const sessions = Array.from(this.sessions.values());
        for (const session of sessions) {
            this.stopSession(session).catch((error) => {
                console.error(error);
                Sentry.captureException(error);
            });
        }
    }

    public confirmRecordingStartedByWebhook(recordingSessionId: string, egressId: string, roomName: string): boolean {
        const session = this.sessions.get(recordingSessionId);
        if (!session) {
            return false;
        }

        if (!this.matchesSessionWebhook(session, egressId, roomName)) {
            return false;
        }

        if (session.status === "recording") {
            return true;
        }

        if (session.status === "stopping") {
            return true;
        }

        session.status = "recording";
        this.publishState();

        if (session.stopAfterStartRequested) {
            this.runStop(session).catch((error) => {
                console.error("Error stopping recording after LiveKit start confirmation:", error);
                Sentry.captureException(error);
            });
        }

        return true;
    }

    public finishRecordingByWebhook(
        recordingSessionId: string,
        egressId: string,
        roomName: string
    ): { processed: boolean; recorder: SpaceUser | null; unexpected: boolean; hasActiveSessions: boolean } {
        const session = this.sessions.get(recordingSessionId);
        if (!session) {
            return { processed: false, recorder: null, unexpected: false, hasActiveSessions: this.sessions.size > 0 };
        }

        if (!this.matchesSessionWebhook(session, egressId, roomName)) {
            return {
                processed: false,
                recorder: session.recorder,
                unexpected: false,
                hasActiveSessions: this.sessions.size > 0,
            };
        }

        const unexpected = session.status !== "stopping";
        const recorder = session.recorder;
        this.deleteSession(recordingSessionId);
        this.publishState();

        return {
            processed: true,
            recorder,
            unexpected,
            hasActiveSessions: this.sessions.size > 0,
        };
    }

    private createSession(recorder: SpaceUser): RecordingSession {
        const session: RecordingSession = {
            createdAt: Date.now(),
            expectedRoomName: getLivekitRoomName(this._space.getSpaceName()),
            recorder,
            recordingSessionId: randomUUID(),
            startPromise: null,
            status: "starting",
            stopAfterStartRequested: false,
            stopPromise: null,
        };

        this.sessions.set(session.recordingSessionId, session);
        this.primarySessionId = session.recordingSessionId;
        return session;
    }

    private getPrimarySession(): RecordingSession | undefined {
        if (this.primarySessionId) {
            const primarySession = this.sessions.get(this.primarySessionId);
            if (primarySession) {
                return primarySession;
            }
        }

        const fallbackSession = Array.from(this.sessions.values()).sort(
            (left, right) => right.createdAt - left.createdAt
        )[0];
        this.primarySessionId = fallbackSession?.recordingSessionId;
        return fallbackSession;
    }

    private deleteSession(recordingSessionId: string): void {
        const session = this.sessions.get(recordingSessionId);
        if (session?.egressId) {
            this.sessionIdsByEgressId.delete(session.egressId);
        }

        this.sessions.delete(recordingSessionId);
        if (this.primarySessionId === recordingSessionId) {
            this.primarySessionId = undefined;
        }
        this.getPrimarySession();
    }

    private async runStart(session: RecordingSession): Promise<void> {
        const promise = this.performStart(session);
        session.startPromise = promise;

        try {
            await promise;
        } finally {
            if (session.startPromise === promise) {
                session.startPromise = null;
            }
        }
    }

    private async performStart(session: RecordingSession): Promise<void> {
        session.status = "starting";
        session.stopAfterStartRequested = false;
        session.egressId = undefined;
        session.expectedRoomName = getLivekitRoomName(this._space.getSpaceName());
        this.publishState();

        try {
            const currentState = this._lifecycleManager.getCurrentState();

            if (this.isRecordableState(currentState)) {
                const recordingStartInfo = await currentState.handleStartRecording(
                    session.recorder,
                    session.recordingSessionId
                );
                this.reconcileStartResult(
                    session.recordingSessionId,
                    recordingStartInfo.egressId,
                    recordingStartInfo.roomName
                );
            } else {
                await this.switchToLivekitAndRecord(session);
            }
        } catch (error) {
            this.deleteSession(session.recordingSessionId);
            this.publishState();
            throw error;
        }
    }

    private async stopSession(session: RecordingSession): Promise<SpaceUser | null> {
        switch (session.status) {
            case "starting":
                return this.requestStopAfterStart(session);
            case "recording":
                return this.runStop(session);
            case "stopping":
                return session.stopPromise ? await session.stopPromise : null;
        }
    }

    private async requestStopAfterStart(session: RecordingSession): Promise<SpaceUser | null> {
        session.stopAfterStartRequested = true;

        if (session.startPromise) {
            await session.startPromise;
        }

        const refreshedSession = this.sessions.get(session.recordingSessionId);
        if (!refreshedSession) {
            return session.recorder;
        }

        if (refreshedSession.status === "recording") {
            return this.runStop(refreshedSession);
        }

        if (refreshedSession.status === "stopping" && refreshedSession.stopPromise) {
            return refreshedSession.stopPromise;
        }

        return session.recorder;
    }

    private async runStop(session: RecordingSession): Promise<SpaceUser | null> {
        if (session.stopPromise) {
            return session.stopPromise;
        }

        const promise = this.performStop(session);
        session.stopPromise = promise;

        try {
            return await promise;
        } finally {
            if (session.stopPromise === promise) {
                session.stopPromise = null;
            }
        }
    }

    private async performStop(session: RecordingSession): Promise<SpaceUser | null> {
        session.status = "stopping";
        this.publishState();

        try {
            const currentState = this._lifecycleManager.getCurrentState();

            if (!this.isRecordableState(currentState)) {
                throw new Error("Current state is not recordable");
            }

            await currentState.handleStopRecording(session.egressId);
            return session.recorder;
        } catch (error) {
            session.status = session.egressId ? "recording" : "starting";
            this.publishState();
            throw error;
        }
    }

    private async switchToLivekitAndRecord(session: RecordingSession): Promise<void> {
        const recordableState = await this._transitionOrchestrator.executeImmediateTransition(
            CommunicationType.LIVEKIT,
            {
                space: this._space,
                users: this._userRegistry.getUsers(),
                usersToNotify: this._userRegistry.getUsersToNotify(),
                playUri: session.recorder.playUri,
            }
        );

        if (!recordableState || !this.isRecordableState(recordableState)) {
            throw new Error("Failed to switch to Livekit");
        }

        await this._lifecycleManager.transitionTo(recordableState);
        const recordingStartInfo = await recordableState.handleStartRecording(
            session.recorder,
            session.recordingSessionId
        );
        this.reconcileStartResult(session.recordingSessionId, recordingStartInfo.egressId, recordingStartInfo.roomName);
    }

    private reconcileStartResult(recordingSessionId: string, egressId: string, roomName: string): void {
        const session = this.sessions.get(recordingSessionId);
        if (!session) {
            return;
        }

        if (roomName !== session.expectedRoomName) {
            return;
        }

        if (!session.egressId) {
            this.assignEgressId(session, egressId);
            return;
        }
    }

    private publishState(): void {
        const snapshot = this.buildStateSnapshot();
        this._space.publishMetadata({
            recording: {
                recorder: snapshot.recorder,
                recording: snapshot.status === "recording" || snapshot.status === "stopping",
                status: snapshot.status,
            },
        });
    }

    private buildStateSnapshot(): ManagedRecordingState {
        const primarySession = this.getPrimarySession();
        if (!primarySession) {
            return {
                isRecording: false,
                recorder: null,
                status: "idle",
            };
        }

        return {
            isRecording: true,
            recorder: primarySession.recorder.spaceUserId,
            status: primarySession.status,
        };
    }

    private matchesSessionWebhook(session: RecordingSession, egressId: string, roomName: string): boolean {
        if (roomName !== session.expectedRoomName) {
            return false;
        }

        if (getLivekitRoomName(this._space.getSpaceName()) !== roomName) {
            return false;
        }

        if (!session.egressId) {
            return this.assignEgressId(session, egressId);
        }

        if (session.egressId !== egressId) {
            return false;
        }

        return true;
    }

    private assignEgressId(session: RecordingSession, egressId: string): boolean {
        const existingSessionId = this.sessionIdsByEgressId.get(egressId);
        if (existingSessionId && existingSessionId !== session.recordingSessionId) {
            return false;
        }

        if (session.egressId && session.egressId !== egressId) {
            this.sessionIdsByEgressId.delete(session.egressId);
        }

        session.egressId = egressId;
        this.sessionIdsByEgressId.set(egressId, session.recordingSessionId);
        return true;
    }

    private isRecordableState(
        state: ICommunicationState<IRecordableStrategy>
    ): state is IRecordableState<IRecordableStrategy> {
        return "handleStartRecording" in state && "handleStopRecording" in state;
    }
}
