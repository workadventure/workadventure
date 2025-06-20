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
    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager
    ) {
        super(_space, _communicationManager, new WebRTCCommunicationStrategy(_space));
        this.SWITCH_TIMEOUT_MS = 5000;
    }
    async handleUserAdded(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user);
            return;
        }

        if (this._nextStatePromise) {
            this._waitingList.add(user.spaceUserId);
            const nextState = await this._nextStatePromise;
            await nextState.handleUserAdded(user);
            return;
        }

        return super.handleUserAdded(user);
    }

    async handleUserDeleted(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this._nextStatePromise) {
            this._waitingList.delete(user.spaceUserId);
            const nextState = await this._nextStatePromise;
            await nextState.handleUserDeleted(user);
        }

        return super.handleUserDeleted(user);
    }

    async handleUserUpdated(user: SpaceUser): Promise<void> {
        if (this._nextStatePromise) {
            const nextState = await this._nextStatePromise;
            await nextState.handleUserUpdated(user);
            return;
        }

        return super.handleUserUpdated(user);
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
            this._readyUsers.add(user.spaceUserId);
            try {
                await nextState.handleUserAdded(user);
            } catch (e) {
                console.error(
                    `WebRTCState.switchToNextState: Error adding user ${user.name} (${user.spaceUserId}) to Livekit state:`,
                    e
                );
                Sentry.captureException(e);
            }

            this.notifyAllUsersToPrepareSwitchToNextState();
            this.setupSwitchTimeout();
            return nextState;
        })();
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
