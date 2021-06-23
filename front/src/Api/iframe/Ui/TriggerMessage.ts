
import { removeTriggerMessage, triggerMessage, TriggerMessageEvent } from '../../Events/ui/TriggerMessageEvent';
import { sendToWorkadventure } from '../IframeApiContribution';
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export let triggerMessageInstance: TriggerMessage | undefined = undefined



export class TriggerMessage {
    uuid: string

    constructor(private message: string, private callback: () => void) {
        this.uuid = uuidv4()
        if (triggerMessageInstance) {
            triggerMessageInstance.remove();
        }
        triggerMessageInstance = this;
        this.create();
    }

    create(): this {
        sendToWorkadventure({
            type: triggerMessage,
            data: {
                message: this.message,
                uuid: this.uuid
            } as TriggerMessageEvent
        })
        return this
    }

    remove() {
        sendToWorkadventure({
            type: removeTriggerMessage,
            data: {
                uuid: this.uuid
            } as TriggerMessageEvent
        })
        triggerMessageInstance = undefined
    }

    trigger() {
        this.callback();
    }
}