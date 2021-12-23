import * as tg from "generic-type-guard";

export const isColorEvent = new tg.IsInterface()
    .withProperties({
        red: tg.isNumber,
        green: tg.isNumber,
        blue: tg.isNumber,
    })
    .get();
/**
 * A message sent from the iFrame to the game to dynamically set the outline of the player.
 */
export type ColorEvent = tg.GuardedType<typeof isColorEvent>;
