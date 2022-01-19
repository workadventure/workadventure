import * as tg from "generic-type-guard";

export const isMovePlayerToEventConfig = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        speed: tg.isOptional(tg.isNumber),
    })
    .get();

export type MovePlayerToEvent = tg.GuardedType<typeof isMovePlayerToEventConfig>;
