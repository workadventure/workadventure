import type { SpaceUser } from "@workadventure/messages";
import { WebRTCCommunicationStrategy } from "../Strategies/WebRTCCommunicationStrategy.ts";
import { CommunicationType } from "../Types/CommunicationTypes.ts";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace.ts";
import { CommunicationState } from "./AbstractCommunicationState.ts";

export class WebRTCState extends CommunicationState<WebRTCCommunicationStrategy> {
    protected _communicationType: CommunicationType = CommunicationType.WEBRTC;
    protected _nextCommunicationType: CommunicationType = CommunicationType.LIVEKIT;

    constructor(
        protected readonly _space: ICommunicationSpace,
        users: ReadonlyMap<string, SpaceUser>,
        usersToNotify: ReadonlyMap<string, SpaceUser>
    ) {
        super(_space, new WebRTCCommunicationStrategy(_space, users, usersToNotify), users, usersToNotify);
    }
}
