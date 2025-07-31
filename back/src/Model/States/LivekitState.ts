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
        protected readonly _communicationManager: ICommunicationManager,
        protected readonly _readyUsers: Set<string> = new Set()
    ) {
        //super(_space, _communicationManager, new LivekitCommunicationStrategy(_space,this._readyUsers));
        super(_space, _communicationManager, new LivekitCommunicationStrategy(_space), _readyUsers);
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
        const activeStreamers = this._space.getUsersInFilter().length;
        const activeWatchers = this._space.getUsersToNotify().length;

        const fewStreamers = activeStreamers <= this.MAX_STREAMERS_FOR_PEER;
        const fewWatchers = activeWatchers <= this.MAX_WATCHERS_FOR_PEER;
        const smallAudience = activeStreamers === 1 && activeWatchers <= 8;

        const shouldSwitchBack = fewStreamers && fewWatchers && smallAudience;

        if (shouldSwitchBack && !this.isSwitching()) {
            console.log(
                "Switching back to P2P:",
                "fewStreamers:",
                fewStreamers,
                "fewWatchers:",
                fewWatchers,
                "smallAudience:",
                smallAudience
            );
            return true;
        }

        return false;
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const activeStreamers = this._space.getUsersInFilter().length;
        const activeWatchers = this._space.getUsersToNotify().length;

        const tooManyStreamers = activeStreamers > this.MAX_STREAMERS_FOR_PEER;
        const tooManyWatchers = activeWatchers > this.MAX_WATCHERS_FOR_PEER;
        const oneStreamBigAudience = activeStreamers === 1 && activeWatchers > 8;

        const shouldCancelSwitch = tooManyStreamers || tooManyWatchers || oneStreamBigAudience;

        if (this.isSwitching() && shouldCancelSwitch) {
            console.log(
                "Cancelling switch back to P2P:",
                "tooManyStreamers:",
                tooManyStreamers,
                "tooManyWatchers:",
                tooManyWatchers,
                "oneStreamBigAudience:",
                oneStreamBigAudience
            );
            return true;
        }

        return false;
    }

    protected areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected preparedSwitchAction(readyUsers: Set<string>): void {
        this._currentStrategy.initialize(readyUsers);
    }
}
