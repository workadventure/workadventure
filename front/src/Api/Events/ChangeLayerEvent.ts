import * as tg from "generic-type-guard";

export const isChangeLayerEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a layer.
 */
export type ChangeLayerEvent = tg.GuardedType<typeof isChangeLayerEvent>;
