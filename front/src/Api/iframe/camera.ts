import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { Subject } from "rxjs";
import type { HasCameraMovedEvent, HasCameraMovedEventCallback } from "../Events/HasCameraMovedEvent";
import { apiCallback } from "./registeredCallbacks";
import { isHasCameraMovedEvent } from "../Events/HasCameraMovedEvent";

const moveStream = new Subject<HasCameraMovedEvent>();

export class WorkAdventureCameraCommands extends IframeApiContribution<WorkAdventureCameraCommands> {
    callbacks = [
        apiCallback({
            type: "hasCameraMoved",
            typeChecker: isHasCameraMovedEvent,
            callback: (payloadData) => {
                moveStream.next(payloadData);
            },
        }),
    ];

    onCameraMove(callback: HasCameraMovedEventCallback): void {
        moveStream.subscribe(callback);
        sendToWorkadventure({
            type: "onCameraMove",
            data: null,
        });
    }
}

export default new WorkAdventureCameraCommands();
