import * as Sentry from "@sentry/node";
import { SpaceUser } from "@workadventure/messages";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { WebRTCCommunicationStrategy } from "../Strategies/WebRTCCommunicationStrategy";
import { CommunicationType } from "../Types/CommunicationTypes";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { ADMIN_API_URL } from "../../Enum/EnvironmentVariable";
import { adminApi } from "../../Services/AdminApi";
import { CommunicationState } from "./AbstractCommunicationState";
import { LivekitState } from "./LivekitState";

export class WebRTCState extends CommunicationState {
    protected _currentCommunicationType: CommunicationType = CommunicationType.WEBRTC;
    protected _nextCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    private _nextStatePromise: Promise<LivekitState> | undefined;
    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager
    ) {
        super(_space, _communicationManager, new WebRTCCommunicationStrategy(_space));
        this.SWITCH_TIMEOUT_MS = 5000;
    }
    handleUserAdded(user: SpaceUser): void {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user);
            return;
        }

        if (this.isSwitching()) {
            this._waitingList.add(user.spaceUserId);
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
            this._waitingList.delete(user.spaceUserId);
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

    private switchToNextState(user: SpaceUser): void {
        this._nextStatePromise = (async () => {
            let nextState: LivekitState | undefined;
            if (ADMIN_API_URL) {
                const res = await adminApi.fetchLivekitCredentials(this._space.getSpaceName());
                nextState = new LivekitState(this._space, this._communicationManager, res);
            } else {
                nextState = new LivekitState(this._space, this._communicationManager);
            }

            this._nextState = nextState;
            this._readyUsers.add(user.spaceUserId);
            this._nextState.handleUserAdded(user);

            this.notifyAllUsersToPrepareSwitchToNextState();
            this.setupSwitchTimeout();
            return nextState;
        })();
        this._nextStatePromise.catch((err) => {
            Sentry.captureException(err);
            console.error(err);
        });
    }

    areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected shouldSwitchToNextState(): boolean {
        return (
            this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC &&
            !this.isSwitching() &&
            !this._nextStatePromise
        );
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
        return this.isSwitching() && isMaxUsersReached;
    }

    protected afterSwitchAction(): void {
        this._currentStrategy.initialize(this._readyUsers);
    }
}
