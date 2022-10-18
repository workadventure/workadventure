import type {
    ActionMessageType,
    MessageReferenceEvent,
    TriggerActionMessageEvent,
} from "../../Events/Ui/TriggerActionMessageEvent";
import { removeActionMessage, triggerActionMessage } from "../../Events/Ui/TriggerActionMessageEvent";
import { queryWorkadventure } from "../IframeApiContribution";
import type { ActionMessageOptions } from "../ui";
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export class ActionMessage {
    public readonly uuid: string;
    private readonly type: ActionMessageType;
    private readonly message: string;
    private readonly callback: () => void;

    constructor(actionMessageOptions: ActionMessageOptions, private onRemove: () => void) {
        this.uuid = uuidv4();
        this.message = actionMessageOptions.message;
        this.type = actionMessageOptions.type ?? "message";
        this.callback = actionMessageOptions.callback;
        this.create().catch((e) => console.error(e));
    }

    private async create() {
        await queryWorkadventure({
            type: triggerActionMessage,
            data: {
                message: this.message,
                type: this.type,
                uuid: this.uuid,
            } as TriggerActionMessageEvent,
        });
    }

    async remove() {
        await queryWorkadventure({
            type: removeActionMessage,
            data: {
                uuid: this.uuid,
            } as MessageReferenceEvent,
        });
        this.onRemove();
    }

    triggerCallback() {
        this.callback();
    }
}
