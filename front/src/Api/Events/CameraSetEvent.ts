import * as tg from "generic-type-guard";

export const isCameraSetEvent = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isOptional(tg.isNumber),
        height: tg.isOptional(tg.isNumber),
        lock: tg.isBoolean,
        smooth: tg.isBoolean,
    })
    .get();
/**
 * A message sent from the iFrame to the game to change the camera position.
 */
export type CameraSetEvent = tg.GuardedType<typeof isCameraSetEvent>;
