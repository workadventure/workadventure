import { SpaceUser } from "@workadventure/messages";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { WebRTCCommunicationStrategy } from "../Strategies/WebRTCCommunicationStrategy";
import { CommunicationType } from "../Types/CommunicationTypes";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { CommunicationState } from "./AbstractCommunicationState";
import { LivekitState } from "./LivekitState";

export class WebRTCState extends CommunicationState {
    protected _currentCommunicationType: CommunicationType = CommunicationType.WEBRTC;
    protected _nextCommunicationType: CommunicationType = CommunicationType.LIVEKIT;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager
    ) {
        super(_space, _communicationManager, new WebRTCCommunicationStrategy(_space));
        this.SWITCH_TIMEOUT_MS = 5000;
    }
    handleUserAdded(user: SpaceUser): void {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user, "user");
            return;
        }

        if (this.isSwitching()) {
            this._nextState?.handleUserAdded(user);
            return;
        }

        super.handleUserAdded(user);
    }

    handleUserDeleted(user: SpaceUser): void {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this.isSwitching()) {
            this._nextState?.handleUserDeleted(user);
        }

        super.handleUserDeleted(user);
    }

    handleUserUpdated(user: SpaceUser): void {
        if (this.isSwitching()) {
            this._nextState?.handleUserUpdated(user);
            return;
        }

        super.handleUserUpdated(user);
    }

    handleUserToNotifyAdded(user: SpaceUser): void {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user, "userToNotify");
            return;
        }

        if (this.isSwitching()) {
            this._nextState?.handleUserToNotifyAdded(user);
            return;
        }

        console.log("👌👌👌👌👌👌👌 WebRTCState handleUserToNotifyAdded", user);
        super.handleUserToNotifyAdded(user);
    }

    handleUserToNotifyDeleted(user: SpaceUser): void {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this.isSwitching()) {
            this._nextState?.handleUserToNotifyDeleted(user);
            return;
        }

        console.log("👌👌👌👌👌👌👌 WebRTCState handleUserToNotifyDeleted", user);
        super.handleUserToNotifyDeleted(user);
    }

    //TODO : trouver un autre moyen de faire le switch
    private switchToNextState(user: SpaceUser, typeOfSwitch: "user" | "userToNotify"): void {
        this._readyUsers.add(user.spaceUserId);
        this._switchInitiatorUserId = user.spaceUserId;

        this._nextState = new LivekitState(this._space, this._communicationManager, this._readyUsers);

        if (
            typeOfSwitch === "user" &&
            this._space.getUsersInFilter().find((user) => user.spaceUserId === user.spaceUserId)
        ) {
            this._nextState.handleUserAdded(user);
        }

        if (
            typeOfSwitch === "userToNotify" &&
            this._space.getUsersToNotify().find((user) => user.spaceUserId === user.spaceUserId)
        ) {
            this._nextState.handleUserToNotifyAdded(user);
        }

        this.notifyAllUsersToPrepareSwitchToNextState();

        this.setupSwitchTimeout();
    }

    areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected shouldSwitchToNextState(): boolean {
        /**
         * TODO : Trouver une regle qui se base sur les flux plutot que sur le nombres d'utilisateur
         * pour eviter les switchs inutiles (ex: si on a 100 utilisateurs  1 personnes diffuse et 1 personne watch peut etre pas utile de switch
         *  ou une personne stream pour 5/6 personnes )
         **/

        return this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC && !this.isSwitching();
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
        return this.isSwitching() && isMaxUsersReached;
    }

    protected afterSwitchAction(): void {
        this._currentStrategy.initialize(this._readyUsers);
    }
}
