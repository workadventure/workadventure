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

    public setPosition(x: number, y: number, width: number, height: number, smooth: boolean = false): void {
        sendToWorkadventure({
            type: "cameraSetPosition",
            data: { x, y, width, height, smooth },
        });
    }

    public focusOn(x: number, y: number, width: number, height: number, smooth: boolean = false): void {
        sendToWorkadventure({
            type: "cameraFocusOn",
            data: { x, y, width, height, smooth },
        });
    }

    public followPlayer(smooth: boolean = false): void {
        sendToWorkadventure({
            type: "cameraFollowPlayer",
            data: { smooth },
        });
    }

    onCameraUpdate(callback: WasCameraUpdatedEventCallback): void {
        moveStream.subscribe(callback);
        sendToWorkadventure({
            type: "onCameraUpdate",
            data: null,
        });
    }
}

export default new WorkAdventureCameraCommands();
