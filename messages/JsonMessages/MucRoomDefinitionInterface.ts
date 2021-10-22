import * as tg from "generic-type-guard";
import {isMapDetailsData} from "./MapDetailsData";

export const isMucRoomDefinition = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
        uri: tg.isString,
    })
    .get();

export type MucRoomDefinitionInterface = tg.GuardedType<typeof isMucRoomDefinition>;

