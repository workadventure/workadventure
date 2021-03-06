import {RoomConnection} from "../Connexion/RoomConnection";
import * as TypeMessages from "./TypeMessage";
import List = Phaser.Structs.List;
import {UpdatedLocalStreamCallback} from "../WebRtc/MediaManager";
import {Banned} from "./TypeMessage";

export interface TypeMessageInterface {
    showMessage(message: string): void;
}

export class UserMessageManager {

    typeMessages: Map<string, TypeMessageInterface> = new Map<string, TypeMessageInterface>();
    receiveBannedMessageListener: Set<Function> = new Set<UpdatedLocalStreamCallback>();

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
            const typeMessage = this.showMessage(type, message);

            //listener on banned receive message
            if(typeMessage instanceof Banned) {
                for (const callback of this.receiveBannedMessageListener) {
                    callback();
                }
            }
        });
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
        this.receiveBannedMessageListener.add(callback);
    }
}