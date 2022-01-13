import * as tg from "generic-type-guard";
import { isCharacterTexture } from "./CharacterTexture";
import { isNumber } from "generic-type-guard";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isMapDetailsData = new tg.IsInterface()
    .withProperties({
        mapUrl: tg.isString,
        policy_type: isNumber, //isNumericEnum(GameRoomPolicyTypes),
        tags: tg.isArray(tg.isString),
        textures: tg.isArray(isCharacterTexture),
        authenticationMandatory: tg.isUnion(tg.isNullable(tg.isBoolean), tg.isUndefined),
        roomSlug: tg.isNullable(tg.isString), // deprecated
        contactPage: tg.isNullable(tg.isString),
        group: tg.isNullable(tg.isString),
    })
    .withOptionalProperties({
        iframeAuthentication: tg.isNullable(tg.isString),
        // The date (in ISO 8601 format) at which the room will expire
        expireOn: tg.isString,
        // Whether the "report" feature is enabled or not on this room
        canReport: tg.isBoolean,
    })
    .get();

export type MapDetailsData = tg.GuardedType<typeof isMapDetailsData>;
