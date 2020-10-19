import {RoomConnection} from "../Connexion/RoomConnection";
import * as TypeMessages from "./TypeMessage";

export interface TypeMessageInterface {
    showMessage(message: string): void;
}

export class UserMessageManager {

    typeMessages: Map<string, TypeMessageInterface> = new Map<string, TypeMessageInterface>();

    constructor(private Connection: RoomConnection) {
        const valueTypeMessageTab = Object.values(TypeMessages);
        Object.keys(TypeMessages).forEach((value: string, index: number) => {
            const typeMessageInstance: TypeMessageInterface = (new valueTypeMessageTab[index]() as TypeMessageInterface);
            this.typeMessages.set(value.toLowerCase(), typeMessageInstance);
        });
        this.initialise();
    }

    initialise() {
        //receive signal to show message
        this.Connection.receiveUserMessage((type: string, message: string) => {
            this.showMessage(type, message);
        });
    }

    showMessage(type: string, message: string) {
        const classTypeMessage = this.typeMessages.get(type.toLowerCase());
        if (!classTypeMessage) {
            console.error('Message unknown');
            return;
        }
        classTypeMessage.showMessage(message);
    }
}