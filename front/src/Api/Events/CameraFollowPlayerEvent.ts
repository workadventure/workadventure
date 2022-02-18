import * as tg from "generic-type-guard";

export const isCameraFollowPlayerEvent = new tg.IsInterface()
    .withProperties({
        smooth: tg.isBoolean,
    })
    .get();
/**
 * A message sent from the iFrame to the game to make the camera follow player.
 */
export type CameraFollowPlayerEvent = tg.GuardedType<typeof isCameraFollowPlayerEvent>;
