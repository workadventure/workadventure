import * as Sentry from "@sentry/node";
import { SpaceUser } from "@workadventure/messages";
import { ICommunicationManager } from "../Interfaces/ICommunicationManager";
import { WebRTCCommunicationStrategy } from "../Strategies/WebRTCCommunicationStrategy";
import { CommunicationType } from "../Types/CommunicationTypes";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { adminApi } from "../../Services/AdminApi";
import { getCapability } from "../../Services/Capabilities";
import { LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../../Enum/EnvironmentVariable";
import { CommunicationState } from "./AbstractCommunicationState";
import { LivekitState } from "./LivekitState";

export class WebRTCState extends CommunicationState {
    protected _currentCommunicationType: CommunicationType = CommunicationType.WEBRTC;
    protected _nextCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected livekitAvailable: boolean;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _communicationManager: ICommunicationManager
    ) {
        super(_space, _communicationManager, new WebRTCCommunicationStrategy(_space));
        this.SWITCH_TIMEOUT_MS = 5000;
        this.livekitAvailable =
            getCapability("api/livekit/credentials") === "v1" ||
            (!!LIVEKIT_HOST && !!LIVEKIT_API_KEY && !!LIVEKIT_API_SECRET);
    }
    async handleUserAdded(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user, "user");
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

    async handleUserToNotifyAdded(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchToNextState()) {
            this.switchToNextState(user, "userToNotify");
            return;
        }

        if (this._nextStatePromise) {
            this._waitingList.add(user.spaceUserId);
            const nextState = await this._nextStatePromise;
            await nextState.handleUserToNotifyAdded(user);
            return;
        }

        await super.handleUserToNotifyAdded(user);
    }

    async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        if (this.shouldSwitchBackToCurrentState()) {
            this.cancelSwitch();
        }

        if (this.isSwitching()) {
            if (this._nextStatePromise) {
                this._waitingList.delete(user.spaceUserId);
                const nextState = await this._nextStatePromise;
                await nextState.handleUserToNotifyDeleted(user);
            }
        }

        await super.handleUserToNotifyDeleted(user);
    }

    private switchToNextState(user: SpaceUser, typeOfSwitch: "user" | "userToNotify"): void {
        this._nextStatePromise = (async () => {
            let nextState: LivekitState | undefined;
            if (getCapability("api/livekit/credentials") === "v1") {
                const credentials = await adminApi.fetchLivekitCredentials(this._space.getSpaceName(), user.playUri);
                nextState = new LivekitState(this._space, this._communicationManager, credentials, this._readyUsers);
            } else {
                if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
                    throw new Error("Livekit credentials are not set in environment variables");
                }
                nextState = new LivekitState(
                    this._space,
                    this._communicationManager,
                    {
                        livekitHost: LIVEKIT_HOST,
                        livekitApiKey: LIVEKIT_API_KEY,
                        livekitApiSecret: LIVEKIT_API_SECRET,
                    },
                    this._readyUsers
                ); //fallback to default credentials
            }
            this._readyUsers.add(user.spaceUserId);
            this._switchInitiatorUserId = user.spaceUserId;
            try {
                if (
                    typeOfSwitch === "user" &&
                    this._space.getUsersInFilter().find((user) => user.spaceUserId === user.spaceUserId)
                ) {
                    await nextState.handleUserAdded(user);
                }

                if (
                    typeOfSwitch === "userToNotify" &&
                    this._space.getUsersToNotify().find((user) => user.spaceUserId === user.spaceUserId)
                ) {
                    await nextState.handleUserToNotifyAdded(user);
                }
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
        const shouldSwitchToNextState =
            this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC &&
            !this.isSwitching() &&
            !this._nextStatePromise;
        if (shouldSwitchToNextState && !this.livekitAvailable) {
            console.warn(
                "Livekit is not configured in environment variables (or in AdminAPI), cannot switch to conversation to Livekit"
            );
            return false;
        }
        return shouldSwitchToNextState;
    }

    protected shouldSwitchBackToCurrentState(): boolean {
        const isMaxUsersReached = this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
        return this.isSwitching() && isMaxUsersReached;
    }

    protected afterSwitchAction(): void {
        this._currentStrategy.initialize(this._readyUsers);
    }
}
