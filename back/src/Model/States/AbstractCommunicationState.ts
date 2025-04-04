import { SpaceUser, PrivateEvent } from "@workadventure/messages";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { CommunicationType } from "../Types/CommunicationTypes";
import { ICommunicationState } from "../Interfaces/ICommunicationState";
import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { CommunicationConfig } from "../CommunicationManager";
export abstract class CommunicationState implements ICommunicationState {
    protected _switchTimeout: NodeJS.Timeout | null = null;
    protected _readyUsers: Set<string> = new Set();
    protected SWITCH_TIMEOUT_MS = 0;
    protected _nextState: CommunicationState | null = null;
    protected abstract _currentCommunicationType: CommunicationType;
    protected abstract _nextCommunicationType: CommunicationType;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager,
        protected readonly _currentStrategy: ICommunicationStrategy,
        protected readonly MAX_USERS_FOR_WEBRTC: number = CommunicationConfig.MAX_USERS_FOR_WEBRTC
    ) {
        this.preparedSwitchAction();
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
        if (!this.isSwitching()) {
            return;
        }

        if (!this._nextState) {
            return;
        }

        try {
            const users = this._space.getAllUsers();

            users.forEach((user) => {
                this.dispatchSwitchEvent(user.spaceUserId, "executeSwitchMessage", {
                    strategy: this._nextCommunicationType,
                });
            });
        } finally {
            this._communicationManager.setState(this._nextState);
            this._nextState.afterSwitchAction();
            this._readyUsers.clear();
            if (this._switchTimeout) {
                clearTimeout(this._switchTimeout);
                this._switchTimeout = null;
            }
        }
    }

    handleUserAdded(user: SpaceUser, switchInProgress = false): void {
        this._currentStrategy.addUser(user, switchInProgress);
    }
    handleUserDeleted(user: SpaceUser): void {
        this._currentStrategy.deleteUser(user);
    }
    handleUserUpdated(user: SpaceUser): void {
        this._currentStrategy.updateUser(user);
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
            this.dispatchSwitchEvent(user.spaceUserId, "prepareSwitchMessage", { strategy: this._nextCommunicationType });
        });
    }

    protected notifyUserOfCurrentStrategy(user: SpaceUser, strategy: CommunicationType): void {
        this.dispatchSwitchEvent(user.spaceUserId, "communicationStrategyMessage", { strategy });
    }
    protected abstract shouldSwitchBackToCurrentState(): boolean;
    protected abstract shouldSwitchToNextState(): boolean;
    protected abstract areAllUsersReady(): boolean;

    protected afterSwitchAction(): void {}
    protected preparedSwitchAction(): void {}
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
}
