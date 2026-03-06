import type { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import type { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import type { ICommunicationState, ITranscribableState } from "./Interfaces/ICommunicationState";
import type { ITranscribableStrategy } from "./Interfaces/ICommunicationStrategy";
import type { IStateLifecycleManager } from "./Interfaces/IStateLifecycleManager";
import type { ITransitionOrchestrator } from "./Interfaces/ITransitionOrchestrator";
import type { IUserRegistry } from "./Interfaces/IUserRegistry";
import { CommunicationType } from "./Types/CommunicationTypes";

export interface ITranscriptionManager {
    startTranscription(user: SpaceUser): Promise<void>;
    stopTranscription(user: SpaceUser): Promise<void>;
    handleAddUser(user: SpaceUser): void;
    handleRemoveUser(user: SpaceUser): Promise<void>;
    isTranscribing: boolean;
    destroy(): void;
}

export class TranscriptionManager implements ITranscriptionManager {
    private _isTranscribing = false;
    private _user: SpaceUser | undefined;

    constructor(
        private readonly _space: ICommunicationSpace,
        private readonly _transitionOrchestrator: ITransitionOrchestrator,
        private readonly _userRegistry: IUserRegistry,
        private readonly _lifecycleManager: IStateLifecycleManager
    ) {}

    public async startTranscription(user: SpaceUser): Promise<void> {
        if (this._isTranscribing) {
            throw new Error("Transcription already started");
        }

        this._isTranscribing = true;
        this._user = user;
        const currentState = this._lifecycleManager.getCurrentState();

        if (this.isTranscribableState(currentState)) {
            await this.executeTranscription(currentState, user);
            return;
        }

        await this.switchToLivekitAndTranscribe(user);
    }

    private async executeTranscription(
        transcribableState: ITranscribableState<ITranscribableStrategy>,
        user: SpaceUser
    ): Promise<void> {
        try {
            this._isTranscribing = true;
            await transcribableState.handleStartTranscription(user);
        } catch (error) {
            this._isTranscribing = false;
            this._user = undefined;
            throw error;
        }
    }

    private async switchToLivekitAndTranscribe(user: SpaceUser): Promise<void> {
        const transcribableState = await this._transitionOrchestrator.executeImmediateTransition(
            CommunicationType.LIVEKIT,
            {
                space: this._space,
                users: this._userRegistry.getUsers(),
                usersToNotify: this._userRegistry.getUsersToNotify(),
                playUri: user.playUri,
            }
        );

        if (!transcribableState || !this.isTranscribableState(transcribableState)) {
            throw new Error("Failed to switch to Livekit");
        }

        await this._lifecycleManager.transitionTo(transcribableState);
        await this.executeTranscription(transcribableState, user);
    }

    public async stopTranscription(user: SpaceUser): Promise<void> {
        if (!this._isTranscribing) {
            console.warn("No transcription is currently active.");
            return;
        }

        if (this._user?.spaceUserId !== user.spaceUserId) {
            throw new Error("User is not the one transcribing");
        }

        const currentState = this._lifecycleManager.getCurrentState();
        if (this.isTranscribableState(currentState)) {
            await currentState.handleStopTranscription();
        }

        this._isTranscribing = false;
        this._user = undefined;
    }

    public handleAddUser(user: SpaceUser): void {
        // Does nothing. Here for symmetry with handleRemoveUser.
    }

    public async handleRemoveUser(user: SpaceUser): Promise<void> {
        if (!this._isTranscribing) {
            return;
        }

        if (this._user?.spaceUserId === user.spaceUserId) {
            await this.stopTranscription(user);
        }
    }

    public get isTranscribing(): boolean {
        return this._isTranscribing;
    }

    public destroy(): void {
        if (this._isTranscribing && this._user) {
            this.stopTranscription(this._user).catch((error) => {
                console.error(error);
                Sentry.captureException(error);
            });
        }
    }

    private isTranscribableState(
        state: ICommunicationState<ITranscribableStrategy>
    ): state is ITranscribableState<ITranscribableStrategy> {
        return "handleStartTranscription" in state && "handleStopTranscription" in state;
    }
}
