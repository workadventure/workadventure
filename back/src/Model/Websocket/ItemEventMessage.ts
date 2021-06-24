import * as tg from "generic-type-guard";

export const isItemEventMessageInterface = new tg.IsInterface()
    .withProperties({
        itemId: tg.isNumber,
        event: tg.isString,
        state: tg.isUnknown,
        parameters: tg.isUnknown,
    })
    .get();
export type ItemEventMessageInterface = tg.GuardedType<typeof isItemEventMessageInterface>;
