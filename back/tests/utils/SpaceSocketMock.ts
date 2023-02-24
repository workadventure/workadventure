import { BackToPusherSpaceMessage } from "../../src/Messages/generated/messages_pb";
import { EventEmitter } from "events";

export declare interface SpaceSocketMock {
    on(event: "write", listener: (message: BackToPusherSpaceMessage) => void): this;
    on(event: "end", listener: () => void): this;
}

export class SpaceSocketMock extends EventEmitter {
    write(message: BackToPusherSpaceMessage) {
        this.emit("write", message);
    }
    end() {
        this.emit("end");
    }
}
