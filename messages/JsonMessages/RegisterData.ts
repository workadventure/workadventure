import * as tg from "generic-type-guard";
import { isCharacterTexture } from "./CharacterTexture";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isRegisterData = new tg.IsInterface()
    .withProperties({
        roomUrl: tg.isString,
        email: tg.isNullable(tg.isString),
        organizationMemberToken: tg.isNullable(tg.isString),
        mapUrlStart: tg.isString,
        userUuid: tg.isString,
        textures: tg.isArray(isCharacterTexture),
        authToken: tg.isString,
    })
    .withOptionalProperties({
        messages: tg.isArray(tg.isUnknown),
    })
    .get();
export type RegisterData = tg.GuardedType<typeof isRegisterData>;
