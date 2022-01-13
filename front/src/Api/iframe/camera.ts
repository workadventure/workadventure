import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { Subject } from "rxjs";
import type { WasCameraUpdatedEvent } from "../Events/WasCameraUpdatedEvent";
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

    public setViewport(
        x: number,
        y: number,
        width?: number,
        height?: number,
        lock: boolean = false,
        smooth: boolean = false
    ): void {
        console.log({ x, y, width, height, lock, smooth });
        sendToWorkadventure({
            type: "cameraSetViewport",
            data: { x, y, width, height, lock, smooth },
        });
    }

    public followPlayer(smooth: boolean = false): void {
        sendToWorkadventure({
            type: "cameraFollowPlayer",
            data: { smooth },
        });
    }

    onCameraUpdate(): Subject<WasCameraUpdatedEvent> {
        sendToWorkadventure({
            type: "onCameraUpdate",
            data: null,
        });
        return moveStream;
    }
}

export default new WorkAdventureCameraCommands();
