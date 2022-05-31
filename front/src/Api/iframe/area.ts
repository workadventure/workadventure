import { Subject } from "rxjs";
import { ChangeAreaEvent } from "../Events/ChangeAreaEvent";
import { CreateAreaEvent, ModifyAreaEvent } from "../Events/CreateAreaEvent";
import { Area } from "./Area/Area";
import { IframeApiContribution, queryWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

const enterAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();
const leaveAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();

export class WorkadventureAreaCommands extends IframeApiContribution<WorkadventureAreaCommands> {
    callbacks = [
        apiCallback({
            type: "enterAreaEvent",
            callback: (payloadData: ChangeAreaEvent) => {
                enterAreaStreams.get(payloadData.name)?.next();
            },
        }),
        apiCallback({
            type: "leaveAreaEvent",
            callback: (payloadData) => {
                leaveAreaStreams.get(payloadData.name)?.next();
            },
        }),
    ];

    create(createAreaEvent: CreateAreaEvent): Area {
        void queryWorkadventure({
            type: "createArea",
            data: createAreaEvent,
        });
        return new Area(createAreaEvent);
    }

    async get(name: string): Promise<Area> {
        const areaEvent = await queryWorkadventure({
            type: "getArea",
            data: name,
        });

        return new Area(areaEvent);
    }

    async delete(name: string): Promise<void> {
        await queryWorkadventure({
            type: "deleteArea",
            data: name,
        });
        enterAreaStreams.delete(name);
        leaveAreaStreams.delete(name);
    }

    modify(modifyAreaEvent: ModifyAreaEvent): void {
        void queryWorkadventure({
            type: "modifyArea",
            data: modifyAreaEvent,
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
}

export default new WorkadventureAreaCommands();
