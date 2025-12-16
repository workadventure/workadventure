import * as Sentry from "@sentry/node";
import type { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import type { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import { LiveKitService } from "../Services/LivekitService";
import { CommunicationState } from "./AbstractCommunicationState";

export class LivekitState extends CommunicationState {
    protected _communicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected _nextCommunicationType: CommunicationType = CommunicationType.WEBRTC;

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
    async handleUserDeleted(user: SpaceUser): Promise<void> {
        try {
            await super.handleUserDeleted(user);
        } catch (e) {
            console.error(`Error deleting user ${user.spaceUserId} from Livekit:`, e);
            Sentry.captureException(e);
        }
    }

    async handleUserToNotifyDeleted(user: SpaceUser): Promise<void> {
        try {
            await super.handleUserToNotifyDeleted(user);
        } catch (e) {
            console.error(`Error deleting user ${user.spaceUserId} from Livekit:`, e);
            Sentry.captureException(e);
        }
    }
}
