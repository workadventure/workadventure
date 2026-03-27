import type { SpaceUser } from "@workadventure/messages";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import type { ICommunicationState } from "../Interfaces/ICommunicationState";
import { CommunicationType } from "../Types/CommunicationTypes";
import type { ICommunicationStrategy } from "../Interfaces/ICommunicationStrategy";
import { getLivekitCredentials } from "../../Utils/livekitCredentials";
import { LivekitState } from "./LivekitState";
import { WebRTCState } from "./WebRTCState";
import { VoidState } from "./VoidState";

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
        options: StateFactoryOptions
    ): Promise<ICommunicationState<ICommunicationStrategy>> {
        switch (type) {
            case CommunicationType.WEBRTC:
                return new WebRTCState(space, users, usersToNotify);
            case CommunicationType.LIVEKIT:
                if (!options.playUri) {
                    throw new Error("playUri is required");
                }
                return this.createLivekitState(space, users, usersToNotify, options.playUri);
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
        playUri: string
    ): Promise<LivekitState> {
        const credentials = await getLivekitCredentials(playUri);
        return new LivekitState(space, credentials, users, usersToNotify);
    }
}

