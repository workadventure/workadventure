import * as tg from "generic-type-guard";

export const isHasCameraMovedEvent = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
    })
    .get();

/**
 * A message sent from the game to the iFrame to notify a movement from the camera.
 */

export type HasCameraMovedEvent = tg.GuardedType<typeof isHasCameraMovedEvent>;

export type HasCameraMovedEventCallback = (event: HasCameraMovedEvent) => void;
