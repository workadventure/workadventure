import * as tg from "generic-type-guard";

export const isWalkPlayerToEventConfig = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        speed: tg.isNumber,
    })
    .get();

export type WalkPlayerToEvent = tg.GuardedType<typeof isWalkPlayerToEventConfig>;
