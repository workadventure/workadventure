import * as tg from "generic-type-guard";

export const isViewport = new tg.IsInterface()
    .withProperties({
        left: tg.isNumber,
        top: tg.isNumber,
        right: tg.isNumber,
        bottom: tg.isNumber,
    })
    .get();
export type ViewportInterface = tg.GuardedType<typeof isViewport>;
