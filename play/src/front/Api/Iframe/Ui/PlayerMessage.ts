import {
    type PlayerMessageType,
    type MessageReferenceEvent,
    type TriggerPlayerMessageEvent,
    triggerPlayerMessage,
} from "../../Events/Ui/TriggerPlayerMessageEvent";
import { removePlayerMessage } from "../../Events/Ui/TriggerPlayerMessageEvent";
import { queryWorkadventure } from "../IframeApiContribution";
import type { PlayerMessageOptions } from "../ui";
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export class PlayerMessage {
    public readonly uuid: string;
    private readonly type: PlayerMessageType;
    private readonly message: string;
    private readonly callback: () => void;

    constructor(playerMessageOptions: PlayerMessageOptions, private onRemove: () => void) {
        this.uuid = uuidv4();
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
