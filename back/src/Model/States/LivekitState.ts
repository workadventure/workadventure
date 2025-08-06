import { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { IRecordableState } from "../Interfaces/ICommunicationState";
import { IRecordableStrategy } from "../Interfaces/ICommunicationStrategy";
import { CommunicationState } from "./AbstractCommunicationState";
import { WebRTCState } from "./WebRTCState";

export class LivekitState extends CommunicationState implements IRecordableState {
    protected _currentCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected _nextCommunicationType: CommunicationType = CommunicationType.WEBRTC;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager,
        protected readonly _currentStrategy: IRecordableStrategy,
        protected readonly _readyUsers: Set<string> = new Set()
    ) {
        super(_space, _communicationManager, _currentStrategy, _readyUsers);
        this.SWITCH_TIMEOUT_MS = 5000;
    }

    public static async create(
        _space: ICommunicationSpace,
        _communicationManager: ICommunicationManager,
        _readyUsers: Set<string> = new Set()
    ) {
        const strategy = await LivekitCommunicationStrategy.create(_space);
        return new LivekitState(_space, _communicationManager, strategy, _readyUsers);
    }

    handleUserAdded(user: SpaceUser): void {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }
        super.handleUserAdded(user);
    }
    handleUserDeleted(user: SpaceUser): void {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(undefined);
        }

        if (this.isSwitching()) {
            this._nextState?.handleUserDeleted(user);
        }

        super.handleUserDeleted(user);
    }
    handleUserUpdated(user: SpaceUser): void {
        super.handleUserUpdated(user);
    }
    handleUserReadyForSwitch(userId: string): void {
        super.handleUserReadyForSwitch(userId);
    }

    handleUserToNotifyAdded(user: SpaceUser): void {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }
        super.handleUserToNotifyAdded(user);

        //TODO : voir si on sépare les token en 2
        //TODO : 1token pour les watcher qui donne seulement le droit de subscribe
        //TODO : 1token pour les users qui donne le droit de streamer et de subscribe

        //TODO : voir le meilleur moyen de gerer ça dans le front
        //TODO : on pourrait avoir 2 messages/event differents et gere de maniere independante
    }

    handleUserToNotifyDeleted(user: SpaceUser): void {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this.isSwitching()) {
            this._nextState?.handleUserDeleted(user);
        }

        super.handleUserDeleted(user);
    }

    private switchToNextState(user: SpaceUser | undefined): void {
        this._nextState = new WebRTCState(this._space, this._communicationManager);
        if (user) {
            this._readyUsers.add(user.spaceUserId);
            this.notifyUserOfCurrentStrategy(user, this._nextCommunicationType);
        }

        this.notifyAllUsersToPrepareSwitchToNextState();
        this.setupSwitchTimeout();
    }

    protected shouldSwitchToNextState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
        return !this.isSwitching() && isMaxUsersReached;
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC;
        return this.isSwitching() && isMaxUsersReached;
    }

    protected areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected preparedSwitchAction(readyUsers: Set<string>): void {
        this._currentStrategy.initialize(readyUsers);
    }

    async handleStartRecording(user: SpaceUser, userUuid: string): Promise<void> {
        if (this.isRecordableStrategy(this._currentStrategy)) {
            await this._currentStrategy.startRecording(user, userUuid).catch((error) => {
                console.error("Error starting recording:", error);
                throw new Error("Failed to start recording");
            });
        }
    }

    async handleStopRecording(): Promise<void> {
        if (this.isRecordableStrategy(this._currentStrategy)) {
            await this._currentStrategy.stopRecording();
        }
    }
}
