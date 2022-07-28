import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";
import { Zone } from "../Model/Zone";
import { Movable } from "../Model/Movable";
import { PositionNotifier } from "../Model/PositionNotifier";
import { ServerDuplexStream } from "grpc";
import {
    AvailabilityStatus,
    BatchMessage,
    CompanionMessage,
    FollowAbortMessage,
    FollowConfirmationMessage,
    PusherToBackMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SubMessage,
} from "../Messages/generated/messages_pb";
import { CharacterLayer } from "../Model/Websocket/CharacterLayer";
import { BoolValue, UInt32Value } from "google-protobuf/google/protobuf/wrappers_pb";

export type UserSocket = ServerDuplexStream<PusherToBackMessage, ServerToClientMessage>;

export class User implements Movable {
    public listenedZones: Set<Zone>;
    public group?: Group;
    private _following: User | undefined;
    private followedBy: Set<User> = new Set<User>();

    public constructor(
        public id: number,
        public readonly uuid: string,
        public readonly IPAddress: string,
        private position: PointInterface,
        private positionNotifier: PositionNotifier,
        private availabilityStatus: AvailabilityStatus,
        public readonly socket: UserSocket,
        public readonly tags: string[],
        public readonly visitCardUrl: string | null,
        public readonly name: string,
        public readonly characterLayers: CharacterLayer[],
        public readonly companion?: CompanionMessage,
        private outlineColor?: number,
        private voiceIndicatorShown?: boolean,
        public readonly activatedInviteUser?: boolean
    ) {
        this.listenedZones = new Set<Zone>();

        this.positionNotifier.enter(this);
    }

    public getPosition(): PointInterface {
        return this.position;
    }

    public setPosition(position: PointInterface): void {
        const oldPosition = this.position;
        this.position = position;
        this.positionNotifier.updatePosition(this, position, oldPosition);
    }

    public addFollower(follower: User): void {
        this.followedBy.add(follower);
        follower._following = this;

        const message = new FollowConfirmationMessage();
        message.setFollower(follower.id);
        message.setLeader(this.id);
        const clientMessage = new ServerToClientMessage();
        clientMessage.setFollowconfirmationmessage(message);
        this.socket.write(clientMessage);
    }

    public delFollower(follower: User): void {
        this.followedBy.delete(follower);
        follower._following = undefined;

        const message = new FollowAbortMessage();
        message.setFollower(follower.id);
        message.setLeader(this.id);
        const clientMessage = new ServerToClientMessage();
        clientMessage.setFollowabortmessage(message);
        this.socket.write(clientMessage);
        follower.socket.write(clientMessage);
    }

    public hasFollowers(): boolean {
        return this.followedBy.size !== 0;
    }

    public getOutlineColor(): number | undefined {
        return this.outlineColor;
    }

    public getAvailabilityStatus(): AvailabilityStatus {
        return this.availabilityStatus;
    }

    public get silent(): boolean {
        return (
            this.availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
            this.availabilityStatus === AvailabilityStatus.SILENT ||
            this.availabilityStatus === AvailabilityStatus.JITSI ||
            this.availabilityStatus === AvailabilityStatus.BBB
        );
    }

    get following(): User | undefined {
        return this._following;
    }

    public stopLeading(): void {
        for (const follower of this.followedBy) {
            this.delFollower(follower);
        }
    }

    private batchedMessages: BatchMessage = new BatchMessage();
    private batchTimeout: NodeJS.Timeout | null = null;

    public emitInBatch(payload: SubMessage): void {
        this.batchedMessages.addPayload(payload);

        if (this.batchTimeout === null) {
            this.batchTimeout = setTimeout(() => {
                /*if (socket.disconnecting) {
                    return;
                }*/

                const serverToClientMessage = new ServerToClientMessage();
                serverToClientMessage.setBatchmessage(this.batchedMessages);

                this.socket.write(serverToClientMessage);
                this.batchedMessages = new BatchMessage();
                this.batchTimeout = null;
            }, 100);
        }
    }

    public updateDetails(details: SetPlayerDetailsMessage) {
        if (details.getRemoveoutlinecolor()) {
            this.outlineColor = undefined;
        } else if (details.getOutlinecolor()?.getValue() !== undefined) {
            this.outlineColor = details.getOutlinecolor()?.getValue();
        }
        this.voiceIndicatorShown = details.getShowvoiceindicator()?.getValue();

        const availabilityStatus = details.getAvailabilitystatus();
        let sendStatusUpdate = false;
        if (availabilityStatus && availabilityStatus !== this.availabilityStatus) {
            this.availabilityStatus = availabilityStatus;
            sendStatusUpdate = true;
        }

        const playerDetails = new SetPlayerDetailsMessage();

        if (this.outlineColor !== undefined) {
            playerDetails.setOutlinecolor(new UInt32Value().setValue(this.outlineColor));
        }
        if (details.getRemoveoutlinecolor()) {
            playerDetails.setRemoveoutlinecolor(new BoolValue().setValue(true));
        }
        if (this.voiceIndicatorShown !== undefined) {
            playerDetails.setShowvoiceindicator(new BoolValue().setValue(this.voiceIndicatorShown));
        }
        if (sendStatusUpdate) {
            playerDetails.setAvailabilitystatus(details.getAvailabilitystatus());
        }

        this.positionNotifier.updatePlayerDetails(this, playerDetails);
    }
}
