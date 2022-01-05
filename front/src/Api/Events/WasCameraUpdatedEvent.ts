import * as tg from "generic-type-guard";

export const isWasCameraUpdatedEvent = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
        zoom: tg.isNumber,
    })
    .get();

/**
 * A message sent from the game to the iFrame to notify a movement from the camera.
 */

export type WasCameraUpdatedEvent = tg.GuardedType<typeof isWasCameraUpdatedEvent>;

export type WasCameraUpdatedEventCallback = (event: WasCameraUpdatedEvent) => void;
