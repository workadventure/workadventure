import * as tg from "generic-type-guard";

/*export const isPositionState = new tg.IsInterface().withProperties({
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

export type PlayerStateObject = tg.GuardedType<typeof isPlayerState>;*/

export const isGameStateEvent =
    new tg.IsInterface().withProperties({
        roomId: tg.isString,
        mapUrl: tg.isString,
        nickname: tg.isUnion(tg.isString, tg.isNull),
        uuid: tg.isUnion(tg.isString, tg.isUndefined),
        startLayerName: tg.isUnion(tg.isString, tg.isNull)
    }).get();
/**
 * A message sent from the game to the iFrame when the gameState is got by the script
 */
export type GameStateEvent = tg.GuardedType<typeof isGameStateEvent>;