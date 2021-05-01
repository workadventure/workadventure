import * as tg from "generic-type-guard";

export const isPositionState = new tg.IsInterface().withProperties({
    x: tg.isNumber,
    y: tg.isNumber
}).get()
export const isPlayerState = new tg.IsInterface()
    .withStringIndexSignature(
        new tg.IsInterface().withProperties({
            position: isPositionState,
            pusherId: tg.isUnion(tg.isNumber, tg.isUndefined)
        }).get()
    ).get()

export type PlayerStateObject = tg.GuardedType<typeof isPlayerState>;

export const isGameStateEvent =
    new tg.IsInterface().withProperties({
        roomId: tg.isString,
        data: tg.isObject,
        mapUrl: tg.isString,
        nickName: tg.isString,
        uuid: tg.isUnion(tg.isString, tg.isUndefined),
        players: isPlayerState,
        startLayerName: tg.isUnion(tg.isString, tg.isNull)
    }).get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type GameStateEvent = tg.GuardedType<typeof isGameStateEvent>;