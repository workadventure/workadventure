import * as tg from "generic-type-guard";

const isSoundConfig = new tg.IsInterface()
    .withProperties({
        volume: tg.isOptional(tg.isNumber),
        loop: tg.isOptional(tg.isBoolean),
        mute: tg.isOptional(tg.isBoolean),
        rate: tg.isOptional(tg.isNumber),
        detune: tg.isOptional(tg.isNumber),
        seek: tg.isOptional(tg.isNumber),
        delay: tg.isOptional(tg.isNumber),
    })
    .get();

export const isPlaySoundEvent = new tg.IsInterface()
    .withProperties({
        url: tg.isString,
        config: tg.isOptional(isSoundConfig),
    })
    .get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type PlaySoundEvent = tg.GuardedType<typeof isPlaySoundEvent>;
