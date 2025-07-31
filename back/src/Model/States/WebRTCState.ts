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
        const activeStreamers = this._space.getUsersInFilter().length;
        const activeWatchers = this._space.getUsersToNotify().length;

        // Thresholds (tweak these values as needed)
        const MAX_PEER_STREAMERS = this.MAX_STREAMERS_FOR_PEER || 5;
        const MAX_PEER_WATCHERS = this.MAX_WATCHERS_FOR_PEER || 10;

        // Rule 1: Too many concurrent streamers for P2P to handle efficiently
        const isStreamerOverload = activeStreamers > MAX_PEER_STREAMERS;

        // Rule 2: Too many total watchers (watchers = incoming video connections)
        const isWatcherOverload = activeWatchers > MAX_PEER_WATCHERS;

        // Rule 3: Even 1 stream with a large audience (e.g., presentation mode)
        const isOneStreamBigAudience = activeStreamers > 0 && activeWatchers > 8;

        const shouldSwitch = (isStreamerOverload || isWatcherOverload || isOneStreamBigAudience) && !this.isSwitching();

        if (shouldSwitch) {
            console.log("Switching to LiveKit due to:", {
                activeStreamers,
                activeWatchers,
                isStreamerOverload,
                isWatcherOverload,
                isOneStreamBigAudience,
            });
        } else {
            console.log("Staying in Peer-to-Peer:", { activeStreamers, activeWatchers });
        }

        return shouldSwitch;
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const activeStreamers = this._space.getUsersInFilter().length;
        const activeWatchers = this._space.getUsersToNotify().length;

        // Hysteresis thresholds (stricter than switch-to-LiveKit to avoid flapping)
        const SWITCH_BACK_STREAMERS_THRESHOLD = this.MAX_STREAMERS_FOR_PEER - 2; // e.g. 8 if max is 10
        const SWITCH_BACK_WATCHERS_THRESHOLD = this.MAX_WATCHERS_FOR_PEER - 3; // e.g. 7 if max is 10

        const isStreamerLoadLow = activeStreamers <= SWITCH_BACK_STREAMERS_THRESHOLD;
        const isWatcherLoadLow = activeWatchers <= SWITCH_BACK_WATCHERS_THRESHOLD;

        // Hysteresis for 'one stream large audience' case
        const isOneStreamSmallAudience = activeStreamers === 1 && activeWatchers <= 6;

        const shouldSwitchBack =
            this.isSwitching() && isStreamerLoadLow && isWatcherLoadLow && isOneStreamSmallAudience;

        if (shouldSwitchBack) {
            console.log("✅ Switching back to Peer-to-Peer:", { activeStreamers, activeWatchers });
        } else {
            console.log("⛔ Staying on LiveKit:", {
                reason: {
                    streamersLow: isStreamerLoadLow,
                    watchersLow: isWatcherLoadLow,
                    oneStreamSmallAudience: isOneStreamSmallAudience,
                },
                activeStreamers,
                activeWatchers,
            });
        }

        return shouldSwitchBack;
    }

    protected afterSwitchAction(): void {
        this._currentStrategy.initialize(this._readyUsers);
    }
}
