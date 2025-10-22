import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import { createLivekitState } from "./States/StateFactory";

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
        private readonly communicationManager: ICommunicationManager,
        private readonly space: ICommunicationSpace
    ) {}

    public async startRecording(user: SpaceUser): Promise<void> {
        if (this._isRecording) {
            throw new Error("Recording already started");
        }
        this._isRecording = true;
        const currentState = this.communicationManager.currentState;
        this._user = user;

        if (this.isRecordableState(currentState)) {
            await this.executeRecording(currentState, user);
        } else {
            await this.switchToLivekitAndRecord(user);
        }

        this._isRecording = true;
    }

    private async executeRecording(recordableState: IRecordableState, user: SpaceUser): Promise<void> {
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
        const livekitState = await createLivekitState(
            this.space,
            user.playUri,
            this.communicationManager.users,
            this.communicationManager.usersToNotify
        ); // await is for room creation
        this.communicationManager.setState(livekitState);

        await this.executeRecording(livekitState, user);
    }

    public async stopRecording(user: SpaceUser): Promise<void> {
        if (!this._isRecording) {
            console.warn("No recording is currently active.");
            return;
        }

        if (this._user?.spaceUserId !== user.spaceUserId) {
            throw new Error("User is not the one recording");
        }

        const currentState = this.communicationManager.currentState;

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
            // await this.stopRecording(user);
            await this.space.updateMetadata(
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

    private isRecordableState(state: ICommunicationState): state is IRecordableState {
        return "handleStartRecording" in state && "handleStopRecording" in state;
    }
}
