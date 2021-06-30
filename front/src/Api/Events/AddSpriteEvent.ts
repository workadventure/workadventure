import * as tg from 'generic-type-guard';

export const isVector2D = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
    })
    .get();

export const isSpriteEvent = new tg.IsInterface()
    .withProperties({
        spiteSourceUrl: tg.isString,
        spriteAnimationWidth: tg.isNumber,
        spriteAnimationHeight: tg.isNumber,
        relativePositionOffset: isVector2D,
    })
    .get();

export type SpriteEvent = tg.GuardedType<typeof isSpriteEvent>;
