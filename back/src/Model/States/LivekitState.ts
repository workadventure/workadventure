import * as Sentry from "@sentry/node";
import type { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import type { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import type { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import { LiveKitService } from "../Services/LivekitService";
import type { IRecordableState } from "../Interfaces/ICommunicationState";
import type { IRecordableStrategy } from "../Interfaces/ICommunicationStrategy";
import { CommunicationState } from "./AbstractCommunicationState";

export class LivekitState
    extends CommunicationState<LivekitCommunicationStrategy>
    implements IRecordableState<IRecordableStrategy>
{
    protected _communicationType: CommunicationType = CommunicationType.LIVEKIT;
    protected _nextCommunicationType: CommunicationType = CommunicationType.WEBRTC;
    private _isRecording: boolean = false;

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

    async handleStartRecording(user: SpaceUser): Promise<void> {
        this._isRecording = true;
        await this._currentStrategy.startRecording(user).catch((error) => {
            console.error("Error starting recording:", error);
            throw new Error("Failed to start recording");
        });
    }

    async handleStopRecording(): Promise<void> {
        this._isRecording = false;
        await this._currentStrategy.stopRecording();
    }
}
