import * as tg from "generic-type-guard";

export const isPlayerPosition = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
    })
    .get();

export type PlayerPosition = tg.GuardedType<typeof isPlayerPosition>;
