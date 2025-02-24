import { ICommunicationSpaceManager } from "../interfaces/ICommunicationSpaceManager";
import { CommunicationType, ISwitchConfig } from "../types/CommunicationTypes";
import { PrivateEvent, SpaceUser } from "@workadventure/messages";
import { CommunicationManager } from "../CommunicationManager";

export class SwitchHandler {
    private _switchInProgress: boolean = false;
    private _readyUsers: Set<number> = new Set();
    private _switchTimeout: NodeJS.Timeout | null = null;
    private _lastLivekitDisconnection: number | null = null;
    private _currentTargetStrategy: CommunicationType = CommunicationType.NONE;

    constructor(
        private readonly _space: ICommunicationSpaceManager,
        private readonly _config: ISwitchConfig,
        private readonly _communicationManager: CommunicationManager
    ) {}

    public handleSwitch(targetStrategy: CommunicationType, user?: SpaceUser): void {
        if (targetStrategy === this._communicationManager.getCurrentStrategy()) {
            if (this._switchInProgress) {
                this.cancelSwitch();
            }
            return;
        }

        if (this.isInvalidSwitchRequest(targetStrategy)) {
            return;
        }

        this.initializeSwitch(targetStrategy, user);
    }

    public handleUserReady(userId: number): void {
        if (!this._switchInProgress) {
            return;
        }

        this._readyUsers.add(userId);
        if (this.areAllUsersReady()) {
            this.completeSwitchEarly();
        }
    }

    private isInvalidSwitchRequest(targetStrategy: CommunicationType): boolean {
        return this._switchInProgress || targetStrategy === CommunicationType.NONE;
    }

    private initializeSwitch(targetStrategy: CommunicationType, user?: SpaceUser): void {
        this._switchInProgress = true;
        this._currentTargetStrategy = targetStrategy;

        this._communicationManager.prepareStrategy(targetStrategy);

        if (user) {
            this._readyUsers.add(user.id);
            this.notifyUserOfCurrentStrategy(user, targetStrategy);
        }

        this.notifyAllUsersToPrepareSwitchTo(targetStrategy);
        this.setupSwitchTimeout(targetStrategy);
    }

    private notifyAllUsersToPrepareSwitchTo(targetStrategy: CommunicationType): void {
        const users = this._space.getAllUsers();
        const usersToNotify = users.filter(user => !this._readyUsers.has(user.id));
        
        usersToNotify.forEach(user => {
            this.dispatchSwitchEvent(user.id, "prepareSwitchMessage", { targetStrategy });
        });
    }

    private notifyUserOfCurrentStrategy(user: SpaceUser, strategy: CommunicationType): void {
        this.dispatchSwitchEvent(user.id, "communicationStrategyMessage", { strategy });
    }

    private dispatchSwitchEvent(userId: number, eventType: "communicationStrategyMessage" | "prepareSwitchMessage" | "executeSwitchMessage", payload: any): void {
        const event: PrivateEvent = {
            spaceName: this._space.getSpaceName(),
            receiverUserId: userId,
            senderUserId: userId , //TODO : changer trouver un id pour dire que c'est le back qui envoie le message
            spaceEvent: {
                event: {
                    $case: eventType,
                    [eventType]: payload
                }
            }
        } ;
        this._space.dispatchPrivateEvent(event);
    }

    private areAllUsersReady(): boolean {
        const allUsers = this._space.getAllUsers();
        return allUsers.every(user => this._readyUsers.has(user.id));
    }

    private completeSwitchEarly(): void {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        this.executeFinalSwitch();
    }

    private setupSwitchTimeout(targetStrategy: CommunicationType): void {
        const timeout = this.getSwitchTimeout(targetStrategy);
        this._switchTimeout = setTimeout(() => this.executeFinalSwitch(), timeout);
    }

    private getSwitchTimeout(targetStrategy: CommunicationType): number {
        return targetStrategy === CommunicationType.LIVEKIT 
            ? this._config.SWITCH_TO_LIVEKIT_TIMEOUT_MS 
            : this._config.SWITCH_TO_WEBRTC_TIMEOUT_MS;
    }

    private executeFinalSwitch(): void {
        if (!this._currentTargetStrategy || this._currentTargetStrategy === CommunicationType.NONE) {
            console.error('Attempting to execute switch with invalid target strategy');
            return;
        }

        const targetStrategy = this._currentTargetStrategy;

        try {
            const users = this._space.getAllUsers();
            users.forEach(user => {
                this.dispatchSwitchEvent(user.id, "executeSwitchMessage", {
                    strategy: targetStrategy
                });
            });

            
        } finally {
            this._communicationManager.switchToStrategy(targetStrategy);
            this._switchInProgress = false;
            this._readyUsers.clear();
            if (this._switchTimeout) {
                clearTimeout(this._switchTimeout);
                this._switchTimeout = null;
            }
        }
    }

    public handleLivekitDisconnection(): void {
        const now = Date.now();
        
        if (!this._lastLivekitDisconnection || (now - this._lastLivekitDisconnection) > 5000) {
            this._lastLivekitDisconnection = now;
            this.handleSwitch(CommunicationType.WEBRTC);
        }
    }

    public cancelSwitch(): void {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        this._switchInProgress = false;
        this._readyUsers.clear();
        this._currentTargetStrategy = CommunicationType.NONE;
        this._communicationManager.cancelPreparedStrategy();
    }
} 