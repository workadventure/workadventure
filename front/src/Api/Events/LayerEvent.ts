import * as tg from "generic-type-guard";

export const isLayerEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();
/**
 * A message sent from the iFrame to the game to show/hide a layer.
 */
export type LayerEvent = tg.GuardedType<typeof isLayerEvent>;
