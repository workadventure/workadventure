import * as tg from "generic-type-guard";

export const isMovePlayerToEventAnswer = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        cancelled: tg.isBoolean,
    })
    .get();

export type MovePlayerToEventAnswer = tg.GuardedType<typeof isMovePlayerToEventAnswer>;
