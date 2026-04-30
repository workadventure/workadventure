import * as Sentry from "@sentry/node";
import type {
    GetLivekitCredentialResponseMessage,
    HandleRecordingWebhookRequest,
    SpaceUser,
} from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import type { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST, PLAY_URL } from "../../Enum/EnvironmentVariable";
import { LiveKitService, type RecordingStartInfo } from "../Services/LivekitService";
import type { IRecordableState } from "../Interfaces/ICommunicationState";
import type { IRecordableStrategy } from "../Interfaces/ICommunicationStrategy";
import { CommunicationState } from "./AbstractCommunicationState";

export class LivekitState
    extends CommunicationState<LivekitCommunicationStrategy>
    implements IRecordableState<IRecordableStrategy>
{
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
        usersToNotify: ReadonlyMap<string, SpaceUser>
    ) {
        super(
            _space,
            new LivekitCommunicationStrategy(
                _space,
                new LiveKitService(
                    _livekitServerCredentials.livekitHost,
                    _livekitServerCredentials.livekitApiKey,
                    _livekitServerCredentials.livekitApiSecret,
                    _livekitServerCredentials.livekitHost.replace("http", "ws"),
                    PLAY_URL
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

    async handleStartRecording(user: SpaceUser, recordingSessionId: string): Promise<RecordingStartInfo> {
        return await this._currentStrategy.startRecording(user, recordingSessionId).catch((error) => {
            console.error("Error starting recording:", error);
            throw new Error("Failed to start recording");
        });
    }

    async handleStopRecording(egressId?: string): Promise<void> {
        await this._currentStrategy.stopRecording(egressId);
    }

    async handleLivekitWebhook(
        rawBody: Buffer | Uint8Array,
        authorizationHeader: string | undefined,
        spaceName: string,
        recordingSessionId: string
    ): Promise<HandleRecordingWebhookRequest | "ignored"> {
        return this._currentStrategy.handleLivekitWebhook(rawBody, authorizationHeader, spaceName, recordingSessionId);
    }

    async handleGenerateLivekitCredentials(user: SpaceUser): Promise<GetLivekitCredentialResponseMessage> {
        const token = await this._currentStrategy.generateToken(user);
        return {
            url: this._livekitServerCredentials.livekitHost,
            jwtToken: token,
        };
    }
}
