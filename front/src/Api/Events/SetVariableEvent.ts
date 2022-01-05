import * as tg from "generic-type-guard";

export const isSetVariableEvent = new tg.IsInterface()
    .withProperties({
        key: tg.isString,
        value: tg.isUnknown,
        target: tg.isSingletonStringUnion("global", "player"),
    })
    .get();
/**
 * A message sent from the iFrame to the game to change the value of the property of the layer
 */
export type SetVariableEvent = tg.GuardedType<typeof isSetVariableEvent>;

export const isSetVariableIframeEvent = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonString("setVariable"),
        data: isSetVariableEvent,
    })
    .get();
