import { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import { LiveKitService } from "../Services/LivekitService";
import { CommunicationState } from "./AbstractCommunicationState";
import { WebRTCState } from "./WebRTCState";

export class LivekitState extends CommunicationState {
    protected _currentCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected _nextCommunicationType: CommunicationType = CommunicationType.WEBRTC;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager,
        protected readonly _livekitServerCredentials: LivekitCredentialsResponse = {
            livekitApiKey: LIVEKIT_API_KEY ?? "",
            livekitApiSecret: LIVEKIT_API_SECRET ?? "",
            livekitHost: LIVEKIT_HOST ?? "",
        },
        protected readonly _readyUsers: Set<string> = new Set()
    ) {
        //super(_space, _communicationManager, new LivekitCommunicationStrategy(_space,this._readyUsers));
        console.log(
            _livekitServerCredentials.livekitHost,
            _livekitServerCredentials.livekitApiKey,
            _livekitServerCredentials.livekitApiSecret
        );
        super(
            _space,
            _communicationManager,
            new LivekitCommunicationStrategy(
                _space,
                new LiveKitService(
                    _livekitServerCredentials.livekitHost,
                    _livekitServerCredentials.livekitApiKey,
                    _livekitServerCredentials.livekitApiSecret,
                    _livekitServerCredentials.livekitHost.replace("http", "ws")
                )
            ),
            _readyUsers
        );
        this.SWITCH_TIMEOUT_MS = 5000;
    }
    async handleUserAdded(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this._nextStatePromise) {
            this._waitingList.delete(user.spaceUserId);
            const nextState = await this._nextStatePromise;
            await nextState.handleUserAdded(user);
            // Don't call super.handleUserAdded if the user is already handled by the next state
            return;
        }

        return super.handleUserAdded(user);
    }
    async handleUserDeleted(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(undefined);
        }

        if (this._nextStatePromise) {
            this._waitingList.add(user.spaceUserId);
            const nextState = await this._nextStatePromise;
            await nextState.handleUserAdded(user);
        }

        return super.handleUserDeleted(user);
    }
    async handleUserUpdated(user: SpaceUser): Promise<void> {
        return super.handleUserUpdated(user);
    }
    async handleUserReadyForSwitch(userId: string): Promise<void> {
        return super.handleUserReadyForSwitch(userId);
    }

    handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }
        return super.handleUserToNotifyAdded(user);

        //TODO : voir si on sépare les token en 2
        //TODO : 1token pour les watcher qui donne seulement le droit de subscribe
        //TODO : 1token pour les users qui donne le droit de streamer et de subscribe

        //TODO : voir le meilleur moyen de gerer ça dans le front
        //TODO : on pourrait avoir 2 messages/event differents et gere de maniere independante
    }

    async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this.isSwitching()) {
            if (this._nextStatePromise) {
                this._waitingList.delete(user.spaceUserId);
                const nextState = await this._nextStatePromise;
                await nextState.handleUserAdded(user);
                // Don't call super.handleUserAdded if the user is already handled by the next state
                return;
            }
        }

        await super.handleUserDeleted(user);
    }

    private switchToNextState(user: SpaceUser | undefined): void {
        this._nextStatePromise = Promise.resolve(new WebRTCState(this._space, this._communicationManager));
        if (user) {
            this._readyUsers.add(user.spaceUserId);
            this.notifyUserOfCurrentStrategy(user, this._nextCommunicationType);
        }

        this.notifyAllUsersToPrepareSwitchToNextState();
        this.setupSwitchTimeout();
    }

    protected shouldSwitchToNextState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
        return !this.isSwitching() && isMaxUsersReached;
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC;
        return this.isSwitching() && isMaxUsersReached;
    }

    protected areAllUsersReady(): boolean {
        return this._readyUsers.size === this._space.getAllUsers().length;
    }

    protected preparedSwitchAction(readyUsers: Set<string>): void {
        this._currentStrategy.initialize(readyUsers);
    }
}
