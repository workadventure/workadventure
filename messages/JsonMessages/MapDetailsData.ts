import * as tg from "generic-type-guard";
import { isCharacterTexture } from "./CharacterTexture";
import { isNumber } from "generic-type-guard";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isMapDetailsData = new tg.IsInterface()
    .withProperties({
        roomSlug: tg.isOptional(tg.isString), // deprecated
        mapUrl: tg.isString,
        policy_type: isNumber, //isNumericEnum(GameRoomPolicyTypes),
        tags: tg.isArray(tg.isString),
        textures: tg.isArray(isCharacterTexture),
        contactPage: tg.isUnion(tg.isString, tg.isUndefined),
        authenticationMandatory: tg.isUnion(tg.isBoolean, tg.isUndefined),
        group: tg.isNullable(tg.isString),
    })
    .withOptionalProperties({
        iframeAuthentication: tg.isNullable(tg.isString),
    })
    .get();

export type MapDetailsData = tg.GuardedType<typeof isMapDetailsData>;
