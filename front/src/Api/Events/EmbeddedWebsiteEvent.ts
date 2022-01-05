import * as tg from "generic-type-guard";

export const isRectangle = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
    })
    .get();

export const isEmbeddedWebsiteEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .withOptionalProperties({
        url: tg.isString,
        visible: tg.isBoolean,
        allowApi: tg.isBoolean,
        allow: tg.isString,
        x: tg.isNumber,
        y: tg.isNumber,
        width: tg.isNumber,
        height: tg.isNumber,
        origin: tg.isSingletonStringUnion("player", "map"),
        scale: tg.isNumber,
    })
    .get();

export const isCreateEmbeddedWebsiteEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
        url: tg.isString,
        position: isRectangle,
    })
    .withOptionalProperties({
        visible: tg.isBoolean,
        allowApi: tg.isBoolean,
        allow: tg.isString,
        origin: tg.isSingletonStringUnion("player", "map"),
        scale: tg.isNumber,
    })
    .get();

/**
 * A message sent from the iFrame to the game to modify an embedded website
 */
export type ModifyEmbeddedWebsiteEvent = tg.GuardedType<typeof isEmbeddedWebsiteEvent>;

export type CreateEmbeddedWebsiteEvent = tg.GuardedType<typeof isCreateEmbeddedWebsiteEvent>;
// TODO: make a variation that is all optional (except for the name)
export type Rectangle = tg.GuardedType<typeof isRectangle>;
