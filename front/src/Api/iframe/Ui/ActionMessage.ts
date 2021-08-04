import {
    MessageReferenceEvent,
    removeActionMessage,
    triggerActionMessage,
    TriggerActionMessageEvent,
} from "../../Events/ui/TriggerActionMessageEvent";
import { queryWorkadventure } from "../IframeApiContribution";
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export let triggerMessageInstance: ActionMessage | undefined = undefined;

export class ActionMessage {
    uuid: string;

    constructor(private message: string, private callback: () => void) {
        this.uuid = uuidv4();
        if (triggerMessageInstance) {
            triggerMessageInstance.remove();
        }
        triggerMessageInstance = this;
        this.create();
    }

    async create() {
        await queryWorkadventure({
            type: triggerActionMessage,
            data: {
                message: this.message,
                uuid: this.uuid,
            } as TriggerActionMessageEvent,
        });
        this.callback();
    }

    async remove() {
        await queryWorkadventure({
            type: removeActionMessage,
            data: {
                uuid: this.uuid,
            } as MessageReferenceEvent,
        });
        triggerMessageInstance = undefined;
    }
}
