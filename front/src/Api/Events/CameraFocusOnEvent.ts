import * as tg from "generic-type-guard";

export const isCameraFocusOnEvent = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
        smooth: tg.isBoolean,
    })
    .get();
/**
 * A message sent from the iFrame to the game to set the camera focus on certain place.
 */
export type CameraFocusOnEvent = tg.GuardedType<typeof isCameraFocusOnEvent>;
