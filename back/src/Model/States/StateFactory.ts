import type { SpaceUser } from "@workadventure/messages";
import { getCapability } from "../../Services/Capabilities.ts";
import { adminApi } from "../../Services/AdminApi.ts";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable.ts";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace.ts";
import type { ICommunicationState } from "../Interfaces/ICommunicationState.ts";
import { CommunicationType } from "../Types/CommunicationTypes.ts";
import type { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy.ts";
import { LivekitState } from "./LivekitState.ts";
import { WebRTCState } from "./WebRTCState.ts";
import { VoidState } from "./VoidState.ts";

const LIVEKIT_CREDENTIALS_CAPABILITY = "api/livekit/credentials";
const LIVKEIT_CREDENTIALS_VERSION = "v1";

export interface StateFactoryOptions {
    playUri?: string;
}

/**
 * Factory for creating communication states.
 * Centralizes state creation logic to decouple states from each other.
 */
export class StateFactory {
    /**
     * Creates a communication state based on the requested type.
     */
    static async createState(
        type: CommunicationType,
        space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>,
        options?: StateFactoryOptions
    ): Promise<ICommunicationState<ICommunicationStrategy>> {
        switch (type) {
            case CommunicationType.WEBRTC:
                return new WebRTCState(space, users, usersToNotify);
            case CommunicationType.LIVEKIT:
                return this.createLivekitState(space, users, usersToNotify, options?.playUri);
            case CommunicationType.NONE:
                return new VoidState();
        }
    }

    /**
     * Creates a LivekitState with proper credentials handling.
     */
    private static async createLivekitState(
        space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>,
        playUri?: string
    ): Promise<LivekitState> {
        if (getCapability(LIVEKIT_CREDENTIALS_CAPABILITY) === LIVKEIT_CREDENTIALS_VERSION) {
            if (!playUri) {
                throw new Error("playUri is required when using AdminAPI for Livekit credentials");
            }
            const credentials = await adminApi.fetchLivekitCredentials(space.getSpaceName(), playUri);
            return new LivekitState(space, credentials, users, usersToNotify);
        } else {
            if (!LIVEKIT_HOST || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
                throw new Error("Livekit credentials are not set in environment variables");
            }
            return new LivekitState(
                space,
                {
                    livekitHost: LIVEKIT_HOST,
                    livekitApiKey: LIVEKIT_API_KEY,
                    livekitApiSecret: LIVEKIT_API_SECRET,
                },
                users,
                usersToNotify
            );
        }
    }
}
