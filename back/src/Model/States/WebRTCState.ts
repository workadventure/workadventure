import type { SpaceUser } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../Strategies/WebRTCCommunicationStrategy";
import { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { getCapability } from "../../Services/Capabilities";
import { LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../../Enum/EnvironmentVariable";
import type { ICommunicationState, StateTransitionResult } from "../Interfaces/ICommunicationState";
import { CommunicationState } from "./AbstractCommunicationState";
import { createLivekitState } from "./StateFactory";

export class WebRTCState extends CommunicationState {
    protected _communicationType: CommunicationType = CommunicationType.WEBRTC;
    protected _nextCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected livekitAvailable: boolean;
    private livekitStatePromise: Promise<ICommunicationState> | null = null;
    private livekitStateAbortController: AbortController | null = null;

    constructor(
        protected readonly _space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>
    ) {
        super(_space, new WebRTCCommunicationStrategy(_space, users, usersToNotify), users, usersToNotify);
        this.livekitAvailable =
            getCapability("api/livekit/credentials") === "v1" ||
            (!!LIVEKIT_HOST && !!LIVEKIT_API_KEY && !!LIVEKIT_API_SECRET);
    }

    async handleUserAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        // Cancel pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        if (this.shouldSwitchToNextState()) {
            if (!this.livekitStatePromise) {
                const abortController = new AbortController();
                this.livekitStateAbortController = abortController;

                this.livekitStatePromise = createLivekitState(
                    this._space,
                    user.playUri,
                    this.users,
                    this.usersToNotify
                ).then((state) => {
                    if (abortController.signal.aborted) {
                        throw new Error("Transition aborted");
                    }
                    return state;
                });

                return {
                    nextStatePromise: this.livekitStatePromise,
                    abortController,
                };
            }

            // If promise already exists, return the existing abort controller
            if (this.livekitStateAbortController) {
                return {
                    nextStatePromise: this.livekitStatePromise,
                    abortController: this.livekitStateAbortController,
                };
            }
        }

        return super.handleUserAdded(user);
    }

    async handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        // Cancel pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        if (this.shouldSwitchToNextState()) {
            if (!this.livekitStatePromise) {
                const abortController = new AbortController();
                this.livekitStateAbortController = abortController;

                this.livekitStatePromise = createLivekitState(
                    this._space,
                    user.playUri,
                    this.users,
                    this.usersToNotify
                ).then((state) => {
                    if (abortController.signal.aborted) {
                        throw new Error("Transition aborted");
                    }
                    return state;
                });

                return {
                    nextStatePromise: this.livekitStatePromise,
                    abortController,
                };
            }

            // If promise already exists, return the existing abort controller
            if (this.livekitStateAbortController) {
                return {
                    nextStatePromise: this.livekitStatePromise,
                    abortController: this.livekitStateAbortController,
                };
            }
        }

        return super.handleUserToNotifyAdded(user);
    }

    public shouldSwitchToNextState(): boolean {
        const shouldSwitchToNextState = this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC;
        if (shouldSwitchToNextState && !this.livekitAvailable) {
            console.warn(
                "Livekit is not configured in environment variables (or in AdminAPI), cannot switch to conversation to Livekit"
            );
            return false;
        }
        return shouldSwitchToNextState;
    }

    public getNextStateType(): CommunicationType | null {
        return this._nextCommunicationType;
    }

    private cancelPendingTransitionIfNeeded(): void {
        if (!this.livekitStateAbortController || !this.livekitStatePromise) {
            return;
        }

        // Cancel if we should no longer switch (user count decreased)
        if (!this.shouldSwitchToNextState()) {
            this.livekitStateAbortController.abort();
            this.livekitStateAbortController = null;
            this.livekitStatePromise = null;
        }
    }
}
