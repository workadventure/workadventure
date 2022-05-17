import { Subject } from "rxjs";
import { ChangeAreaEvent, isChangeAreaEvent } from "../Events/ChangeAreaEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

const enterAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();
const leaveAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();

export class WorkadventureAreaCommands extends IframeApiContribution<WorkadventureAreaCommands> {
    callbacks = [
        apiCallback({
            type: "enterAreaEvent",
            typeChecker: isChangeAreaEvent,
            callback: (payloadData: ChangeAreaEvent) => {
                enterAreaStreams.get(payloadData.name)?.next();
            },
        }),
        apiCallback({
            type: "leaveAreaEvent",
            typeChecker: isChangeAreaEvent,
            callback: (payloadData) => {
                leaveAreaStreams.get(payloadData.name)?.next();
            },
        }),
    ];

    onEnterArea(areaName: string): Subject<void> {
        let subject = enterAreaStreams.get(areaName);
        if (subject === undefined) {
            subject = new Subject<void>();
            enterAreaStreams.set(areaName, subject);
        }

        return subject;
    }

    onLeaveArea(areaName: string): Subject<void> {
        let subject = leaveAreaStreams.get(areaName);
        if (subject === undefined) {
            subject = new Subject<void>();
            leaveAreaStreams.set(areaName, subject);
        }

        return subject;
    }

    setAreaProperty(
        areaName: string,
        propertyName: string,
        propertyValue: string | number | boolean | undefined
    ): void {
        sendToWorkadventure({
            type: "setAreaProperty",
            data: {
                areaName,
                propertyName: propertyName,
                propertyValue: propertyValue,
            },
        });
    }
}

export default new WorkadventureAreaCommands();
