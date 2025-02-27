import { v4 as uuid } from "uuid";
import {
    type PlayerMessageType,
    type MessageReferenceEvent,
    type TriggerPlayerMessageEvent,
    triggerPlayerMessage,
} from "../../Events/Ui/TriggerPlayerMessageEvent";
import { removePlayerMessage } from "../../Events/Ui/TriggerPlayerMessageEvent";
import { queryWorkadventure } from "../IframeApiContribution";
import type { PlayerMessageOptions } from "../ui";

export class PlayerMessage {
    public readonly uuid: string;
    private readonly type: PlayerMessageType;
    private readonly message: string;
    private readonly callback: () => void;

    constructor(playerMessageOptions: PlayerMessageOptions, private onRemove: () => void) {
        this.uuid = uuid();
        this.message = playerMessageOptions.message;
        this.type = playerMessageOptions.type ?? "message";
        this.callback = playerMessageOptions.callback;
        this.create().catch((e) => console.error(e));
    }

    private async create() {
        await queryWorkadventure({
            type: triggerPlayerMessage,
            data: {
                message: this.message,
                type: this.type,
                uuid: this.uuid,
            } as TriggerPlayerMessageEvent,
        });
    }

    async remove() {
        await queryWorkadventure({
            type: removePlayerMessage,
            data: {
                uuid: this.uuid,
            } as MessageReferenceEvent,
        });
        this.onRemove();
    }

    triggerCallback() {
        if (this.callback) this.callback();
    }
}
