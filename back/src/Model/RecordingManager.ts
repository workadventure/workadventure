import type { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import type { ITransitionOrchestrator } from "./Interfaces/ITransitionOrchestrator";
import { CommunicationType } from "./Types/CommunicationTypes";
import type { IUserRegistry } from "./Interfaces/IUserRegistry";
import type { IStateLifecycleManager } from "./Interfaces/IStateLifecycleManager";
import type { IRecordableStrategy } from "./Interfaces/ICommunicationStrategy";

export type RecordingStatus = "idle" | "starting" | "recording" | "stopping";

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
    handleAddUser(user: SpaceUser): void;
    isRecording: boolean;
    destroy(): void;
}

export class RecordingManager implements IRecordingManager {
    private _status: RecordingStatus = "idle";
    private _user: SpaceUser | undefined;
    private _startPromise: Promise<void> | null = null;
    private _stopPromise: Promise<SpaceUser | null> | null = null;
    private _stopAfterStartRequested = false;

    constructor(
        private readonly _space: ICommunicationSpace,
        private readonly _transitionOrchestrator: ITransitionOrchestrator,
        private readonly _userRegistry: IUserRegistry,
        private readonly _lifecycleManager: IStateLifecycleManager
    ) {}

    public async startRecording(user: SpaceUser): Promise<void> {
        switch (this._status) {
            case "idle": {
                return this.runStart(user);
            }
            case "starting": {
                if (this._user?.spaceUserId === user.spaceUserId && this._startPromise) {
                    return this._startPromise;
                }
                throw new Error("Recording is already starting");
            }
            case "recording": {
                if (this._user?.spaceUserId === user.spaceUserId) {
                    return;
                }
                throw new Error("Recording already started");
            }
            case "stopping": {
                if (this._user?.spaceUserId === user.spaceUserId && this._stopPromise) {
                    await this._stopPromise;
                    return;
                }
                throw new Error("Recording is already stopping");
            }
        }
    }

    public async stopRecording(user: SpaceUser): Promise<SpaceUser | null> {
        if (!this._user) {
            console.warn("No recording is currently active.");
            return null;
        }

        if (this._user.spaceUserId !== user.spaceUserId) {
            throw new Error("User is not the one recording");
        }

        switch (this._status) {
            case "idle": {
                console.warn("No recording is currently active.");
                return null;
            }
            case "starting": {
                await this.requestStopAfterStart();
                return this._user;
            }
            case "recording": {
                await this.runStop();
                return this._user;
            }
            case "stopping": {
                if (this._stopPromise) {
                    await this._stopPromise;
                }
                return null;
            }
        }
    }

    public async stopRecordingByServer(): Promise<SpaceUser | null> {
        switch (this._status) {
            case "idle": {
                return null;
            }
            case "starting": {
                return await this.requestStopAfterStart();
            }
            case "recording": {
                return await this.runStop();
            }
            case "stopping": {
                return this._stopPromise ? await this._stopPromise : this._user ?? null;
            }
        }
    }

    public async stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null> {
        if (this._user?.spaceUserId !== spaceUserId) {
            return null;
        }

        return this.stopRecordingByServer();
    }

    public handleAddUser(_user: SpaceUser): void {
        // Intentionally empty. Kept for symmetry with deletion hooks.
    }

    public getRecordingState(): ManagedRecordingState {
        return this.buildStateSnapshot();
    }

    public get isRecording(): boolean {
        return this._status !== "idle";
    }

    public destroy(): void {
        if (this._status === "idle") {
            return;
        }

        this.stopRecordingByServer().catch((error) => {
            console.error(error);
            Sentry.captureException(error);
        });
    }

    private async runStart(user: SpaceUser): Promise<void> {
        const promise = this.performStart(user);
        this._startPromise = promise;

        try {
            await promise;
        } finally {
            if (this._startPromise === promise) {
                this._startPromise = null;
            }
        }
    }

    private async performStart(user: SpaceUser): Promise<void> {
        this._user = user;
        this._status = "starting";
        this._stopAfterStartRequested = false;
        this.publishState();

        try {
            const currentState = this._lifecycleManager.getCurrentState();

            if (this.isRecordableState(currentState)) {
                await currentState.handleStartRecording(user);
            } else {
                await this.switchToLivekitAndRecord(user);
            }

            this._status = "recording";
            this.publishState();

            if (this._stopAfterStartRequested) {
                await this.runStop();
            }
        } catch (error) {
            this._status = "idle";
            this._user = undefined;
            this._stopAfterStartRequested = false;
            this.publishState();
            throw error;
        }
    }

    private async requestStopAfterStart(): Promise<SpaceUser | null> {
        const recorder = this._user;
        if (!recorder) {
            return null;
        }

        this._stopAfterStartRequested = true;

        if (this._startPromise) {
            await this._startPromise;
            return recorder;
        }

        if (this._status === "recording") {
            return await this.runStop();
        }

        return null;
    }

    private async runStop(): Promise<SpaceUser | null> {
        if (!this._user) {
            return null;
        }

        if (this._stopPromise) {
            return this._stopPromise;
        }

        const promise = this.performStop();
        this._stopPromise = promise;

        try {
            return await promise;
        } finally {
            if (this._stopPromise === promise) {
                this._stopPromise = null;
            }
        }
    }

    private async performStop(): Promise<SpaceUser | null> {
        const recorder = this._user;
        if (!recorder) {
            return null;
        }

        this._status = "stopping";
        this.publishState();

        try {
            const currentState = this._lifecycleManager.getCurrentState();

            if (!this.isRecordableState(currentState)) {
                throw new Error("Current state is not recordable");
            }

            await currentState.handleStopRecording();

            this._status = "idle";
            this._user = undefined;
            this._stopAfterStartRequested = false;
            this.publishState();

            return recorder;
        } catch (error) {
            this._status = "recording";
            this.publishState();
            throw error;
        }
    }

    private async switchToLivekitAndRecord(user: SpaceUser): Promise<void> {
        const recordableState = await this._transitionOrchestrator.executeImmediateTransition(
            CommunicationType.LIVEKIT,
            {
                space: this._space,
                users: this._userRegistry.getUsers(),
                usersToNotify: this._userRegistry.getUsersToNotify(),
                playUri: user.playUri,
            }
        );

        if (!recordableState || !this.isRecordableState(recordableState)) {
            throw new Error("Failed to switch to Livekit");
        }

        await this._lifecycleManager.transitionTo(recordableState);
        await recordableState.handleStartRecording(user);
    }

    private publishState(): void {
        this._space.publishMetadata({
            recording: {
                recorder: this._user?.spaceUserId ?? null,
                recording: this._status === "recording" || this._status === "stopping",
                status: this._status,
            },
        });
    }

    private buildStateSnapshot(): ManagedRecordingState {
        return {
            isRecording: this._status !== "idle",
            recorder: this._user?.spaceUserId ?? null,
            status: this._status,
        };
    }

    private isRecordableState(
        state: ICommunicationState<IRecordableStrategy>
    ): state is IRecordableState<IRecordableStrategy> {
        return "handleStartRecording" in state && "handleStopRecording" in state;
    }
}
