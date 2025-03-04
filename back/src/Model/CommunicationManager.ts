import { SpaceUser } from "@workadventure/messages";
import { ICommunicationSpaceManager } from "./interfaces/ICommunicationSpaceManager";
import { CommunicationType, ISwitchConfig } from "./types/CommunicationTypes";
import { SwitchHandler } from "./services/SwitchHandler";
import { CommunicationStrategyFactory } from "./factories/CommunicationStrategyFactory";
import { ICommunicationStrategy } from "./interfaces/ICommunicationStrategy";
import { DefaultCommunicationStrategy } from "./strategies/DefaultCommunicationStrategy";
import { WebRTCCommunicationStrategy } from "./strategies/WebRTCCommunicationStrategy";
import { LivekitCommunicationStrategy } from "./strategies/LivekitCommunicationStrategy";




export const communicationConfig = {
    MAX_USERS_FOR_WEBRTC: 4,
    SWITCH_TO_LIVEKIT_TIMEOUT_MS: 5000,
    SWITCH_TO_WEBRTC_TIMEOUT_MS: 5000, //TODO : augmenter
    WEBRTC_RECONNECTION_WINDOW_MS: 5000
}

export class CommunicationManager {

    //TODO : est ce qu'on laisse la partie prepareStrategy de ce cote ou on essaye de la basculer côté switch 
    private _currentStrategy: ICommunicationStrategy;
    private _preparedStrategy: ICommunicationStrategy | null = null;
    private _communicationStrategyType: CommunicationType = CommunicationType.NONE;
    private _switchHandler: SwitchHandler;

    constructor(private readonly space: ICommunicationSpaceManager , private readonly config: ISwitchConfig = communicationConfig) {
        this._switchHandler = new SwitchHandler(space, config, this);
        this._currentStrategy = new DefaultCommunicationStrategy(this.space);
        this.initializeStrategy();
    }

    public onUserAdded(user: SpaceUser): void {
        if (this.shouldSwitchToLivekit()) {
            this._switchHandler.handleSwitch(CommunicationType.LIVEKIT, user);
            return;
        } 

        this._currentStrategy.addUser(user,!!this._preparedStrategy);
    }

    public onUserDeleted(user: SpaceUser): void {
        this._currentStrategy.deleteUser(user);
        if (this.shouldSwitchBackToWebRTC()) {
            this._switchHandler.handleSwitch(CommunicationType.WEBRTC);
        }
    }

    public onUserUpdated(user: SpaceUser): void {

        if(!this._preparedStrategy) {
            this._currentStrategy.updateUser(user);
        }else {
            //TODO : gerer le cas ou on est en train de switcher de strategie et qu'on a un user qui se connecte  
        }
    }

    public handleUserReadyForSwitch(userId: number): void {
        this._switchHandler.handleUserReady(userId);
    }

    private initializeStrategy(): void {
        this._communicationStrategyType = this.determineInitialStrategy();
        this._currentStrategy = CommunicationStrategyFactory.create(
            this._communicationStrategyType,
            this.space
        );
        this._currentStrategy.initialize();
    }

    private determineInitialStrategy(): CommunicationType {
        const propertiesToSync = this.space.getPropertiesToSync();
        return this.hasMediaProperties(propertiesToSync) 
            ? CommunicationType.WEBRTC 
            : CommunicationType.NONE;
    }

    private hasMediaProperties(properties: string[]): boolean {
        return properties.some(prop => 
            ['cameraState', 'microphoneState', 'screenSharingState'].includes(prop)
        );
    }

    private shouldSwitchToLivekit(): boolean {
        return this._communicationStrategyType === CommunicationType.WEBRTC &&
            this.space.getAllUsers().length > this.config.MAX_USERS_FOR_WEBRTC;
    }

    private shouldSwitchBackToWebRTC(): boolean {
        const isSwitchingToLivekit = (this._communicationStrategyType === CommunicationType.LIVEKIT) || (this._preparedStrategy !== null && (this.getStrategyType(this._preparedStrategy) === CommunicationType.LIVEKIT));
        const isMaxUsersReached = this.space.getAllUsers().length <= this.config.MAX_USERS_FOR_WEBRTC;
        return (isSwitchingToLivekit && isMaxUsersReached);
    }

    public getCurrentStrategy(): CommunicationType {
        return this._communicationStrategyType;
    }

    public switchToStrategy(type: CommunicationType): void {
        if (type === this.getCurrentStrategy()) {
            return;
        }
        if (this._currentStrategy) {
            this._currentStrategy.cleanup();
        }

        if (this._preparedStrategy && this.getStrategyType(this._preparedStrategy) === type) {
            this._currentStrategy = this._preparedStrategy;
        } else {
            this._currentStrategy = CommunicationStrategyFactory.create(type, this.space);
            this._currentStrategy.initialize();
        }

        this._preparedStrategy = null;
        this._communicationStrategyType = type;
    }

    public prepareStrategy(type: CommunicationType): void {
        if (type === this.getCurrentStrategy()) {
            return;
        }

        this._preparedStrategy = CommunicationStrategyFactory.create(type, this.space);
        this._preparedStrategy.initialize();
        
    }

    private getStrategyType(strategy: ICommunicationStrategy): CommunicationType {
        if (strategy instanceof WebRTCCommunicationStrategy) {
            return CommunicationType.WEBRTC;
        }

        if (strategy instanceof LivekitCommunicationStrategy) {
            return CommunicationType.LIVEKIT;
        }

        if (strategy instanceof DefaultCommunicationStrategy) {
            return CommunicationType.NONE;
        }
        return CommunicationType.NONE;
    }

    public cancelPreparedStrategy(): void {
        if (this._preparedStrategy) {
            this._preparedStrategy.cleanup();
            this._preparedStrategy = null;
        }
    }

    get preparedStrategy(): ICommunicationStrategy | null {
        return this._preparedStrategy;
    }
}





