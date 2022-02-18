import * as tg from "generic-type-guard";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isCharacterTexture = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        level: tg.isNumber,
        url: tg.isString,
        rights: tg.isString,
    })
    .get();
export type CharacterTexture = tg.GuardedType<typeof isCharacterTexture>;
