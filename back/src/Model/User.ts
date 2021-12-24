import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";
import { Zone } from "_Model/Zone";
import { Movable } from "_Model/Movable";
import { PositionNotifier } from "_Model/PositionNotifier";
import { ServerDuplexStream } from "grpc";
import {
    BatchMessage,
    CompanionMessage,
    FollowAbortMessage,
    FollowConfirmationMessage,
    PusherToBackMessage,
    ServerToClientMessage,
    SetPlayerDetailsMessage,
    SubMessage,
} from "../Messages/generated/messages_pb";
import { CharacterLayer } from "_Model/Websocket/CharacterLayer";

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
        public silent: boolean,
        private positionNotifier: PositionNotifier,
        public readonly socket: UserSocket,
        public readonly tags: string[],
        public readonly visitCardUrl: string | null,
        public readonly name: string,
        public readonly characterLayers: CharacterLayer[],
        public readonly companion?: CompanionMessage,
        private _outlineColor?: number | undefined
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

    public set outlineColor(value: number | undefined) {
        this._outlineColor = value;

        const playerDetails = new SetPlayerDetailsMessage();
        if (value === undefined) {
            playerDetails.setRemoveoutlinecolor(true);
        } else {
            playerDetails.setOutlinecolor(value);
        }

        this.positionNotifier.updatePlayerDetails(this, playerDetails);
    }
}
