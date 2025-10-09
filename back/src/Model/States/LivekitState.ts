import { SpaceUser } from "@workadventure/messages";
import { CommunicationType } from "../Types/CommunicationTypes";
import { LivekitCommunicationStrategy } from "../Strategies/LivekitCommunicationStrategy";
import { ICommunicationSpace } from "../Interfaces/ICommunicationSpace";
import { LivekitCredentialsResponse } from "../../Services/Repository/LivekitCredentialsResponse";
import { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_HOST } from "../../Enum/EnvironmentVariable";
import { LiveKitService } from "../Services/LivekitService";
import { ICommunicationState, IRecordableState } from "../Interfaces/ICommunicationState";
import { CommunicationState } from "./AbstractCommunicationState";
import { WebRTCState } from "./WebRTCState";

export class LivekitState extends CommunicationState implements IRecordableState {
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
                    _livekitServerCredentials.livekitHost.replace("http", "ws")
                )
            ),
            users,
            usersToNotify
        );
    }
    async handleUserDeleted(user: SpaceUser): Promise<ICommunicationState | void> {
        if (this.shouldSwitchToNextState()) {
            return new WebRTCState(this._space, this.users, this.usersToNotify);
        }

        return super.handleUserDeleted(user);
    }

    async handleUserToNotifyDeleted(user: SpaceUser): Promise<ICommunicationState | void> {
        if (this.shouldSwitchToNextState()) {
            return new WebRTCState(this._space, this.users, this.usersToNotify);
        }

        await super.handleUserToNotifyDeleted(user);
    }

    protected shouldSwitchToNextState(): boolean {
        return this._space.getAllUsers().length <= this.MAX_USERS_FOR_WEBRTC;
    }

    async handleStartRecording(user: SpaceUser, userUuid: string): Promise<void> {
        if (this.isRecordableStrategy(this._currentStrategy)) {
            await this._currentStrategy.startRecording(user, userUuid).catch((error) => {
                console.error("Error starting recording:", error);
                throw new Error("Failed to start recording");
            });
        }
    }

    async handleStopRecording(): Promise<void> {
        if (this.isRecordableStrategy(this._currentStrategy)) {
            await this._currentStrategy.stopRecording();
        }
    }
}
