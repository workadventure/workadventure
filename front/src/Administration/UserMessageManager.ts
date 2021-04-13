import * as TypeMessages from "./TypeMessage";
import {Banned} from "./TypeMessage";
import {adminMessagesService} from "../Connexion/AdminMessagesService";

export interface TypeMessageInterface {
    showMessage(message: string): void;
}

class UserMessageManager {

    typeMessages: Map<string, TypeMessageInterface> = new Map<string, TypeMessageInterface>();
    receiveBannedMessageListener!: Function;

    constructor() {
        const valueTypeMessageTab = Object.values(TypeMessages);
        Object.keys(TypeMessages).forEach((value: string, index: number) => {
            const typeMessageInstance: TypeMessageInterface = (new valueTypeMessageTab[index]() as TypeMessageInterface);
            this.typeMessages.set(value.toLowerCase(), typeMessageInstance);
        });

        adminMessagesService.messageStream.subscribe((event) => {
            const typeMessage = this.showMessage(event.type, event.text);
            if(typeMessage instanceof Banned) {
                this.receiveBannedMessageListener();
            }
        })
    }

    showMessage(type: string, message: string) {
        const classTypeMessage = this.typeMessages.get(type.toLowerCase());
        if (!classTypeMessage) {
            console.error('Message unknown');
            return;
        }
        classTypeMessage.showMessage(message);
        return classTypeMessage;
    }

    setReceiveBanListener(callback: Function){
        this.receiveBannedMessageListener = callback;
    }
}
export const userMessageManager = new UserMessageManager()