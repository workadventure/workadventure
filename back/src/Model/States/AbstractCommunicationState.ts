import { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { SpaceUser } from "@workadventure/messages";
import { PrivateEvent } from "@workadventure/messages";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { CommunicationType } from "../types/CommunicationTypes";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";

export abstract class CommunicationState {

    protected _switchTimeout: NodeJS.Timeout | null = null;
    protected _readyUsers: Set<number> = new Set();          
    protected SWITCH_TIMEOUT_MS: number = 0;
    protected _nextState: CommunicationState | null = null;
    protected abstract _currentCommunicationType: CommunicationType ;
    protected abstract _nextCommunicationType: CommunicationType ;
    
    constructor(protected readonly _space: ICommunicationSpace , protected readonly _communicationManager: ICommunicationManager, protected readonly _currentStrategy: ICommunicationStrategy) {
        this._currentStrategy.initialize();
    }
    dispatchSwitchEvent(userId: number, eventType: "communicationStrategyMessage" | "prepareSwitchMessage" | "executeSwitchMessage", payload: unknown): void {
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
        } as PrivateEvent;
        this._space.dispatchPrivateEvent(event);
    }

    protected cancelSwitch(){
        if(this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        this._readyUsers.clear();
    }

    protected setupSwitchTimeout(): void {
        this._switchTimeout = setTimeout(() => this.executeFinalSwitch(), this.SWITCH_TIMEOUT_MS);
    }

    protected executeFinalSwitch(): void {
        if (!this.isSwitching) {
            return;
        }

        if(!this._nextState) {
            return;
        }

        try {
            const users = this._space.getAllUsers();

            users.forEach(user => {
                this.dispatchSwitchEvent(user.id, "executeSwitchMessage", {
                    strategy: this._nextCommunicationType
                });
            });
            
        } finally {
            this._communicationManager.setState(this._nextState);
            this._readyUsers.clear();
            if (this._switchTimeout) {
                clearTimeout(this._switchTimeout);
                this._switchTimeout = null;
            }

        }
    } 

    handleUserAdded(user: SpaceUser, switchInProgress: boolean = false): void {
        this._currentStrategy.addUser(user, switchInProgress)
    }
    handleUserDeleted(user: SpaceUser): void {
        this._currentStrategy.deleteUser(user)
    }
    handleUserUpdated(user: SpaceUser): void {
        this._currentStrategy.updateUser(user)
    }
    handleUserReadyForSwitch(userId: number): void {
        if(!this.isSwitching()) {
            return;
        }

        this._readyUsers.add(userId);
        
        if(this.areAllUsersReady()) {
            this.completeSwitchEarly();
        }
    } 


    protected notifyAllUsersToPrepareSwitchToCurrentState(): void {
        const users = this._space.getAllUsers();
        const usersToNotify = users.filter(user => !this._readyUsers.has(user.id));
        
        usersToNotify.forEach(user => {
            this.dispatchSwitchEvent(user.id, "prepareSwitchMessage", { strategy: this._currentCommunicationType });
        });
    }

    protected notifyUserOfCurrentStrategy(user: SpaceUser, strategy: CommunicationType): void {
        this.dispatchSwitchEvent(user.id, "communicationStrategyMessage", { strategy });
    }
    protected abstract shouldSwitchBackToCurrentState(): boolean;
    protected abstract shouldSwitchToNextState(): boolean;
    protected abstract areAllUsersReady(): boolean;
    private completeSwitchEarly(): void {
        if (this._switchTimeout) {
            clearTimeout(this._switchTimeout);
            this._switchTimeout = null;
        }
        this.executeFinalSwitch();
    }
    protected  isSwitching(): boolean {
        return !!this._nextState;
    }
}