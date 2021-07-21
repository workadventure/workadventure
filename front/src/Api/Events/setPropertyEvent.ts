import * as tg from "generic-type-guard";

export const isSetPropertyEvent = new tg.IsInterface()
    .withProperties({
        layerName: tg.isString,
        propertyName: tg.isString,
        propertyValue: tg.isUnion(tg.isString, tg.isUnion(tg.isNumber, tg.isUnion(tg.isBoolean, tg.isUndefined))),
    })
    .get();
/**
 * A message sent from the iFrame to the game to change the value of the property of the layer
 */
export type SetPropertyEvent = tg.GuardedType<typeof isSetPropertyEvent>;
