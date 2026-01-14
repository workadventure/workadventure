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
    startRecording(user: SpaceUser): Promise<void>;
    stopRecording(user: SpaceUser): Promise<void>;
    handleAddUser(user: SpaceUser): void;
    handleRemoveUser(user: SpaceUser): Promise<void>;
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

        this._isRecording = true;
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

    public async stopRecording(user: SpaceUser): Promise<void> {
        if (!this._isRecording) {
            console.warn("No recording is currently active.");
            return;
        }

        if (this._user?.spaceUserId !== user.spaceUserId) {
            throw new Error("User is not the one recording");
        }

        const currentState = this._lifecycleManager.getCurrentState();

        if (this.isRecordableState(currentState)) {
            await currentState.handleStopRecording();
        }

        this._isRecording = false;
        this._user = undefined;
    }

    public handleAddUser(user: SpaceUser): void {}

    public async handleRemoveUser(user: SpaceUser): Promise<void> {
        if (!this._isRecording) {
            return;
        }

        if (this._user === user) {
            await this.stopRecording(user);
            await this._space.updateMetadata(
                {
                    recording: {
                        recorder: user.spaceUserId,
                        recording: false,
                    },
                },
                user.spaceUserId
            );
        }
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
