import * as Sentry from "@sentry/node";
import type { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import type { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import { LiveKitService } from "../Services/LivekitService";
import type { ICommunicationState, StateTransitionResult } from "../Interfaces/ICommunicationState";
import { CommunicationState } from "./AbstractCommunicationState";
import { WebRTCState } from "./WebRTCState";

export class LivekitState extends CommunicationState {
    protected _communicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected _nextCommunicationType: CommunicationType = CommunicationType.WEBRTC;
    private readonly LIVEKIT_TO_WEBRTC_DELAY_MS = 20_000; // 20 seconds
    private _pendingTransitionAbortController: AbortController | null = null;
    private _pendingTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(
        protected readonly _space: ICommunicationSpace,
        protected readonly _livekitServerCredentials: LivekitCredentialsResponse = {
            livekitApiKey: LIVEKIT_API_KEY ?? "",
            livekitApiSecret: LIVEKIT_API_SECRET ?? "",
            livekitHost: LIVEKIT_HOST ?? "",
        },
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>,
        protected readonly _readyUsers: Set<string> = new Set()
    ) {
        super(
            _space,
            new LivekitCommunicationStrategy(
                _space,
                new LiveKitService(
                    _livekitServerCredentials.livekitHost,
                    _livekitServerCredentials.livekitApiKey,
                    _livekitServerCredentials.livekitApiSecret,
                    _livekitServerCredentials.livekitHost.replace("http", "ws")
                )
            ),
            users,
            usersToNotify
        );
    }
    async handleUserDeleted(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        try {
            await super.handleUserDeleted(user);
        } catch (e) {
            console.error(`Error deleting user ${user.spaceUserId} from Livekit:`, e);
            Sentry.captureException(e);
        }

        // Cancel any pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        if (this.shouldSwitchToNextState()) {
            return this.scheduleTransitionToWebRTC();
        }
    }

    async handleUserToNotifyDeleted(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        try {
            await super.handleUserToNotifyDeleted(user);
        } catch (e) {
            console.error(`Error deleting user ${user.spaceUserId} from Livekit:`, e);
            Sentry.captureException(e);
        }

        // Cancel any pending transition if conditions no longer allow switching
        this.cancelPendingTransitionIfNeeded();

        if (this.shouldSwitchToNextState()) {
            return this.scheduleTransitionToWebRTC();
        }
    }

    async handleUserAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        const result = await super.handleUserAdded(user);

        // Cancel pending transition if a user was added (we should stay in LiveKit)
        this.cancelPendingTransitionIfNeeded();

        return result;
    }

    async handleUserToNotifyAdded(user: SpaceUser): Promise<StateTransitionResult | ICommunicationState | void> {
        const result = await super.handleUserToNotifyAdded(user);

        // Cancel pending transition if a user was added (we should stay in LiveKit)
        this.cancelPendingTransitionIfNeeded();

        return result;
    }

    public shouldSwitchToNextState(): boolean {
        return this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
    }

    public getNextStateType(): CommunicationType | null {
        return this._nextCommunicationType;
    }

    private scheduleTransitionToWebRTC(): StateTransitionResult {
        // If a transition is already scheduled, return the existing abort controller
        if (this._pendingTransitionAbortController && this._pendingTransitionTimeout) {
            return {
                abortController: this._pendingTransitionAbortController,
            };
        }

        // Create new abort controller for this transition
        const abortController = new AbortController();
        this._pendingTransitionAbortController = abortController;

        // Create promise that resolves after delay, unless aborted
        const nextStatePromise = new Promise<ICommunicationState>((resolve, reject) => {
            this._pendingTransitionTimeout = setTimeout(() => {
                if (abortController.signal.aborted) {
                    reject(new Error("Transition aborted"));
                    return;
                }

                // Verify we should still switch before resolving
                if (this.shouldSwitchToNextState()) {
                    const nextState = new WebRTCState(this._space, this.users, this.usersToNotify);
                    this._pendingTransitionAbortController = null;
                    this._pendingTransitionTimeout = null;
                    resolve(nextState);
                } else {
                    this._pendingTransitionAbortController = null;
                    this._pendingTransitionTimeout = null;
                    reject(new Error("Transition conditions no longer met"));
                }
            }, this.LIVEKIT_TO_WEBRTC_DELAY_MS);

            // Listen for abort signal
            abortController.signal.addEventListener("abort", () => {
                if (this._pendingTransitionTimeout) {
                    clearTimeout(this._pendingTransitionTimeout);
                    this._pendingTransitionTimeout = null;
                }
                this._pendingTransitionAbortController = null;
                reject(new Error("Transition aborted"));
            });
        });

        return {
            nextStatePromise,
            abortController,
        };
    }

    private cancelPendingTransitionIfNeeded(): void {
        if (!this._pendingTransitionAbortController || !this._pendingTransitionTimeout) {
            return;
        }

        // Cancel if we should no longer switch (user count increased)
        if (!this.shouldSwitchToNextState()) {
            this._pendingTransitionAbortController.abort();
            this._pendingTransitionAbortController = null;
            if (this._pendingTransitionTimeout) {
                clearTimeout(this._pendingTransitionTimeout);
                this._pendingTransitionTimeout = null;
            }
        }
    }
}
