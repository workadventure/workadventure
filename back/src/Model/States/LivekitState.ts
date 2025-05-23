import { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { CommunicationState } from "./AbstractCommunicationState";
import { WebRTCState } from "./WebRTCState";

export class LivekitState extends CommunicationState {
    protected _currentCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected _nextCommunicationType: CommunicationType = CommunicationType.WEBRTC;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager
    ) {
        //super(_space, _communicationManager, new LivekitCommunicationStrategy(_space,this._readyUsers));
        super(_space, _communicationManager, new LivekitCommunicationStrategy(_space));
        this.SWITCH_TIMEOUT_MS = 5000;
    }
    handleUserAdded(user: SpaceUser): void {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }
        super.handleUserAdded(user);
    }
    handleUserDeleted(user: SpaceUser): void {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user);
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

    private switchToNextState(user: SpaceUser): void {
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

    //TODO : passer dans la classe abstraite
    protected areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected preparedSwitchAction(readyUsers: Set<string>): void {
        this._currentStrategy.initialize(readyUsers);
    }
}
