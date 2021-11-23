import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { Subject } from "rxjs";
import type { WasCameraUpdatedEvent, WasCameraUpdatedEventCallback } from "../Events/WasCameraUpdatedEvent";
import { apiCallback } from "./registeredCallbacks";
import { isWasCameraUpdatedEvent } from "../Events/WasCameraUpdatedEvent";

const moveStream = new Subject<WasCameraUpdatedEvent>();

export class WorkAdventureCameraCommands extends IframeApiContribution<WorkAdventureCameraCommands> {
    callbacks = [
        apiCallback({
            type: "wasCameraUpdated",
            typeChecker: isWasCameraUpdatedEvent,
            callback: (payloadData) => {
                moveStream.next(payloadData);
            },
        }),
    ];

    onCameraUpdate(callback: WasCameraUpdatedEventCallback): void {
        moveStream.subscribe(callback);
        sendToWorkadventure({
            type: "onCameraUpdate",
            data: null,
        });
    }
}

export default new WorkAdventureCameraCommands();
