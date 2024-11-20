import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type { WasCameraUpdatedEvent } from "../Events/WasCameraUpdatedEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

const moveStream = new Subject<WasCameraUpdatedEvent>();

export class WorkAdventureCameraCommands extends IframeApiContribution<WorkAdventureCameraCommands> {
    callbacks = [
        apiCallback({
            type: "wasCameraUpdated",
            callback: (payloadData) => {
                moveStream.next(payloadData);
            },
        }),
    ];

    /**
     * Set camera to follow the player.
     * {@link https://docs.workadventu.re/map-building/api-camera.md#start-following-player | Website documentation}
     *
     * @param smooth Smooth transition
     */
    public followPlayer(smooth = false, duration?: number): void {
        sendToWorkadventure({
            type: "cameraFollowPlayer",
            data: { smooth, duration },
        });
    }

    /**
     * Set camera to look at given spot. Setting width and height will adjust zoom.
     * Set lock to true to lock camera in this position.
     * Set smooth to true for smooth transition.
     * {@link https://docs.workadventu.re/map-building/api-camera.md#set-spot-for-camera-to-look-at | Website documentation}
     *
     * @param {number} x Horizontal position
     * @param {number} y Vertical position
     * @param {number} width Width size
     * @param {number} height Height size
     * @param {boolean} lock Zoom locked
     * @param {boolean} smooth Smooth transition
     */
    set(x: number, y: number, width?: number, height?: number, lock = false, smooth = false, duration?: number): void {
        sendToWorkadventure({
            type: "cameraSet",
            data: { x, y, width, height, lock, smooth, duration },
        });
    }

    /**
     * Listens to updates of the camera viewport.
     * It will trigger for every update of the camera's properties (position or scale for instance).
     * {@link https://docs.workadventu.re/map-building/api-camera.md#listen-to-camera-updates | Website documentation}
     *
     * @returns {Subject<WasCameraUpdatedEvent>} An observable firing event when the camera is updated
     */
    onCameraUpdate(): Observable<WasCameraUpdatedEvent> {
        sendToWorkadventure({
            type: "onCameraUpdate",
            data: undefined,
        });
        return moveStream.asObservable();
    }
}

export default new WorkAdventureCameraCommands();
