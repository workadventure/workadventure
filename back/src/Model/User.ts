import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";
import { Zone } from "_Model/Zone";
import { Movable } from "_Model/Movable";
import { PositionNotifier } from "_Model/PositionNotifier";
import { ServerDuplexStream } from "grpc";
import {
    BatchMessage,
    CompanionMessage,
    PusherToBackMessage,
    ServerToClientMessage,
    SubMessage,
} from "../Messages/generated/messages_pb";
import { CharacterLayer } from "_Model/Websocket/CharacterLayer";

export type UserSocket = ServerDuplexStream<PusherToBackMessage, ServerToClientMessage>;

export class User implements Movable {
    public listenedZones: Set<Zone>;
    public group?: Group;

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
        public readonly companion?: CompanionMessage
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
}
