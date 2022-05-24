import { Subject } from "rxjs";
import { ChangeAreaEvent, isChangeAreaEvent } from "../Events/ChangeAreaEvent";
import { CreateAreaEvent, ModifyAreaEvent } from "../Events/CreateAreaEvent";
import { Area } from "./Area/Area";
import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
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

    create(createAreaEvent: CreateAreaEvent): Area {
        queryWorkadventure({
            type: "createArea",
            data: createAreaEvent,
        }).catch((e) => {
            console.error(e);
        });
        return new Area(createAreaEvent);
    }

    delete(name: string): void {
        queryWorkadventure({
            type: "deleteArea",
            data: name,
        }).catch((e) => {
            console.error(e);
        });
    }

    modify(modifyAreaEvent: ModifyAreaEvent): void {
        queryWorkadventure({
            type: "modifyArea",
            data: modifyAreaEvent,
        }).catch((e) => {
            console.error(e);
        });
    }

    onEnter(areaName: string): Subject<void> {
        let subject = enterAreaStreams.get(areaName);
        if (subject === undefined) {
            subject = new Subject<void>();
            enterAreaStreams.set(areaName, subject);
        }

        return subject;
    }

    onLeave(areaName: string): Subject<void> {
        let subject = leaveAreaStreams.get(areaName);
        if (subject === undefined) {
            subject = new Subject<void>();
            leaveAreaStreams.set(areaName, subject);
        }

        return subject;
    }

    setProperty(areaName: string, propertyName: string, propertyValue: string | number | boolean | undefined): void {
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
