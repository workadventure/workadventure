import * as Sentry from "@sentry/node";
import { SpaceUser, PrivateEvent } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { ICommunicationState } from "../Interfaces/ICommunicationState";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { CommunicationConfig } from "../CommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
export abstract class CommunicationState implements ICommunicationState {
    protected _switchTimeout: NodeJS.Timeout | null = null;
    protected SWITCH_TIMEOUT_MS = 0;
    protected _nextStatePromise: Promise<CommunicationState> | null = null;
    protected abstract _currentCommunicationType: CommunicationType;
    protected abstract _nextCommunicationType: CommunicationType;
    protected _waitingList: Set<string> = new Set<string>();
    protected _switchInitiatorUserId: string | null = null;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager,
        protected readonly _currentStrategy: ICommunicationStrategy,
        protected readonly _readyUsers: Set<string> = new Set(),
        protected readonly MAX_USERS_FOR_WEBRTC: number = CommunicationConfig.MAX_USERS_FOR_WEBRTC
    ) {
        this.preparedSwitchAction(this._readyUsers);
    }
    dispatchSwitchEvent(
        userId: string,
        eventType: "communicationStrategyMessage" | "prepareSwitchMessage" | "executeSwitchMessage",
        payload: unknown
    ): void {
        const event: PrivateEvent = {
            spaceName: this._space.getSpaceName(),
            receiverUserId: userId,
            senderUserId: userId,
            spaceEvent: {
                event: {
                    $case: eventType,
                    [eventType]: payload,
                },
            },
        } as PrivateEvent;
        this._space.dispatchPrivateEvent(event);
    }

    protected cancelSwitch() {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        this._nextStatePromise = null;
        this._readyUsers.clear();
        const spaceUsers = this._space.getAllUsers();

        this._waitingList.forEach((userId) => {
            const waitingUser = spaceUsers.find(({ spaceUserId }) => spaceUserId === userId);
            if (waitingUser) {
                this.handleUserAdded(waitingUser).catch((e) => {
                    Sentry.captureException(e);
                    console.error(e);
                });
            }
        });
        this._waitingList.clear();
    }

    protected setupSwitchTimeout(): void {
        this._switchTimeout = setTimeout(() => {
            this.executeFinalSwitch().catch((e) => {
                //TODO : handle error
                Sentry.captureException(e);
                console.error(e);
            });
        }, this.SWITCH_TIMEOUT_MS);
    }

    protected async executeFinalSwitch(): Promise<void> {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }

        if (!this.isSwitching()) {
            return;
        }

        if (!this._nextStatePromise) {
            return;
        }

        try {
            const users = new Set<string>([
                ...this._space.getUsersInFilter().map((user) => user.spaceUserId),
                ...this._space.getUsersToNotify().map((user) => user.spaceUserId),
            ]);
            if (this._switchInitiatorUserId) {
                users.delete(this._switchInitiatorUserId);
            }

            users.forEach((spaceUserId) => {
                this.dispatchSwitchEvent(spaceUserId, "executeSwitchMessage", {
                    strategy: this._nextCommunicationType,
                });
            });
        } finally {
            const nextState = await this._nextStatePromise;
            this._communicationManager.setState(nextState);
            nextState.afterSwitchAction();
            this._readyUsers.clear();
            this._switchInitiatorUserId = null;
        }
    }

    handleUserAdded(user: SpaceUser): Promise<void> {
        this.notifyUserOfCurrentStrategy(user, this._currentCommunicationType);
        const switchInProgress = this.isSwitching();
        this._currentStrategy.addUser(user, switchInProgress);
        return Promise.resolve();
    }
    handleUserDeleted(user: SpaceUser): Promise<void> {
        this._currentStrategy.deleteUser(user);
        return Promise.resolve();
    }
    handleUserUpdated(user: SpaceUser): Promise<void> {
        this._currentStrategy.updateUser(user);
        return Promise.resolve();
    }
    handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        this.notifyUserOfCurrentStrategy(user, this._currentCommunicationType);
        this._currentStrategy.addUserToNotify(user);
        return Promise.resolve();
    }
    handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        this._currentStrategy.deleteUserFromNotify(user);
        return Promise.resolve();
    }
    handleUserReadyForSwitch(userId: string): Promise<void> {
        if (!this.isSwitching()) {
            return Promise.resolve();
        }

        this._readyUsers.add(userId);

        if (this.areAllUsersReady()) {
            this.completeSwitchEarly().catch((e) => {
                Sentry.captureException(e);
                console.error(e);
            });
        }
        return Promise.resolve();
    }

    protected notifyAllUsersToPrepareSwitchToNextState(): void {
        const users = this._space.getAllUsers();
        const usersToNotify = users.filter((user) => !this._readyUsers.has(user.spaceUserId));
        usersToNotify.forEach((user) => {
            this.dispatchSwitchEvent(user.spaceUserId, "prepareSwitchMessage", {
                strategy: this._nextCommunicationType,
            });
        });
    }

    protected notifyUserOfCurrentStrategy(user: SpaceUser, strategy: CommunicationType): void {
        console.log("🚀🚀🚀🚀🚀🚀🚀 notifyUserOfCurrentStrategy", user.spaceUserId, strategy);
        this.dispatchSwitchEvent(user.spaceUserId, "communicationStrategyMessage", { strategy });
    }
    protected abstract shouldSwitchBackToCurrentState(): boolean;
    protected abstract shouldSwitchToNextState(): boolean;
    protected abstract areAllUsersReady(): boolean;

    protected afterSwitchAction(): void {}
    protected preparedSwitchAction(readyUsers: Set<string>): void {}
    private async completeSwitchEarly(): Promise<void> {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        await this.executeFinalSwitch();
    }
    protected isSwitching(): boolean {
        return !!this._nextStatePromise;
    }
}
