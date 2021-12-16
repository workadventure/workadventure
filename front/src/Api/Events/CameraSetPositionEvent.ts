import * as tg from "generic-type-guard";

export const isCameraSetPositionEvent = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
        smooth: tg.isBoolean,
    })
    .get();
/**
 * A message sent from the iFrame to the game to change the camera position.
 */
export type CameraSetPositionEvent = tg.GuardedType<typeof isCameraSetPositionEvent>;
