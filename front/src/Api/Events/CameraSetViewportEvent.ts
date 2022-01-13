import * as tg from "generic-type-guard";

export const isCameraSetViewportEvent = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
        lock: tg.isBoolean,
        smooth: tg.isBoolean,
    })
    .get();
/**
 * A message sent from the iFrame to the game to change the camera position.
 */
export type CameraSetViewportEvent = tg.GuardedType<typeof isCameraSetViewportEvent>;
