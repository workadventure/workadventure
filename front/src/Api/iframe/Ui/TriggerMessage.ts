import { removeTriggerMessage, triggerMessage, TriggerMessageEvent } from '../../Events/TriggerMessageEvent';
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
export class TriggerMessage {

    uuid: string

    constructor(private message: string, private callback: () => void) {
        this.uuid = uuidv4()
    }

    create(): this {
        window.parent.postMessage({
            type: triggerMessage,
            data: {
                message: this.message,
                uuid: this.uuid
            } as TriggerMessageEvent
        }, "*")
        return this
    }

    remove() {
        window.parent.postMessage({
            type: removeTriggerMessage,
            data: {
                uuid: this.uuid
            } as TriggerMessageEvent
        }, "*")
    }

    trigger() {
        this.callback();
    }
}