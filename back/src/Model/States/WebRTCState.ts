import type { SpaceUser } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../Strategies/WebRTCCommunicationStrategy";
import { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { getCapability } from "../../Services/Capabilities";
import { LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "../../Enum/EnvironmentVariable";
import type { ICommunicationState } from "../Interfaces/ICommunicationState";
import { CommunicationState } from "./AbstractCommunicationState";
import { createLivekitState } from "./StateFactory";

export class WebRTCState extends CommunicationState {
    protected _communicationType: CommunicationType = CommunicationType.WEBRTC;
    protected _nextCommunicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected livekitAvailable: boolean;
    private livekitStatePromise: Promise<ICommunicationState> | null = null;

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

    async handleUserAdded(user: SpaceUser): Promise<ICommunicationState | void> {
        /**
         // If we implement cancel switch, we need to reset the livekitStatePromise
         */
        if (this.shouldSwitchToNextState()) {
            if (!this.livekitStatePromise) {
                this.livekitStatePromise = createLivekitState(
                    this._space,
                    user.playUri,
                    this.users,
                    this.usersToNotify
                );
                return this.livekitStatePromise;
            }

            return;
        }

        return super.handleUserAdded(user);
    }

    async handleUserToNotifyAdded(user: SpaceUser): Promise<ICommunicationState | void> {
        /**
         * If we implement cancel switch, we need to reset the livekitStatePromise
         */
        if (this.shouldSwitchToNextState()) {
            if (!this.livekitStatePromise) {
                this.livekitStatePromise = createLivekitState(
                    this._space,
                    user.playUri,
                    this.users,
                    this.usersToNotify
                );
                return this.livekitStatePromise;
            }

            return;
        }

        return super.handleUserToNotifyAdded(user);
    }

    protected shouldSwitchToNextState(): boolean {
        const shouldSwitchToNextState = this._space.getAllUsers().length > this.MAX_USERS_FOR_WEBRTC;
        if (shouldSwitchToNextState && !this.livekitAvailable) {
            console.warn(
                "Livekit is not configured in environment variables (or in AdminAPI), cannot switch to conversation to Livekit"
            );
            return false;
        }
        return shouldSwitchToNextState;
    }
}
