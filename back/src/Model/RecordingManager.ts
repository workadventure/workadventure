import { randomUUID } from "crypto";
import type { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { LIVEKIT_RECORDING_WITH_MAP } from "../Enum/EnvironmentVariable";
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
    withMap: boolean;
    /** A recording over the map of a bubble follows the person recording (their uuid), not the bubble. */
    follows?: string;
}

/**
 * A bubble breaks up and forms again under another space as people walk, so a recording over the map of a bubble
 * follows the person who started it (the recorder page goes along, see GameRoom.startFollowing). The space it was
 * started from keeps the session and gets its webhooks; every bubble the person is in shows it, can stop it and
 * stays on LiveKit for the recorder page to see the cameras.
 */
interface FollowedRecording {
    owner: RecordingManager;
    recordingSessionId: string;
    /** The bubbles the person is in right now. */
    spaces: Set<RecordingManager>;
    graceTimer?: ReturnType<typeof setTimeout>;
}
const followedRecordings = new Map<string, FollowedRecording>();
// ponytail: alone (or gone) for this long, the person is done; a "pause" in the UI would let them say so.
export const FOLLOW_GRACE_MS = 2 * 60 * 1000;

export interface ManagedRecordingState {
    isRecording: boolean;
    recorder: string | null;
    status: RecordingStatus;
}

export interface IRecordingManager {
    getRecordingState(): ManagedRecordingState;
    startRecording(user: SpaceUser, withMap?: boolean): Promise<void>;
    stopRecording(user: SpaceUser): Promise<SpaceUser | null>;
    stopRecordingByServer(): Promise<SpaceUser | null>;
    stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null>;
    confirmRecordingStartedByWebhook(recordingSessionId: string, egressId: string, roomName: string): boolean;
    finishRecordingByWebhook(
        recordingSessionId: string,
        egressId: string,
        roomName: string,
    ): { processed: boolean; recorder: SpaceUser | null; unexpected: boolean; hasActiveSessions: boolean };
    /** The sessions still waiting for LiveKit to report the end of their egress. */
    getRecordingSessionIds(): string[];
    /** Called when a session starts waiting for its egress, before LiveKit is even asked to start it. */
    onSessionAdded?: (recordingSessionId: string) => void;
    /** Called when a session no longer waits for its egress. */
    onSessionRemoved?: (recordingSessionId: string) => void;
    handleAddUser(user: SpaceUser): void;
    /** The space said it is a bubble: a recording following one of its users shows here. */
    handleSpaceKindChanged(): void;
    readonly followedRecorder: SpaceUser | undefined;
    isRecording: boolean;
    destroy(): void;
}

export class RecordingManager implements IRecordingManager {
    private readonly sessions = new Map<string, RecordingSession>();
    private readonly sessionIdsByEgressId = new Map<string, string>();
    private primarySessionId: string | undefined;
    /** A recording started in another bubble, by someone now in this one. */
    private followed: { recording: FollowedRecording; recorder: SpaceUser } | undefined;
    public onSessionAdded?: (recordingSessionId: string) => void;
    public onSessionRemoved?: (recordingSessionId: string) => void;

    constructor(
        private readonly _space: ICommunicationSpace,
        private readonly _transitionOrchestrator: ITransitionOrchestrator,
        private readonly _userRegistry: IUserRegistry,
        private readonly _lifecycleManager: IStateLifecycleManager,
    ) {}

    public async startRecording(user: SpaceUser, withMap = false): Promise<void> {
        if (this.followed || (this.follows(withMap) && followedRecordings.has(user.uuid))) {
            throw new Error("Recording already started");
        }
        const primarySession = this.getPrimarySession();

        if (!primarySession) {
            const session = this.createSession(user, withMap);
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
        if (this.followed) {
            if (this.followed.recorder.spaceUserId !== user.spaceUserId) {
                throw new Error("User is not the one recording");
            }
            return this.followed.recording.owner.stopFollowed(this.followed.recording);
        }
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
        // The last camera left this bubble, not the recording: it is elsewhere with the person.
        if (!primarySession || primarySession.follows) {
            return null;
        }

        return this.stopSession(primarySession);
    }

    public async stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null> {
        if (this.followed?.recorder.spaceUserId === spaceUserId) {
            this.leaveFollowed();
            return null;
        }
        const primarySession = this.getPrimarySession();
        if (!primarySession || primarySession.recorder.spaceUserId !== spaceUserId) {
            return null;
        }
        const followed = primarySession.follows && followedRecordings.get(primarySession.follows);
        if (followed) {
            // The person left this bubble: the recording goes with them.
            this.unfollow(followed);
            this.publishState();
            return null;
        }

        return this.stopSession(primarySession);
    }

    public handleAddUser(user: SpaceUser): void {
        this.showFollowed(user);
    }

    public handleSpaceKindChanged(): void {
        for (const user of this._userRegistry.getUsers().values()) {
            this.showFollowed(user);
        }
    }

    /** The person a recording follows, when it shows in this bubble because of them. */
    public get followedRecorder(): SpaceUser | undefined {
        return this.followed?.recorder;
    }

    private showFollowed(user: SpaceUser): void {
        const recording = followedRecordings.get(user.uuid);
        if (!recording || this._space.getState().kind !== "bubble" || recording.spaces.has(this)) {
            return;
        }
        if (recording.owner !== this) {
            // ponytail: a bubble shows one recording; joining a bubble already recorded leaves this one running unseen.
            if (this.followed || this.sessions.size > 0) {
                return;
            }
            this.followed = { recording, recorder: user };
        }
        recording.spaces.add(this);
        clearTimeout(recording.graceTimer);
        recording.graceTimer = undefined;
        this.publishState();
    }

    private leaveFollowed(): void {
        const recording = this.followed?.recording;
        this.followed = undefined;
        if (recording) {
            this.unfollow(recording);
        }
        this.publishState();
    }

    private unfollow(recording: FollowedRecording): void {
        recording.spaces.delete(this);
        if (recording.spaces.size > 0 || recording.graceTimer) {
            return;
        }
        recording.graceTimer = setTimeout(() => {
            recording.owner.stopFollowed(recording).catch((error) => {
                console.error("Error stopping a recording nobody is in anymore:", error);
                Sentry.captureException(error);
            });
        }, FOLLOW_GRACE_MS);
        recording.graceTimer.unref?.();
    }

    private async stopFollowed(recording: FollowedRecording): Promise<SpaceUser | null> {
        const session = this.sessions.get(recording.recordingSessionId);
        return session ? this.stopSession(session) : null;
    }

    private follows(withMap: boolean): boolean {
        return withMap && LIVEKIT_RECORDING_WITH_MAP && this._space.getState().kind === "bubble";
    }

    public getRecordingSessionIds(): string[] {
        return Array.from(this.sessions.keys());
    }

    public getRecordingState(): ManagedRecordingState {
        return this.buildStateSnapshot();
    }

    public get isRecording(): boolean {
        return this.sessions.size > 0 || this.followed !== undefined;
    }

    public destroy(): void {
        if (this.followed) {
            this.leaveFollowed();
        }
        const sessions = Array.from(this.sessions.values());
        for (const session of sessions) {
            const followed = session.follows && followedRecordings.get(session.follows);
            if (followed) {
                // This bubble is over, not the recording: it is elsewhere with the person, or waits for them.
                this.unfollow(followed);
                continue;
            }
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
        roomName: string,
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

    private createSession(recorder: SpaceUser, withMap: boolean): RecordingSession {
        const session: RecordingSession = {
            createdAt: Date.now(),
            expectedRoomName: getLivekitRoomName(this._space.getSpaceName()),
            recorder,
            recordingSessionId: randomUUID(),
            startPromise: null,
            status: "starting",
            stopAfterStartRequested: false,
            stopPromise: null,
            withMap,
            follows: this.follows(withMap) ? recorder.uuid : undefined,
        };

        this.sessions.set(session.recordingSessionId, session);
        if (session.follows) {
            followedRecordings.set(session.follows, {
                owner: this,
                recordingSessionId: session.recordingSessionId,
                spaces: new Set([this]),
            });
        }
        this.primarySessionId = session.recordingSessionId;
        this.onSessionAdded?.(session.recordingSessionId);
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
            (left, right) => right.createdAt - left.createdAt,
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
        const followed = session?.follows && followedRecordings.get(session.follows);
        if (followed && followed.recordingSessionId === recordingSessionId) {
            followedRecordings.delete(session.follows ?? "");
            clearTimeout(followed.graceTimer);
            for (const space of followed.spaces) {
                if (space !== this) {
                    space.leaveFollowed();
                }
            }
        }
        this.onSessionRemoved?.(recordingSessionId);
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
                    session.recordingSessionId,
                    session.withMap,
                );
                this.reconcileStartResult(
                    session.recordingSessionId,
                    recordingStartInfo.egressId,
                    recordingStartInfo.roomName,
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
            },
        );

        if (!recordableState || !this.isRecordableState(recordableState)) {
            throw new Error("Failed to switch to Livekit");
        }

        await this._lifecycleManager.transitionTo(recordableState);
        const recordingStartInfo = await recordableState.handleStartRecording(
            session.recorder,
            session.recordingSessionId,
            session.withMap,
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
        this.writeState();
        const session = this.getPrimarySession();
        const followed = session?.follows && followedRecordings.get(session.follows);
        for (const space of followed ? followed.spaces : []) {
            if (space !== this) {
                space.writeState();
            }
        }
    }

    private writeState(): void {
        const snapshot = this.buildStateSnapshot();
        this._space.updateState((state) => {
            state.recording = {
                recorder: snapshot.recorder,
                recording: snapshot.status === "recording" || snapshot.status === "stopping",
                status: snapshot.status,
            };
        });
    }

    private buildStateSnapshot(): ManagedRecordingState {
        if (this.followed) {
            const session = this.followed.recording.owner.sessions.get(this.followed.recording.recordingSessionId);
            return session
                ? { isRecording: true, recorder: this.followed.recorder.spaceUserId, status: session.status }
                : { isRecording: false, recorder: null, status: "idle" };
        }
        const primarySession = this.getPrimarySession();
        const followed = primarySession?.follows && followedRecordings.get(primarySession.follows);
        // The person took the recording to another bubble: this one is not recorded anymore.
        if (!primarySession || (followed && !followed.spaces.has(this))) {
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
        state: ICommunicationState<IRecordableStrategy>,
    ): state is IRecordableState<IRecordableStrategy> {
        return "handleStartRecording" in state && "handleStopRecording" in state;
    }
}
