import { SpaceUser } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ICommunicationManager } from "./Interfaces/ICommunicationManager";
import { ICommunicationSpace } from "./Interfaces/ICommunicationSpace";
import { ICommunicationState, IRecordableState } from "./Interfaces/ICommunicationState";
import { LivekitState } from "./States/LivekitState";

export interface IRecordingManager {
    startRecording(user: SpaceUser, userUuid: string): Promise<void>;
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

    public async startRecording(user: SpaceUser, userUuid: string): Promise<void> {
        if (this._isRecording) {
            throw new Error("Recording already started");
        }
        this._isRecording = true;
        const currentState = this.communicationManager.currentState;
        this._user = user;

        if (this.isRecordableState(currentState)) {
            await this.executeRecording(currentState, user, userUuid);
        } else {
            await this.switchToLivekitAndRecord(user, userUuid);
        }

        this._isRecording = true;
    }

    private async executeRecording(
        recordableState: IRecordableState,
        user: SpaceUser,
        userUuid: string
    ): Promise<void> {
        try {
            this._isRecording = true;
            await recordableState.handleStartRecording(user, userUuid);
        } catch (error) {
            this._isRecording = false;
            this._user = undefined;
            throw error;
        }
    }

    private async switchToLivekitAndRecord(user: SpaceUser, userUuid: string): Promise<void> {
        const livekitState = await LivekitState.create(this.space, this.communicationManager); // await is for roomcreation
        this.communicationManager.setState(livekitState);

        livekitState.handleUserAdded(user);

        const allUsers = this.space.getAllUsers();
        allUsers.forEach((spaceUser) => {
            if (spaceUser.spaceUserId !== user.spaceUserId) {
                livekitState.handleUserAdded(spaceUser);
            }
        });

        await this.executeRecording(livekitState, user, userUuid);
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

    public handleAddUser(user: SpaceUser): void {
        if (!this._isRecording) {
            return;
        }
        //TODO : send event to the space to notify that a user has been added to the recording
    }

    public async handleRemoveUser(user: SpaceUser): Promise<void> {
        if (!this._isRecording) {
            return;
        }

        if (this._user === user) {
            await this.stopRecording(user);
            this.space.dispatchPrivateEvent({
                spaceName: this.space.getSpaceName(),
                senderUserId: user.spaceUserId,
                receiverUserId: user.spaceUserId,
                spaceEvent: {
                    event: {
                        $case: "stopRecordingResultMessage",
                        stopRecordingResultMessage: {
                            success: true,
                        },
                    },
                },
            });
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

    //TODO : voir si on a un autre moyen de faire ça
    private isRecordableState(state: ICommunicationState): state is IRecordableState {
        return "handleStartRecording" in state && "handleStopRecording" in state;
    }
}
