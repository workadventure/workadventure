import type { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import type { ITransitionOrchestrator } from "./Interfaces/ITransitionOrchestrator";
import { CommunicationType } from "./Types/CommunicationTypes";
import type { IUserRegistry } from "./Interfaces/IUserRegistry";
import type { IStateLifecycleManager } from "./Interfaces/IStateLifecycleManager";
import type { IRecordableStrategy } from "./Interfaces/ICommunicationStrategy";

export interface IRecordingManager {
    getRecordingState(): { isRecording: boolean; recorder: string | null };
    startRecording(user: SpaceUser): Promise<void>;
    stopRecording(user: SpaceUser): Promise<SpaceUser | null>;
    stopRecordingByServer(): Promise<SpaceUser | null>;
    stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null>;
    handleAddUser(user: SpaceUser): void;
    isRecording: boolean;
    destroy(): void;
}

export class RecordingManager implements IRecordingManager {
    private _isRecording: boolean = false;
    private _user: SpaceUser | undefined;

    constructor(
        private readonly _space: ICommunicationSpace,
        private readonly _transitionOrchestrator: ITransitionOrchestrator,
        private readonly _userRegistry: IUserRegistry,
        private readonly _lifecycleManager: IStateLifecycleManager
    ) {}

    public async startRecording(user: SpaceUser): Promise<void> {
        if (this._isRecording) {
            throw new Error("Recording already started");
        }
        this._isRecording = true;
        const currentState = this._lifecycleManager.getCurrentState();
        this._user = user;

        if (this.isRecordableState(currentState)) {
            await this.executeRecording(currentState, user);
        } else {
            await this.switchToLivekitAndRecord(user);
        }
    }

    private async executeRecording(
        recordableState: IRecordableState<IRecordableStrategy>,
        user: SpaceUser
    ): Promise<void> {
        try {
            this._isRecording = true;
            await recordableState.handleStartRecording(user);
        } catch (error) {
            this._isRecording = false;
            this._user = undefined;
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
        await this.executeRecording(recordableState, user);
    }

    public async stopRecording(user: SpaceUser): Promise<SpaceUser | null> {
        if (!this._isRecording) {
            console.warn("No recording is currently active.");
            return null;
        }

        if (this._user?.spaceUserId !== user.spaceUserId) {
            throw new Error("User is not the one recording");
        }

        return this.stopCurrentRecording();
    }

    public async stopRecordingByServer(): Promise<SpaceUser | null> {
        if (!this._isRecording) {
            return null;
        }

        return this.stopCurrentRecording();
    }

    public async stopRecordingIfRecorderMatches(spaceUserId: string): Promise<SpaceUser | null> {
        if (this._user?.spaceUserId !== spaceUserId) {
            return null;
        }

        return this.stopRecordingByServer();
    }

    private async stopCurrentRecording(): Promise<SpaceUser | null> {
        if (!this._user) {
            return null;
        }

        const recorder = this._user;
        const currentState = this._lifecycleManager.getCurrentState();

        if (this.isRecordableState(currentState)) {
            await currentState.handleStopRecording();
        }

        this._isRecording = false;
        this._user = undefined;
        return recorder;
    }

    public handleAddUser(user: SpaceUser): void {
        // Does nothing. Here for symmetry with deletion hooks.
    }

    public getRecordingState(): { isRecording: boolean; recorder: string | null } {
        return {
            isRecording: this._isRecording,
            recorder: this._user?.spaceUserId ?? null,
        };
    }

    public get isRecording(): boolean {
        return this._isRecording;
    }

    public destroy(): void {
        if (this._isRecording && this._user) {
            this.stopRecording(this._user).catch((error) => {
                console.error(error);
                Sentry.captureException(error);
            });
        }
    }

    private isRecordableState(
        state: ICommunicationState<IRecordableStrategy>
    ): state is IRecordableState<IRecordableStrategy> {
        return "handleStartRecording" in state && "handleStopRecording" in state;
    }
}
