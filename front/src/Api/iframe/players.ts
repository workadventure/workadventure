import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from "../Events/HasPlayerMovedEvent";
import { Subject } from "rxjs";
import { apiCallback } from "./registeredCallbacks";
import { createState } from "./state";
import {SetSharedPlayerVariableEvent} from "../Events/SetSharedPlayerVariableEvent";

const sharedPlayersVariableStream = new Map<string, Subject<SetSharedPlayerVariableEvent>>();


export class WorkadventurePlayersCommands extends IframeApiContribution<WorkadventurePlayersCommands> {

    callbacks = [
        apiCallback({
            type: "setSharedPlayerVariable",
            callback: (payloadData) => {
                let stream = sharedPlayersVariableStream.get(payloadData.key);
                if (!stream) {
                    stream = new Subject<SetSharedPlayerVariableEvent>();
                    sharedPlayersVariableStream.set(payloadData.key, stream);
                }
                stream.next(payloadData);
            },
        }),
    ];

    public onVariableChange(variableName: string, callback: (userId: number, value: unknown) => void) {
        let stream = sharedPlayersVariableStream.get(variableName);
        if (!stream) {
            stream = new Subject<SetSharedPlayerVariableEvent>();
            sharedPlayersVariableStream.set(variableName, stream);
        }
        stream.subscribe((payload) => {
            callback(payload.playerId, payload.value);
        });

    }
}

export default new WorkadventurePlayersCommands();
