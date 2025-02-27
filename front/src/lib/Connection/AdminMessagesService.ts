import { Subject } from "rxjs";
import type { BanUserMessage, SendUserMessage } from "@workadventure/messages";

export enum AdminMessageEventTypes {
    admin = "message",
    audio = "audio",
    ban = "ban",
    banned = "banned",
}

interface AdminMessageEvent {
    type: AdminMessageEventTypes;
    text: string;
    //todo add optional properties for other event types
}

//this class is designed to easily allow communication between the RoomConnection objects (that receive the message)
//and the various objects that may render the message on screen
class AdminMessagesService {
    private _messageStream: Subject<AdminMessageEvent> = new Subject();
    public messageStream = this._messageStream.asObservable();

    onSendusermessage(message: SendUserMessage | BanUserMessage) {
        this._messageStream.next({
            type: message.type as unknown as AdminMessageEventTypes,
            text: message.message,
        });
    }
}

export const adminMessagesService = new AdminMessagesService();
