import { SpaceUser, PrivateEvent } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { ICommunicationState } from "../Interfaces/ICommunicationState";
import {ICommunicationStrategy, IRecordableStrategy} from "../Interfaces/ICommunicationStrategy";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { CommunicationConfig } from "../CommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
export abstract class CommunicationState implements ICommunicationState {
    protected _switchTimeout: NodeJS.Timeout | null = null;
    protected SWITCH_TIMEOUT_MS = 0;
    protected _nextState: CommunicationState | null = null;
    protected abstract _currentCommunicationType: CommunicationType;
    protected abstract _nextCommunicationType: CommunicationType;
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
        this._nextState = null;
        this._readyUsers.clear();
    }

    protected setupSwitchTimeout(): void {
        this._switchTimeout = setTimeout(() => this.executeFinalSwitch(), this.SWITCH_TIMEOUT_MS);
    }

    protected executeFinalSwitch(): void {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }

        if (!this.isSwitching()) {
            return;
        }

        if (!this._nextState) {
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
            this._communicationManager.setState(this._nextState);
            this._nextState.afterSwitchAction();
            this._readyUsers.clear();
            this._switchInitiatorUserId = null;
        }
    }

    handleUserAdded(user: SpaceUser): void {
        this.notifyUserOfCurrentStrategy(user, this._currentCommunicationType);
        this._currentStrategy.addUser(user);
    }
    handleUserDeleted(user: SpaceUser): void {
        this._currentStrategy.deleteUser(user);
    }
    handleUserUpdated(user: SpaceUser): void {
        this._currentStrategy.updateUser(user);
    }
    handleUserToNotifyAdded(user: SpaceUser): void {
        this.notifyUserOfCurrentStrategy(user, this._currentCommunicationType);
        this._currentStrategy.addUserToNotify(user);
    }
    handleUserToNotifyDeleted(user: SpaceUser): void {
        this._currentStrategy.deleteUserFromNotify(user);
    }
    handleUserReadyForSwitch(userId: string): void {
        if (!this.isSwitching()) {
            return;
        }

        this._readyUsers.add(userId);

        if (this.areAllUsersReady()) {
            this.completeSwitchEarly();
        }
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

    protected afterSwitchAction(): void {}
    protected preparedSwitchAction(readyUsers: Set<string>): void {}
    private completeSwitchEarly(): void {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        this.executeFinalSwitch();
    }
    protected isSwitching(): boolean {
        return !!this._nextState;
    }

    protected areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected isRecordableStrategy(strategy: ICommunicationStrategy): strategy is IRecordableStrategy {
        return 'startRecording' in strategy && 'stopRecording' in strategy;
    }
}
