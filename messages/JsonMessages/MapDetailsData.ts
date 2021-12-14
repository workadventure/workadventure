import * as tg from "generic-type-guard";
import { isCharacterTexture } from "./CharacterTexture";
import { isNumber } from "generic-type-guard";

/*const isNumericEnum =
    <T extends { [n: number]: string }>(vs: T) =>
    (v: any): v is T =>
        typeof v === "number" && v in vs;*/

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
